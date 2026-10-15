# Running Thumper with Docker

This guide covers running Thumper using Docker CLI and Docker Compose.

---

## 1. Quick Start (`docker run`)

Run the prebuilt Thumper image pointing to your RabbitMQ management API:

```bash
docker run -d \
  --name thumper \
  -p 8080:8080 \
  -e RABBITMQ_URL="http://your-rabbitmq-host:15672" \
  thumper:latest
```

Open [http://localhost:8080](http://localhost:8080) in your browser and sign in with your RabbitMQ credentials.

### Configuration Reference

| Environment Variable | Default | Description |
| :--- | :--- | :--- |
| `RABBITMQ_URL` | `http://rabbitmq:15672` | The HTTP URL of the RabbitMQ Management API (without trailing slash). |

---

## 2. Docker Compose

To run Thumper alongside a RabbitMQ broker, add the following to your `docker-compose.yml`:

```yaml
services:
  rabbitmq:
    image: rabbitmq:4-management
    container_name: rabbitmq
    ports:
      - "5672:5672"   # AMQP protocol
      - "15672:15672" # Management UI / HTTP API
    environment:
      RABBITMQ_DEFAULT_USER: guest
      RABBITMQ_DEFAULT_PASS: guest
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq

  thumper:
    image: thumper:latest
    build: .
    container_name: thumper
    ports:
      - "8080:8080"
    environment:
      # Internal Docker network DNS to RabbitMQ
      RABBITMQ_URL: "http://rabbitmq:15672"
    depends_on:
      - rabbitmq

volumes:
  rabbitmq_data:
```

Start both services:

```bash
docker compose up -d
```

Access Thumper at [http://localhost:8080](http://localhost:8080).

---

## 3. Building the Image Locally

```bash
# Build the image
docker build -t thumper:latest .

# Run pointing to a broker on host machine
docker run -d \
  -p 8080:8080 \
  -e RABBITMQ_URL="http://host.docker.internal:15672" \
  thumper:latest
```
