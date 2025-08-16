# Kubernetes Deployment Notes

1) Build and push your image

- Update `k8s/deployment.yaml` image to your registry.
- Build from backend/ directory.

2) Create config and secret

```bash
kubectl create configmap agenthub-config \
  --from-literal=NODE_ENV=production \
  --from-literal=CORS_ORIGINS="http://localhost:3000" \
  --from-literal=RATE_LIMIT_WINDOW_MS=60000 \
  --from-literal=RATE_LIMIT_MAX=100

kubectl create secret generic agenthub-secrets \
  --from-literal=DATABASE_URL="postgresql://user:pass@host:5432/db?schema=public" \
  --from-literal=JWT_SECRET="replace-with-strong-secret"
```

3) Apply manifests

```bash
kubectl apply -f k8s/deployment.yaml
kubectl apply -f k8s/service.yaml
```

4) Access

- Service is ClusterIP on port 80 -> containerPort 3000
- Use an Ingress or port-forward for external access.
