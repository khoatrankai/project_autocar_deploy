# 1. Giai đoạn Build
FROM node:20-alpine AS builder 
WORKDIR /app

# [MỚI] Cài OpenSSL để Prisma generate đúng phiên bản
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci
COPY . .

# Generate Prisma Client (Lúc này đã có openssl nên nó sẽ gen bản 3.0)
RUN npx prisma generate 
RUN npm run build

# 2. Giai đoạn Run
FROM node:20-alpine
WORKDIR /app

# [MỚI] Cài OpenSSL để môi trường chạy (Production) có thư viện sử dụng
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci --only=production

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/main"]