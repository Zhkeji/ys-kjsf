#!/data/data/com.termux/files/usr/bin/env bash
# YS 论坛系统 — Termux 极速启动版
# 在 Termux 中粘贴执行：bash start-termux-quick.sh

set -e

echo "=========================================="
echo "  YS 论坛系统 — Termux 极速启动"
echo "=========================================="

# 安装依赖
echo "[1/4] 安装系统依赖..."
pkg update -y >/dev/null 2>&1 && pkg install -y nodejs-lts git curl python make clang >/dev/null 2>&1 || pkg install -y nodejs git curl python make clang >/dev/null 2>&1

# 克隆/更新仓库
WORK="$HOME/ys-kjsf"
if [ -d "$WORK/.git" ]; then
  echo "[2/4] 更新代码..."
  cd "$WORK" && git pull -q 2>/dev/null || true
else
  echo "[2/4] 克隆代码..."
  git clone -q https://github.com/Zhkeji/ys-kjsf "$WORK"
  cd "$WORK"
fi

# 安装依赖 + 构建前端
if [ ! -d "$WORK/frontend/dist" ]; then
  echo "[3/4] 构建前端（首次较慢）..."
  cd "$WORK/frontend"
  npm install --no-audit --no-fund 2>&1 | tail -1
  npm run build 2>&1 | tail -1
fi

echo "[3/4] 安装后端依赖..."
cd "$WORK/backend"
npm install --no-audit --no-fund 2>&1 | tail -1

# 下载 cloudflared
echo "[4/4] 准备隧道..."
CFD="$WORK/.cloudflared/cloudflared"
mkdir -p "$WORK/.cloudflared"
if [ ! -x "$CFD" ]; then
  ARCH=$(uname -m)
  case "$ARCH" in
    aarch64|arm64) URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64" ;;
    arm*)          URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm" ;;
    *)             URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" ;;
  esac
  curl -sL -o "$CFD" "$URL" && chmod +x "$CFD"
fi

# 启动后端
cd "$WORK/backend"
node server.js &
SERVER_PID=$!
echo "等待后端启动..."
for i in $(seq 1 20); do
  curl -s -o /dev/null http://localhost:3001/api/health 2>/dev/null && break
  sleep 1
done

echo ""
echo "=========================================="
echo "  ✓ 本地: http://localhost:3001"
echo "  正在建立公网隧道..."
echo "  找到下面的 trycloudflare.com 地址"
echo "  Ctrl+C 停止"
echo "=========================================="
"$CFD" tunnel --url http://localhost:3001 &
TUNNEL_PID=$!
trap "kill $SERVER_PID $TUNNEL_PID 2>/dev/null; exit 0" INT TERM
wait
