# ── Stage 1: Build React app ──────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Accept server IP/domain at build time — baked into the React bundle
ARG REACT_APP_API_URL=""
ENV REACT_APP_API_URL=${REACT_APP_API_URL}

# Install dependencies first (layer cached unless package.json changes)
COPY package.json package-lock.json* ./
RUN npm ci --silent

# Copy source and build
COPY . .
RUN npm run build


# ── Stage 2: Nginx serves the built React app ─────────────────────────────────
FROM nginx:1.27-alpine AS production

# Copy built React files
COPY --from=builder /app/build /usr/share/nginx/html

# nginx.conf is NOT baked in here — it is mounted from the backend repo
# via docker-compose: ./docker/nginx.conf:/etc/nginx/conf.d/default.conf:ro

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

