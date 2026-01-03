FROM node:20-bullseye-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json .npmrc .prettierrc ./
COPY apps/frontend/package.json apps/frontend/tsconfig.json apps/frontend/next.config.js ./apps/frontend/
COPY packages/shared/package.json packages/shared/tsconfig*.json packages/shared/.eslintrc.js ./packages/shared/

RUN pnpm install --ignore-scripts

COPY . .

RUN pnpm --filter @astraxis/shared build && pnpm --filter frontend build

FROM node:20-bullseye-slim AS runner
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
ENV NODE_ENV=production
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/apps/frontend/.next /app/apps/frontend/.next
COPY --from=base /app/apps/frontend/public /app/apps/frontend/public
COPY --from=base /app/apps/frontend/package.json /app/apps/frontend/package.json

ENV PORT=3000
EXPOSE 3000
CMD ["pnpm", "--filter", "frontend", "start"]
