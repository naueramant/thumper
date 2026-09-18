# Feature Specification: Admin & Cluster Management

Based on Screenshots `8.png`, `9.png`, `10.png`, `11.png`, `12.png`, `13.png`, `14.png`, `15.png`.

---

## 1. User Management (`8.png`, `9.png`)

### 1.1 Users List (`8.png`)
- **Counter Badge**: `All users (26)`.
- **Search & Filter**: Text search with `Regex ?` checkbox.
- **Users Table Columns**:
  - `Name`: Username string (links to User Detail).
  - `Tags`: Role authorization tags:
    - `administrator`: Full cluster configuration and user management permissions.
    - `monitoring`: Can view all connections/channels/queues and metrics.
    - `policymaker`: Can create and modify HA/retention policies and limits.
    - `management`: Standard access to management UI.
    - `impersonator`: Allowed to authenticate on behalf of other users.
    - `robot` / custom tags: Tag assigned to headless machine accounts.
  - `Can access virtual hosts`: Comma-separated list of virtual hosts the user has permission grants on.
  - `Has password`: Bullet indicator (`•`) denoting active password authentication.

### 1.2 Add a User Form (`8.png`)
- `Username`: Text input (required).
- `Password`: Password masked input (required).
- `Confirm password`: Password confirmation input.
- `Tags`: Text input with quick preset selection buttons:
  - `Admin`, `Monitoring`, `Policymaker`, `Management`, `Impersonator`, `None`.
- Action: `Add user` button.

### 1.3 User Detail & Permissions Configuration (`9.png`)
`User: <username>`

#### Overview
- User tags.
- Password authentication status.

#### Virtual Host Permissions
- **Current Permissions Table**:
  - `Virtual host`: Virtual host name.
  - `Configure regexp`: Regular expression defining which resources (queues/exchanges) the user can declare, modify, or delete (e.g. `.*`).
  - `Write regexp`: Regular expression defining which resources the user can publish or bind to (e.g. `.*`).
  - `Read regexp`: Regular expression defining which resources the user can consume from (e.g. `.*`).
  - Action: `Clear` button to revoke permissions for that vhost.
- **Set Permission Form**:
  - `Virtual Host`: Dropdown selector.
  - `Configure regexp`: Regex input (default `.*`).
  - `Write regexp`: Regex input (default `.*`).
  - `Read regexp`: Regex input (default `.*`).
  - Action: `Set permission` button.

#### Topic Permissions
Fine-grained authorization for AMQP topic exchanges:
- **Current Topic Permissions Table**: VHost, Exchange, Write regexp, Read regexp, Clear action.
- **Set Topic Permission Form**:
  - `Virtual Host`: Dropdown.
  - `Exchange`: Dropdown of exchanges in selected vhost.
  - `Write regexp`: Routing key pattern user can publish to.
  - `Read regexp`: Routing key pattern user can bind queues to.
  - Action: `Set topic permission` button.

#### User Maintenance
- **Update this user**:
  - Password & Confirm Password.
  - Tags input with preset chips.
  - Action: `Update user` button.
- **Delete this user**:
  - Action: `Delete` button.

---

## 2. Virtual Hosts Management (`10.png`)

Virtual hosts provide isolated, multi-tenant administrative boundaries for exchanges, queues, and bindings.

### 2.1 Virtual Hosts Listing Table
- **Columns**:
  - `Name`: VHost identifier (e.g., `/`, `device-monitor`, `flow-deletion`, `mail`).
  - `Users`: Comma-separated list of authorized users.
  - `State`: Live status badge (`running`).
  - `Messages`: Ready, Unacked, Total message volume in this vhost.
  - `Network`: Real-time network throughput (`From client`, `To client`).
  - `Message rates`: Ingress (`publish`) and egress (`deliver / get`) rates.

### 2.2 Add a New Virtual Host Form
- `Name`: Text input (required).
- `Description`: Human-readable summary of vhost purpose.
- `Tags`: Comma-delimited classification tags.
- `Default Queue Type`: Dropdown selector (`Classic`, `Quorum`, `Stream`).
- Action: `Add virtual host` button.

---

## 3. Feature Flags (`11.png`)

Inspects and enables RabbitMQ cluster-wide feature flags to manage rolling upgrades and cluster compatibility.

### Feature Flags Table
- **Columns**:
  - `Name`: Feature flag identifier (e.g., `classic_mirrored_queue_version`, `quorum_queue`, `stream_queue`, `direct_exchange_routing_v2`, `drop_unroutable_metric`, `restart_streams`, `user_limits`, `virtual_host_metadata`, etc.).
  - `State`: `Enabled` green badge, or `Enable` actionable button.
  - `Description`: Technical description of what the feature unlocks, plus `[Learn more]` documentation link.

---

## 4. Policies & Operator Policies (`12.png`)

Policies dynamically apply parameters (HA replication, message TTL, max-length) to matching queues and exchanges using regex without modifying client code.

### 4.1 User Policies Table
- **Columns**:
  - `Virtual Host`: Scope vhost.
  - `Name`: Policy name (e.g., `replicate-device-monitor`, `consumer-timeout`).
  - `Pattern`: Regex applied to entity names (e.g., `.*`, `^mail\..*`).
  - `Apply to`: Scope dropdown: `all`, `queues`, `exchanges`, `classic_queues`, `quorum_queues`, `streams`.
  - `Definition`: Key-value configuration rules:
    - High-Availability: `ha-mode: exactly`, `ha-params: 2`, `ha-sync-mode: automatic`
    - Timeouts: `consumer-timeout: 3600000`
    - Dead-lettering: `dead-letter-exchange`, `dead-letter-routing-key`
    - Queue length: `max-length`, `max-length-bytes`, `overflow`
  - `Priority`: Numeric integer deciding precedence when multiple policies match.

### 4.2 Add / Update Policy Form
- Virtual Host dropdown.
- Name input.
- Pattern regex input.
- Apply to dropdown.
- Priority integer input.
- Key-Value Definition builder (with presets for HA, TTL, and DLX).
- Action: `Add / update policy` button.

### 4.3 Operator Policies
- Dedicated policy layer reserved for cluster operators to enforce non-overridable constraints (e.g. cluster-wide max queue length or expiry rules).
- Separate table and creation form mirroring the User Policy structure.

---

## 5. Limits Configuration (`13.png`)

Enforces multi-tenant resource quotas to prevent "noisy neighbor" resource exhaustion.

### 5.1 Virtual Host Limits
- Table of existing vhost limits.
- **Set / update a virtual host limit Form**:
  - `Virtual host`: Dropdown selector.
  - `Limit`: Dropdown selector (e.g., `max-connections`, `max-queues`).
  - `Value`: Integer threshold limit.
  - Action: `Set / update limit` button.

### 5.2 User Limits
- Table of existing user limits.
- **Set / update a user limit Form**:
  - `User`: Dropdown selector.
  - `Limit`: Dropdown selector (e.g., `max-connections`, `max-channels`).
  - `Value`: Integer threshold limit.
  - Action: `Set / update limit` button.

---

## 6. Cluster Management (`14.png`)

Cluster-level configuration:
- **Cluster Name Display**: Active cluster name (e.g., `wiseflowmq`).
- **Description**: Explanation of how the cluster name is transmitted to AMQP clients during connection negotiation and used by federation/shovel links.
- **Change Name Form**:
  - `Name`: Input field.
  - Action: `Change name` button.

---

## 7. Dynamic Shovel Management & Status (`15.png`)

Dynamic shovels automate unidirectional message bridging between queues and exchanges across different vhosts, clusters, or cloud regions.

### 7.1 Dynamic Shovels List
- Table listing active shovels, their operational status (`running`, `terminated`), and transmission metrics.

### 7.2 Add a New Shovel Form
- **Virtual host**: Scope vhost dropdown.
- **Name**: Shovel name input (required).
- **Source Configuration**:
  - `Type`: Dropdown (`AMQP 0.9.1`, `AMQP 1.0`).
  - `URI`: Connection URI (e.g., `amqp://...`).
  - `Queue / Exchange`: Dropdown target selector + name text input.
  - `Prefetch count`: Integer prefetch limit.
  - `Auto-delete`: Dropdown (`Never`, `After X messages`).
- **Destination Configuration**:
  - `Type`: Dropdown (`AMQP 0.9.1`, `AMQP 1.0`).
  - `URI`: Connection URI.
  - `Queue / Exchange`: Dropdown target selector + name text input.
  - `Add forwarding headers`: Dropdown (`No` / `Yes`).
- **Operational Tuning**:
  - `Reconnect delay`: Seconds to wait before retrying broken connections.
  - `Acknowledgement mode`:
    - `On confirm`: Safest mode; acks source only after destination confirms persistence.
    - `On publish`: Acks source as soon as destination receives message.
    - `No ack`: Acks source before destination confirms (at-most-once delivery).
- Action: `Add shovel` button.

### 7.3 URI Helper Documentation
In-dashboard reference guide detailing URI connection formats:
- `amqp://` (local server default user)
- `amqp://user@/my-vhost`
- `amqp://server-name`
- `amqp://user:password@server-name/my-vhost`
- `amqps://...` (TLS secured URI with client certificate, CA path, and verification flags).

---

## 8. Modern UI Enhancements for Admin

1. **Interactive Regex Validator**:
   - Live tester for VHost/Topic regex permissions and Policy patterns showing exactly which queues/exchanges match before saving.
2. **Visual Policy Conflict Resolver**:
   - Matrix showing policy precedence and highlighting any conflicting rules across queues.
3. **User Access Audit Map**:
   - Visual permission grid displaying all users on one axis and all virtual hosts on the other with permission badges (`C`, `W`, `R`).
4. **Shovel Health Dashboard & Throughput Graphs**:
   - Dedicated lag and transfer rate charts for active dynamic shovels.
