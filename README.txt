小步 · 每天一点，走得更远

个人使用的服务器端任务管理 PWA。当前只实现任务插件：每日计划、长期计划、节点进度、重复任务和 Web Push 提醒。信息收集、理财和音乐留待以后开发。

本地开发
Node.js >=22.16（推荐当前 LTS），npm ci，npm run build。
PUBLIC_ORIGIN=http://127.0.0.1:18788 DATA_DIR=./state npm start
终端会显示生成的私人入口。npm test 运行隔离数据与模拟推送测试，不会向真实手机发送通知。

服务器（域名和 IP 均为示例，部署前请替换）
目录：/opt/lifehub-planner；进程：lifehub-planner.service；只监听 127.0.0.1:18787。
状态：systemctl status lifehub-planner.service
日志：journalctl -u lifehub-planner.service --since today
重启：systemctl restart lifehub-planner.service
正式入口：https://planner.example.com/app/<私人入口标识>/。
公网服务器 203.0.113.10 的宝塔 Nginx 提供 HTTPS，通过 ZeroTier 访问 10.147.0.2:18787。
内网 lifehub-planner-zerotier.socket 只允许公网服务器的 ZeroTier 地址 10.147.0.1，通过 systemd-socket-proxyd 转发到 127.0.0.1:18787。
旧 lifehub-push-test-tunnel.service 暂时保留用于已安装手机 App 的迁移；正式入口不依赖它。
公网配置：/www/server/panel/vhost/nginx/planner.example.com.conf；在宝塔网站列表中对应 planner.example.com。
证书检查：xiaobu-my-certificate.timer，每日检查，仅证书不足 30 天时调用宝塔现有 ACME 工具续期并重载 Nginx。

数据
state/planner.sqlite 是任务、设置、重复模板和提醒队列。state/secrets.json 是私人入口和手机推送密钥，禁止放入代码仓库或发给他人。
state/public-origin.txt 是 HTTPS 来源地址。它需要与浏览器访问的域名一致。
lifehub-planner-backup.timer 每天备份到 state/backups，保留最近 7 份。也可以运行 systemctl start lifehub-planner-backup.service。
备份和原始数据在同一服务器；服务器磁盘损坏仍需要额外异机备份。界面“我的 → 导出我的计划”可另存 JSON。
恢复前先停止 App 服务，将选定备份的 planner.sqlite、secrets.json、public-origin.txt 复制回 state；避免保留其他版本的 SQLite WAL/SHM 文件；恢复所有权 nobody:nogroup 和文件权限 600，再启动服务。需要改域名时同步更新 origin 并重新连接手机通知。

手机安装
在 iPhone Safari 打开私人入口 → 分享 → 添加到主屏幕；从桌面打开“小步” → 我的 → 连接手机通知 → 允许。
点“发一条测试”，回到主屏幕，约 10 秒后检查横幅。是否展示横幅还受系统通知设置和专注模式影响。
此前“通知测试”使用同一域名、路径和推送密钥；打开它可更新界面。新名称/图标若未更新，可重新添加到主屏幕并重新连接通知。
不需要付费 Apple Developer 会员。现在使用固定域名 planner.example.com；手机应从新入口重新添加到主屏幕并允许通知。旧域名的安装实例、Service Worker 和通知权限不会自动迁移到新域名。
旧域名仍在 ADDITIONAL_ORIGINS 的明确允许列表内；完成手机迁移后可删除该兼容项，并停止旧 Cloudflare 隧道。

反向代理维护
公网 Nginx 的代理地址、内网 socket 的监听地址与允许 IP 均记录在 deploy 配置文件中。若重分配 ZeroTier 地址，需同步修改对应项。
内网 App 重启：systemctl restart lifehub-planner.service。
内网代理：systemctl status lifehub-planner-zerotier.socket lifehub-planner-zerotier.service。
公网证书手动检查：systemctl start xiaobu-my-certificate.service。
公网 Nginx 校验与重载：/www/server/nginx/sbin/nginx -t && /www/server/nginx/sbin/nginx -s reload。
域名根路径不跳转或泄露私人入口；访问 App 时请使用完整私人链接。

提醒规则
默认北京时间，22:00–08:00 免打扰，每日最多 6 次，可选 3/10 次或暂停一天。
温柔提醒：提前 30 分钟、到期时，逾期 3 小时后每日最多一次（最多追踪 7 天）。
多督促一点：提前 60/10 分钟、到期时，逾期 3 小时后每 3 小时一个时间段（最多 7 天）。
早间 09:00、晚间 20:30：仅有未完成且允许提醒的每日任务时汇总。
完成、暂停、关闭单项提醒不会催促；示例任务永不推送。节点可独立设置截止日，默认当日 20:00。
提醒队列会去重、重试、在发送前重新检查任务。推送服务接受与设备显示分别记录；不承诺网络断开时即时送达。

界面参考
参考 Uizard Organic Mind 的移动任务结构、Things 3 的快速收集，以及多邻国的圆润按钮、路径进度与完成奖励。没有购买或复制付费模板、Duolingo 角色和字体；芽芽、样式和交互为本项目原创。来源在 docs/design-references.json。
