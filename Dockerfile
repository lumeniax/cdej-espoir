# ============================================================
# CDEJ Espoir TG0154 — Dockerfile multi-stage
# ============================================================

FROM node:24-alpine AS base
RUN npm install -g pnpm@10
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY tsconfig.base.json tsconfig.json ./
COPY lib/db/package.json ./lib/db/
COPY lib/api-spec/package.json ./lib/api-spec/
COPY lib/api-zod/package.json ./lib/api-zod/
COPY lib/api-client-react/package.json ./lib/api-client-react/
COPY artifacts/api-server/package.json ./artifacts/api-server/
COPY artifacts/cdej-espoir/package.json ./artifacts/cdej-espoir/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy all source files
COPY lib/ ./lib/
COPY artifacts/ ./artifacts/
COPY scripts/ ./scripts/

# ---- API build ----
FROM base AS api-build
WORKDIR /app
RUN pnpm --filter @workspace/api-server run build

# ---- Frontend build ----
FROM base AS frontend-build
WORKDIR /app
ARG VITE_API_BASE_URL=/api
ENV BASE_PATH=/
ENV PORT=4000
RUN pnpm --filter @workspace/cdej-espoir run build

# ---- API runtime ----
FROM node:24-alpine AS api
RUN npm install -g pnpm@10
WORKDIR /app
COPY --from=api-build /app/artifacts/api-server/dist ./dist
COPY --from=api-build /app/node_modules ./node_modules
COPY --from=api-build /app/artifacts/api-server/package.json ./
EXPOSE 8080
CMD ["node", "--enable-source-maps", "./dist/index.mjs"]

# ---- Frontend runtime (nginx) ----
FROM nginx:alpine AS frontend
COPY --from=frontend-build /app/artifacts/cdej-espoir/dist/public /usr/share/nginx/html
COPY nginx-frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
