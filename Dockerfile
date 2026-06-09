FROM node:24.11.1 AS builder

ENV NODE_ENV=development

WORKDIR /home/app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./

RUN pnpm install --frozen-lockfile --ignore-scripts \
 && pnpm rebuild bcrypt sharp @swc/core @prisma/engines prisma

COPY . .

RUN pnpm run build

FROM  node:24.11.1-bullseye-slim

ENV NODE_ENV=production

RUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/* \
    && groupadd -r appuser && useradd -r -g appuser appuser

WORKDIR /home/app

COPY --from=builder /home/app/package*.json ./
COPY --from=builder /home/app/prisma/ ./prisma/
COPY --from=builder /home/app/prisma.config.ts ./
COPY --from=builder /home/app/dist/ ./dist/
COPY --from=builder /home/app/node_modules/ ./node_modules/

RUN chown -R appuser:appuser /home/app
USER appuser

CMD ["npm", "run", "start:prod"]
