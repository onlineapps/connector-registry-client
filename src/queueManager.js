/**
 * queueManager.js
 *
 * Responsible for connecting to RabbitMQ and asserting/confirming the existence of queues
 * used by the microservice agent.
 *
 * Overview:
 *   - Queues managed by the microservice: 'workflow' and '<serviceName>.registry'
 *   - On startup: assertQueue for all required queues
 *   - Provides access to the channel for further operations (send, consume)
 *
 * Usage:
 *   const qm = new QueueManager(amqpUrl, serviceName);
 *   await qm.init();
 *   await qm.ensureQueues();
 *   const { channel } = qm;
 *
 * @module @onlineapps/agent-registry-client/src/queueManager
 */

const amqp = require('amqplib');

/**
 * Queue manager for the microservice agent.
 */
class QueueManager {
  /**
   * @param {string} amqpUrl - RabbitMQ server URL (AMQP URI)
   * @param {string} serviceName - Name of the microservice (e.g. 'invoicing')
   */
  constructor(amqpUrl, serviceName) {
    if (!amqpUrl) throw new Error('amqpUrl is required');
    if (!serviceName) throw new Error('serviceName is required');
    this.amqpUrl = amqpUrl;
    this.serviceName = serviceName;
    this.conn = null;
    this.channel = null;
  }

  /**
   * Initializes the connection and channel to RabbitMQ.
   * @returns {Promise<void>} 
   */
  async init() {
    this.conn = await amqp.connect(this.amqpUrl);
    this.channel = await this.conn.createChannel();
  }

  /**
   * Ensures all required queues exist. Creates them if they don't.
   * @param {Array<string>} [additionalQueues=[]] - Any additional custom queues
   * @returns {Promise<void>}
   */
  async ensureQueues(additionalQueues = []) {
    if (!this.channel) {
      throw new Error('Channel is not initialized. Call init() first.');
    }

    // Default queues for the registry client
    const baseQueues = [
      'workflow',
      `${this.serviceName}.registry`
    ];

    const queuesToCreate = baseQueues.concat(additionalQueues);

    for (const q of queuesToCreate) {
      await this.channel.assertQueue(q, { durable: true });
    }
  }

  /**
   * Closes the channel and connection.
   * @returns {Promise<void>}
   */
  async close() {
    if (this.channel) await this.channel.close();
    if (this.conn) await this.conn.close();
  }
}

module.exports = QueueManager;
