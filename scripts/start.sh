#!/data/data/com.termux/files/usr/bin/env bash
# YS 论坛系统 — Termux 一键启动（国内镜像加速）
# 用法: bash scripts/start.sh
# 完全免费，无需 root/账号/银行卡

set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT"
LOG_DIR="$ROOT/.logs"
PID_DIR="$ROOT/.pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

# 国内镜像加速
export GIT_TERMINAL_PROMPT=0
npm config set registry https://registry.npmmirror.com 2>/dev/null || true

# GitHub 加速前缀（可切换备用）
GH_PROXY="https://ghfast.top"

echo "=========================================="
echo "  YS 论坛系统 — Termux 启动"
echo "=========================================="

# 检查是否已在运行
if [ -f "$PID_DIR/server.pid" ] && kill -0 "$(cat $PID_DIR/server.pid)" 2>/dev/null; then
  echo "⚠ 服务已在运行，如需重启请先执行: bash scripts/stop.sh"
  exit 1
fi

# 0. 安装系统依赖
echo "[0/5] 检查系统依赖..."
pkg install -y nodejs-lts git curl python make clang 2>/dev/null || \
pkg install -y nodejs git curl python make clang 2>/dev/null || true

# 1. 克隆/更新代码（用加速镜像）
if [ ! -f "$WORK/backend/server.js" ]; then
  echo "[1/5] 克隆代码（国内加速）..."
  if git clone "${GH_PROXY}/https://github.com/Zhkeji/ys-kjsf" "$WORK" 2>/dev/null; then
    echo "  ghfast.top 镜像成功"
  elif git clone "https://gh-proxy.com/https://github.com/Zhkeji/ys-kjsf" "$WORK" 2>/dev/null; then
    echo "  gh-proxy.com 镜像成功"
  elif git clone "https://github.com/Zhkeji/ys-kjsf" "$WORK" 2>/dev/null; then
    echo "  直连成功"
  else
    echo "  ✗ 所有克隆方式失败，请检查网络"
    exit 1
  fi
else
  echo "[1/5] 代码已存在，跳过"
fi

# 2. 构建前端
if [ ! -d "$WORK/frontend/dist" ]; then
  echo "[2/5] 构建前端（首次较慢，约3-5分钟）..."
  cd "$WORK/frontend"
  npm install --no-audit --no-fund 2>&1 | tail -1
  npm run build 2>&1 | tail -1
else
  echo "[2/5] 前端已构建，跳过"
fi

# 3. 安装后端依赖
echo "[3/5] 安装后端依赖..."
cd "$WORK/backend"
if [ ! -d node_modules ] || [ ! -d node_modules/better-sqlite3 ]; then
  npm install --no-audit --no-fund 2>&1 | tail -1
else
  echo "  依赖已安装，跳过"
fi

# 4. 下载 cloudflared（多镜像备用）
echo "[4/5] 检查 cloudflared..."
CFD="$WORK/.cloudflared/cloudflared"
mkdir -p "$WORK/.cloudflared"
if [ ! -x "$CFD" ]; then
  ARCH=$(uname -m)
  case "$ARCH" in
    aarch64|arm64) CF_FILE="cloudflared-linux-arm64" ;;
    arm*)          CF_FILE="cloudflared-linux-arm" ;;
    *)             CF_FILE="cloudflared-linux-amd64" ;;
  esac
  CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/${CF_FILE}"
  echo "  下载 $ARCH 版本（多镜像重试）..."
  for PROXY in "${GH_PROXY}" "https://gh-proxy.com" "https://mirror.ghproxy.com" ""; do
    [ -z "$PROXY" ] && URL="$CF_URL" || URL="${PROXY}/${CF_URL}"
    echo "  尝试: ${PROXY:-直连}"
    if curl -sL --connect-timeout 15 -o "$CFD" "$URL" && [ -s "$CFD" ]; then
      chmod +x "$CFD"
      echo "  ✓ 下载成功"
      break
    fi
  done
  if [ ! -s "$CFD" ]; then
    echo "  ✗ cloudflared 下载失败，将仅本地运行"
    CFD=""
  fi
fi

# 5. 启动后端（后台，用 setsid 完全脱离）
echo "[5/5] 启动服务..."
cd "$WORK/backend"
setsid nohup node server.js > "$LOG_DIR/backend.log" 2>&1 &
SERVER_PID=$!
disown $SERVER_PID 2>/dev/null || true
echo $SERVER_PID > "$PID_DIR/server.pid"

# 等待后端就绪
echo -n "等待后端启动"
for i in $(seq 1 20); do
  if curl -s -o /dev/null http://localhost:3001/api/health 2>/dev/null; then
    echo " ✓"
    break
  fi
  echo -n "."
  sleep 1
done

# 启动隧道（后台，仅当 cloudflared 可用）
if [ -n "$CFD" ] && [ -x "$CFD" ]; then
  setsid nohup "$CFD" tunnel --url http://localhost:3001 > "$LOG_DIR/tunnel.log" 2>&1 &
  TUNNEL_PID=$!
  disown $TUNNEL_PID 2>/dev/null || true
  echo $TUNNEL_PID > "$PID_DIR/tunnel.pid"
  echo "隧道建立中，10秒后读取公网地址..."
  sleep 10
  PUB_URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$LOG_DIR/tunnel.log" 2>/dev/null | head -1)
else
  PUB_URL=""
fi

echo ""
echo "=========================================="
echo "  ✓ 服务已启动"
echo "  本地访问: http://localhost:3001"
if [ -n "$PUB_URL" ]; then
  echo "  公网地址: $PUB_URL"
else
  echo "  公网地址: 查看日志 .logs/tunnel.log"
fi
echo ""
echo "  查看状态: bash scripts/status.sh"
echo "  查看日志: bash scripts/logs.sh"
echo "  停止服务: bash scripts/stop.sh"
echo "=========================================="
