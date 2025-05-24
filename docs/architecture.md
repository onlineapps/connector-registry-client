# Architecture Overview

This document provides a high-level architectural overview of the `@onlineapps/agent-registry-client` module, its responsibilities, and how it integrates with RabbitMQ and a central service registry.

---

## 1. Purpose and Scope

The `agent-registry-client` module encapsulates the logic required for a microservice to register itself, send periodic heartbeats, and exchange API descriptions with a central registry. It relies on a generic AMQP client for communication and emits events for application-level handling.

### Key Responsibilities

* **Queue Management**: Ensure required queues exist (`workflow`, `${serviceName}.registry`, `api_services_queue`, `registry_office`).
* **Heartbeat**: Send periodic `heartbeat` messages to `api_services_queue`.
* **API Description Exchange**:

  * Listen on `registry_office` for `apiDescriptionRequest` messages.
  * Send back API description messages with service metadata.
* **Event Emission**: Produce semantic events (`heartbeatSent`, `apiDescriptionRequest`, `apiDescriptionSent`, `error`) via `EventEmitter`.

---

## 2. Core Components

```plaintext
+----------------------+      +-------------------------+
| Microservice + Agent |      | Central Service Registry|
|  ServiceRegistryClient|<----|   api_services_queue    |
|                      |  └-->└ registry_office queue ──┐
+----------------------+                               |
       │    │                                          |
       │    └─── heartbeat messages (AMQP)            |
       │                                               │
       └─── API description responses (AMQP)           │
                                                       │
+------------------------------------------------------+   
|       ServiceRegistryStorage & Orchestration         |
+------------------------------------------------------+    
```

1. **Microservice + Agent**: Runs `ServiceRegistryClient` to manage self-registration, heartbeats, and API description.
2. **AMQP Broker**: Provides messaging infrastructure (e.g., RabbitMQ).
3. **Central Service Registry**:

   * Consumes heartbeats from `api_services_queue`.
   * Issues `apiDescriptionRequest` on `registry_office` when a new or updated service appears.
   * Stores API descriptions and updates state.

---

## 3. Startup Sequence

1. **Instantiate** `ServiceRegistryClient` with configuration (`amqpUrl`, `serviceName`, `version`, etc.).
2. **init()**:

   * Connect to AMQP broker via generic `agent-mq-client`.
   * Call `QueueManager.ensureQueues()` to assert existence of:

     * `workflow`
     * `<serviceName>.registry`
     * `api_services_queue`
     * `registry_office`
   * Begin consuming `registry_office` queue to handle incoming requests.
3. **startHeartbeat()**:

   * Immediately send a `heartbeat` message.
   * Schedule periodic heartbeats at configured intervals.

---

## 4. Message Flows

### 4.1 Heartbeat Flow

* Agent sends:

  ```json
  {
    "id": "<uuid>",
    "type": "heartbeat",
    "serviceName": "invoicing",
    "version": "1.2.0",
    "timestamp": "2025-05-24T12:00:00Z"
  }
  ```
* Destination queue: `api_services_queue`
* Central registry updates or creates service entry, logs timestamp.

### 4.2 API Description Request & Response

1. **Registry** detects new service or missing entry → publishes:

   ```json
   {
     "id": "<uuid>",
     "type": "apiDescriptionRequest",
     "serviceName": "invoicing",
     "version": "1.2.0",
     "timestamp": "2025-05-24T12:01:00Z"
   }
   ```

   on queue `registry_office`.

2. **Agent** (ServiceRegistryClient) consumes request, emits `apiDescriptionRequest` event.

3. **Application** listens for this event, generates or loads an OpenAPI/JSON description, and calls `sendApiDescription(desc)`.

4. **Agent** sends:

   ```json
   {
     "id": "<uuid>",
     "type": "apiDescription",
     "serviceName": "invoicing",
     "version": "1.2.0",
     "description": { /* API spec object */ },
     "timestamp": "2025-05-24T12:02:00Z"
   }
   ```

   on `registry_office` queue.

5. **Registry** consumes, stores API spec, marks service as fully active.

---

## 5. Event Model

The module emits the following events to decouple application logic:

| Event                   | Payload Description                                          |
| ----------------------- | ------------------------------------------------------------ |
| `heartbeatSent`         | `{ id, type, serviceName, version, timestamp }`              |
| `apiDescriptionRequest` | `{ id, type, serviceName, version, timestamp }`              |
| `apiDescriptionSent`    | `{ id, type, serviceName, version, description, timestamp }` |
| `error`                 | `Error` instance or error details                            |

Applications can subscribe to these events to log metrics, trigger retries, or update UI/operational dashboards.

---

## 6. Extensibility

* **Adding new queues**: Pass extra queue names into `QueueManager.ensureQueues()`.
* **Custom retry or circuit-breaker**: Wrap `channel.sendToQueue` calls or extend `ServiceRegistryClient`.
* **TLS/Authentication**: Configure `amqpUrl` with credentials or use environment-driven TLS parameters.

---

**Next Steps**: Review the API reference in `docs/api.md`, run the example in `examples/basicUsage.js`, and integrate into your microservice startup flow.
