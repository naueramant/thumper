// Package faker generates fun, on-theme fake data for the CarrotWorks
// Logistics & Kitchens Inc. platform simulator.
package faker

import (
	"fmt"
	"math/rand"
)

var (
	firstNames = []string{"Bugs", "Roger", "Ginger", "Peter", "Flopsy", "Thumper", "Clover", "Hazel", "Bigwig", "Dill"}
	lastNames  = []string{"Longears", "Carrotson", "Warrenby", "Burrowes", "Twitchnose", "Hopkins", "Munch", "Sprout", "Fernsby", "Dandelion"}

	cities = []struct {
		Name   string
		Region string
	}{
		{"Rotterdam", "eu-west"}, {"Berlin", "eu-west"}, {"Warsaw", "eu-east"},
		{"Austin", "us-east"}, {"Denver", "us-east"}, {"Portland", "us-west"},
		{"Singapore", "apac"}, {"Osaka", "apac"}, {"Sydney", "apac"},
	}

	foods = []string{"Carrot Ramen", "Kale Tacos", "Burrow Bao Buns", "Warren Waffles", "Clover Salad", "Meadow Pizza", "Lettuce Wraps", "Turnip Tempura", "Sprout Sushi", "Garden Gyoza"}

	vehicleTypes = []string{"bike", "van", "drone"}

	services = []string{"order-api", "kitchen-worker", "delivery-tracker", "payments-gateway", "fleet-controller", "notification-hub"}

	logLevels   = []string{"debug", "info", "warning", "error"}
	logMessages = []string{
		"handled request", "cache miss, recomputing", "retrying downstream call",
		"connection pool exhausted", "slow query detected", "rate limit hit",
		"unexpected nil pointer recovered", "queue depth above threshold",
	}
)

// Name returns a fictional CarrotWorks employee/customer name.
func Name() string {
	return fmt.Sprintf("%s %s", pick(firstNames), pick(lastNames))
}

// City returns a delivery city plus its logistics region code.
func City() (string, string) {
	c := cities[rand.Intn(len(cities))]
	return c.Name, c.Region
}

// Food returns a fictional CarrotWorks Kitchens menu item.
func Food() string {
	return pick(foods)
}

// VehicleType returns one of CarrotWorks Fleet's vehicle categories.
func VehicleType() string {
	return pick(vehicleTypes)
}

// Vehicle returns a fun fleet vehicle identifier, e.g. "van-042".
func Vehicle(kind string) string {
	return fmt.Sprintf("%s-%03d", kind, rand.Intn(200))
}

// ServiceName returns a fictional microservice name for log/audit events.
func ServiceName() string {
	return pick(services)
}

// LogLevel returns a random log severity, weighted towards info/debug.
func LogLevel() string {
	// Weighted so error/warning are rarer than info/debug.
	r := rand.Intn(100)
	switch {
	case r < 50:
		return "info"
	case r < 75:
		return "debug"
	case r < 92:
		return "warning"
	default:
		return "error"
	}
}

// LogMessage returns a fictional log line body.
func LogMessage() string {
	return pick(logMessages)
}

// OrderID returns a fictional CarrotWorks order number.
func OrderID() string {
	return fmt.Sprintf("CW-ORD-%06d", rand.Intn(999999))
}

// Amount returns a random order/payment amount in cents.
func Amount() int {
	return 500 + rand.Intn(9500)
}

func pick(items []string) string {
	return items[rand.Intn(len(items))]
}
