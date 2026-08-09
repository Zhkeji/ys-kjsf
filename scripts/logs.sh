#!/data/data/com.termux/files/usr/bin/env bash
# YS 论坛系统 — 查看日志
# 用法: bash scripts/logs.sh [backend|tunnel]
# 不带参数显示后端日志

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$ROOT/.logs"
TARGET="${1:-backend}"

case "$TARGET" in
  backend|b|1)
    FILE="$LOG_DIR/backend.log"
    NAME="后端"
    ;;
  tunnel|t|2)
    FILE="$LOG_DIR/tunnel.log"
    NAME="隧道"
    ;;
  *)
    echo "用法: bash scripts/logs.sh [backend|tunnel]"
    exit 1
    ;;
esac

echo "=========================================="
echo "  $NAME 日志（最近 50 行，实时刷新）"
echo "=========================================="

if [ ! -f "$FILE" ]; then
  echo "（暂无日志，服务可能未启动）"
  exit 0
fi

tail -n 50 -f "$FILE"
