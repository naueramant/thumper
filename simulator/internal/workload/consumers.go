package workload

import (
	"context"
	"math/rand"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/rabbitdash/simulator/internal/config"
	"github.com/rabbitdash/simulator/internal/topology"
)

// consumerSpec describes one simulated downstream worker: which queue it
// drains, how long it "thinks" per message, and how often it prefetches.
type consumerSpec struct {
	connectionName string
	queue          string
	prefetch       int
	minDelay       time.Duration
	maxDelay       time.Duration
	// nackRate is the fraction (0-1) of messages rejected without requeue,
	// used to demonstrate dead-lettering / retry behaviour.
	nackRate float64
}

// RunConsumer starts a simple simulated worker that consumes, "processes"
// (sleeps a random duration to look busy on the dashboard) and acks/nacks
// messages from a single queue.
func RunConsumer(ctx context.Context, cfg config.Config, spec consumerSpec) {
	conn, err := Dial(cfg, spec.connectionName)
	if err != nil {
		logErr(spec.connectionName, err)
		return
	}
	defer conn.Close()

	ch, err := newChannel(conn)
	if err != nil {
		logErr(spec.connectionName, err)
		return
	}
	defer ch.Close()

	prefetch := spec.prefetch
	if prefetch <= 0 {
		prefetch = 1
	}
	if err := ch.Qos(prefetch, 0, false); err != nil {
		logErr(spec.connectionName, err)
		return
	}

	deliveries, err := ch.Consume(spec.queue, spec.connectionName, false, false, false, false, nil)
	if err != nil {
		logErr(spec.connectionName, err)
		return
	}

	minDelay, maxDelay := spec.minDelay, spec.maxDelay
	if maxDelay <= minDelay {
		maxDelay = minDelay + time.Millisecond
	}

	for {
		select {
		case <-ctx.Done():
			return
		case d, ok := <-deliveries:
			if !ok {
				return
			}
			think := minDelay + time.Duration(rand.Int63n(int64(maxDelay-minDelay)))
			select {
			case <-ctx.Done():
				return
			case <-time.After(time.Duration(float64(think) / cfg.Scale)):
			}

			if spec.nackRate > 0 && rand.Float64() < spec.nackRate {
				logErr(spec.connectionName, d.Nack(false, false)) // dead-letter, no requeue
				continue
			}
			logErr(spec.connectionName, d.Ack(false))
		}
	}
}

// RunEventStreamConsumer tails the CarrotWorks events stream from the
// first available offset, showcasing RabbitMQ's stream consumer semantics.
func RunEventStreamConsumer(ctx context.Context, cfg config.Config, connectionName string) {
	conn, err := Dial(cfg, connectionName)
	if err != nil {
		logErr(connectionName, err)
		return
	}
	defer conn.Close()

	ch, err := newChannel(conn)
	if err != nil {
		logErr(connectionName, err)
		return
	}
	defer ch.Close()

	if err := ch.Qos(200, 0, false); err != nil {
		logErr(connectionName, err)
		return
	}

	deliveries, err := ch.Consume(topology.QEventsStream, connectionName, false, false, false, false, amqp.Table{
		"x-stream-offset": "next",
	})
	if err != nil {
		logErr(connectionName, err)
		return
	}

	for {
		select {
		case <-ctx.Done():
			return
		case d, ok := <-deliveries:
			if !ok {
				return
			}
			logErr(connectionName, d.Ack(false))
		}
	}
}

// StartAllConsumers launches one goroutine per simulated CarrotWorks
// downstream worker, each with its own connection/channel and a
// distinctive processing profile.
func StartAllConsumers(ctx context.Context, cfg config.Config) {
	specs := []consumerSpec{
		// Two fulfillment workers race on new orders, like a real worker pool.
		{"order-fulfillment-worker-1", topology.QOrdersCreated, 5, 50 * time.Millisecond, 250 * time.Millisecond, 0},
		{"order-fulfillment-worker-2", topology.QOrdersCreated, 5, 50 * time.Millisecond, 250 * time.Millisecond, 0},
		{"billing-reconciler", topology.QOrdersPaid, 10, 20 * time.Millisecond, 120 * time.Millisecond, 0},
		{"cancellation-handler", topology.QOrdersCancelled, 2, 100 * time.Millisecond, 400 * time.Millisecond, 0},
		{"vip-concierge", topology.QOrdersVIP, 1, 10 * time.Millisecond, 60 * time.Millisecond, 0},

		{"kitchen-line-cook", topology.QKitchenNew, 3, 200 * time.Millisecond, 900 * time.Millisecond, 0},
		{"kitchen-expo", topology.QKitchenReady, 3, 50 * time.Millisecond, 200 * time.Millisecond, 0},

		{"delivery-dispatch-eu", topology.QDeliveryEU, 4, 30 * time.Millisecond, 150 * time.Millisecond, 0},
		{"delivery-dispatch-us", topology.QDeliveryUS, 4, 30 * time.Millisecond, 150 * time.Millisecond, 0},
		{"delivery-dispatch-apac", topology.QDeliveryAPAC, 4, 30 * time.Millisecond, 150 * time.Millisecond, 0},
		// Deliberately slower than production to let delivery.all build up a
		// visible backlog for the dashboard's queue-depth graphs.
		{"delivery-analytics-archiver", topology.QDeliveryAll, 1, 300 * time.Millisecond, 1200 * time.Millisecond, 0},

		{"email-dispatcher", topology.QNotifyEmail, 8, 10 * time.Millisecond, 80 * time.Millisecond, 0},
		{"sms-dispatcher", topology.QNotifySMS, 8, 10 * time.Millisecond, 80 * time.Millisecond, 0},
		{"push-dispatcher", topology.QNotifyPush, 8, 10 * time.Millisecond, 80 * time.Millisecond, 0},

		{"gps-tracker", topology.QTelemetryGPS, 20, 5 * time.Millisecond, 30 * time.Millisecond, 0},
		{"climate-monitor", topology.QTelemetryTemp, 20, 5 * time.Millisecond, 30 * time.Millisecond, 0},
		{"drone-battery-watchdog", topology.QTelemetryBattery, 10, 5 * time.Millisecond, 40 * time.Millisecond, 0},

		{"alerting-service", topology.QLogsErrors, 5, 10 * time.Millisecond, 50 * time.Millisecond, 0},
		{"oncall-digest", topology.QLogsWarn, 5, 10 * time.Millisecond, 50 * time.Millisecond, 0},
		// Log firehose consumer is intentionally left slow/low-prefetch so
		// logs.all shows a lingering backlog (until its TTL expires messages).
		{"log-archiver", topology.QLogsAll, 1, 200 * time.Millisecond, 500 * time.Millisecond, 0},

		// ~15% of payment messages get dead-lettered, mirroring the
		// "declined" flag the producer sets - simulates fraud/retry flow.
		{"payments-worker", topology.QPaymentsProcess, 5, 40 * time.Millisecond, 180 * time.Millisecond, 0.15},
		{"fraud-review-desk", topology.QPaymentsDead, 1, 300 * time.Millisecond, 900 * time.Millisecond, 0},
	}

	for _, spec := range specs {
		go RunConsumer(ctx, cfg, spec)
	}

	go RunEventStreamConsumer(ctx, cfg, "events-stream-consumer")
}
