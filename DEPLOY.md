# YS 论坛系统 — 部署指南

## 免费部署到 Fly.io

> 适合本项目的全栈架构（Node.js + SQLite + Socket.io），支持数据持久化和 WebSocket 长连接。

### 前置条件

1. **注册 Fly.io 账号**（免费）：https://fly.io/app/sign-up
   - 可直接用 GitHub 账号登录
2. **安装 flyctl CLI**：
   ```bash
   # macOS
   brew install flyctl
   # Linux
   curl -L https://fly.io/install.sh | sh
   # Windows (PowerShell)
   pwsh -Command "iwr https://fly.io/install.ps1 -useb | iex"
   ```
3. **登录**：
   ```bash
   fly auth login
   ```

### 部署步骤

在项目根目录执行：

```bash
# 1. 首次部署（自动创建应用 + 构建镜像）
fly deploy

# 2. 创建持久卷（保存数据库和上传文件，1GB 足够）
fly volumes create ys_data --size 1

# 3. 再次部署挂载卷
fly deploy

# 4. 打开访问
fly open
```

部署完成后会得到地址，如 `https://ys-kjsf.fly.dev`。

### 免费额度说明

| 资源 | 免费额度 | 本项目用量 |
|------|---------|-----------|
| VM | 3 × 256MB × 750h/月 | 1 台常驻 |
| 持久卷 | 3GB | 1GB |
| 出站流量 | 160GB/月 | 远低于 |

**完全不花钱**，且应用 24/7 在线运行。

### 常用运维命令

```bash
fly status              # 查看应用状态
fly logs                # 实时查看日志
fly ssh console         # 进入容器排查
fly scale memory 512    # 升级内存（如需，仍免费）
fly deploy              # 更新部署
```

### 数据备份

```bash
# 导出数据库到本地
fly ssh sftp get /data/ysforum.db ./backup-$(date +%Y%m%d).db
```

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
