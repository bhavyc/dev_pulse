# Backend Dockerfile for DevPulse
FROM node:22-alpine AS builder

WORKDIR /app

# Copy root and package manifests
COPY package.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

RUN npm install

# Copy source code
COPY shared/ ./shared/
COPY backend/ ./backend/

# Build shared package and backend
RUN npm --workspace=shared run build
RUN npx prisma generate --schema backend/prisma/schema.prisma
RUN npm --workspace=backend run build

# Production runtime stage
FROM node:22-alpine AS runner

WORKDIR /app
ENV NODE_ENV=production

COPY package.json ./
COPY shared/package.json ./shared/
COPY backend/package.json ./backend/

RUN npm install --omit=dev

COPY --from=builder /app/shared/dist ./shared/dist
COPY --from=builder /app/backend/dist ./backend/dist
COPY --from=builder /app/backend/prisma ./backend/prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

EXPOSE 5000

CMD ["node", "backend/dist/server.js"]
