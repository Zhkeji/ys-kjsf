# YS 论坛系统 — 本地部署 + 公网隧道

> 完全免费，无需账号、无需银行卡、无需实名认证。
> 在你自己电脑上运行，通过 Cloudflare 隧道暴露到公网，任何人都能访问。

## 前置条件

只需在电脑上安装 **Node.js 18+**：
- 下载：https://nodejs.org （选 LTS 版本）

## 快速启动

### Windows
```bash
# 双击运行，或命令行执行
start-tunnel.bat
```

### macOS / Linux
```bash
./start-tunnel.sh
```

脚本会自动完成：
1. 构建前端
2. 安装后端依赖
3. 下载 cloudflared（首次约 40MB）
4. 启动后端服务（端口 3001）
5. 建立公网隧道

启动后控制台会显示两个地址：
- **本地访问**：`http://localhost:3001`
- **公网地址**：`https://xxx-xxx-xxx.trycloudflare.com`（随机分配，每次启动可能变化）

把这个 `trycloudflare.com` 地址发给别人，他们就能在浏览器打开访问你的论坛了。

## 仅本地运行（不要公网）

如果只需要自己用，不需要公网访问：

### Windows
```bash
start.bat
```

### macOS / Linux
```bash
./start.sh
```

访问 `http://localhost:3001` 即可。

## 停止服务

在运行脚本的窗口按 `Ctrl + C`，或关闭窗口即可停止。

## 常见问题

**Q: 公网地址每次都不一样？**
A: 快速隧道是临时的，每次启动随机分配域名。如需固定域名，需注册免费 Cloudflare 账号创建命名隧道（仍免费，需一个域名）。

**Q: 关机后还能访问吗？**
A: 不能。本地 + 隧道方案要求你的电脑开机且脚本运行中。这是该方案唯一的限制——完全免费的代价。

**Q: 访问很慢？**
A: 隧道走 Cloudflare 全球网络，通常很快。慢的话检查本地网络。

**Q: 别人能访问到我的电脑文件吗？**
A: 不能。隧道只转发 3001 端口的 HTTP 流量到论坛应用，不暴露文件系统。

## 文件说明

| 文件 | 用途 |
|------|------|
| `start.sh` / `start.bat` | 仅本地启动 |
| `start-tunnel.sh` / `start-tunnel.bat` | 本地 + 公网隧道 |
| `.cloudflared/` | cloudflared 二进制（自动下载） |
