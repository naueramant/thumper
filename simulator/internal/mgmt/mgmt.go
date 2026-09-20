// Package mgmt talks to the RabbitMQ HTTP management API to provision
// virtual hosts and permissions before the simulator connects over AMQP,
// which has no protocol-level way to create a vhost.
package mgmt

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"

	"github.com/rabbitdash/simulator/internal/config"
)

// EnsureVHost makes sure vhost exists (idempotent PUT) and that the
// configured management user has full permissions on it, so the simulator
// can declare topology and publish/consume there over AMQP.
func EnsureVHost(cfg config.Config, vhost string) error {
	encoded := url.PathEscape(vhost)

	if err := put(cfg, "/api/vhosts/"+encoded, map[string]any{
		"description": "CarrotWorks simulator vhost",
		"tags":        "carrotworks-simulator",
	}); err != nil {
		return fmt.Errorf("create vhost %q: %w", vhost, err)
	}

	if err := put(cfg, "/api/permissions/"+encoded+"/"+url.PathEscape(cfg.ManagementUser), map[string]any{
		"configure": ".*",
		"write":     ".*",
		"read":      ".*",
	}); err != nil {
		return fmt.Errorf("grant permissions on vhost %q: %w", vhost, err)
	}

	return nil
}

func put(cfg config.Config, path string, body map[string]any) error {
	payload, err := json.Marshal(body)
	if err != nil {
		return err
	}

	req, err := http.NewRequest(http.MethodPut, cfg.ManagementURL+path, bytes.NewReader(payload))
	if err != nil {
		return err
	}
	req.SetBasicAuth(cfg.ManagementUser, cfg.ManagementPassword)
	req.Header.Set("Content-Type", "application/json")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	// 201 Created or 204 No Content (already exists/updated) are both fine.
	if resp.StatusCode != http.StatusCreated && resp.StatusCode != http.StatusNoContent {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("unexpected status %d: %s", resp.StatusCode, respBody)
	}
	return nil
}
