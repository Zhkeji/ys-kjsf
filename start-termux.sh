#!/data/data/com.termux/files/usr/bin/env bash
# YS 论坛系统 — Termux 一键安装+启动（带公网隧道）
# 适用于 Android Termux 环境（ARM64/ARM32）
# 完全免费，无需 root，无需账号/银行卡

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=========================================="
echo "  YS 论坛系统 — Termux 启动"
echo "=========================================="

# 0. 安装系统依赖（Termux 包）
echo "[0/5] 检查系统依赖..."
pkg install -y nodejs-lts git curl 2>/dev/null || pkg install -y nodejs git curl

# better-sqlite3 编译需要 python 和 make
pkg install -y python make clang 2>/dev/null || true

# 1. 如目录为空则克隆仓库
if [ ! -f "$ROOT/backend/server.js" ]; then
  echo "[1/5] 克隆仓库..."
  git clone https://github.com/Zhkeji/ys-kjsf "$ROOT/ys-kjsf-tmp" 2>/dev/null
  cp -r "$ROOT/ys-kjsf-tmp/"* "$ROOT/" 2>/dev/null
  cp -r "$ROOT/ys-kjsf-tmp/".* "$ROOT/" 2>/dev/null || true
  rm -rf "$ROOT/ys-kjsf-tmp"
  ROOT="$ROOT"
fi

# 2. 构建前端
if [ ! -d "$ROOT/frontend/dist" ]; then
  echo "[2/5] 构建前端..."
  cd "$ROOT/frontend"
  npm install --no-audit --no-fund
  npm run build
else
  echo "[2/5] 前端已构建，跳过"
fi

# 3. 安装后端依赖
echo "[3/5] 安装后端依赖..."
cd "$ROOT/backend"
npm install --no-audit --no-fund

# 4. 下载 cloudflared（ARM 版本）
echo "[4/5] 检查 cloudflared..."
CFD="$ROOT/.cloudflared/cloudflared"
mkdir -p "$ROOT/.cloudflared"
if [ ! -f "$CFD" ]; then
  ARCH=$(uname -m)
  case "$ARCH" in
    aarch64|arm64)
      URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64"
      ;;
    armv7l|arm|armhf)
      URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm"
      ;;
    *)
      URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64"
      ;;
  esac
  echo "  下载 $ARCH 版本..."
  curl -L -o "$CFD" "$URL"
  chmod +x "$CFD"
fi

# 5. 启动后端 + 隧道
echo "[5/5] 启动服务..."
cd "$ROOT/backend"
node server.js &
SERVER_PID=$!

# 等待后端就绪
echo "等待后端启动..."
for i in $(seq 1 20); do
  if curl -s -o /dev/null http://localhost:3001/api/health 2>/dev/null; then
    echo "  后端已就绪"
    break
  fi
  sleep 1
done

echo ""
echo "=========================================="
echo "  本地访问: http://localhost:3001"
echo "  正在建立公网隧道..."
echo "  （下方显示的 trycloudflare.com 即公网地址）"
echo "  按 Ctrl+C 停止"
echo "=========================================="

# 启动隧道（前台运行，显示输出）
"$CFD" tunnel --url http://localhost:3001 &
TUNNEL_PID=$!

trap "kill $SERVER_PID $TUNNEL_PID 2>/dev/null; exit 0" INT TERM
wait
