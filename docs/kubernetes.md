# Running Thumper in Kubernetes

This guide covers deploying Thumper in a Kubernetes cluster alongside RabbitMQ.

---

## 1. Overview

Thumper runs as a lightweight, unprivileged container that serves the static SPA assets and proxies `/api/*` calls internally to the RabbitMQ Kubernetes service. This avoids exposing RabbitMQ's management port (`15672`) publicly.

---

## 2. Manifests

### Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: thumper
  namespace: rabbitmq
  labels:
    app: thumper
spec:
  replicas: 2
  selector:
    matchLabels:
      app: thumper
  template:
    metadata:
      labels:
        app: thumper
    spec:
      securityContext:
        runAsNonRoot: true
        runAsUser: 101
      containers:
        - name: thumper
          image: your-registry/thumper:latest
          imagePullPolicy: IfNotPresent
          ports:
            - containerPort: 8080
              name: http
          env:
            # Internal service URL of your RabbitMQ instance
            - name: RABBITMQ_URL
              value: "http://rabbitmq.rabbitmq.svc.cluster.local:15672"
          resources:
            requests:
              cpu: 50m
              memory: 64Mi
            limits:
              cpu: 250m
              memory: 128Mi
          livenessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 5
            periodSeconds: 15
          readinessProbe:
            httpGet:
              path: /
              port: http
            initialDelaySeconds: 2
            periodSeconds: 10
```

### Service & Ingress

```yaml
apiVersion: v1
kind: Service
metadata:
  name: thumper
  namespace: rabbitmq
spec:
  type: ClusterIP
  ports:
    - port: 80
      targetPort: 8080
      name: http
  selector:
    app: thumper
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: thumper
  namespace: rabbitmq
spec:
  rules:
    - host: rabbitmq.company.io
      http:
        paths:
          - path: /
            pathType: Prefix
            backend:
              service:
                name: thumper
                port:
                  number: 80
```
