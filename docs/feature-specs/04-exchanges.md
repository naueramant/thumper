# Feature Specification: Exchanges

Based on Screenshots `5.png` and `6.png`.

---

## 1. Exchanges Listing & Overview (`5.png`)

Displays all declared exchanges within the active virtual host scope.

### 1.1 Header & Filter Controls
- **Counter Badge**: e.g., `All exchanges (199)`.
- **Pagination**: `Page [ X ] of Y`, `page size up to: 100`.
- **Search & Regex**: Text search input with `Regex ?` checkbox.
- **Column Visibility**: `+/-` column configuration selector.

### 1.2 Table Column Specifications
- **Virtual Host**: Parent virtual host.
- **Name**: Exchange identifier (links to Exchange Detail).
  - Standard system exchanges displayed: `(AMQP default)`, `amq.direct`, `amq.fanout`, `amq.headers`, `amq.match`, `amq.rabbitmq.trace`, `amq.topic`.
  - Application-declared exchanges: e.g., `device-monitor`, `flow-deletion-failed`, etc.
- **Type**: Routing algorithm type:
  - `direct`: Exact match routing key.
  - `fanout`: Broadcasts to all bound queues ignoring routing key.
  - `topic`: Wildcard pattern matching (`*` single word, `#` zero or more words).
  - `headers`: Matches AMQP message header attributes instead of routing key.
  - Custom plugin exchange types (e.g., `x-consistent-hash`, `x-delayed-message`, `x-random`).
- **Features Badges**:
  - `D`: Durable (survives broker restart).
  - `I`: Internal (cannot be published to directly by clients; only receives messages routed from other exchanges via exchange-to-exchange bindings).
  - `Policy`: Name of active HA or routing policy applied to this exchange (e.g. `replicate-device-monitor`).
- **Throughput Rates**:
  - `Message rate in`: Ingress publish rate (/s).
  - `Message rate out`: Outgress routed message rate (/s).

---

## 2. Add a New Exchange Form (`5.png`)

Collapsible drawer/accordion at the bottom of the exchanges listing.

### Form Fields
- **Virtual Host**: Dropdown selector (defaults to current global vhost).
- **Name**: Text input (required).
- **Type**: Dropdown (`direct`, `fanout`, `headers`, `topic`).
- **Durability**: Dropdown:
  - `Durable`: Exchange metadata persists to disk.
  - `Transient`: Deleted upon broker restart.
- **Auto delete**: Dropdown:
  - `No` (default): Exchange remains active indefinitely.
  - `Yes`: Exchange automatically deleted once all bound queues/exchanges unbind.
- **Internal?**: Dropdown:
  - `No` (default): Client publishers can send directly to it.
  - `Yes`: Only internal routing allowed.
- **Arguments**: Key-Value table for AMQP exchange arguments:
  - Key string input.
  - Type dropdown: `String`, `Number`, `Boolean`, `Array`, etc.
  - Value input.
  - **Quick Preset Helpers**:
    - `Alternate exchange`: Button that populates key `alternate-exchange` (specifies fallback exchange for unroutable messages).
- **Action Button**: `Add exchange`.

---

## 3. Exchange Detail View (`6.png`)

Detailed management and operational diagnostics for a specific exchange:
`Exchange: <exchange_name> in virtual host <vhost>`

### 3.1 Overview Card
- **Message Rates Chart**: Time-series chart over `last hour` (rate in, rate out).
- **Status Indicator**: e.g., `Currently idle` or active rate metrics.
- **Details**:
  - `Type`: e.g., `direct`.
  - `Features`: Key-value tags (`durable: true`, `internal: false`).
  - `Policy`: Active policy link (e.g. `replicate-device-monitor`).

---

## 4. Bindings Management (`6.png`)

Manages downstream routing connections originating from this exchange.

### 4.1 Bindings Graph & Table
- **Visual Flow Diagram**: `[This exchange] ⇓ ... downstream ...`
- **Current Bindings Table**:
  - Target: Bound entity name with icon indicating Queue or Exchange.
  - `Routing key`: Bound routing key pattern.
  - `Arguments`: Key-value table of routing arguments (e.g., `x-match: all` for headers exchanges).
  - Action: `Unbind` button to sever the routing link.

### 4.2 Add Binding Form
Allows binding this exchange to another entity:
- **Target Type**: Dropdown (`To queue` / `To exchange`).
- **Target Name**: Text input with autocomplete of existing queues/exchanges (required).
- **Routing key**: Text input for the binding key.
- **Arguments**: Key-value table with data type selector (`String`, `Number`, `Boolean`).
- **Action Button**: `Bind`.

---

## 5. Test Message Publisher (`6.png`)

Enables developers and operators to manually inject test messages directly into the exchange:

### Publisher Form Fields
- **Routing key**: Target routing key string.
- **Headers**: Table of key-value message headers (e.g. `trace-id`, `content-type`, `timestamp`) with type selector (`String`, `Number`, etc.).
- **Properties**: AMQP message properties table:
  - `correlation_id`
  - `reply_to`
  - `message_id`
  - `expiration`
  - `user_id`
  - `app_id`
  - `priority`
- **Payload**: Large text area for message content.
- **Payload encoding**:
  - `String (default)`: Raw UTF-8 string text.
  - `base64`: Base64-encoded binary payload.
- **Action Button**: `Publish message`.
- **Response Notification**: Feedback alert confirming message was routed to $N$ queues or warning that message was dropped/unroutable.

---

## 6. Delete Exchange (`6.png`)

Collapsible section at the bottom of the detail view:
- **Warning**: Deleting an exchange severs all incoming bindings.
- **Action Button**: `Delete` button.

---

## 7. Modern UI Enhancements for Exchanges

1. **Interactive Routing Topology Visualizer**:
   - Render an interactive node graph (using React Flow or D3 DAG) showing:
     `Publishers -> [ Exchange ] --(Routing Keys)--> [ Queues / Sub-Exchanges ]`
   - Visually simulate routing matches: typing a routing key highlights which queues would receive the message!
2. **Rich Payload Editor (Monaco / CodeMirror)**:
   - Full JSON, XML, Protobuf, and plain-text editor with syntax highlighting, auto-formatting, and linting.
3. **Payload Templates & Presets**:
   - Save frequently used test payloads for quick replay during debugging.
4. **Dead-Letter / Alternate Exchange Quick Navigation**:
   - Direct hyperlinking between alternate exchanges and dead-letter queues.
