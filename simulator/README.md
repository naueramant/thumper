# CarrotWorks Platform Simulator

A small Go program that pretends to be **CarrotWorks Logistics & Kitchens
Inc.** — a fictional food-delivery-meets-logistics megacorp — running its
microservices against RabbitMQ. It exists to generate realistic, varied
load (exchanges, queues, bindings, connections, channels, consumers, and
message flow) so you can exercise the rabbitdash UI without a real
production workload.

## What it simulates

| Exchange | Type | Purpose |
|---|---|---|
| `carrotworks.orders` | direct | order created / paid / cancelled / VIP |
| `carrotworks.kitchen` | direct | cooking tickets new / ready |
| `carrotworks.delivery` | topic | region + status delivery updates (`delivery.<region>.<status>`) |
| `carrotworks.notifications` | fanout | broadcasts to email/SMS/push |
| `carrotworks.fleet.telemetry` | headers | IoT pings from bikes/vans/drones, matched by sensor type |
| `carrotworks.audit.logs` | topic | structured logs (`log.<service>.<level>`) |
| `carrotworks.payments` | direct | payment processing, with a fanout DLX for declined charges |
| `carrotworks.events` | direct | feeds an append-only **stream** queue |

Queue types used: classic, **quorum** (`orders.paid`, `delivery.all`),
**stream** (`events.stream`), and a **priority** queue (`orders.vip`,
`x-max-priority`). `payments.process` demonstrates dead-lettering: ~15% of
messages are nacked and land on `payments.dead` via `carrotworks.payments.dlx`.
`logs.all` sets a short message TTL to mimic log retention.

Each simulated microservice (producer or consumer) opens its **own AMQP
connection** with a friendly `connection_name` (e.g.
`order-fulfillment-worker-1`, `fleet-controller-producer`), so the
Connections/Channels pages show a realistic, varied fleet of clients
instead of one shared connection.

## Running

Requires Go 1.21+ and a reachable RabbitMQ broker (the repo's
`docker-compose.yml` at the repo root works out of the box).

```bash
cd simulator
go run .
```

CarrotWorks runs its whole topology, producers and consumers independently
in a fixed set of vhosts (`/`, `carrotworks-staging`, `carrotworks-analytics`)
so the dashboard has multiple vhosts with live traffic to show. Vhosts
besides `/` are created automatically (and the AMQP user granted full
permissions on them) via the management HTTP API on startup — this isn't
configurable, since the simulator is a fixed, self-contained fictional
platform rather than a general-purpose load generator.

Environment variables:

- `AMQP_URL` — broker URI (default `amqp://guest:guest@localhost:5672/`)
- `SIMULATOR_SCALE` — multiplies publish rates; e.g. `2` doubles traffic, `0.5` halves it (default `1`)
- `SIMULATOR_MANAGEMENT_URL` — RabbitMQ management API base URL, only used for the vhost provisioning above (default `http://<AMQP_URL host>:15672`)
- `SIMULATOR_MANAGEMENT_USER` / `SIMULATOR_MANAGEMENT_PASSWORD` — management API credentials (default: the username/password from `AMQP_URL`)

Stop with `Ctrl+C`; it shuts down all producer/consumer goroutines gracefully.

## Layout

```
simulator/
  main.go                     # wiring + graceful shutdown
  internal/config/            # env-based config + fixed vhost list
  internal/mgmt/              # HTTP management API calls to provision vhosts
  internal/faker/             # themed fake data generators
  internal/topology/          # exchange/queue/binding declarations
  internal/workload/          # producers + consumers per simulated service
```
