# API Reference

This document describes the public API of the `@onlineapps/agent-registry-client` module, including classes, methods, constructor options, and event constants.

---

## Module Exports

```js
const { ServiceRegistryClient, EVENTS } = require('agent-registry-client');
```

* **ServiceRegistryClient** – Core class for registering services, sending heartbeats, and exchanging API descriptions.
* **EVENTS** – An object containing event name constants emitted by `ServiceRegistryClient`.

---

## `ServiceRegistryClient` Class

### Constructor

```ts
new ServiceRegistryClient(options: RegistryClientOptions)
```

#### Parameters (`RegistryClientOptions`)

| Name                | Type     | Required | Default                | Description                                                  |
| ------------------- | -------- | -------- | ---------------------- | ------------------------------------------------------------ |
| `amqpUrl`           | `string` | Yes      | —                      | AMQP connection string (e.g., `amqp://user:pass@host:5672`). |
| `serviceName`       | `string` | Yes      | —                      | Logical name of the service (e.g., `invoicing`).             |
| `version`           | `string` | Yes      | —                      | Service version (SemVer format, e.g., `1.0.0`).              |
| `heartbeatInterval` | `number` | No       | `10000`                | Interval in milliseconds between heartbeats.                 |
| `apiQueue`          | `string` | No       | `'api_services_queue'` | Queue name for heartbeat and API requests.                   |
| `registryQueue`     | `string` | No       | `'registry_office'`    | Queue name for registry messages (requests & descriptions).  |

### Instance Methods

All methods return a `Promise` where noted.

#### `init(): Promise<void>`

* **Description**: Connects to RabbitMQ, ensures required queues exist, and starts consuming registry requests.
* **Usage**:

  ```js
  await client.init();
  ```

---

#### `startHeartbeat(): void`

* **Description**: Begins sending heartbeat messages immediately and at configured intervals.
* **Usage**:

  ```js
  client.startHeartbeat();
  ```

---

#### `stopHeartbeat(): void`

* **Description**: Stops the periodic heartbeat loop.
* **Usage**:

  ```js
  client.stopHeartbeat();
  ```

---

#### `sendHeartbeat(): Promise<void>`

* **Description**: Sends a single heartbeat message to the configured `apiQueue`.
* **Payload Structure**:

  ```json
  {
    "id": "<uuid>",
    "type": "heartbeat",
    "serviceName": "<serviceName>",
    "version": "<version>",
    "timestamp": "<ISO8601>"
  }
  ```
* **Usage**:

  ```js
  await client.sendHeartbeat();
  ```

---

#### `sendApiDescription(apiDescription: object): Promise<void>`

* **Description**: Sends a JSON object containing the service's API description to the `registryQueue`.
* **Parameters**:

  * `apiDescription` (`object`): The API spec (e.g., OpenAPI object or custom JSON schema).
* **Payload Structure**:

  ```json
  {
    "id": "<uuid>",
    "type": "apiDescription",
    "serviceName": "<serviceName>",
    "version": "<version>",
    "description": <apiDescription>,
    "timestamp": "<ISO8601>"
  }
  ```
* **Usage**:

  ```js
  await client.sendApiDescription({ endpoints: [...] });
  ```

---

#### `close(): Promise<void>`

* **Description**: Stops the heartbeat (if running) and closes the underlying AMQP connection and channel.
* **Usage**:

  ```js
  await client.close();
  ```

---

## `EVENTS` Constants

The following event names are emitted by `ServiceRegistryClient`. Use them with `client.on(EVENTS.<NAME>, handler)`.

| Constant                  | Event Name                | Payload Description                                          |
| ------------------------- | ------------------------- | ------------------------------------------------------------ |
| `HEARTBEAT_SENT`          | `'heartbeatSent'`         | `{ id, type, serviceName, version, timestamp }`              |
| `API_DESCRIPTION_REQUEST` | `'apiDescriptionRequest'` | `{ id, type, serviceName, version, timestamp }`              |
| `API_DESCRIPTION_SENT`    | `'apiDescriptionSent'`    | `{ id, type, serviceName, version, description, timestamp }` |
| `ERROR`                   | `'error'`                 | `Error` instance or error details                            |

---

## Example Usage

```js
const { ServiceRegistryClient, EVENTS } = require('agent-registry-client');

const client = new ServiceRegistryClient({
  amqpUrl: 'amqp://localhost',
  serviceName: 'invoicing',
  version: '1.0.0'
});

client.on(EVENTS.API_DESCRIPTION_REQUEST, async () => {
  const description = await loadMyOpenApiSpec();
  await client.sendApiDescription(description);
});

await client.init();
client.startHeartbeat();

// Graceful shutdown
process.on('SIGINT', async () => {
  await client.close();
  process.exit(0);
});
```

---

*This is part of the first version of ONLINE APPS API ENVIRONMENT. Hope you find it helpful.*
