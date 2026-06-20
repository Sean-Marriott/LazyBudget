#!/bin/sh
set -e
echo "Running database migrations..."
npm run db:push -- --force
echo "Starting Next.js..."
exec npm run start
