#!/usr/bin/env bash
# YS 论坛系统 — 本地启动 + Cloudflare 隧道（公网访问）
# 完全免费，无需账号/银行卡/实名

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  YS 论坛系统 — 本地 + 公网隧道启动"
echo "=========================================="

# 1. 构建前端
if [ ! -d "$ROOT/frontend/dist" ]; then
  echo "[1/4] 首次运行，构建前端..."
  cd "$ROOT/frontend"
  if [ ! -d node_modules ]; then npm install; fi
  npm run build
else
  echo "[1/4] 前端已构建，跳过"
fi

# 2. 安装后端依赖
echo "[2/4] 检查后端依赖..."
cd "$ROOT/backend"
if [ ! -d node_modules ]; then npm install; fi

# 3. 下载 cloudflared（如未安装）
echo "[3/4] 检查 cloudflared..."
CFD="$ROOT/.cloudflared/cloudflared"
if [ ! -f "$CFD" ]; then
  mkdir -p "$ROOT/.cloudflared"
  case "$(uname -s)" in
    Darwin)
      ARCH=$(uname -m); [ "$ARCH" = "arm64" ] && ARCH_SUFFIX="arm64" || ARCH_SUFFIX="amd64"
      curl -L -o "$CFD" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-${ARCH_SUFFIX}.tgz" && tar -xzf "$CFD" -C "$ROOT/.cloudflared" && mv "$ROOT/.cloudflared/cloudflared" "$CFD" 2>/dev/null || true
      ;;
    Linux)
      curl -L -o "$CFD" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
      ;;
    MINGW*|MSYS*)
      curl -L -o "$CFD.exe" "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
      ;;
  esac
  chmod +x "$CFD" 2>/dev/null || true
fi

# 4. 启动后端 + 隧道
echo "[4/4] 启动服务..."
cd "$ROOT/backend"
node server.js &
SERVER_PID=$!

# 等待后端就绪
echo "等待后端启动..."
for i in $(seq 1 15); do
  if curl -s -o /dev/null http://localhost:3001/api/health 2>/dev/null; then
    break
  fi
  sleep 1
done

# 启动隧道
echo ""
echo "=========================================="
echo "  本地访问: http://localhost:3001"
echo "  正在建立公网隧道..."
echo "=========================================="
"$CFD" tunnel --url http://localhost:3001 2>&1 | grep -E "trycloudflare\.com|https://" &

# 捕获退出信号
trap "kill $SERVER_PID 2>/dev/null; exit 0" INT TERM
wait
