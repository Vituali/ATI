#!/bin/sh
set -e

echo "--- ATI API — Entrypoint ---"

# Wait for Postgres to be ready
if [ -n "$DATABASE_URL" ]; then
  echo "Waiting for PostgreSQL..."
  host=$(echo "$DATABASE_URL" | sed -E 's|.*@([^:/]+).*|\1|')
  port=$(echo "$DATABASE_URL" | sed -E 's|.*:([0-9]+)/.*|\1|')
  port=${port:-5432}

  for i in $(seq 1 30); do
    if node -e "
      const n = require('net');
      const [h, p] = process.argv[1].split(':');
      const s = n.connect(+p, h, () => { s.end(); process.exit(0); });
      s.on('error', () => process.exit(1));
    " "$host:$port" 2>/dev/null; then
      echo "PostgreSQL is ready!"
      break
    fi
    if [ "$i" -eq 30 ]; then
      echo "ERROR: PostgreSQL did not become ready in time."
      exit 1
    fi
    echo "  Attempt $i/30 — waiting..."
    sleep 2
  done
fi

# Run pending migrations
echo "Running database migrations..."
npx prisma migrate deploy --schema ./prisma/schema.prisma

# Start the application
echo "Starting API server..."
exec "$@"
