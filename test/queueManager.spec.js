/**
 * queueManager.spec.js
 *
 * Unit tests for QueueManager module.
 * Uses Jest to verify correct behavior of init(), ensureQueues() and close().
 * Mocks amqplib to avoid real RabbitMQ connection.
 */

const amqp = require('amqplib');
const QueueManager = require('../src/queueManager');

// Mock amqplib.connect to return a fake connection and channel
jest.mock('amqplib');

describe('QueueManager', () => {
  let fakeConn;
  let fakeChannel;

  beforeEach(() => {
    fakeChannel = {
      assertQueue: jest.fn().mockResolvedValue(undefined),
      close: jest.fn().mockResolvedValue(undefined)
    };
    fakeConn = {
      createChannel: jest.fn().mockResolvedValue(fakeChannel),
      close: jest.fn().mockResolvedValue(undefined)
    };
    amqp.connect.mockResolvedValue(fakeConn);
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  const amqpUrl = 'amqp://localhost';
  const serviceName = 'testService';

  test('constructor throws if missing parameters', () => {
    expect(() => new QueueManager()).toThrow('amqpUrl is required');
    expect(() => new QueueManager(amqpUrl)).toThrow('serviceName is required');
  });

  describe('init()', () => {
    test('should connect and create channel', async () => {
      const qm = new QueueManager(amqpUrl, serviceName);
      await qm.init();

      expect(amqp.connect).toHaveBeenCalledWith(amqpUrl);
      expect(fakeConn.createChannel).toHaveBeenCalled();
      expect(qm.conn).toBe(fakeConn);
      expect(qm.channel).toBe(fakeChannel);
    });
  });

  describe('ensureQueues()', () => {
    test('throws if channel not initialized', async () => {
      const qm = new QueueManager(amqpUrl, serviceName);
      await expect(qm.ensureQueues()).rejects.toThrow('Channel is not initialized. Call init() first.');
    });

    test('should assert default queues', async () => {
      const qm = new QueueManager(amqpUrl, serviceName);
      await qm.init();

      await qm.ensureQueues();
      // default queues: ['workflow', `${serviceName}.registry`]
      expect(fakeChannel.assertQueue).toHaveBeenCalledTimes(2);
      expect(fakeChannel.assertQueue).toHaveBeenCalledWith('workflow', { durable: true });
      expect(fakeChannel.assertQueue).toHaveBeenCalledWith(`${serviceName}.registry`, { durable: true });
    });

    test('should assert additional queues too', async () => {
      const qm = new QueueManager(amqpUrl, serviceName);
      await qm.init();

      const extras = ['extraQueue1', 'extraQueue2'];
      await qm.ensureQueues(extras);

      // total calls = default (2) + extras (2)
      expect(fakeChannel.assertQueue).toHaveBeenCalledTimes(4);
      expect(fakeChannel.assertQueue).toHaveBeenCalledWith('workflow', { durable: true });
      expect(fakeChannel.assertQueue).toHaveBeenCalledWith(`${serviceName}.registry`, { durable: true });
      extras.forEach(q => {
        expect(fakeChannel.assertQueue).toHaveBeenCalledWith(q, { durable: true });
      });
    });
  });

  describe('close()', () => {
    test('should close channel and connection', async () => {
      const qm = new QueueManager(amqpUrl, serviceName);
      await qm.init();
      await qm.close();

      expect(fakeChannel.close).toHaveBeenCalled();
      expect(fakeConn.close).toHaveBeenCalled();
    });

    test('should not throw if already closed', async () => {
      const qm = new QueueManager(amqpUrl, serviceName);
      // channel and conn are null
      await expect(qm.close()).resolves.toBeUndefined();
    });
  });
});
