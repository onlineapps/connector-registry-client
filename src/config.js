/**
 * config.js
 *
 * Loads and validates configuration variables via environment variables.
 * Uses dotenv to load the .env file and Joi for validation.
 *
 * @module @onlineapps/connector-registry-client/src/config
 */

// Load .env (if it exists)
require('dotenv').config();

const Joi = require('joi');

// Define schema for environment variables
const envSchema = Joi.object({
  AMQP_URL: Joi.string().uri().required()
    .description('AMQP URI for connecting to RabbitMQ'),

  SERVICE_NAME: Joi.string().required()
    .description('Name of the service to register'),

  SERVICE_VERSION: Joi.string().required()
    .description('Service version in SemVer format'),

  HEARTBEAT_INTERVAL: Joi.number().integer().min(1000).default(10000)
    .description('Interval for sending heartbeat messages in ms'),

  API_QUEUE: Joi.string().default('api_services_queue')
    .description('Name of the queue for heartbeat and API requests'),

  REGISTRY_QUEUE: Joi.string().default('registry_office')
    .description('Name of the queue for registry messages')
})
  .unknown() // allow additional variables
  .required();

// Validate variables
const { error, value: envVars } = envSchema.validate(process.env);
if (error) {
  throw new Error(`Config validation error: ${error.message}`);
}

// Export configuration
module.exports = {
  amqpUrl: envVars.AMQP_URL,
  serviceName: envVars.SERVICE_NAME,
  version: envVars.SERVICE_VERSION,
  heartbeatInterval: envVars.HEARTBEAT_INTERVAL,
  apiQueue: envVars.API_QUEUE,
  registryQueue: envVars.REGISTRY_QUEUE
};
