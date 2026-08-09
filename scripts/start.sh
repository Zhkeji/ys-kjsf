#!/data/data/com.termux/files/usr/bin/env bash
# YS 论坛系统 — Termux 一键启动（国内镜像加速 + 超时容错）
# 用法: bash scripts/start.sh [--no-daemon]
# 完全免费，无需 root/账号/银行卡

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="$ROOT"
LOG_DIR="$ROOT/.logs"
PID_DIR="$ROOT/.pids"
mkdir -p "$LOG_DIR" "$PID_DIR"

# 国内镜像加速
export GIT_TERMINAL_PROMPT=0
export GIT_HTTP_LOW_SPEED_LIMIT=1000      # 低于 1KB/s 持续 15s 视为超时
export GIT_HTTP_LOW_SPEED_TIME=15
npm config set registry https://registry.npmmirror.com 2>/dev/null || true

# GitHub 加速镜像列表（按顺序尝试）
GH_MIRRORS=(
  "https://ghfast.top"
  "https://gh-proxy.com"
  "https://mirror.ghproxy.com"
  "https://ghproxy.net"
  "https://kkgithub.com"                 # 直接替换域名，无需前缀
  ""                                     # 直连
)

echo "=========================================="
echo "  YS 论坛系统 — Termux 启动"
echo "=========================================="

# 检查是否已在运行
if [ -f "$PID_DIR/server.pid" ] && kill -0 "$(cat $PID_DIR/server.pid)" 2>/dev/null; then
  echo "⚠ 服务已在运行，如需重启请先执行: bash scripts/stop.sh"
  exit 1
fi

# 0. 安装系统依赖（不退出）
echo "[0/5] 检查系统依赖..."
pkg install -y nodejs-lts git curl python make clang >/dev/null 2>&1 || \
pkg install -y nodejs git curl python make clang >/dev/null 2>&1 || true

# 1. 克隆/更新代码（多镜像 + 超时重试）
if [ ! -f "$WORK/backend/server.js" ]; then
  echo "[1/5] 克隆代码（国内镜像加速，超时自动切换）..."
  CLONE_OK=0
  for PROXY in "${GH_MIRRORS[@]}"; do
    if [ -z "$PROXY" ]; then
      URL="https://github.com/Zhkeji/ys-kjsf"
      LABEL="直连"
    elif [[ "$PROXY" == *"kkgithub.com"* ]]; then
      URL="https://kkgithub.com/Zhkeji/ys-kjsf"
      LABEL="kkgithub"
    else
      URL="${PROXY}/https://github.com/Zhkeji/ys-kjsf"
      LABEL="$PROXY"
    fi
    echo "  尝试: $LABEL ..."
    # 硬超时 120s + 浅克隆，失败立即切换
    if timeout 120 git clone --depth 1 "$URL" "$WORK" 2>"$LOG_DIR/clone.err"; then
      echo "  ✓ $LABEL 克隆成功"
      CLONE_OK=1
      break
    else
      echo "  ✗ $LABEL 失败（$(tail -1 "$LOG_DIR/clone.err" 2>/dev/null)）"
      rm -rf "$WORK" 2>/dev/null
    fi
  done
  if [ $CLONE_OK -eq 0 ]; then
    echo "  ✗ 所有克隆方式均失败，请检查网络"
    echo "  可手动下载: https://github.com/Zhkeji/ys-kjsf/archive/refs/heads/main.zip"
    exit 1
  fi
else
  echo "[1/5] 代码已存在，跳过克隆"
fi

# 2. 构建前端（仅在 dist 不存在时）
if [ ! -d "$WORK/frontend/dist" ]; then
  echo "[2/5] 构建前端（首次较慢，约3-5分钟）..."
  cd "$WORK/frontend"
  npm install --no-audit --no-fund --prefer-offline 2>&1 | tail -3
  npm run build 2>&1 | tail -3
  if [ ! -d "$WORK/frontend/dist" ]; then
    echo "  ✗ 前端构建失败，请查看日志"
    exit 1
  fi
else
  echo "[2/5] 前端已构建，跳过"
fi

# 3. 安装后端依赖
echo "[3/5] 安装后端依赖..."
cd "$WORK/backend"
if [ ! -d node_modules ] || [ ! -d node_modules/better-sqlite3 ]; then
  npm install --no-audit --no-fund --prefer-offline 2>&1 | tail -3
else
  echo "  依赖已安装，跳过"
fi

# 4. 下载 cloudflared（多镜像备用，可选）
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
  for PROXY in "https://ghfast.top" "https://gh-proxy.com" "https://mirror.ghproxy.com" "https://ghproxy.net" ""; do
    [ -z "$PROXY" ] && URL="$CF_URL" || URL="${PROXY}/${CF_URL}"
    echo "  尝试: ${PROXY:-直连}"
    if timeout 60 curl -sL --connect-timeout 10 -o "$CFD" "$URL" && [ -s "$CFD" ]; then
      chmod +x "$CFD"
      echo "  ✓ 下载成功"
      break
    fi
    rm -f "$CFD" 2>/dev/null
  done
  if [ ! -s "$CFD" ]; then
    echo "  ✗ cloudflared 下载失败，将仅本地运行（无公网地址）"
    CFD=""
  fi
else
  echo "  cloudflared 已存在，跳过"
fi

# 5. 启动后端（后台，用 setsid 完全脱离终端）
echo "[5/5] 启动服务..."
cd "$WORK/backend"
setsid nohup node server.js > "$LOG_DIR/backend.log" 2>&1 &
SERVER_PID=$!
disown $SERVER_PID 2>/dev/null || true
echo $SERVER_PID > "$PID_DIR/server.pid"

# 等待后端就绪
echo -n "等待后端启动"
READY=0
for i in $(seq 1 30); do
  if curl -s -o /dev/null http://localhost:3001/api/health 2>/dev/null; then
    echo " ✓"
    READY=1
    break
  fi
  echo -n "."
  sleep 1
done
if [ $READY -eq 0 ]; then
  echo " ✗"
  echo "  后端启动超时，查看日志: bash scripts/logs.sh"
  exit 1
fi

# 启动隧道（后台，仅当 cloudflared 可用）
PUB_URL=""
if [ -n "$CFD" ] && [ -x "$CFD" ]; then
  setsid nohup "$CFD" tunnel --url http://localhost:3001 > "$LOG_DIR/tunnel.log" 2>&1 &
  TUNNEL_PID=$!
  disown $TUNNEL_PID 2>/dev/null || true
  echo $TUNNEL_PID > "$PID_DIR/tunnel.pid"
  echo "隧道建立中，10秒后读取公网地址..."
  sleep 10
  PUB_URL=$(grep -oE "https://[a-z0-9-]+\.trycloudflare\.com" "$LOG_DIR/tunnel.log" 2>/dev/null | head -1)
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
echo "  守护模式: bash scripts/daemon.sh"
echo "=========================================="
