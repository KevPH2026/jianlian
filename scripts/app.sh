#!/bin/sh
set -e
npx prisma generate
npx prisma db push
npx tsx prisma/seed.ts
npx next start
true
