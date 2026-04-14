# ============================================
# Trinity-AI — HF Spaces Dockerfile
# ============================================
# Stage 1: Build
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY . .
RUN npm run build

# Stage 2: Serve
FROM node:20-slim

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/dist ./dist

# HF Spaces injects PORT env var (default 7860)
# The app listens on whatever PORT is set
ENV HOST=0.0.0.0

EXPOSE 7860

CMD ["sh", "-c", "serve -s dist -l ${PORT:-7860} -n --no-clipboard"]
