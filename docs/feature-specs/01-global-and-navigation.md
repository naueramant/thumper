# Feature Specification: Global Controls & Navigation

Based on Screenshots `1.png`, `2.png`, `3.png`, `5.png`, `7.png`, `8.png`, `10.png`.

---

## 1. Top Global Header & Brand

### Visual Elements & Data Points
- **Logo & Brand Identifier**: RabbitMQ logo.
- **Server Version Tags**:
  - `RabbitMQ <version>` (e.g., `RabbitMQ 3.12.12`)
  - `Erlang <version>` (e.g., `Erlang 26.2.1`)
- **Cluster Indicator**:
  - `Cluster <name>` (e.g., `Cluster wiseflowmq`)
- **User Identity & Session**:
  - `User <username>` (e.g., `User admin`)
  - `Log out` button (ends authentication session / clears HTTP Basic auth or cookie token).

---

## 2. Global View Controls

### 2.1 Auto-Refresh Controller
- **Last Refreshed Timestamp**: Displays formatted local time (`Refreshed YYYY-MM-DD HH:MM:SS`).
- **Interval Selector Dropdown**:
  - `Do not refresh` (0)
  - `Refresh every 5 seconds` (default in UI)
  - `Refresh every 10 seconds`
  - `Refresh every 30 seconds`
  - `Refresh every 60 seconds`
- **Behavior**: When enabled, polls the RabbitMQ Management HTTP API at the selected interval, re-rendering active tables and time-series charts without full page reloads.

### 2.2 Global Virtual Host Filter
- **Dropdown Selector**:
  - Option `All` (aggregate view across all accessible virtual hosts)
  - Individual virtual hosts (e.g. `device-monitor`, `flow-deletion`, `flow-synchronization`, `mail`, etc.)
- **Scope & Behavior**:
  - When a virtual host is selected from this dropdown, **every screen** (Overview, Connections, Channels, Exchanges, Queues) is scoped down to only entities belonging to that virtual host.
  - Creation forms automatically pre-populate the selected virtual host.
  - Detail pages indicate the parent virtual host.

---

## 3. Top Navigation Bar

Primary horizontal tab navigation bar:
1. **Overview** (`/#/`)
2. **Connections** (`/#/connections`)
3. **Channels** (`/#/channels`)
4. **Exchanges** (`/#/exchanges`)
5. **Queues and Streams** (`/#/queues`)
6. **Admin** (`/#/admin`)

*(Active tab is highlighted with dark background and white text).*

---

## 4. Admin Sub-Navigation Sidebar

When inside the **Admin** tab (`8.png` - `15.png`), a vertical right-hand sidebar menu provides access to administrative subsystems:
- **Users** (`/#/users`)
- **Virtual Hosts** (`/#/vhosts`)
- **Feature Flags** (`/#/feature-flags`)
- **Policies** (`/#/policies`)
- **Limits** (`/#/limits`)
- **Cluster** (`/#/cluster`)
- **Shovel Status** (`/#/shovel-status`)
- **Shovel Management** (`/#/shovels`)

---

## 5. Global Table Features & Pagination Controls

Observed on all entity listing pages (`2.png`, `3.png`, `5.png`, `7.png`, `8.png`, `10.png`, `12.png`):
- **Item Count Badge**: e.g., `All connections (69)`, `All queues (86, filtered down to 23)`.
- **Page Navigator**: `Page [ <input> ] of <total_pages>`.
- **Filter Search Input**: Text search input that filters table rows on the client/API.
- **Regex Filter Toggle**: Checkbox `Regex ?` enabling regular expression matching against entity names.
- **Page Size Selector**: Input/dropdown (e.g., `page size up to: 100`).
- **Column Visibility Selector (`+/-`)**: Toggle dropdown or modal allowing users to show or hide specific table columns.
- **Sortable Columns**: Clicking table headers re-orders data ascending / descending.

---

## 6. Footer Links & External Resources

Present across all screens at the bottom of the page:
- `HTTP API` (links to `/api/index.html` swagger/documentation)
- `Documentation` (external link to `rabbitmq.com/docs`)
- `Tutorials`
- `New releases`
- `Commercial edition`
- `Commercial support`
- `Discussions`
- `Discord`
- `Slack`
- `Plugins`
- `GitHub`

---

## 7. Opportunities for Modern UI (RabbitDash)

1. **Persistent Global Search (`Cmd+K` / `Ctrl+K`)**:
   - Instant search across all Queues, Exchanges, Consumers, and VHosts with keyboard shortcuts.
2. **WebSocket / Server-Sent Events (SSE) Stream**:
   - Complement polling with WebSocket streaming for instant updates and smoother rate graphs.
3. **Multi-Cluster Support**:
   - Ability to switch between multiple RabbitMQ clusters (Development, Staging, Production) within the same header without logging out and changing URLs.
4. **Theme Switcher**:
   - Built-in Dark Mode and Light Mode with system preference detection.
5. **Modern Toast Notifications**:
   - Non-blocking toast notifications for API actions (e.g. "Exchange created", "Queue purged", "Connection closed") instead of standard browser alerts.
