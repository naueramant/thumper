# Feature Specification: Overview Dashboard

Based on Screenshot `1.png`.

---

## 1. Totals Section

Provides high-level system-wide message accumulation and operational rates.

### 1.1 Queued Messages Chart
- **Time Range Selector**: Dropdown (e.g. `last hour`, `last day`).
- **Metrics Tracked**:
  - `Ready`: Messages waiting in queues available for immediate consumption by consumers.
  - `Unacked`: Messages delivered to consumers but awaiting acknowledgment (`ack`).
  - `Total`: Aggregate messages in queues (`Ready + Unacked`).
- **Visuals**: Multi-line time-series graph with colored legend points (e.g. Yellow for Ready, Blue for Unacked, Red for Total).

### 1.2 Message Rates Chart & Legend
- **Time Range Selector**: Dropdown (e.g. `last hour`).
- **Metrics Tracked** (per second throughput):
  - **Publishing**:
    - `Publish`: Rate of messages published to exchanges (`/s`).
    - `Publisher confirm`: Rate of basic.ack / basic.nack confirmed back to publishers.
  - **Delivery & Consumer Acks**:
    - `Deliver (manual ack)`: Messages pushed to consumers with explicit acknowledgement required.
    - `Deliver (auto ack)`: Messages pushed with `no_ack=true`.
    - `Consumer ack`: Rate at which consumers acknowledge processed messages.
    - `Redelivered`: Rate of previously unacknowledged messages redelivered to consumers.
  - **Direct Get Operations**:
    - `Get (manual ack)`: Direct polling via `basic.get` with manual ack.
    - `Get (auto ack)`: Polling via `basic.get` with auto ack.
    - `Get (empty)`: Rate of `basic.get-empty` responses when polling empty queues.
  - **Routing & Storage**:
    - `Unroutable (return)`: Messages published with `mandatory=true` that could not be routed and were returned to publisher.
    - `Unroutable (drop)`: Messages dropped because no binding existed.
    - `Disk read`: Rate of message reads from disk persistence storage.
    - `Disk write`: Rate of message writes to disk persistence storage.

---

## 2. Global Entity Counts

Summary pill badges at the top of the dashboard providing quick cluster-wide inventory:
- `Connections`: Total client TCP/TLS connections active (e.g., `70`).
- `Channels`: Total AMQP channels active across all connections (e.g., `151`).
- `Exchanges`: Total declared exchanges (e.g., `199`).
- `Queues`: Total declared queues and streams (e.g., `86`).
- `Consumers`: Total registered consumer subscriptions (e.g., `44`).

---

## 3. Cluster Nodes Health & Resource Monitoring

Detailed breakdown of all nodes in the cluster (e.g. `rabbit@rabbitmq-0`, `rabbit@rabbitmq-1`, `rabbit@rabbitmq-2`).

### 3.1 Node Resource Columns
- **Name**: Node identifier string (links to Node detail view).
- **File Descriptors**:
  - Used count vs total available (e.g. `190 / 65536 available`).
  - Visual status bar showing capacity utilization; turns warning/red when approaching limit.
- **Socket Descriptors**:
  - Used sockets vs available (e.g. `34 / 58893 available`).
- **Erlang Processes**:
  - Used Erlang lightweight processes vs total process limit (e.g. `1549 / 1048576 available`).
- **Memory**:
  - Memory currently consumed (e.g. `233 MiB`).
  - High watermark threshold (e.g. `12 GiB high watermark`).
  - Colored progress bar indicating threshold proximity (triggers publisher alarms when breached).
- **Disk Space**:
  - Free disk space on partition (e.g. `7.7 GiB`).
  - Low watermark threshold (e.g. `48 MiB low watermark`).
  - Colored status bar warning when disk free space drops near watermark.
- **Uptime**: Human-readable elapsed time since node boot (e.g. `3d 21h`, `1d 19h`).
- **Info Badges**:
  - Storage node type: `disc` vs `ram`.
  - Type flags: `basic`, Erlang release indicator (`rss`, `6`).
- **Reset Stats Actions**:
  - `This node`: Button to reset churn and rate counters for the specific node.
  - `All nodes`: Button to reset counters cluster-wide.

---

## 4. Churn Statistics

Tracks the velocity of ephemeral resource creation and destruction over the last hour:
1. **Connection Operations**:
   - Time-series graph.
   - `Created / s`
   - `Closed / s`
2. **Channel Operations**:
   - Time-series graph.
   - `Created / s`
   - `Closed / s`
3. **Queue Operations**:
   - Time-series graph.
   - `Declared / s`
   - `Created / s`
   - `Deleted / s`

*Diagnostic Purpose*: Identifies connection leaks, short-lived connection anti-patterns, or rapid queue thrashing in microservices.

---

## 5. Ports and Web Contexts

### 5.1 Listening Ports Table
Lists all active network listening sockets across all nodes:
- `Protocol`: e.g. `amqp` (5672), `clustering` (25672), `http` (15672), `http/prometheus` (9419).
- `Node`: Node hosting the listener.
- `Bound to`: Interface IP (e.g. `::`, `0.0.0.0`).
- `Port`: Port number.

### 5.2 Web Contexts Table
Lists registered HTTP handlers:
- `Context`: e.g. `RabbitMQ Management`, `RabbitMQ Prometheus`.
- `Node`: Hosting node.
- `Bound to`: Bind address.
- `Port`: HTTP port.
- `SSL`: Boolean SSL indicator.
- `Path`: Mount path (e.g. `/`).

---

## 6. Definitions Backup & Restore (Export / Import)

Allows schema migration, backup, and environment replication without message data.

### 6.1 Export Definitions
- **Filename Input**: Text input (defaults to `rabbit_<cluster-node>.json` or `.rab`).
- **Virtual Host Scope**: Dropdown with `All` or specific virtual host.
- **Action**: `Download broker definitions` button.
- **Payload**: JSON schema containing users, vhosts, permissions, parameters, policies, queues, exchanges, and bindings.

### 6.2 Import Definitions
- **File Input**: Native file picker button (`Choose file`).
- **Virtual Host Scope**: Dropdown with `All` or target vhost.
- **Action**: `Upload broker definitions` button.
- **Behavior**: Merges uploaded schema definitions into the broker; provides feedback on success or syntax conflicts.

---

## 7. Modern UI Opportunities for the Overview Dashboard

1. **At-a-Glance Cluster Status Cards**:
   - High-contrast health cards for Cluster Status (Healthy / Degraded / Warning), Memory Pressure, and Disk Space.
2. **Interactive Rate Graphs with Scrubbing**:
   - Replace static canvas graphs with interactive charting (e.g. Apache ECharts, Recharts, or Chart.js) with hover tooltips, range zooming, and togglable series.
3. **Node Topology View**:
   - Visual cluster topology showing leader/follower nodes and distribution of quorum queues across the cluster.
4. **Export / Import Drag-and-Drop Modal**:
   - Visual JSON syntax validator before uploading broker definitions, with diff preview of changes to be applied.
