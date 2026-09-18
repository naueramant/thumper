# Feature Specification: Queues & Streams

Based on Screenshots `7.png` and `17.png`.

---

## 1. Queues and Streams Listing (`7.png`)

Lists all message queues and append-only streams across the cluster or within the active virtual host scope.

### 1.1 Header & Filter Controls
- **Counter Badge**: e.g., `All queues (86, filtered down to 23)`.
- **Pagination**: `Page [ X ] of Y`, `page size up to: 100`.
- **Active Search Filter**: Text search input with instant filtering (e.g. `fail`).
- **Regex Filter Toggle**: Checkbox `Regex ?` for pattern matching queue names.
- **Column Visibility**: `+/-` column configuration selector.

### 1.2 Table Column Specifications
- **Overview**:
  - `Virtual host`: Parent virtual host.
  - `Name`: Queue name (links to Queue Detail).
  - `Node`: Primary hosting node link, plus cluster replication badge (e.g. `+1` indicating replicated mirror or quorum replica).
  - `Type`: Queue architecture type:
    - `classic`: Standard classic queue (mirrored or non-mirrored).
    - `quorum`: Raft-replicated, high-availability fault-tolerant queue.
    - `stream`: High-throughput, non-destructive append-only log.
  - `Features Badges`:
    - `D`: Durable (persisted queue declaration).
    - `Pri`: Priority queue support enabled.
    - `Policy`: Name of active HA/retention policy (e.g. `replicate-mail`, `replicate-rescorer`).
  - `State`: Operational status badge (`idle`, `running`, `paused`).
- **Messages Counts**:
  - `Ready`: Messages awaiting consumer pickup.
  - `Unacked`: Messages currently checked out to consumers awaiting explicit `basic.ack`.
  - `Total`: Aggregate messages stored in queue (`Ready + Unacked`).
- **Message Rates**:
  - `incoming`: Rate of messages routed into this queue (/s).
  - `deliver / get`: Rate of messages delivered to consumers or polled via basic.get (/s).
  - `ack`: Rate of consumer acks processed (/s).

---

## 2. Add a New Queue Form (`7.png`)

Collapsible drawer/accordion at the bottom of the Queues listing.

### Form Fields
- **Virtual host**: Dropdown selector.
- **Type**: Dropdown:
  - `Default for virtual host`
  - `Classic`
  - `Quorum`
  - `Stream`
- **Name**: Text input (required).
- **Durability**: Dropdown (`Durable` / `Transient`).
- **Node**: Dropdown selecting target cluster node to host the queue leader / primary replica.
- **Arguments**: Key-value table with data type selector (`String`, `Number`, `Boolean`).
  - **Quick Preset Argument Shortcuts** (clickable chips that auto-populate standard AMQP arguments):
    - `Auto expire` (`x-expires`): Queue automatically deleted if unused for $N$ milliseconds.
    - `Message TTL` (`x-message-ttl`): Maximum lifespan of published messages before expiry or dead-lettering.
    - `Overflow behaviour` (`x-overflow`): Drop oldest message, reject publish, or drop head when max length reached.
    - `Single active consumer` (`x-single-active-consumer`): Ensures only one consumer receives messages at a time.
    - `Dead letter exchange` (`x-dead-letter-exchange`): Target exchange for rejected or expired messages.
    - `Dead letter routing key` (`x-dead-letter-routing-key`): Routing key override when dead-lettering.
    - `Max length` (`x-max-length`): Maximum number of messages allowed before applying overflow behavior.
    - `Max length bytes` (`x-max-length-bytes`): Maximum byte size threshold for message backlog.
    - `Leader locator` (`x-queue-leader-locator`): Strategy for choosing queue leader node (e.g., `client-local`, `min-masters`, `balanced`).
- **Action Button**: `Add queue`.

---

## 3. Queue Detail View (`17.png`)

Exhaustive operational metrics, consumer telemetry, payload inspection, and administrative operations:
`Queue <queue_name> in virtual host <vhost>`

### 3.1 Overview & Metrics
- **Queued Messages Chart**:
  - Historical multi-line graph over `last hour`.
  - Series: `Ready` (yellow), `Unacked` (blue), `Total` (red).
- **Message Rates Chart**:
  - Historical incoming vs deliver vs ack rates.
- **Queue Details Grid**:
  - `Features`: Key-values (e.g. `durable: true`).
  - `Policy`: Hyperlink to assigned policy (e.g. `replicate-handin-converter`).
  - `Operator policy`: Active operator policy if assigned.
  - `Effective policy definition`: Policy parameters enforced (e.g. `ha-mode: exactly`, `ha-params: 2`, `ha-sync-mode: automatic`).
  - `Node`: Primary host node link.
  - `Mirrors`: List of nodes hosting mirror or follower replicas.
  - `State`: Operational status badge (`idle`).
  - `Consumers`: Current registered consumer count.
  - `Consumer capacity`: Percentage of time consumers can immediately accept messages (0% = backpressure or no consumers).

### 3.2 Storage & Memory Breakdown Card
Granular accounting of physical and virtual storage utilization:
- `Total`: Aggregate count.
- `Ready`: Ready for delivery.
- `Unacked`: Currently in-flight with consumers.
- `In memory`: Count of messages currently cached in RAM.
- `Persistent`: Count of durable messages written to disk storage.
- `Transient`: Count of in-memory ephemeral messages.
- `Paged Out`: Count of messages swapped to disk to relieve RAM pressure.
- `Message body bytes`: Exact byte footprint of message payloads (e.g. `1.0 KiB`).
- `Process memory`: RAM consumed by the Erlang queue process (e.g. `16 KiB`).

### 3.3 Consumers Table
Detailed roster of active consumer connections attached to this queue:
- Consumer tag (`ctag`).
- Channel link (`<client_ip>:<port> (<ch>)`).
- Consumer prefetch limit.
- Ack required mode (`true` / `false`).
- Exclusive consumer indicator.

### 3.4 Bindings Management
- **Inbound Bindings Table**:
  - `From`: Source exchange name.
  - `Routing key`: Matched routing key pattern.
  - `Arguments`: Key-value header/routing arguments.
  - Action: `Unbind` button to disconnect routing from the exchange.
- **Add Binding to this Queue Form**:
  - `From exchange`: Source exchange text input (required).
  - `Routing key`: Binding key input.
  - `Arguments`: Key-value table.
  - Action: `Bind` button.

### 3.5 Test Message Publisher
Publish directly into this queue via the default exchange:
- `Delivery mode`: Dropdown (`1 - Non-persistent`, `2 - Persistent`).
- `Headers`: Custom header key-values.
- `Properties`: AMQP properties table (correlation ID, expiration, reply-to, message-id, etc.).
- `Payload`: Multi-line textarea for message body.
- `Payload encoding`: Dropdown (`String (default)`, `base64`).
- Action: `Publish message` button.

### 3.6 Message Peek & Consumption ("Get Messages")
Allows administrators and developers to inspect or drain messages from the head of the queue.

> [!WARNING]
> Getting messages with ack enabled permanently dequeues them from the queue!

- **Ack Mode Dropdown**:
  - `Nack message requeue true` (Peek mode: reads message and returns it back to the queue head).
  - `Automatic ack` (Consumes and permanently removes message).
  - `Reject requeue false` (Rejects and drops or dead-letters message).
- **Encoding Dropdown**:
  - `Auto string / base64` (safely decodes JSON/text, falls back to base64 if binary).
- **Messages Count**: Number of messages to retrieve (e.g. `1`, `10`).
- **Action Button**: `Get Message(s)`.
- **Inspection Card (Output)**:
  - Header attributes: Message count remaining in queue, routing key, exchange, redelivered boolean, payload size in bytes.
  - Properties & Headers table.
  - Full Message Payload preview.

### 3.7 Move Messages (Queue Shovel Integration)
Built-in shovel mechanism to migrate messages without manual scripting:
- Explanatory note: "The shovel plugin can be used to move messages from this queue to another one..."
- **Destination queue**: Target queue name input.
- **Action Button**: `Move messages` (provisions a temporary dynamic shovel that transfers ready messages).

### 3.8 Destructive Actions: Purge & Delete
- **Purge Messages**:
  - Button: `Purge Messages`.
  - Removes all messages from the queue while preserving queue declaration and bindings.
- **Delete Queue**:
  - Button: `Delete Queue`.
  - Permanently destroys the queue and tears down all inbound bindings.

### 3.9 Advanced Erlang Runtime Metrics
- **Reductions Chart**: Erlang process CPU work units over time.
- **Garbage Collection Metrics**:
  - `min_bin_vheap_size`
  - `min_heap_size`
  - `fullsweep_after`
  - `minor_gcs`

---

## 4. Modern UI Enhancements for Queues & Streams

1. **Non-Destructive Safe Peeking by Default**:
   - Make `Nack message requeue true` the prominent, safe default with clear visual warnings if destructive dequeue is chosen.
2. **Payload Pretty-Printing & Format Detection**:
   - Automatic detection of JSON, XML, Protobuf, Avro, or plain text with one-click JSON formatting, folding, and copy-to-clipboard.
3. **Queue Health & Lag Alarms**:
   - Visual warnings when consumer capacity drops to 0% or unacknowledged messages spike above threshold.
4. **Dead-Letter Queue Traversal**:
   - If `x-dead-letter-exchange` is configured, provide a direct one-click link to the dead-letter queue and a 1-click "Reprocess Dead Letters" workflow.
5. **Bulk Queue Operations**:
   - Multi-select queues to bulk-purge, bulk-pause, or bulk-delete safely with confirmation modals.
