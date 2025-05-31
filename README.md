# @onlineapps/agent-registry-client

[![Build Status](https://img.shields.io/github/actions/workflow/status/onlineapps/agent-registry-client/nodejs.yml?branch=main)](https://github.com/onlineapps/agent-registry-client/actions)
[![Coverage Status](https://codecov.io/gh/onlineapps/agent-registry-client/branch/main/graph/badge.svg)](https://codecov.io/gh/onlineapps/agent-registry-client)
[![npm version](https://img.shields.io/npm/v/@onlineapps/agent-registry-client)](https://www.npmjs.com/package/@onlineapps/agent-registry-client)

> A lightweight client for microservice registration, heartbeat, and API description exchange via RabbitMQ.

## 🚀 Features

* Automatic queue management (`workflow`, `<serviceName>.registry`, `api_services_queue`, `registry_office`)
* Periodic heartbeat messages with metadata
* API description request/response flow
* Event-driven API using `EventEmitter`
* Fully configurable via environment variables or constructor options

## 📦 Installation

```bash
npm install @onlineapps/agent-registry-client
# or
yarn add @onlineapps/agent-registry-client
```

## 🔧 Quick Start

```js
// Load environment, if using .env
require('dotenv').config();

const { ServiceRegistryClient, EVENTS } = require('@onlineapps/agent-registry-client');

const client = new ServiceRegistryClient({
  amqpUrl: process.env.AMQP_URL,
  serviceName: 'invoicing',
  version: '1.0.0'
});

// Listen for API description requests
client.on(EVENTS.API_DESCRIPTION_REQUEST, async () => {
  const apiSpec = await loadOpenApiSpec();
  await client.sendApiDescription(apiSpec);
});

// Initialize and start heartbeats
await client.init();
client.startHeartbeat();

// Graceful shutdown
process.on('SIGINT', async () => {
  await client.close();
  process.exit(0);
});
```

## 📄 Configuration

Configuration can be provided via environment variables or constructor options:

| Variable             | Description                                   | Default              |
| -------------------- | --------------------------------------------- | -------------------- |
| `AMQP_URL`           | RabbitMQ connection string (required)         | —                    |
| `SERVICE_NAME`       | Logical name of your service (required)       | —                    |
| `SERVICE_VERSION`    | Service version in SemVer format (required)   | —                    |
| `HEARTBEAT_INTERVAL` | Interval in ms between heartbeats             | `10000`              |
| `API_QUEUE`          | Queue name for heartbeat/API messages         | `api_services_queue` |
| `REGISTRY_QUEUE`     | Queue name for registry requests/descriptions | `registry_office`    |

## 🛠️ API Reference

See [docs/api.md](https://github.com/onlineapps/agent-registry-client/blob/main/docs/api.md) for full details on classes, methods, and events.

## 📖 Documentation

* Architecture overview: [docs/architecture.md](https://github.com/onlineapps/agent-registry-client/blob/main/docs/architecture.md)
* API reference: [docs/api.md](https://github.com/onlineapps/agent-registry-client/blob/main/docs/api.md)
* Examples: [examples/basicUsage.js](https://github.com/onlineapps/agent-registry-client/blob/main/examples/basicUsage.js)

## ✅ Testing

```bash
# Run unit and integration tests
yarn test
# or
npm test
```

## 🎨 Coding Standards

* **Linting**: ESLint (Airbnb style)
* **Formatting**: Prettier
* **Testing**: Jest

## 🤝 Contributing

Please read [CONTRIBUTING.md](https://github.com/onlineapps/agent-registry-client/blob/main/CONTRIBUTING.md) for details on submitting issues and pull requests.

## 📜 License

This project is licensed under the MIT License. See [LICENSE](https://github.com/onlineapps/agent-registry-client/blob/main/LICENSE) for details.


xxxx