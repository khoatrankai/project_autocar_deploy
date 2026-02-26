# 1. Giai đoạn Build
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Inject biến môi trường vào lúc build
ARG VITE_API_URL=http://103.48.84.245:3000
ARG VITE_SUPABASE_URL=http://103.48.84.245:8000
# Key này lấy từ file .env ở Bước 1 (ANON_KEY)
ARG VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzE1MDAwMDAwLCJleHAiOjIwMzAwNjcyMDB9.ExampleAnonSignature_ChangeThisIdeally

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY

RUN npm run build

# 2. Giai đoạn Run với Nginx
FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]