# Reference Screenshot Audit

This document inventories each screenshot in [`reference/screenshots/`](file:///home/nauer/Area51/rabbitdash/reference/screenshots) to ensure zero feature loss when transitioning from the classic UI to RabbitDash.

---

## Screenshot Inventory

| Screenshot | Primary View | URL / Route Equivalent | Key Functional Blocks Observed |
| :--- | :--- | :--- | :--- |
| **`login.png`** | Login / Authentication | `/#/login` | Centered RabbitMQ logo, Username input (required `*`), Password input (required `*`), Login button. Backend auth validation against `/api/whoami` via Basic Auth. |
| **`1.png`** | Overview | `/#/` | Top navigation header, global vhost picker, auto-refresh interval, cluster banner, user logout; Totals charts (queued messages, message rates breakdown); Global entity counts; Cluster nodes resource usage table (FD, Sockets, Erlang procs, Memory vs High Watermark, Disk vs Low Watermark, Uptime, Node tags/RSS, Reset stats); Churn statistics charts (connections, channels, queues); Listening ports and web contexts; Export definitions; Import definitions. |
| **`2.png`** | Connections | `/#/connections` | Connection count badge (`69`); Table pagination & page size up to 100; Filter box with Regex toggle; Connection table: VHost, Client socket Name, Node, User name, State (`running`), SSL/TLS flag, AMQP Protocol version, Channels count, Network rate (From client / To client); Column visibility selector `+/-`. |
| **`3.png`** | Channels | `/#/channels` | Channel count badge (`152`); Pagination & Regex filter; Channel table: Channel identifier (`<client_ip>:<port> (<ch_num>)`), Hosting node, VHost, Username, Mode, State (`idle`/`running`), Unconfirmed messages count, Prefetch limit, Unacked messages count, Message rates (publish, confirm, unroutable drop, deliver/get, ack). |
| **`4.png`** | Channel Detail | `/#/channels/<vhost>/<channel_id>` | Title showing full route `<client_ip>:<port> -> <server_ip>:<port> (<num>)` and vhost; Overview: Message rates graph, State indicator, details grid (Connection, Node, Username, Mode, State, Prefetch count, Global prefetch, Unacked, Unconfirmed, Uncommitted messages/acks, Raft commands); Consumers table; Advanced Runtime Metrics (Reductions/sec graph, Erlang GC metrics: `min_bin_vheap_size`, `min_heap_size`, `fullsweep_after`, `minor_gcs`). |
| **`5.png`** | Exchanges | `/#/exchanges` | Exchange count badge (`199`); Table pagination & Regex filter; Exchanges table: VHost, Name (with links), Type (`direct`, `fanout`, `headers`, `topic`), Features (`D` Durable, `I` Internal, Policy tag), Message rate in/out; "Add a new exchange" form (VHost, Name, Type, Durability, Auto delete, Internal, Arguments table with quick presets like "Alternate exchange"). |
| **`6.png`** | Exchange Detail | `/#/exchanges/<vhost>/<name>` | Header showing exchange name and vhost; Overview: Message rates chart, Type, Durability feature, Policy; Bindings section: visual source diagram (`[This exchange] ->`), table of current bindings (To queue/exchange, routing key, arguments, Unbind action); "Add binding from this exchange" form (Target type, Target name, Routing key, Arguments key-value); "Publish message" form (Routing key, Headers, Properties, Payload textarea, Payload encoding dropdown); "Delete this exchange" button. |
| **`7.png`** | Queues and Streams | `/#/queues` | Queues count badge (`86, filtered down to 23`); Filter input with active query (`fail`) and Regex checkbox; Queues table: VHost, Name, Node (with node link and cluster replica indicator `+1`), Type (`classic`, `quorum`, `stream`), Features (`D` Durable, `Pri` Priority, Policy badge), State (`idle`), Message count breakdown (Ready, Unacked, Total), Rates (incoming, deliver/get, ack); "Add a new queue" form (VHost, Type, Name, Durability, Node, Arguments table with quick preset buttons: Auto expire, Message TTL, Overflow behaviour, Single active consumer, Dead letter exchange, Dead letter routing key, Max length, Max length bytes, Leader locator). |
| **`8.png`** | Admin: Users | `/#/users` | Admin sidebar navigation; Users count badge (`26`); Pagination & Filter; Users table: Username, Tags (`administrator`, `robot`, `management`, `policymaker`, `monitoring`, `impersonator`), Accessible vhosts list, Password indicator; "Add a user" form (Username, Password, Confirm password, Tags input with quick preset buttons: `Admin`, `Monitoring`, `Policymaker`, `Management`, `Impersonator`, `None`). |
| **`9.png`** | Admin: User Detail | `/#/users/<username>` | User header (`User: admin`); Overview: Tags, login status; Current Permissions table (VHost, Configure regexp, Write regexp, Read regexp, "Clear" action button); "Set permission" form (VHost selector, Configure regex, Write regex, Read regex); Topic permissions table and "Set topic permission" form (VHost, Exchange, Write regex, Read regex); "Update this user" form (Password, Tags with quick preset buttons); "Delete this user" button. |
| **`10.png`** | Admin: Virtual Hosts | `/#/vhosts` | Virtual hosts table (22 items): Name, Authorized users, State (`running`), Message counts (Ready, Unacked, Total), Network throughput (From client, To client), Message rates (publish, deliver/get); "Add a new virtual host" form (Name, Description, Tags, Default Queue Type dropdown: `Classic`, `Quorum`, `Stream`). |
| **`11.png`** | Admin: Feature Flags | `/#/feature-flags` | Feature flags table (17 items): Flag Name (e.g. `quorum_queue`, `stream_queue`, `direct_exchange_routing_v2`, `user_limits`, `virtual_host_metadata`, etc.), State badge (`Enabled` or enable button), Description with `[Learn more]` documentation link. |
| **`12.png`** | Admin: Policies | `/#/policies` | Collapsible "User policies" table (23 items): VHost, Name, Pattern regex, Apply to (`all`, `queues`, `exchanges`, etc.), Definition key-values (`ha-mode: exactly`, `ha-params: 2`, `ha-sync-mode: automatic`, `consumer-timeout: 3600000`), Priority; "Add / update a policy" form; Collapsible "Operator policies" table; "Add / update an operator policy" form. |
| **`13.png`** | Admin: Limits | `/#/limits` | Collapsible "Virtual host Limits" table; "Set / update a virtual host limit" form (Virtual host dropdown, Limit type dropdown e.g. `max-connections`, `max-queues`, Value numeric); Collapsible "User Limits" table; "Set / update a user limit" form (User dropdown, Limit dropdown e.g. `max-connections`, `max-channels`, Value numeric). |
| **`14.png`** | Admin: Cluster | `/#/cluster` | Cluster details page showing active cluster name (`wiseflowmq`), descriptive documentation on client identification and AMQP connection handshake; "Change name" form with Name input and submit button. |
| **`15.png`** | Admin: Shovel Management | `/#/shovels` | Dynamic Shovels table; "Add a new shovel" form: VHost, Name, Source config (Protocol AMQP 0.9.1 / AMQP 1.0, URI, Queue/Exchange target, Prefetch count, Auto-delete), Destination config (Protocol, URI, Queue/Exchange target, Add forwarding headers), Reconnect delay, Acknowledgement mode (`On confirm`, `On publish`, `No ack`); "URI examples" helper section with protocol reference (`amqp://`, `amqps://`, cert and auth parameters). |
| **`16.png`** | Connection Detail | `/#/connections/<name>` | Header showing client socket to server socket and vhost; Overview: Data rates chart (From client, To client over last hour), Details attributes (Node, Username, Protocol `AMQP 0-9-1`, Connected at timestamp, SASL auth mechanism, State, Heartbeat, Frame max, Channel limit); Channels table on this connection; Client properties (tree showing client capabilities, library URL, client version); Advanced Runtime Metrics (Reductions/sec chart, Erlang GC metrics); "Close this connection" form (Custom Reason input, "Force Close" button). |
| **`17.png`** | Queue Detail | `/#/queues/<vhost>/<name>` | Header showing queue name and vhost; Overview: Queued messages chart (Ready, Unacked, Total), Message rates chart; Details grid: Features (`durable: true`), Policy link, Operator policy, Effective policy definition (`ha-mode: exactly`, `ha-params: 2`, `ha-sync-mode: automatic`), Node link, Mirrors nodes, State (`idle`), Consumers count, Consumer capacity (%), Storage breakdown table (Total, Ready, Unacked, In memory, Persistent, Transient, Paged Out), Message body bytes, Process memory; Consumers table; Bindings table (From exchange, routing key, args, Unbind) + "Add binding to this queue" form; "Publish message" form (Delivery mode, Headers, Properties, Payload textarea, Encoding); "Get messages" form (Destructive peek/consume, Ack Mode, Encoding, Messages count, message inspection); "Move messages" form (Shovel to target destination queue); "Purge Messages" button; "Delete Queue" button; Advanced Runtime Metrics (Reductions chart, GC metrics). |

---

## Detailed Navigation Structure of Classic RabbitMQ

```
[ RabbitMQ Management ]
│
├── Header Controls
│   ├── Auto-refresh Interval [Off, 5s, 10s, 30s, 60s]
│   ├── Global Virtual Host Selector [All, /vhost1, /vhost2, ...]
│   ├── Cluster Identifier
│   └── User Badge & Logout
│
├── 1. Overview (Screenshot 1)
│   ├── Totals (Queued messages chart, Message rates chart)
│   ├── Global Counts (Connections, Channels, Exchanges, Queues, Consumers)
│   ├── Nodes Table (Resources, High/Low Watermarks, RSS, Reset Stats)
│   ├── Churn Statistics (Connection, Channel, Queue churn rates)
│   ├── Ports and Contexts (Listening ports, Web contexts)
│   ├── Export Definitions (Download JSON/rab)
│   └── Import Definitions (Upload JSON/rab)
│
├── 2. Connections (Screenshots 2, 16)
│   ├── Connection List (Screenshot 2)
│   └── Connection Detail (Screenshot 16)
│       ├── Throughput Rates Chart
│       ├── Socket & Auth Details
│       ├── Associated Channels Table
│       ├── Client Properties & Capabilities
│       ├── Erlang VM Reductions & GC Metrics
│       └── Force Close Action
│
├── 3. Channels (Screenshots 3, 4)
│   ├── Channel List (Screenshot 3)
│   └── Channel Detail (Screenshot 4)
│       ├── Message Rates Chart
│       ├── Mode, Prefetch, Uncommitted Stats
│       ├── Consumers Table
│       └── Erlang VM Reductions & GC Metrics
│
├── 4. Exchanges (Screenshots 5, 6)
│   ├── Exchange List & Creation Form (Screenshot 5)
│   └── Exchange Detail (Screenshot 6)
│       ├── Rates & Details
│       ├── Bindings Diagram, Table & Add Binding Form
│       ├── Test Message Publisher
│       └── Delete Exchange Action
│
├── 5. Queues and Streams (Screenshots 7, 17)
│   ├── Queue/Stream List & Creation Wizard (Screenshot 7)
│   └── Queue Detail (Screenshot 17)
│       ├── Queue Message & Rate Charts
│       ├── Memory, Disk & Paging Storage Breakdown
│       ├── Consumers Table
│       ├── Bindings (Inbound) & Add Binding Form
│       ├── Test Message Publisher
│       ├── Get / Peek Messages (with Requeue options)
│       ├── Move Messages (Queue Shovel)
│       ├── Purge Messages Action
│       ├── Delete Queue Action
│       └── Erlang VM Reductions & GC Metrics
│
└── 6. Admin (Screenshots 8, 9, 10, 11, 12, 13, 14, 15)
    ├── Users (Screenshot 8: List & Add; Screenshot 9: Permissions & Detail)
    ├── Virtual Hosts (Screenshot 10: List, Throughput & Add VHost)
    ├── Feature Flags (Screenshot 11: Flag state & Enable)
    ├── Policies (Screenshot 12: User & Operator Policies, Add/Edit)
    ├── Limits (Screenshot 13: VHost & User Limits, Add/Edit)
    ├── Cluster (Screenshot 14: Cluster Rename)
    └── Shovel Status & Shovel Management (Screenshot 15: List & Add Shovel)
```
