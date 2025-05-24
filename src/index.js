/**
 * index.js
 *
 * Main entry point for the agent-registry-client module.
 * Exports ServiceRegistryClient and the full set of events.
 *
 * @module @onlineapps/agent-registry-client
 */

// Core client
const { ServiceRegistryClient } = require('./registryClient');
// Events for use with EventEmitter
const EVENTS = require('./events');

module.exports = {
  /**
   * Class for registering a service and sending heartbeats to the central registry.
   * @type {typeof ServiceRegistryClient}
   */
  ServiceRegistryClient,

  /**
   * Constant containing the list of events emitted by ServiceRegistryClient.
   * @type {Object}
   */
  EVENTS
};