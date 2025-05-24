/**
 * registryClient.js
 *
 * ServiceRegistryClient for communication between a microservice (via Agent) and the central registry.
 * Sends heartbeat messages, listens for API description requests, and sends API descriptions.
 * Uses QueueManager to manage AMQP queues.
 * Emits events through EventEmitter.
 *
 * Events (see src/events.js):
 *  - 'heartbeatSent'
 *  - 'apiDescriptionRequest'
 *  - 'apiDescriptionSent'
 *  - 'error'
 *
 * @module @onlineapps/agent-registry-client/src/registryClient
 */

const EventEmitter = require('events');
const QueueManager = require('./queueManager');
const { v4: uuidv4 } = require('uuid');

class ServiceRegistryClient extends EventEmitter {
  /**
   * @param {Object} opts
   * @param {string} opts.amqpUrl - AMQP URI for connecting to RabbitMQ
   * @param {string} opts.serviceName - Name of the service (e.g., 'invoicing')
   * @param {string} opts.version - Version of the service (e.g., '1.2.0')
   * @param {number} [opts.heartbeatInterval=10000] - Heartbeat interval in milliseconds
   * @param {string} [opts.apiQueue='api_services_queue'] - Queue name for heartbeat and API traffic
   * @param {string} [opts.registryQueue='registry_office'] - Queue name for registry messages
   */
  constructor({ amqpUrl, serviceName, version, heartbeatInterval = 10000,
                apiQueue = 'api_services_queue', registryQueue = 'registry_office' }) {
    super();
    if (!amqpUrl || !serviceName || !version) {
      throw new Error('amqpUrl, serviceName, and version are required');
    }
    this.serviceName = serviceName;
    this.version = version;
    this.heartbeatInterval = heartbeatInterval;
    this.apiQueue = apiQueue;
    this.registryQueue = registryQueue;
    this.queueManager = new QueueManager(amqpUrl, serviceName);
    this.heartbeatTimer = null;
  }

  /**
   * Initializes the connection, ensures queues exist, and starts consuming the registry queue.
   * @returns {Promise<void>}
   */
  async init() {
    await this.queueManager.init();
    // Ensure existence of API and registry queues
    await this.queueManager.ensureQueues([this.apiQueue, this.registryQueue]);
    // Start consuming registry queue
    await this.queueManager.channel.consume(
      this.registryQueue,
      msg => this._handleRegistryMessage(msg),
      { noAck: false }
    );
  }

  /**
   * Internal handler for incoming messages from the registry queue.
   * Emits 'apiDescriptionRequest' when appropriate.
   * @param {Object} msg - AMQP message
   * @private
   */
  _handleRegistryMessage(msg) {
    let payload;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch (err) {
      this.emit('error', err);
      return this.queueManager.channel.nack(msg, false, false);
    }

    if (payload.type === 'apiDescriptionRequest' &&
        payload.serviceName === this.serviceName &&
        payload.version === this.version) {
      // Emit API description request event
      this.emit('apiDescriptionRequest', payload);
    }

    // Acknowledge all messages
    this.queueManager.channel.ack(msg);
  }

  /**
   * Sends a heartbeat message to the API queue.
   * Emits 'heartbeatSent'.
   * @returns {Promise<void>}
   */
  async sendHeartbeat() {
    const msg = {
      id: uuidv4(),
      type: 'heartbeat',
      serviceName: this.serviceName,
      version: this.version,
      timestamp: new Date().toISOString()
    };
    await this.queueManager.channel.assertQueue(this.apiQueue, { durable: true });
    this.queueManager.channel.sendToQueue(
      this.apiQueue,
      Buffer.from(JSON.stringify(msg)),
      { persistent: true }
    );
    this.emit('heartbeatSent', msg);
  }

  /**
   * Starts periodic heartbeat messages.
   */
  startHeartbeat() {
    // Send immediately after init
    this.sendHeartbeat();
    // Repeat at the configured interval
    this.heartbeatTimer = setInterval(
      () => this.sendHeartbeat(),
      this.heartbeatInterval
    );
  }

  /**
   * Stops periodic heartbeat messages.
   */
  stopHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
  }

  /**
   * Sends an API description message to the registry queue.
   * Emits 'apiDescriptionSent'.
   * @param {Object} apiDescription - JSON object describing the API
   * @returns {Promise<void>}
   */
  async sendApiDescription(apiDescription) {
    const msg = {
      id: uuidv4(),
      type: 'apiDescription',
      serviceName: this.serviceName,
      version: this.version,
      description: apiDescription,
      timestamp: new Date().toISOString()
    };
    await this.queueManager.channel.assertQueue(this.registryQueue, { durable: true });
    this.queueManager.channel.sendToQueue(
      this.registryQueue,
      Buffer.from(JSON.stringify(msg)),
      { persistent: true }
    );
    this.emit('apiDescriptionSent', msg);
  }

  /**
   * Releases resources: stops heartbeat and closes connection.
   * @returns {Promise<void>}
   */
  async close() {
    this.stopHeartbeat();
    await this.queueManager.close();
  }
}

module.exports = { ServiceRegistryClient };
