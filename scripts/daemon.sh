#!/data/data/com.termux/files/usr/bin/env bash
# YS 论坛系统 — 保活守护脚本
# 用途: 保持服务长期运行，进程崩溃自动重启，防止锁屏被杀
# 用法: bash scripts/daemon.sh
# 按 Ctrl+C 停止守护（会同时停止服务）

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PID_DIR="$ROOT/.pids"
LOG_DIR="$ROOT/.logs"
mkdir -p "$PID_DIR" "$LOG_DIR"

# 守护参数
MAX_RESTART_PER_5MIN=8     # 5 分钟内重启超过此数则放弃
MONITOR_INTERVAL=30        # 正常监控轮询间隔（秒）

echo "=========================================="
echo "  YS 论坛系统 — 守护模式"
echo "  （进程崩溃自动重启 + 防锁屏杀）"
echo "=========================================="

# 1. 申请唤醒锁（防止锁屏被系统杀死）
if command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock 2>/dev/null
  echo "✓ 已获取唤醒锁（屏幕关闭后仍运行）"
fi

# 2. 退出时清理
cleanup() {
  echo ""
  echo "[$(date '+%H:%M:%S')] 收到退出信号，停止服务并释放唤醒锁..."
  bash "$ROOT/scripts/stop.sh" >/dev/null 2>&1 || true
  if command -v termux-wake-unlock >/dev/null 2>&1; then
    termux-wake-unlock 2>/dev/null || true
  fi
  echo "✓ 守护已停止"
  exit 0
}
trap cleanup INT TERM

# 3. 停止旧实例
echo "[$(date '+%H:%M:%S')] 停止旧实例..."
bash "$ROOT/scripts/stop.sh" >/dev/null 2>&1 || true
sleep 1

# 4. 守护循环
echo "[$(date '+%H:%M:%S')] 启动守护进程（Ctrl+C 退出）..."
RESTART_TIMES=()   # 最近重启时间戳数组

while true; do
  # 启动服务（start.sh 内部会处理"已在运行"检查）
  echo ""
  echo "[$(date '+%H:%M:%S')] 启动服务..."
  bash "$ROOT/scripts/start.sh" 2>&1 | tail -20

  # 检查后端是否存活
  SERVER_PID=""
  if [ -f "$PID_DIR/server.pid" ]; then
    SERVER_PID=$(cat "$PID_DIR/server.pid")
  fi

  if [ -z "$SERVER_PID" ] || ! kill -0 "$SERVER_PID" 2>/dev/null; then
    # 服务未起来，记录重启时间
    NOW=$(date +%s)
    RESTART_TIMES+=($NOW)
    # 清理 5 分钟前的记录
    CUTOFF=$((NOW - 300))
    FILTERED=()
    for T in "${RESTART_TIMES[@]}"; do
      [ "$T" -ge "$CUTOFF" ] && FILTERED+=($T)
    done
    RESTART_TIMES=("${FILTERED[@]}")

    COUNT=${#RESTART_TIMES[@]}
    if [ $COUNT -ge $MAX_RESTART_PER_5MIN ]; then
      echo ""
      echo "[$(date '+%H:%M:%S')] ✗ 5分钟内重启 $COUNT 次，可能存在严重问题"
      echo "  查看日志: bash scripts/logs.sh"
      echo "  放弃守护，避免无限重启"
      cleanup
    fi

    echo ""
    echo "[$(date '+%H:%M:%S')] ⚠ 服务退出（5分钟内第 $COUNT 次），10秒后重启..."
    sleep 10
    continue
  fi

  # 服务正常运行，进入监控
  echo "[$(date '+%H:%M:%S')] 服务运行中 (PID $SERVER_PID)，持续监控..."
  while kill -0 "$SERVER_PID" 2>/dev/null; do
    sleep $MONITOR_INTERVAL
  done
  echo "[$(date '+%H:%M:%S')] ⚠ 后端进程消失，准备重启..."
done
