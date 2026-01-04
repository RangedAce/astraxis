# Astraxis — V1 Scaffold

Monorepo TypeScript (pnpm) pour un OGame-like temps réel : NestJS + Prisma + Socket.IO + BullMQ côté backend, Next.js (App Router) côté frontend, formules/types partagées dans `packages/shared`. CockroachDB (cluster 3 nœuds) pour la persistance, Redis pour le pub/sub Socket.IO et BullMQ. Déploiement via Docker + Traefik.

## Démarrage rapide (Docker)
1. Assurez-vous d’avoir Docker/Compose et `pnpm` (corepack) activé.
2. Construire et lancer tous les services :  
   ```bash
   docker compose -f infra/docker/docker-compose.dev.yml up --build
   ```
3. Backend API/WebSocket: `http://localhost/api` (Traefik) ou `http://localhost:3001/api` directement.  
   Frontend Next.js: `http://localhost` (Traefik) ou `http://localhost:3000`.  
   Cockroach UI: `http://localhost:8080`. Redis: `localhost:6379`.

## Dev local (hors Docker)
```bash
pnpm install
pnpm --filter @astraxis/shared build
pnpm --filter backend prisma:generate
# Appliquer la migration initiale (Cockroach/Postgres accessible via DATABASE_URL)
pnpm --filter backend prisma:migrate
pnpm --filter backend seed
pnpm run dev   # démarre backend + frontend en parallèle
```

## Schéma & données
- Prisma schema : `apps/backend/prisma/schema.prisma`
- Migration initiale : `apps/backend/prisma/migrations/0001_init`
- Seed (univers Alpha + création DB) : `apps/backend/prisma/seed.ts`

## Backend (NestJS)
- Dossier: `apps/backend`
- Auth: /auth/register, /auth/login, /auth/refresh, /auth/logout, /auth/me
- Univers: GET /universes, POST /universes (header `x-admin-token`, env `ADMIN_TOKEN`)
- Gameplay: /universe/:id/planet/:planetId/overview, /planet/:planetId/buildings/start, /player/research/start, /planet/:planetId/ships/start, /planet/:planetId/queue
- WebSocket namespace `/socket` (Socket.IO + Redis adapter). Rooms par `playerId`.
- Jobs BullMQ (Redis) pour finaliser les QueueItem à `endAt`.
- Ressources calculées à la demande via timestamps (pas de tick global).

## Frontend (Next.js)
- Dossier: `apps/frontend`
- Pages: `/login`, `/register`, `/overview` (ressources live, boutons construction/recherche/vaisseaux, file d’attente avec countdown).
- Page admin: `/admin/universes` (creation d univers, token requis).
- Socket.IO client pour mises à jour en temps réel. API base configurable via `NEXT_PUBLIC_API_URL`.

## Docker / déploiement
- Image unique multi-rôle (Dockerfile racine ou `ghcr.io/rangedace/astraxis:latest`), contrôlée par `ROLE` (`backend`/`frontend`).
- Stacks disponibles pour Portainer (standalone ou séparées) dans `infra/docker/` :
  - `docker-compose.portainer.yml` : cockroach (1 nœud), redis, backend, frontend (frontend exposé sur `32601:3000`).
  - `docker-compose.backend.yml` : cockroach + redis + backend uniquement.
  - `docker-compose.frontend.yml` : frontend seul (à pointer vers un backend existant via `NEXT_PUBLIC_API_URL`).
- Volumes : `astraxis_db_data` pour persister Cockroach.
- Ports par défaut : backend 3001, frontend 32601, Cockroach SQL 26257, UI 8080.
- Variable admin : `ADMIN_TOKEN` (utilisée par `/admin/universes` pour créer des univers).

## Notes
- TypeScript strict partout (base tsconfig partagé).
- Logs structurés via `nestjs-pino`.
- Pas de limite dure sur les niveaux; coûts/temps exponentiels définis dans `packages/shared`.
- Mode pacifique flaggé au niveau univers/joueur (la partie combat viendra plus tard).
