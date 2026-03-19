import { execSync } from 'node:child_process';
import * as path from 'node:path';

const CORE_PRISMA_SCHEMA = path.resolve(
  __dirname,
  '../../node_modules/@revisium/core/dist/prisma/schema.prisma',
);

export function runMigrations() {
  execSync(`npx prisma migrate deploy --schema "${CORE_PRISMA_SCHEMA}"`, {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    stdio: 'pipe',
  });
}

export function runSeed() {
  const seedScript = path.resolve(
    __dirname,
    '../../node_modules/@revisium/core/dist/prisma/seed.js',
  );

  execSync(`node --experimental-require-module "${seedScript}"`, {
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL,
    },
    stdio: 'pipe',
  });
}
