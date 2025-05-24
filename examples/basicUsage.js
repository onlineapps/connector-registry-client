/**
 * basicUsage.js
 *
 * Example demonstrating full lifecycle of ServiceRegistryClient:
 * 1. Load environment variables
 * 2. Instantiate client
 * 3. Initialize (setup queues and start listening for requests)
 * 4. Register event listeners (apiDescriptionRequest, heartbeatSent, apiDescriptionSent, error)
 * 5. Start heartbeat loop
 * 6. Graceful shutdown on process signals
 */

// Load environment variables from .env file
require('dotenv').config();

const { ServiceRegistryClient, EVENTS } = require('agent-registry-client');

// Step 1: Create a new ServiceRegistryClient instance
const registryClient = new ServiceRegistryClient({
  amqpUrl: process.env.AMQP_URL,
  serviceName: process.env.SERVICE_NAME || 'invoicing',
  version: process.env.SERVICE_VERSION || '1.0.0',
  heartbeatInterval: parseInt(process.env.HEARTBEAT_INTERVAL, 10) || 10000,
  apiQueue: process.env.API_QUEUE,
  registryQueue: process.env.REGISTRY_QUEUE
});

// Step 2: Register event listeners
registryClient.on(EVENTS.HEARTBEAT_SENT, (msg) => {
  console.log(`[Heartbeat] Sent at ${msg.timestamp} for ${msg.serviceName}@${msg.version}`);
});

registryClient.on(EVENTS.API_DESCRIPTION_REQUEST, async (payload) => {
  console.log(`[API Description Request] for ${payload.serviceName}@${payload.version}`);
  // Load local API description (from file or in-memory)
  const apiDesc = await loadLocalApiDescription();
  await registryClient.sendApiDescription(apiDesc);
});

registryClient.on(EVENTS.API_DESCRIPTION_SENT, (msg) => {
  console.log(`[API Description Sent] at ${msg.timestamp} for ${msg.serviceName}@${msg.version}`);
});

registryClient.on(EVENTS.ERROR, (err) => {
  console.error('[RegistryClient Error]', err);
});

(async () => {
  try {
    // Step 3: Initialize client (setup queues and listeners)
    await registryClient.init();
    console.log('RegistryClient initialized: queues are ready.');

    // Step 4: Start heartbeat loop
    registryClient.startHeartbeat();
    console.log('Heartbeat loop started.');

    // Step 5: Graceful shutdown on SIGINT/SIGTERM
    const shutdown = async () => {
      console.log('Shutting down RegistryClient...');
      await registryClient.close();
      process.exit(0);
    };
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('Failed to initialize RegistryClient', err);
    process.exit(1);
  }
})();

/**
 * Helper: Load local API description
 * In a real application, this could read from a JSON file,
 * introspect OpenAPI spec, or build dynamically.
 */
async function loadLocalApiDescription() {
  return {
    endpoints: [
      { path: '/invoices', method: 'POST', description: 'Create a new invoice' },
      { path: '/invoices/:id', method: 'GET', description: 'Retrieve invoice by ID' }
    ]
  };
}
