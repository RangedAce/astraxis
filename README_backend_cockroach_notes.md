Backend boot issues resolved by:
- Injecting ConfigService in RedisIoAdapter (config undefined error).
- Docker runner now runs pnpm install (with dev) + prisma generate + prune to prod; prisma schema copied before generate.
- Cockroach compose: listen-addr 127.0.0.1:26257, sql-addr 0.0.0.0:26257, http-addr 0.0.0.0:8085, advertise cockroach:26257; host mapping 26258:26257.
- Added cockroach healthcheck + init helper (cockroach-init.sh) to create DB.
