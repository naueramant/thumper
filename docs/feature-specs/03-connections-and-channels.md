# Feature Specification: Connections & Channels

Based on Screenshots `2.png`, `3.png`, `4.png`, `16.png`.

---

## 1. Connections Overview Table (`2.png`)

Lists all live TCP/TLS connections from client applications and management tools to the RabbitMQ cluster.

### 1.1 Header & Filter Controls
- **Counter Badge**: e.g., `All connections (69)`.
- **Pagination**: `Page [ X ] of Y`, `page size up to: 100`.
- **Search & Filter**: Text input with `Regex ?` toggle (matches client socket, vhost, or user).
- **Column Visibility**: `+/-` toggle to customize visible table columns.

### 1.2 Table Column Specifications
- **Overview**:
  - `Virtual host`: Virtual host this connection is authenticated into.
  - `Name`: Client socket address `<client_ip>:<client_port>` (links to Connection Detail).
  - `Node`: Cluster node handling this connection socket.
- **Details**:
  - `User name`: Authenticated RabbitMQ user account.
  - `State`: Connection state badge (`running`, `blocked`, `blocking`, `idle`).
  - `SSL / TLS`: Bullet/icon indicator (`o` for plaintext, padlock/badge for TLS).
  - `Protocol`: AMQP protocol version negotiated (`AMQP 0-9-1`, `AMQP 1.0`).
  - `Channels`: Count of multiplexed channels currently open on this connection.
- **Network I/O Rates**:
  - `From client`: Instantaneous network ingress throughput (e.g. `1 B/s`, `1016 B/s`, `2.0 KiB/s`).
  - `To client`: Instantaneous network egress throughput (e.g. `2 B/s`, `1.1 KiB/s`).

---

## 2. Connection Detail View (`16.png`)

Detailed diagnostic inspection and control for an individual client connection:
`Connection <client_ip>:<client_port> -> <server_ip>:<server_port> in virtual host <vhost>`

### 2.1 Throughput & Data Rates
- **Data Rates Chart**:
  - Interactive multi-line graph over selected timeframe (`last hour`).
  - Series: `From client` (ingress throughput in B/s, KiB/s), `To client` (egress throughput).

### 2.2 Connection Details Card
- `Node`: Node running the socket process (with link to node metrics).
- `Username`: Client identity.
- `Protocol`: AMQP version (e.g., `AMQP 0-9-1`).
- `Connected at`: Timestamp when connection was established.
- `SASL auth mechanism`: e.g., `PLAIN`, `EXTERNAL`.
- `State`: Live state badge (`running`).
- `Heartbeat`: Heartbeat interval negotiated (e.g., `10s`).
- `Frame max`: Maximum allowable AMQP frame size in bytes (e.g., `131072 bytes`).
- `Channel limit`: Maximum channels allowed concurrently on this connection (e.g., `2047 channels`).

### 2.3 Associated Channels Table
Embedded sub-table displaying all channels multiplexed across this connection:
- `Channel`: Identifier link.
- `User name`: Associated user.
- `Mode`: Confirm/transaction mode.
- `State`: `idle` or `running`.
- `Unconfirmed`: Count of unconfirmed messages.
- `Prefetch`: Channel prefetch limit.
- `Unacked`: Messages awaiting ack.
- `Message rates`: `publish`, `confirm`, `unroutable (drop)`, `deliver / get`, `ack`.

### 2.4 Client Properties & Capabilities
Hierarchical inspection of metadata sent by the client library during the AMQP connection handshake:
- `capabilities`:
  - `connection.blocked`: boolean
  - `consumer_cancel_notify`: boolean
  - `exchange_exchange_bindings`: boolean
  - `basic.nack`: boolean
  - `publisher_confirms`: boolean
- `product`: Client library identifier / URL (e.g., `https://github.com/streadway/amqp`).
- `version`: Library release (e.g., `beta`, `1.0.0`).
- `platform`: Runtime environment (e.g., Go, Node.js, Python, Java).
- `information`: Optional client metadata.

### 2.5 Advanced Erlang Runtime Metrics
Deep diagnostic metrics on the Erlang actor process powering the connection:
- **Reductions Chart**: Erlang VM reductions (work units) per second over time.
- **Garbage Collection Internals**:
  - `Minimum binary virtual heap size in words (min_bin_vheap_size)`
  - `Minimum heap size in words (min_heap_size)`
  - `Maximum generational collections before fullsweep (fullsweep_after)`
  - `Number of minor GCs (minor_gcs)`

### 2.6 Force Close Action
Allows administrators to terminate problematic client connections:
- **Reason Input Field**: Text input prefilled with default reason (`Closed via management plugin`).
- **Action**: `Force Close` button (sends `connection.close` with given reason to client).

---

## 3. Channels Overview Table (`3.png`)

Lists all multiplexed communication channels across all active connections.

### 3.1 Header & Filter Controls
- **Counter Badge**: e.g., `All channels (152)`.
- **Pagination**: `Page [ X ] of Y`, page size up to 100.
- **Search & Filter**: Text input with `Regex ?` toggle.
- **Column Visibility**: `+/-` toggle.

### 3.2 Channel Table Columns
- **Overview**:
  - `Channel`: Channel identifier format `<client_ip>:<client_port> (<ch_number>)`. Links to Channel Detail.
  - `Node`: Cluster node hosting the channel actor.
  - `Virtual host`: Virtual host.
  - `User name`: User account.
  - `Mode`: Confirmation / transactional mode indicator (e.g., `C` for confirm).
  - `State`: Channel state (`idle`, `running`).
- **Details**:
  - `Unconfirmed`: Count of published messages awaiting publisher confirm.
  - `Prefetch`: Channel-level prefetch count limit.
  - `Unacked`: Count of delivered messages awaiting consumer acknowledgement.
- **Message Rates**:
  - `publish`: Publish rate (/s).
  - `confirm`: Publisher confirmation rate (/s).
  - `unroutable (drop)`: Dropped unroutable rate (/s).
  - `deliver / get`: Combined delivery and get rate (/s).
  - `ack`: Consumer acknowledgment rate (/s).

---

## 4. Channel Detail View (`4.png`)

Detailed diagnostic inspection for an individual channel:
`Channel: <client_ip>:<client_port> -> <server_ip>:<server_port> (<ch_number>) in virtual host <vhost>`

### 4.1 Overview & Message Rates
- **Rate Chart**: Time-series chart of message rates over the last hour.
- **Current Status Indicator**: e.g., `Currently idle`.
- **Channel Attributes**:
  - `Connection`: Link to parent connection detail.
  - `Node`: Hosting cluster node link.
  - `Username`: Channel owner.
  - `Mode`: Channel mode.
  - `State`: Current operational state badge (`idle`).
  - `Prefetch count`: Channel prefetch limit.
  - `Global prefetch count`: Connection-wide prefetch limit across all channels.
  - `Messages unacknowledged`: Active unacked message count.
  - `Messages unconfirmed`: Active unconfirmed message count.
  - `Messages uncommitted`: Uncommitted messages in active transaction.
  - `Acks uncommitted`: Uncommitted acks in active transaction.
  - `Pending Raft commands`: Raft consensus queue backlog for quorum queues/streams accessed by this channel.

### 4.2 Consumers List
Sub-table detailing consumers registered on this channel:
- Consumer tag (`ctag`)
- Target Queue name (with link)
- Exclusive consumer flag
- Acknowledgment required mode (`ack` vs `no_ack`)
- Arguments

### 4.3 Advanced Erlang Runtime Metrics
- **Reductions Chart**: Erlang process reductions per second.
- **Garbage Collection Internals**: `min_bin_vheap_size`, `min_heap_size`, `fullsweep_after`, `minor_gcs`.

---

## 5. Modern UI Enhancements for Connections & Channels

1. **Client Software Grouping / Aggregation**:
   - Ability to aggregate connections by Client Product (e.g., Celery, Spring AMQP, Go streadway, Pika) to quickly detect misbehaving client fleets.
2. **Bulk Force Close**:
   - Checkbox selection on the Connections table to batch-close connections (e.g. all connections from a specific client IP or user).
3. **Connection Throttle & Block Alerting**:
   - Highlight connections in visual `blocking` or `blocked` states prominently with amber/red glow indicators.
4. **Bandwidth Spike Indicators**:
   - Visual sparklines inside table rows showing instantaneous network ingress/egress trajectory.
