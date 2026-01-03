#!/usr/bin/env bash
set -e

# Wait for cockroach to accept SQL connections
until /cockroach/cockroach sql --insecure --host=cockroach:26257 -e "SELECT 1" >/dev/null 2>&1; do
  echo "Waiting for CockroachDB..."
  sleep 1
done

/cockroach/cockroach sql --insecure --host=cockroach:26257 -e "CREATE DATABASE IF NOT EXISTS astraxis;"
