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
	"github.com/rabbitdash/simulator/internal/mgmt"
	"github.com/rabbitdash/simulator/internal/topology"
	"github.com/rabbitdash/simulator/internal/workload"
)

func main() {
	cfg := config.Load()
	log.Printf("🥕 CarrotWorks simulator starting (broker=%s, scale=%.2f, vhosts=%v)", cfg.AMQPURL, cfg.Scale, config.VHosts)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	producers := []func(context.Context, config.Config, string){
		workload.RunOrderProducer,
		workload.RunKitchenProducer,
		workload.RunDeliveryProducer,
		workload.RunNotificationProducer,
		workload.RunTelemetryProducer,
		workload.RunLogProducer,
		workload.RunPaymentProducer,
		workload.RunEventStreamProducer,
	}

	for _, vhost := range config.VHosts {
		if vhost != "/" {
			if err := mgmt.EnsureVHost(cfg, vhost); err != nil {
				log.Fatalf("provision vhost %q: %v", vhost, err)
			}
			log.Printf("vhost %q ready", vhost)
		}

		conn, err := workload.Dial(cfg, vhost, workload.ConnName("carrotworks-topology-bootstrap", vhost))
		if err != nil {
			log.Fatalf("connect to broker (vhost %q): %v", vhost, err)
		}
		if err := topology.Declare(conn); err != nil {
			log.Fatalf("declare topology (vhost %q): %v", vhost, err)
		}
		conn.Close()
		log.Printf("topology declared in vhost %q: 9 exchanges, 22 queues across direct/fanout/topic/headers exchanges and classic/quorum/stream/priority queues", vhost)

		for _, p := range producers {
			go p(ctx, cfg, vhost)
		}
		workload.StartAllConsumers(ctx, cfg, vhost)
	}

	log.Println("all CarrotWorks services running — press Ctrl+C to stop")

	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh

	log.Println("shutting down CarrotWorks simulator…")
	cancel()
}

