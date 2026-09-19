// Package config loads runtime settings for the CarrotWorks platform simulator.
package config

import (
	"os"
	"strconv"
)

// Config holds the tunable knobs for a simulator run.
type Config struct {
	// AMQPURL is the RabbitMQ connection URI used by every simulated service.
	AMQPURL string
	// Scale multiplies publish rates; >1 means busier, <1 means quieter.
	Scale float64
}

// Load reads configuration from the environment, falling back to sane
// defaults that match the repo's docker-compose RabbitMQ instance.
func Load() Config {
	cfg := Config{
		AMQPURL: getEnv("AMQP_URL", "amqp://guest:guest@localhost:5672/"),
		Scale:   1.0,
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
