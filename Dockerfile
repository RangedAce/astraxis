FROM node:20-bullseye-slim AS base
ENV PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

# Workspace metadata and package manifests (minimal for install)
COPY package.json pnpm-workspace.yaml tsconfig.base.json .npmrc .prettierrc ./
COPY apps/backend/package.json apps/backend/tsconfig*.json apps/backend/nest-cli.json ./apps/backend/
COPY apps/frontend/package.json apps/frontend/tsconfig.json apps/frontend/next.config.js ./apps/frontend/
COPY packages/shared/package.json packages/shared/tsconfig*.json ./packages/shared/

ENV DATABASE_URL="postgresql://root@localhost:26257/astraxis?sslmode=disable"

RUN pnpm install --ignore-scripts

# Full sources for build
COPY . .

RUN pnpm --filter backend prisma:generate \
 && pnpm --filter @astraxis/shared build \
 && pnpm --filter backend build \
 && pnpm --filter frontend build

FROM node:20-bullseye-slim AS runner
ENV PNPM_HOME="/pnpm" \
    PATH="$PNPM_HOME:$PATH" \
    NODE_ENV=production
RUN corepack enable
WORKDIR /app

# Runtime deps + built artefacts
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/apps/backend/dist /app/apps/backend/dist
COPY --from=base /app/apps/frontend/.next /app/apps/frontend/.next
COPY --from=base /app/apps/frontend/public /app/apps/frontend/public
COPY --from=base /app/package.json /app/pnpm-workspace.yaml /app/tsconfig.base.json /app/.npmrc /app/.prettierrc ./
COPY --from=base /app/apps/backend/package.json /app/apps/backend/
COPY --from=base /app/apps/frontend/package.json /app/apps/frontend/
COPY --from=base /app/packages/shared/package.json /app/packages/shared/

# Entrypoint multi-rôle
CMD case "$ROLE" in \
    backend|api) node apps/backend/dist/main.js ;; \
    frontend|web) pnpm --filter frontend start ;; \
    *) echo "Unknown ROLE=$ROLE" && exit 1 ;; \
   esac
