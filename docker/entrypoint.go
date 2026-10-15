package main

import (
	"flag"
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strings"
	"syscall"
	"time"
)

func main() {
	healthCheck := flag.Bool("healthcheck", false, "Perform container healthcheck by verifying HTTP service")
	flag.Parse()

	if *healthCheck {
		client := &http.Client{Timeout: 3 * time.Second}
		resp, err := client.Get("http://127.0.0.1:8080/")
		if err != nil || resp.StatusCode >= 500 {
			os.Exit(1)
		}
		os.Exit(0)
	}

	rabbitURL := os.Getenv("RABBITMQ_URL")
	if rabbitURL == "" {
		rabbitURL = "http://rabbitmq:15672"
	}
	rabbitURL = strings.TrimRight(rabbitURL, "/")

	tmplBytes, err := os.ReadFile("/etc/nginx/templates/default.conf.template")
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to read nginx template: %v\n", err)
		os.Exit(1)
	}

	rendered := strings.ReplaceAll(string(tmplBytes), "${RABBITMQ_URL}", rabbitURL)
	if err := os.WriteFile("/tmp/default.conf", []byte(rendered), 0644); err != nil {
		fmt.Fprintf(os.Stderr, "failed to write rendered nginx configuration: %v\n", err)
		os.Exit(1)
	}

	nginxBin, err := exec.LookPath("nginx")
	if err != nil {
		nginxBin = "/usr/sbin/nginx"
	}

	args := []string{"nginx", "-c", "/etc/nginx/nginx.conf", "-e", "/dev/stderr", "-g", "daemon off;"}
	if len(flag.Args()) > 0 {
		if flag.Args()[0] == "nginx" || strings.HasSuffix(flag.Args()[0], "/nginx") {
			args = flag.Args()
		} else {
			args = append([]string{"nginx"}, flag.Args()...)
		}
	}

	if err := syscall.Exec(nginxBin, args, os.Environ()); err != nil {
		fmt.Fprintf(os.Stderr, "failed to exec nginx: %v\n", err)
		os.Exit(1)
	}
}
