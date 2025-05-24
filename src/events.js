/**
 * events.js
 *
 * List of events used in the agent-registry-client module.
 * Acts as a central place for constants to avoid typos
 * when emitting and listening for events.
 *
 * @module @onlineapps/agent-registry-client/src/events
 */

/**
 * Named EventEmitter events for ServiceRegistryClient.
 */
const EVENTS = {
    /** Emitted after a successful heartbeat is sent. Payload: { id, type, serviceName, version, timestamp } */
    HEARTBEAT_SENT: 'heartbeatSent',
  
    /** Emitted when the registryOffice requests the API description. Payload: { id, type, serviceName, version, timestamp } */
    API_DESCRIPTION_REQUEST: 'apiDescriptionRequest',
  
    /** Emitted after sending the API description. Payload: { id, type, serviceName, version, description, timestamp } */
    API_DESCRIPTION_SENT: 'apiDescriptionSent',
  
    /** Emitted on internal errors. Payload: Error instance or error description. */
    ERROR: 'error'
};
  
module.exports = EVENTS;
