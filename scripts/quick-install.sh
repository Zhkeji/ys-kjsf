#!/data/data/com.termux/files/usr/bin/env bash
# YS 论坛系统 — Termux 极速安装（一行命令版）
#
# 推荐用法（先下载到本地再执行，能看到下载错误）:
#   curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/Zhkeji/ys-kjsf/main/scripts/quick-install.sh -o /tmp/ys-install.sh && bash /tmp/ys-install.sh
#
# 备用（管道方式，下载失败会无输出）:
#   bash -c "$(curl -fsSL https://ghfast.top/https://raw.githubusercontent.com/Zhkeji/ys-kjsf/main/scripts/quick-install.sh)"

# 立即输出，确认脚本已被执行（如果看不到这行，说明脚本根本没下载下来）
echo "[YS] 安装脚本已启动 @ $(date '+%H:%M:%S')"

WORK="$HOME/ys-kjsf"
LOG_DIR="$HOME/.ys-install-logs"
mkdir -p "$LOG_DIR"
PKG_LOG="$LOG_DIR/pkg.log"
NPM_LOG="$LOG_DIR/npm.log"

# 国内镜像加速 + git 超时容错
export GIT_TERMINAL_PROMPT=0
export GIT_HTTP_LOW_SPEED_LIMIT=1000
export GIT_HTTP_LOW_SPEED_TIME=15

echo "=========================================="
echo "  YS 论坛系统 — 极速安装"
echo "  日志目录: $LOG_DIR"
echo "=========================================="

# 1. 装 Termux 依赖（输出到日志，同时 tail 显示关键行）
echo "[1/4] 安装系统依赖（首次较慢，请耐心等待）..."
echo "[YS] -> pkg update"
pkg update -y >"$PKG_LOG" 2>&1 || echo "[YS] ! pkg update 失败（忽略，继续）"
echo "[YS] -> pkg install nodejs git curl ..."
if ! pkg install -y nodejs-lts git curl python make clang >>"$PKG_LOG" 2>&1; then
  echo "[YS] ! nodejs-lts 不可用，改用 nodejs"
  pkg install -y nodejs git curl python make clang >>"$PKG_LOG" 2>&1 || echo "[YS] ! 依赖安装有失败，继续尝试"
fi
echo "[YS] ✓ 依赖安装完成（node: $(node -v 2>/dev/null || echo '?'), npm: $(npm -v 2>/dev/null || echo '?')）"

# npm 国内镜像
npm config set registry https://registry.npmmirror.com 2>/dev/null || true

# 2. 克隆代码（多镜像重试 + 硬超时 + 浅克隆）
echo "[2/4] 克隆代码（国内镜像加速，超时自动切换）..."
rm -rf "$WORK"
CLONE_OK=0
for PROXY in "https://ghfast.top" "https://gh-proxy.com" "https://mirror.ghproxy.com" "https://ghproxy.net" "https://kkgithub.com" ""; do
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
  echo "[YS]   尝试: $LABEL ..."
  if timeout 120 git clone --depth 1 "$URL" "$WORK" >>"$PKG_LOG" 2>&1; then
    echo "[YS] ✓ $LABEL 克隆成功"
    CLONE_OK=1
    break
  else
    echo "[YS] ✗ $LABEL 失败，切换下一个"
    rm -rf "$WORK" 2>/dev/null
  fi
done

if [ $CLONE_OK -eq 0 ]; then
  echo "[YS] ✗ 所有镜像均失败，请检查网络后重试"
  echo "[YS]   可手动下载 zip: https://github.com/Zhkeji/ys-kjsf/archive/refs/heads/main.zip"
  echo "[YS]   或查看日志: cat $PKG_LOG"
  exit 1
fi

cd "$WORK"
chmod +x scripts/*.sh ys.sh 2>/dev/null || true

# 3. 预装后端依赖（输出到日志，显示进度）
echo "[3/4] 预装后端依赖（首次较慢）..."
cd "$WORK/backend"
echo "[YS] -> npm install (better-sqlite3 需要编译，约2-4分钟)"
npm install --no-audit --no-fund --prefer-offline >"$NPM_LOG" 2>&1 || {
  echo "[YS] ! npm install 有警告/错误，查看: cat $NPM_LOG"
  # 失败也继续，start.sh 会再尝试
}
echo "[YS] ✓ 后端依赖安装完成"

# 4. 启动
echo "[4/4] 启动服务..."
bash "$WORK/scripts/start.sh"

echo ""
echo "=========================================="
echo "  ✓ 安装完成！"
echo ""
echo "  日后管理（推荐）: cd ~/ys-kjsf && bash ys.sh"
echo "  ─────────────────────────────────────"
echo "  一键启动:   bash scripts/start.sh"
echo "  守护模式:   bash scripts/daemon.sh   (保长期运行)"
echo "  停止服务:   bash scripts/stop.sh"
echo "  查看状态:   bash scripts/status.sh"
echo "  查看日志:   bash scripts/logs.sh"
echo ""
echo "  安装日志:   $PKG_LOG / $NPM_LOG"
echo "=========================================="
