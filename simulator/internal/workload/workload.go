// Package workload implements the simulated CarrotWorks microservices:
// producers that publish fake orders/deliveries/telemetry/logs/payments,
// and consumers that process them (at varying speeds, with occasional
// failures) so the rabbitdash UI has realistic connections, channels,
// queues and message flow to display.
package workload

import (
	"fmt"
	"log"
	"math/rand"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/rabbitdash/simulator/internal/config"
)

// Dial opens a new AMQP connection tagged with a friendly connection name,
// so each simulated microservice instance shows up distinctly in the
// RabbitMQ management UI / rabbitdash Connections page.
func Dial(cfg config.Config, connectionName string) (*amqp.Connection, error) {
	amqpCfg := amqp.Config{
		Properties: amqp.NewConnectionProperties(),
	}
	amqpCfg.Properties.SetClientConnectionName(connectionName)
	return amqp.DialConfig(cfg.AMQPURL, amqpCfg)
}

// jitter sleeps for baseDelay scaled by cfg.Scale, plus up to 40% random
// jitter, so producers/consumers don't all tick in lockstep.
func jitter(cfg config.Config, baseDelay time.Duration) time.Duration {
	scaled := time.Duration(float64(baseDelay) / cfg.Scale)
	wobble := time.Duration(rand.Int63n(int64(scaled) * 4 / 10))
	return scaled + wobble
}

// logErr logs a non-fatal error with a service label, so goroutines can
// keep running instead of crashing the whole simulator.
func logErr(service string, err error) {
	if err != nil {
		log.Printf("[%s] %v", service, err)
	}
}

// reconnectingChannel opens a fresh channel on conn, retrying briefly if
// the broker is momentarily unavailable during startup.
func newChannel(conn *amqp.Connection) (*amqp.Channel, error) {
	var lastErr error
	for i := 0; i < 5; i++ {
		ch, err := conn.Channel()
		if err == nil {
			return ch, nil
		}
		lastErr = err
		time.Sleep(500 * time.Millisecond)
	}
	return nil, fmt.Errorf("open channel: %w", lastErr)
}
