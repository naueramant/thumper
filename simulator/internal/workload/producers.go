package workload

import (
	"context"
	"encoding/json"
	"math/rand"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"

	"github.com/rabbitdash/simulator/internal/config"
	"github.com/rabbitdash/simulator/internal/faker"
	"github.com/rabbitdash/simulator/internal/topology"
)

func publishJSON(ch *amqp.Channel, exchange, routingKey string, payload any, extra ...func(*amqp.Publishing)) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	msg := amqp.Publishing{
		ContentType:  "application/json",
		Body:         body,
		Timestamp:    time.Now(),
		DeliveryMode: amqp.Persistent,
	}
	for _, fn := range extra {
		fn(&msg)
	}
	return ch.PublishWithContext(context.Background(), exchange, routingKey, false, false, msg)
}

// RunOrderProducer simulates CarrotWorks' order-api service: new orders,
// payments confirming, occasional cancellations, and a trickle of VIP
// carrot-club priority orders.
func RunOrderProducer(ctx context.Context, cfg config.Config, vhost string) {
	conn, err := Dial(cfg, vhost, ConnName("order-api-producer", vhost))
	if err != nil {
		logErr("order-api", err)
		return
	}
	defer conn.Close()
	ch, err := newChannel(conn)
	if err != nil {
		logErr("order-api", err)
		return
	}
	defer ch.Close()

	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(jitter(cfg, 700*time.Millisecond)):
		}

		orderID := faker.OrderID()
		customer := faker.Name()
		item := faker.Food()
		amount := faker.Amount()

		payload := map[string]any{
			"orderId":  orderID,
			"customer": customer,
			"item":     item,
			"amount":   amount,
		}

		logErr("order-api", publishJSON(ch, topology.ExOrders, topology.RKOrderCreated, payload))

		// Most orders get paid shortly after.
		if rand.Intn(100) < 85 {
			logErr("order-api", publishJSON(ch, topology.ExOrders, topology.RKOrderPaid, payload))
		} else {
			logErr("order-api", publishJSON(ch, topology.ExOrders, topology.RKOrderCancelled, payload))
		}

		// ~8% of orders are placed by VIP carrot-club members.
		if rand.Intn(100) < 8 {
			logErr("order-api", publishJSON(ch, topology.ExOrders, topology.RKOrderVIP, payload, func(p *amqp.Publishing) {
				p.Priority = uint8(5 + rand.Intn(5))
			}))
		}
	}
}

// RunKitchenProducer simulates the kitchen-worker service turning paid
// orders into cooking tickets and marking them ready for delivery.
func RunKitchenProducer(ctx context.Context, cfg config.Config, vhost string) {
	conn, err := Dial(cfg, vhost, ConnName("kitchen-worker-producer", vhost))
	if err != nil {
		logErr("kitchen-worker", err)
		return
	}
	defer conn.Close()
	ch, err := newChannel(conn)
	if err != nil {
		logErr("kitchen-worker", err)
		return
	}
	defer ch.Close()

	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(jitter(cfg, 900*time.Millisecond)):
		}

		ticket := map[string]any{
			"ticketId": faker.OrderID(),
			"item":     faker.Food(),
			"chef":     faker.Name(),
		}
		logErr("kitchen-worker", publishJSON(ch, topology.ExKitchen, topology.RKKitchenNew, ticket))

		if rand.Intn(100) < 60 {
			logErr("kitchen-worker", publishJSON(ch, topology.ExKitchen, topology.RKKitchenReady, ticket))
		}
	}
}

// RunDeliveryProducer simulates delivery-tracker publishing region-scoped
// status updates onto the topic exchange (dispatched -> in-transit ->
// delivered), driving three regional queues plus a firehose queue.
func RunDeliveryProducer(ctx context.Context, cfg config.Config, vhost string) {
	conn, err := Dial(cfg, vhost, ConnName("delivery-tracker-producer", vhost))
	if err != nil {
		logErr("delivery-tracker", err)
		return
	}
	defer conn.Close()
	ch, err := newChannel(conn)
	if err != nil {
		logErr("delivery-tracker", err)
		return
	}
	defer ch.Close()

	statuses := []string{"dispatched", "in-transit", "delivered", "delayed"}

	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(jitter(cfg, 500*time.Millisecond)):
		}

		city, region := faker.City()
		status := statuses[rand.Intn(len(statuses))]
		vehicle := faker.Vehicle(faker.VehicleType())
		routingKey := region + "." + status

		payload := map[string]any{
			"orderId": faker.OrderID(),
			"city":    city,
			"region":  region,
			"status":  status,
			"vehicle": vehicle,
		}
		logErr("delivery-tracker", publishJSON(ch, topology.ExDelivery, "delivery."+routingKey, payload))
	}
}

// RunNotificationProducer simulates notification-hub fanning order/delivery
// events out to every channel: email, SMS and push all receive a copy.
func RunNotificationProducer(ctx context.Context, cfg config.Config, vhost string) {
	conn, err := Dial(cfg, vhost, ConnName("notification-hub-producer", vhost))
	if err != nil {
		logErr("notification-hub", err)
		return
	}
	defer conn.Close()
	ch, err := newChannel(conn)
	if err != nil {
		logErr("notification-hub", err)
		return
	}
	defer ch.Close()

	templates := []string{"order_confirmed", "order_delivered", "delivery_delayed", "vip_perk_unlocked"}

	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(jitter(cfg, 1200*time.Millisecond)):
		}

		payload := map[string]any{
			"customer": faker.Name(),
			"template": templates[rand.Intn(len(templates))],
			"orderId":  faker.OrderID(),
		}
		logErr("notification-hub", publishJSON(ch, topology.ExNotify, "", payload))
	}
}

// RunTelemetryProducer simulates fleet-controller receiving IoT sensor
// pings from bikes, vans and drones, routed by a headers exchange.
func RunTelemetryProducer(ctx context.Context, cfg config.Config, vhost string) {
	conn, err := Dial(cfg, vhost, ConnName("fleet-controller-producer", vhost))
	if err != nil {
		logErr("fleet-controller", err)
		return
	}
	defer conn.Close()
	ch, err := newChannel(conn)
	if err != nil {
		logErr("fleet-controller", err)
		return
	}
	defer ch.Close()

	sensors := []string{"gps", "temperature", "battery"}

	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(jitter(cfg, 250*time.Millisecond)):
		}

		kind := faker.VehicleType()
		vehicle := faker.Vehicle(kind)
		sensor := sensors[rand.Intn(len(sensors))]

		payload := map[string]any{
			"vehicle": vehicle,
			"sensor":  sensor,
			"reading": telemetryReading(sensor),
		}

		headers := amqp.Table{
			"sensor":       sensor,
			"vehicle-type": kind,
		}
		logErr("fleet-controller", publishJSON(ch, topology.ExTelemetry, "", payload, func(p *amqp.Publishing) {
			p.Headers = headers
		}))
	}
}

func telemetryReading(sensor string) float64 {
	switch sensor {
	case "gps":
		return rand.Float64() * 360
	case "temperature":
		return -5 + rand.Float64()*35
	default: // battery
		return rand.Float64() * 100
	}
}

// RunLogProducer simulates every CarrotWorks microservice emitting
// structured audit log lines at varying severities onto the topic
// exchange (log.<service>.<level>).
func RunLogProducer(ctx context.Context, cfg config.Config, vhost string) {
	conn, err := Dial(cfg, vhost, ConnName("audit-logger-producer", vhost))
	if err != nil {
		logErr("audit-logger", err)
		return
	}
	defer conn.Close()
	ch, err := newChannel(conn)
	if err != nil {
		logErr("audit-logger", err)
		return
	}
	defer ch.Close()

	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(jitter(cfg, 150*time.Millisecond)):
		}

		service := faker.ServiceName()
		level := faker.LogLevel()
		payload := map[string]any{
			"service": service,
			"level":   level,
			"message": faker.LogMessage(),
		}
		logErr("audit-logger", publishJSON(ch, topology.ExAuditLogs, "log."+service+"."+level, payload))
	}
}

// RunPaymentProducer simulates payments-gateway processing charges. A
// fraction of payloads are intentionally malformed ("declined") so the
// consumer nacks them into the dead-letter queue, demonstrating DLX flow.
func RunPaymentProducer(ctx context.Context, cfg config.Config, vhost string) {
	conn, err := Dial(cfg, vhost, ConnName("payments-gateway-producer", vhost))
	if err != nil {
		logErr("payments-gateway", err)
		return
	}
	defer conn.Close()
	ch, err := newChannel(conn)
	if err != nil {
		logErr("payments-gateway", err)
		return
	}
	defer ch.Close()

	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(jitter(cfg, 600*time.Millisecond)):
		}

		payload := map[string]any{
			"orderId":  faker.OrderID(),
			"amount":   faker.Amount(),
			"card":     "**** **** **** " + faker.Vehicle("")[0:4],
			"declined": rand.Intn(100) < 15,
		}
		logErr("payments-gateway", publishJSON(ch, topology.ExPayments, topology.RKPaymentProcess, payload))
	}
}

// RunEventStreamProducer floods the append-only events stream with a
// high-rate firehose of platform-wide business events, showcasing
// RabbitMQ's stream queue type.
func RunEventStreamProducer(ctx context.Context, cfg config.Config, vhost string) {
	conn, err := Dial(cfg, vhost, ConnName("events-stream-producer", vhost))
	if err != nil {
		logErr("events-stream", err)
		return
	}
	defer conn.Close()
	ch, err := newChannel(conn)
	if err != nil {
		logErr("events-stream", err)
		return
	}
	defer ch.Close()

	eventTypes := []string{"order.lifecycle", "delivery.lifecycle", "kitchen.lifecycle", "payment.lifecycle"}

	for {
		select {
		case <-ctx.Done():
			return
		case <-time.After(jitter(cfg, 80*time.Millisecond)):
		}

		payload := map[string]any{
			"type":      eventTypes[rand.Intn(len(eventTypes))],
			"entityId":  faker.OrderID(),
			"timestamp": time.Now().UnixMilli(),
		}
		logErr("events-stream", publishJSON(ch, topology.ExEvents, topology.RKEventStream, payload))
	}
}
