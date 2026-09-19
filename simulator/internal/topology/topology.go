// Package topology declares every exchange, queue and binding for the
// fictional "CarrotWorks Logistics & Kitchens Inc." platform used to
// generate realistic-looking load for the rabbitdash UI.
package topology

import amqp "github.com/rabbitmq/amqp091-go"

// Exchange names.
const (
	ExOrders      = "carrotworks.orders"          // direct
	ExKitchen     = "carrotworks.kitchen"         // direct
	ExDelivery    = "carrotworks.delivery"        // topic
	ExNotify      = "carrotworks.notifications"   // fanout
	ExTelemetry   = "carrotworks.fleet.telemetry" // headers
	ExAuditLogs   = "carrotworks.audit.logs"      // topic
	ExPayments    = "carrotworks.payments"        // direct
	ExPaymentsDLX = "carrotworks.payments.dlx"    // fanout (dead-letter)
	ExEvents      = "carrotworks.events"          // direct (feeds the stream queue)
)

// Routing keys.
const (
	RKOrderCreated   = "order.created"
	RKOrderPaid      = "order.paid"
	RKOrderCancelled = "order.cancelled"
	RKOrderVIP       = "order.vip"

	RKKitchenNew   = "kitchen.ticket.new"
	RKKitchenReady = "kitchen.ticket.ready"

	RKPaymentProcess = "payment.process"
	RKPaymentDead    = "payment.dead"

	RKEventStream = "event.stream"
)

// Queue names.
const (
	QOrdersCreated   = "orders.created"
	QOrdersPaid      = "orders.paid"
	QOrdersCancelled = "orders.cancelled"
	QOrdersVIP       = "orders.vip"

	QKitchenNew   = "kitchen.tickets.new"
	QKitchenReady = "kitchen.tickets.ready"

	QDeliveryEU   = "delivery.eu"
	QDeliveryUS   = "delivery.us"
	QDeliveryAPAC = "delivery.apac"
	QDeliveryAll  = "delivery.all"

	QNotifyEmail = "notifications.email"
	QNotifySMS   = "notifications.sms"
	QNotifyPush  = "notifications.push"

	QTelemetryGPS     = "telemetry.gps"
	QTelemetryTemp    = "telemetry.temperature"
	QTelemetryBattery = "telemetry.drone-battery"

	QLogsErrors = "logs.errors"
	QLogsWarn   = "logs.warnings"
	QLogsAll    = "logs.all"

	QPaymentsProcess = "payments.process"
	QPaymentsDead    = "payments.dead"

	QEventsStream = "events.stream"
)

// Declare creates every exchange, queue and binding used by the simulator.
// It is idempotent and safe to call every time the simulator starts.
func Declare(conn *amqp.Connection) error {
	ch, err := conn.Channel()
	if err != nil {
		return err
	}
	defer ch.Close()

	if err := declareExchanges(ch); err != nil {
		return err
	}
	if err := declareOrderQueues(ch); err != nil {
		return err
	}
	if err := declareKitchenQueues(ch); err != nil {
		return err
	}
	if err := declareDeliveryQueues(ch); err != nil {
		return err
	}
	if err := declareNotificationQueues(ch); err != nil {
		return err
	}
	if err := declareTelemetryQueues(ch); err != nil {
		return err
	}
	if err := declareLogQueues(ch); err != nil {
		return err
	}
	if err := declarePaymentQueues(ch); err != nil {
		return err
	}
	if err := declareEventStream(ch); err != nil {
		return err
	}
	return nil
}

func declareExchanges(ch *amqp.Channel) error {
	exchanges := []struct {
		name string
		kind string
	}{
		{ExOrders, amqp.ExchangeDirect},
		{ExKitchen, amqp.ExchangeDirect},
		{ExDelivery, amqp.ExchangeTopic},
		{ExNotify, amqp.ExchangeFanout},
		{ExTelemetry, amqp.ExchangeHeaders},
		{ExAuditLogs, amqp.ExchangeTopic},
		{ExPayments, amqp.ExchangeDirect},
		{ExPaymentsDLX, amqp.ExchangeFanout},
		{ExEvents, amqp.ExchangeDirect},
	}
	for _, e := range exchanges {
		if err := ch.ExchangeDeclare(e.name, e.kind, true, false, false, false, nil); err != nil {
			return err
		}
	}
	return nil
}

func declareOrderQueues(ch *amqp.Channel) error {
	if _, err := ch.QueueDeclare(QOrdersCreated, true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.QueueBind(QOrdersCreated, RKOrderCreated, ExOrders, false, nil); err != nil {
		return err
	}

	// Quorum queue: paid orders must survive node loss.
	if _, err := ch.QueueDeclare(QOrdersPaid, true, false, false, false, amqp.Table{
		"x-queue-type": "quorum",
	}); err != nil {
		return err
	}
	if err := ch.QueueBind(QOrdersPaid, RKOrderPaid, ExOrders, false, nil); err != nil {
		return err
	}

	if _, err := ch.QueueDeclare(QOrdersCancelled, true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.QueueBind(QOrdersCancelled, RKOrderCancelled, ExOrders, false, nil); err != nil {
		return err
	}

	// Priority queue: VIP carrot-club members jump the line.
	if _, err := ch.QueueDeclare(QOrdersVIP, true, false, false, false, amqp.Table{
		"x-max-priority": 10,
	}); err != nil {
		return err
	}
	return ch.QueueBind(QOrdersVIP, RKOrderVIP, ExOrders, false, nil)
}

func declareKitchenQueues(ch *amqp.Channel) error {
	if _, err := ch.QueueDeclare(QKitchenNew, true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.QueueBind(QKitchenNew, RKKitchenNew, ExKitchen, false, nil); err != nil {
		return err
	}

	if _, err := ch.QueueDeclare(QKitchenReady, true, false, false, false, nil); err != nil {
		return err
	}
	return ch.QueueBind(QKitchenReady, RKKitchenReady, ExKitchen, false, nil)
}

func declareDeliveryQueues(ch *amqp.Channel) error {
	bindings := []struct {
		queue   string
		pattern string
		quorum  bool
	}{
		{QDeliveryEU, "delivery.eu-*.#", false},
		{QDeliveryUS, "delivery.us-*.#", false},
		{QDeliveryAPAC, "delivery.apac-*.#", false},
		{QDeliveryAll, "delivery.#", true},
	}
	for _, b := range bindings {
		var args amqp.Table
		if b.quorum {
			args = amqp.Table{"x-queue-type": "quorum"}
		}
		if _, err := ch.QueueDeclare(b.queue, true, false, false, false, args); err != nil {
			return err
		}
		if err := ch.QueueBind(b.queue, b.pattern, ExDelivery, false, nil); err != nil {
			return err
		}
	}
	return nil
}

func declareNotificationQueues(ch *amqp.Channel) error {
	for _, q := range []string{QNotifyEmail, QNotifySMS, QNotifyPush} {
		if _, err := ch.QueueDeclare(q, true, false, false, false, nil); err != nil {
			return err
		}
		if err := ch.QueueBind(q, "", ExNotify, false, nil); err != nil {
			return err
		}
	}
	return nil
}

func declareTelemetryQueues(ch *amqp.Channel) error {
	bindings := []struct {
		queue string
		args  amqp.Table
	}{
		{QTelemetryGPS, amqp.Table{"x-match": "any", "sensor": "gps"}},
		{QTelemetryTemp, amqp.Table{"x-match": "any", "sensor": "temperature"}},
		{QTelemetryBattery, amqp.Table{"x-match": "all", "sensor": "battery", "vehicle-type": "drone"}},
	}
	for _, b := range bindings {
		if _, err := ch.QueueDeclare(b.queue, true, false, false, false, nil); err != nil {
			return err
		}
		if err := ch.QueueBind(b.queue, "", ExTelemetry, false, b.args); err != nil {
			return err
		}
	}
	return nil
}

func declareLogQueues(ch *amqp.Channel) error {
	if _, err := ch.QueueDeclare(QLogsErrors, true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.QueueBind(QLogsErrors, "log.*.error", ExAuditLogs, false, nil); err != nil {
		return err
	}

	if _, err := ch.QueueDeclare(QLogsWarn, true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.QueueBind(QLogsWarn, "log.*.warning", ExAuditLogs, false, nil); err != nil {
		return err
	}

	// Firehose of every log line, with a short TTL to mimic log retention.
	if _, err := ch.QueueDeclare(QLogsAll, true, false, false, false, amqp.Table{
		"x-message-ttl": int32(60000),
	}); err != nil {
		return err
	}
	return ch.QueueBind(QLogsAll, "log.#", ExAuditLogs, false, nil)
}

func declarePaymentQueues(ch *amqp.Channel) error {
	// Dead-letter target first, so the main queue can reference it.
	if _, err := ch.QueueDeclare(QPaymentsDead, true, false, false, false, nil); err != nil {
		return err
	}
	if err := ch.QueueBind(QPaymentsDead, "", ExPaymentsDLX, false, nil); err != nil {
		return err
	}

	if _, err := ch.QueueDeclare(QPaymentsProcess, true, false, false, false, amqp.Table{
		"x-dead-letter-exchange": ExPaymentsDLX,
	}); err != nil {
		return err
	}
	return ch.QueueBind(QPaymentsProcess, RKPaymentProcess, ExPayments, false, nil)
}

func declareEventStream(ch *amqp.Channel) error {
	if _, err := ch.QueueDeclare(QEventsStream, true, false, false, false, amqp.Table{
		"x-queue-type": "stream",
	}); err != nil {
		return err
	}
	return ch.QueueBind(QEventsStream, RKEventStream, ExEvents, false, nil)
}
