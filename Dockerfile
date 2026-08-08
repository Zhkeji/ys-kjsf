# YS 论坛系统 — Fly.io 部署配置
# 多阶段构建：前端构建 → 后端依赖 → 运行镜像

# ============ 阶段1: 构建前端 ============
FROM node:20-slim AS frontend-build
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ============ 阶段2: 安装后端依赖 ============
FROM node:20-slim AS backend-deps
WORKDIR /build/backend
# better-sqlite3 需要编译环境
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*
COPY backend/package*.json ./
RUN npm ci --omit=dev

# ============ 阶段3: 运行镜像 ============
FROM node:20-slim AS runtime
WORKDIR /app

# 持久数据目录（挂载到 Fly.io volume）
RUN mkdir -p /data
ENV DATA_DIR=/data
ENV NODE_ENV=production
ENV PORT=8080

# 复制后端代码与依赖
COPY --from=backend-deps /build/backend/node_modules ./backend/node_modules
COPY backend/ ./backend/

# 复制前端构建产物
COPY --from=frontend-build /build/frontend/dist ./frontend/dist

EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:'+process.env.PORT+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

WORKDIR /app/backend
CMD ["node", "server.js"]
