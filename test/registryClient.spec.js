/**
 * registryClient.spec.js
 *
 * Unit tests for ServiceRegistryClient module.
 * Uses Jest to verify behavior of init(), sendHeartbeat(), startHeartbeat()/stopHeartbeat(),
 * _handleRegistryMessage(), sendApiDescription(), and close().
 * Mocks QueueManager to avoid real RabbitMQ operations.
 */

jest.useFakeTimers();

// Mock the QueueManager class
jest.mock('../src/queueManager', () => {
  return jest.fn().mockImplementation(() => ({
    init: jest.fn().mockResolvedValue(),
    ensureQueues: jest.fn().mockResolvedValue(),
    channel: {
      assertQueue: jest.fn().mockResolvedValue(),
      sendToQueue: jest.fn(),
      consume: jest.fn().mockResolvedValue(),
      ack: jest.fn(),
      nack: jest.fn()
    },
    close: jest.fn().mockResolvedValue()
  }));
});

const { ServiceRegistryClient } = require('../src/registryClient');
const EVENTS = require('../src/events');
const QueueManagerMock = require('../src/queueManager');

describe('ServiceRegistryClient', () => {
  const amqpUrl = 'amqp://localhost';
  const serviceName = 'testService';
  const version = '1.0.0';
  let client;

  beforeEach(async () => {
    // Reset mock instances
    QueueManagerMock.mockClear();
    client = new ServiceRegistryClient({ amqpUrl, serviceName, version, heartbeatInterval: 5000, apiQueue: 'apiQ', registryQueue: 'regQ' });
  });

  test('constructor throws if required params missing', () => {
    expect(() => new ServiceRegistryClient({})).toThrow();
    expect(() => new ServiceRegistryClient({ amqpUrl })).toThrow();
    expect(() => new ServiceRegistryClient({ amqpUrl, serviceName })).toThrow();
  });

  describe('init()', () => {
    test('initializes QueueManager and sets up queues and consumer', async () => {
      await client.init();

      // QueueManager should be constructed once
      expect(QueueManagerMock).toHaveBeenCalledWith(amqpUrl, serviceName);
      //const qmInstance = QueueManagerMock.mock.instances[0];
      const qmInstance = client.queueManager;

      expect(qmInstance.init).toHaveBeenCalled();
      expect(qmInstance.ensureQueues).toHaveBeenCalledWith(['apiQ', 'regQ']);

      // Should consume from registryQueue
      expect(qmInstance.channel.consume).toHaveBeenCalledWith(
        'regQ',
        expect.any(Function),
        { noAck: false }
      );
    });

    test('init resolves with no return value (covers final await)', async () => {
      // client je už vytvořený ve beforeEach
      const result = await client.init();
      expect(result).toBeUndefined(); // tím projde i await channel.consume(...)
    });

    test('uses default queue names when none are provided', async () => {
      // Vytvoříme klienta bez apiQueue a registryQueue => měly by padnout na defaults
      client = new ServiceRegistryClient({ amqpUrl, serviceName, version });
      await client.init();
      const qm = client.queueManager;
  
      // Ověříme, že se volají defaultní názvy front
      expect(qm.ensureQueues).toHaveBeenCalledWith(['api_services_queue', 'registry_office']);
      expect(qm.channel.consume).toHaveBeenCalledWith(
        'registry_office',
        expect.any(Function),
        { noAck: false }
      );
    });
  });

  describe('sendHeartbeat()', () => {
    beforeEach(async () => {
      await client.init();
    });

    test('sends heartbeat message and emits event', async () => {
      const handler = jest.fn();
      client.on(EVENTS.HEARTBEAT_SENT, handler);

      await client.sendHeartbeat();
      //const qm = QueueManagerMock.mock.instances[0];
      const qm = client.queueManager;

      // Assert queue assertion and sendToQueue
      expect(qm.channel.assertQueue).toHaveBeenCalledWith('apiQ', { durable: true });
      expect(qm.channel.sendToQueue).toHaveBeenCalledWith(
        'apiQ',
        expect.any(Buffer),
        { persistent: true }
      );

      // Event emitted with correct payload properties
      expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({ type: 'heartbeat', serviceName, version, timestamp: expect.any(String) })
        );
      
        // Inspect the actual timestamp to ensure it's a valid ISO string
        const sentMsg = handler.mock.calls[0][0];
        expect(() => new Date(sentMsg.timestamp)).not.toThrow();
        expect(new Date(sentMsg.timestamp).toISOString()).toBe(sentMsg.timestamp);
    });
  });

  describe('startHeartbeat() and stopHeartbeat()', () => {
    beforeEach(async () => {
      await client.init();
    });

    test('startHeartbeat triggers sendHeartbeat immediately and on interval', () => {
      const spy = jest.spyOn(client, 'sendHeartbeat').mockResolvedValue();

      client.startHeartbeat();

      // Immediately called once
      expect(spy).toHaveBeenCalledTimes(1);

      // Advance timers by interval
      jest.advanceTimersByTime(5000);
      expect(spy).toHaveBeenCalledTimes(2);

      client.stopHeartbeat();
      jest.advanceTimersByTime(5000);
      expect(spy).toHaveBeenCalledTimes(2);
    });
  });

  describe('_handleRegistryMessage()', () => {
    beforeEach(async () => {
      await client.init();
    });
    test('emits apiDescriptionRequest on matching message and acks', () => {
      //const qm = QueueManagerMock.mock.instances[0];
      const qm = client.queueManager;
      const payload = { type: 'apiDescriptionRequest', serviceName, version };
      const msg = { content: Buffer.from(JSON.stringify(payload)) };

      const handler = jest.fn();
      client.on(EVENTS.API_DESCRIPTION_REQUEST, handler);

      // Call private handler
      client._handleRegistryMessage(msg);

      expect(handler).toHaveBeenCalledWith(payload);
      expect(qm.channel.ack).toHaveBeenCalledWith(msg);
    });

    test('nacks on invalid JSON', () => {
      //const qm = QueueManagerMock.mock.instances[0];
      const qm = client.queueManager;
      const badMsg = { content: Buffer.from('not-json') };
      const errorHandler = jest.fn();
      client.on(EVENTS.ERROR, errorHandler);

      client._handleRegistryMessage(badMsg);

      expect(errorHandler).toHaveBeenCalled();
      expect(qm.channel.nack).toHaveBeenCalledWith(badMsg, false, false);
    });

    test('ignores non-matching messages but still acks', () => {
      //const qm = QueueManagerMock.mock.instances[0];
      const qm = client.queueManager;
      const payload = { type: 'other', serviceName, version };
      const msg = { content: Buffer.from(JSON.stringify(payload)) };
      client._handleRegistryMessage(msg);

      expect(qm.channel.ack).toHaveBeenCalledWith(msg);
    });
  });

  describe('sendApiDescription()', () => {
    beforeEach(async () => {
      await client.init();
    });
    test('sends apiDescription message and emits event', async () => {
      const desc = { endpoints: [] };
      const handler = jest.fn();
      client.on(EVENTS.API_DESCRIPTION_SENT, handler);

      await client.sendApiDescription(desc);
      //const qm = QueueManagerMock.mock.instances[0];
      const qm = client.queueManager;

      expect(qm.channel.assertQueue).toHaveBeenCalledWith('regQ', { durable: true });
      expect(qm.channel.sendToQueue).toHaveBeenCalledWith(
        'regQ',
        expect.any(Buffer),
        { persistent: true }
      );
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'apiDescription', serviceName, version, description: desc })
      );
    });
  });

  describe('close()', () => {
    beforeEach(async () => {
      await client.init();
      client.startHeartbeat();
    });
    test('stops heartbeat and closes QueueManager', async () => {
      //const qm = QueueManagerMock.mock.instances[0];
      const qm = client.queueManager;
      client.stopHeartbeat = jest.fn();

      await client.close();

      expect(client.stopHeartbeat).toHaveBeenCalled();
      expect(qm.close).toHaveBeenCalled();
    });
  });
});
