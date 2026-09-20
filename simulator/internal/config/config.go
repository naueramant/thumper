// Package config loads runtime settings for the CarrotWorks platform simulator.
package config

import (
	"fmt"
	"os"
	"strconv"

	amqp "github.com/rabbitmq/amqp091-go"
)

// VHosts are the virtual hosts CarrotWorks runs its whole topology in, each
// with its own exchanges/queues/producers/consumers. The simulator owns and
// creates these itself (see internal/mgmt) — it's a fixed, self-contained
// fictional platform, not a general-purpose load generator, so this isn't
// user-configurable.
var VHosts = []string{"/", "carrotworks-staging", "carrotworks-analytics"}

// Config holds the tunable knobs for a simulator run.
type Config struct {
	// AMQPURL is the RabbitMQ connection URI used by every simulated service.
	// Its vhost segment is swapped out per-vhost when dialing (see VHosts).
	AMQPURL string
	// Scale multiplies publish rates; >1 means busier, <1 means quieter.
	Scale float64
	// ManagementURL is the RabbitMQ HTTP management API base URL, used only
	// to create vhosts (and grant the AMQP user access to them) that don't
	// already exist. AMQP itself has no way to create a vhost.
	ManagementURL      string
	ManagementUser     string
	ManagementPassword string
}

// Load reads configuration from the environment, falling back to sane
// defaults that match the repo's docker-compose RabbitMQ instance.
func Load() Config {
	amqpURL := getEnv("AMQP_URL", "amqp://guest:guest@localhost:5672/")
	uri, err := amqp.ParseURI(amqpURL)
	if err != nil {
		uri = amqp.URI{Scheme: "amqp", Host: "localhost", Port: 5672, Username: "guest", Password: "guest"}
	}

	cfg := Config{
		AMQPURL:            amqpURL,
		Scale:              1.0,
		ManagementURL:      getEnv("SIMULATOR_MANAGEMENT_URL", fmt.Sprintf("http://%s:15672", uri.Host)),
		ManagementUser:     getEnv("SIMULATOR_MANAGEMENT_USER", uri.Username),
		ManagementPassword: getEnv("SIMULATOR_MANAGEMENT_PASSWORD", uri.Password),
	}
	if raw := os.Getenv("SIMULATOR_SCALE"); raw != "" {
		if v, err := strconv.ParseFloat(raw, 64); err == nil && v > 0 {
			cfg.Scale = v
		}
	}
	return cfg
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
