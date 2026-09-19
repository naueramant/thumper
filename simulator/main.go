// Command simulator runs a fictional "CarrotWorks Logistics & Kitchens
// Inc." platform against a RabbitMQ broker, generating realistic
// exchanges, queues, bindings, connections and message flow so the
// rabbitdash UI has something interesting to display.
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"github.com/rabbitdash/simulator/internal/config"
	"github.com/rabbitdash/simulator/internal/topology"
	"github.com/rabbitdash/simulator/internal/workload"
)

func main() {
	cfg := config.Load()
	log.Printf("🥕 CarrotWorks simulator starting (broker=%s, scale=%.2f)", cfg.AMQPURL, cfg.Scale)

	conn, err := workload.Dial(cfg, "carrotworks-topology-bootstrap")
	if err != nil {
		log.Fatalf("connect to broker: %v", err)
	}
	if err := topology.Declare(conn); err != nil {
		log.Fatalf("declare topology: %v", err)
	}
	conn.Close()
	log.Println("topology declared: 9 exchanges, 22 queues across direct/fanout/topic/headers exchanges and classic/quorum/stream/priority queues")

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	producers := []func(context.Context, config.Config){
		workload.RunOrderProducer,
		workload.RunKitchenProducer,
		workload.RunDeliveryProducer,
		workload.RunNotificationProducer,
		workload.RunTelemetryProducer,
		workload.RunLogProducer,
		workload.RunPaymentProducer,
		workload.RunEventStreamProducer,
	}
	for _, p := range producers {
		go p(ctx, cfg)
	}

	workload.StartAllConsumers(ctx, cfg)

	log.Println("all CarrotWorks services running — press Ctrl+C to stop")

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Println("shutting down CarrotWorks simulator…")
	cancel()
}
