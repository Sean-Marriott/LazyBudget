#!/bin/sh
set -e
echo "Running database migrations..."
npm run db:push
echo "Starting Next.js..."
exec npm run start
