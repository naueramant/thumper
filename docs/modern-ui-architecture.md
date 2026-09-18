# Modern UI Architecture & Screen Implementation Plan ("RabbitDash")

## 1. Vision & Objectives

The goal of **RabbitDash** is to deliver a modern, lightning-fast, and visually stunning management dashboard for RabbitMQ that preserves **100% of the functionality** of the classic management plugin while dramatically improving user experience, developer productivity, and operational observability.

---

## 2. Information Architecture & Screen Hierarchy

```
[ RabbitDash Application ]
│
├── Global Navigation & Command Bar
│   ├── App Bar: Cluster Switcher, VHost Combobox, Global Search (Cmd+K), Refresh Rate, Theme Toggle, User Profile
│   └── Persistent Left Sidebar Navigation (collapsible):
│       ├── Dashboard (Overview)
│       ├── Connections
│       ├── Channels
│       ├── Exchanges
│       ├── Queues & Streams
│       └── Administration (Users, VHosts, Policies, Limits, Shovels, Feature Flags, Cluster)
│
├── Core Screens & Views
│   ├── 0. Authentication & Login Screen (/login)
│   │   ├── Cluster Connection Selector & URI endpoint input
│   │   ├── Credentials (Username / Password) with show/hide toggle
│   │   ├── Remember Profile & Local Encryption
│   │   ├── SSO / OAuth2 / OIDC login button
│   │   └── Offline Demo Mode quick connect
│   │
│   ├── 1. Overview Screen (/overview)
│   │   ├── Metric KPI Ribbon (Totals, Rates, Cluster Health)
│   │   ├── Real-time Ingress/Egress & Queue Depth Charts
│   │   ├── Node Health & Resource Utilization Cards
│   │   ├── Churn Analysis & Connection Velocity
│   │   ├── Network Ports & Listeners
│   │   └── Broker Definitions Export / Import Drawer
│   │
│   ├── 2. Connections Screen (/connections)
│   │   ├── Connection DataGrid with multi-filtering, grouping & sparklines
│   │   └── Connection Detail View (/connections/:name)
│   │       ├── Socket Telemetry & Ingress/Egress graphs
│   │       ├── Active Channels Drawer
│   │       ├── Client Properties & Capabilities Inspector
│   │       ├── Erlang Process & GC Diagnostics
│   │       └── Safe Force-Close with custom reason modal
│   │
│   ├── 3. Channels Screen (/channels)
│   │   ├── Channel DataGrid with unconfirmed & unacked alerts
│   │   └── Channel Detail View (/channels/:vhost/:channel)
│   │       ├── Prefetch & Ack Rate Monitor
│   │       ├── Active Consumers Sub-table
│   │       └── Raft Consensus & Erlang Reduction metrics
│   │
│   ├── 4. Exchanges Screen (/exchanges)
│   │   ├── Exchange DataGrid with type badges & throughput indicators
│   │   ├── "Create Exchange" Modal / Drawer with type presets
│   │   └── Exchange Detail View (/exchanges/:vhost/:name)
│   │       ├── Interactive Bindings Visualizer (Topology DAG)
│   │       ├── Bindings Table with inline Unbind & Add Binding
│   │       ├── Rich Test Message Publisher (Monaco Editor, JSON validation)
│   │       └── Safe Exchange Deletion with impact assessment
│   │
│   ├── 5. Queues & Streams Screen (/queues)
│   │   ├── Queue DataGrid (Classic, Quorum, Stream) with health status
│   │   ├── "Create Queue" Wizard with presets (HA, DLQ, TTL, Stream)
│   │   └── Queue Detail View (/queues/:vhost/:name)
│   │       ├── Queue Depth, In-Flight & Rate historical graphs
│   │       ├── Granular Storage Breakdown (RAM vs Disk vs Paging)
│   │       ├── Active Consumers Table
│   │       ├── Inbound Bindings Table & Add Binding Form
│   │       ├── Direct Test Message Publisher
│   │       ├── Message Peek & Dequeue Viewer (Non-destructive safe preview)
│   │       ├── Message Migration (Built-in Shovel runner)
│   │       └── Purge & Delete Queue actions with confirmation guards
│   │
│   └── 6. Administration Hub (/admin)
│       ├── Users & Roles (/admin/users)
│       │   ├── User DataGrid with role badges
│       │   ├── Add User Drawer
│       │   └── User Detail & Permissions Matrix (VHost & Topic regex tester)
│       ├── Virtual Hosts (/admin/vhosts)
│       │   ├── Multi-tenant cards with message backlog & network throughput
│       │   └── Create VHost modal with default queue type selection
│       ├── Policies (/admin/policies)
│       │   ├── User & Operator Policies table
│       │   ├── Visual Policy Regex Simulator (live matches preview)
│       │   └── Policy Editor Form (HA, TTL, DLX templates)
│       ├── Limits (/admin/limits)
│       │   └── Interactive Quota Gauges (VHost & User connection/queue limits)
│       ├── Dynamic Shovels (/admin/shovels)
│       │   ├── Shovel Status & Throughput telemetry
│       │   └── Dynamic Shovel Creator with URI builder
│       ├── Feature Flags (/admin/feature-flags)
│       │   └── Cluster feature flag checklist with upgrade safety warnings
│       └── Cluster Configuration (/admin/cluster)
│           └── Cluster rename & node clustering overview
```

---

## 3. Key UX & Developer Experience Enhancements

### 3.1 Global Command Palette (`Cmd+K` / `Ctrl+K`)
- Instantly jump to any Queue, Exchange, Connection, VHost, or User by typing its name.
- Execute quick actions directly from the keyboard (e.g., `> Create Queue`, `> Export Definitions`, `> Switch VHost`).

### 3.2 Visual Routing Topology Graph
- In the classic UI, bindings are represented as flat, disconnected text rows.
- In RabbitDash, render an interactive directed acyclic graph (DAG) using **React Flow** or **visx**:
  - `Publishers -> [ Exchange: amq.direct ] --(routing_key)--> [ Queue: order_events ] -> Consumers`
  - Allows visual debugging of complex topic hierarchies and dead-letter routing loops.

### 3.3 Rich Message Publisher & Safe Peeker
- **Integrated Monaco / CodeMirror Editor**:
  - Syntax highlighting for JSON, XML, YAML, and Protobuf.
  - JSON formatting, linting, and payload size calculation before publishing.
  - Saved payload drafts and replay history.
- **Safe Message Peeking**:
  - Classic UI defaults to `requeue=true`, but accidental clicks on destructive modes can cause message loss.
  - RabbitDash defaults to a non-destructive read-only preview drawer.
  - Auto-formatting of JSON messages with one-click copy, header inspection, and "Clone & Republish" action.

### 3.4 Interactive Policy & Regex Simulator
- Instead of hoping a regular expression `^orders\.(eu|us)\..*` matches the right queues, RabbitDash provides a **Live Policy Simulator**:
  - As the user types the pattern in the policy editor, RabbitDash dynamically highlights all existing queues and exchanges that match the pattern in real time!

### 3.5 Modern DataGrids
- Replace static HTML tables with virtualized DataGrids:
  - Supports thousands of queues/connections without UI lag.
  - Quick column sorting, column reordering, column visibility toggles, and column pinning.
  - Inline search-as-you-type with fuzzy matching.
  - Batch operations (e.g., select 10 queues $\to$ Bulk Purge or Bulk Set Policy).

---

## 4. Technical Architecture & Implementation Stack

### 4.1 Frontend Stack
- **Framework**: React 19 + TypeScript (already initialized in project).
- **Bundler / Dev Server**: Vite 8 (with fast HMR).
- **Styling & Components**: Tailwind CSS v4 or Radix UI / Lucide React / Shadcn UI patterns.
- **Data Table**: TanStack Table v8 (virtualized, headless, flexible).
- **Charts & Telemetry**: Apache ECharts or Recharts (high performance, responsive, tooltip crosshairs).
- **Code & Payload Editor**: Monaco Editor (`@monaco-editor/react`) or CodeMirror 6.
- **Topology Graph**: `@xyflow/react` (React Flow) for interactive exchange-to-queue visualization.
- **Routing**: TanStack Router or React Router v7.

### 4.2 API Communication & State Management
- **API Client**: Strongly-typed RabbitMQ Management HTTP API client (`fetch` / `ky` / `axios`).
- **Data Query & Caching**: TanStack Query (React Query) v5:
  - Handles automatic polling intervals (5s, 10s, 30s, etc.).
  - Automatic background refetching and window focus synchronization.
  - Optimistic updates for actions (create exchange, add binding, purge queue).
- **Authentication**:
  - HTTP Basic Auth / Bearer Token with secure in-memory storage.
  - Local proxy support during development (`vite.config.ts` proxying `/api` to target RabbitMQ cluster).

---

## 5. Phased Implementation Roadmap

### Phase 1: Core Shell & Foundation
- App Layout (collapsible sidebar, global header, vhost picker, auto-refresh controller, dark/light theme).
- API Client and authentication layer with credentials management.
- Command Palette (`Cmd+K`).

### Phase 2: Overview Dashboard & Observability
- Metric KPI cards and historical time-series charts (Queued messages, rates breakdown).
- Cluster Node health table with memory/disk watermark gauges.
- Broker definition export/import drawer with JSON validation.

### Phase 3: Queues, Streams & Exchanges
- High-performance Queues & Streams DataGrid with health badges and quick filtering.
- Queue Detail View with storage breakdown, consumers, bindings, message peeking, and moving.
- Exchanges DataGrid and Exchange Detail View with bindings table and test publisher.
- Interactive Routing Topology Graph.

### Phase 4: Connections & Channels
- Connections and Channels tables with rate sparklines and client categorization.
- Connection detail with client properties tree, runtime Erlang GC metrics, and safe force-close.
- Channel detail with prefetch and unacked monitoring.

### Phase 5: Administration & Multi-Tenancy Hub
- User management and visual VHost/Topic regex permissions matrix.
- Virtual Hosts management with multi-tenant throughput metrics.
- User Policies and Operator Policies with live regex simulation.
- Limits and Dynamic Shovel management.
