# YS 论坛系统 — 部署指南

## 部署方案选择

本项目为全栈应用（Node.js + SQLite + Socket.io），需"常驻进程 + 文件持久化"。

### 方案一：Sealos（推荐，免银行卡）

国内容器云，免费额度足够，Docker 部署不改代码。需身份证实名认证。

详见：[DEPLOY_SEALOS.md](./DEPLOY_SEALOS.md)

### 方案二：Fly.io（需银行卡，永久免费）

支持持久卷 + WebSocket，24/7 在线，完全免费但需绑卡验证。

详见：[fly.toml](./fly.toml) + [Dockerfile](./Dockerfile)

---

## 本地开发

```bash
# 后端
cd backend && npm install && npm start    # http://localhost:3001

# 前端（开发模式，另开终端）
cd frontend && npm install && npm run dev # http://localhost:5173
```

生产模式：前端构建后由后端静态服务
```bash
cd frontend && npm run build   # 产物在 frontend/dist
cd ../backend && npm start     # 访问 http://localhost:3001
```
