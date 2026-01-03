FROM node:20-bullseye-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-workspace.yaml tsconfig.base.json .npmrc .prettierrc ./
COPY apps/backend/package.json apps/backend/nest-cli.json apps/backend/tsconfig*.json apps/backend/.eslintrc.js apps/backend/.env.example ./apps/backend/
COPY packages/shared/package.json packages/shared/tsconfig*.json packages/shared/.eslintrc.js ./packages/shared/

RUN pnpm install --ignore-scripts

COPY . .

RUN pnpm --filter @astraxis/shared build && pnpm --filter backend build

FROM node:20-bullseye-slim AS runner
ENV NODE_ENV=production
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app
COPY --from=base /app/node_modules /app/node_modules
COPY --from=base /app/apps/backend/dist /app/apps/backend/dist
COPY --from=base /app/apps/backend/package.json /app/apps/backend/package.json
COPY --from=base /app/apps/backend/.env.example /app/apps/backend/.env.example

EXPOSE 3001
CMD ["node", "apps/backend/dist/main.js"]
