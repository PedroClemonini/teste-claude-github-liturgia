#!/bin/sh
set -e

echo "Aplicando o schema do Prisma no banco de dados..."
npx prisma db push --skip-generate

if [ "$SEED_DB" = "true" ]; then
  echo "Populando o banco com dados de exemplo..."
  npm run db:seed
fi

echo "Iniciando o servidor Next.js..."
exec npm run start
