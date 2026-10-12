#!/bin/sh
set -eu
cd /opt/lifehub-planner
node deploy/migrate-test.mjs
chown -R nobody:nogroup state
chmod 700 state
install -m 644 deploy/lifehub-planner.service /etc/systemd/system/lifehub-planner.service
install -m 644 deploy/lifehub-planner-backup.service /etc/systemd/system/lifehub-planner-backup.service
install -m 644 deploy/lifehub-planner-backup.timer /etc/systemd/system/lifehub-planner-backup.timer
systemctl daemon-reload
systemctl stop lifehub-push-test.service
systemctl enable --now lifehub-planner.service
for attempt in 1 2 3 4 5 6 7 8 9 10; do
  if curl -fsS http://127.0.0.1:18787/health; then
    systemctl enable --now lifehub-planner-backup.timer
    systemctl start lifehub-planner-backup.service
    exit 0
  fi
  sleep 0.5
done
echo '启动检查失败，恢复原来的通知测试服务。' >&2
systemctl stop lifehub-planner.service
systemd-run --unit=lifehub-push-test --uid=nobody --gid=nogroup --working-directory=/opt/lifehub-push-test -p NoNewPrivileges=yes -p PrivateTmp=yes -p ProtectSystem=strict -p ProtectHome=yes -p ReadWritePaths=/opt/lifehub-push-test/state /usr/bin/node /opt/lifehub-push-test/server.mjs
exit 1
