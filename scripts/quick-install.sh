#!/data/data/com.termux/files/usr/bin/env bash
# YS 论坛系统 — Termux 极速安装（一行命令版）
# 在 Termux 中执行:
#   curl -sL https://ghfast.top/https://raw.githubusercontent.com/Zhkeji/ys-kjsf/main/scripts/quick-install.sh | bash

set -e
WORK="$HOME/ys-kjsf"

echo "=========================================="
echo "  YS 论坛系统 — 极速安装"
echo "=========================================="

# 1. 装 Termux 依赖
echo "[1/3] 安装系统依赖..."
pkg update -y >/dev/null 2>&1 || true
pkg install -y nodejs-lts git curl python make clang >/dev/null 2>&1 || \
pkg install -y nodejs git curl python make clang >/dev/null 2>&1 || true

# npm 国内镜像
npm config set registry https://registry.npmmirror.com 2>/dev/null || true

# 2. 克隆代码（多镜像重试）
echo "[2/3] 克隆代码（国内镜像加速）..."
rm -rf "$WORK"
GH_PROXY=""
for PROXY in "https://ghfast.top" "https://gh-proxy.com" "https://mirror.ghproxy.com" ""; do
  [ -z "$PROXY" ] && RAW_URL="https://github.com/Zhkeji/ys-kjsf" || RAW_URL="${PROXY}/https://github.com/Zhkeji/ys-kjsf"
  echo "  尝试: ${PROXY:-直连}"
  if git clone --depth 1 "$RAW_URL" "$WORK" 2>/dev/null; then
    GH_PROXY="$PROXY"
    echo "  ✓ 克隆成功"
    break
  fi
done

if [ ! -d "$WORK/.git" ]; then
  echo "  ✗ 所有镜像均失败，请检查网络后重试"
  exit 1
fi

cd "$WORK"
chmod +x scripts/*.sh

# 3. 启动
echo "[3/3] 启动服务..."
bash scripts/start.sh

echo ""
echo "=========================================="
echo "  安装完成！"
echo "  日后启动: cd ~/ys-kjsf && bash scripts/start.sh"
echo "  守护模式: cd ~/ys-kjsf && bash scripts/daemon.sh"
echo "  停止服务: cd ~/ys-kjsf && bash scripts/stop.sh"
echo "  查看状态: cd ~/ys-kjsf && bash scripts/status.sh"
echo "=========================================="
