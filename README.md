# 小彤 · 个人空间

以红发角色小彤为主角的个人 PWA。午夜动漫都市场景、分层角色切换、逐日收益回放，以及安静的资讯阅读体验。

## 当前功能

- 六种角色心情，暮色、雨幕、月夜三套原创动漫场景。旧人物淡出后，背景与新人物、文字错峰入场。
- 最近 30 天收益动画、累计与今日盈亏、虚拟币/基金/股票详情、周期与日期选择。
- 资讯列表、来源与关键词筛选、阅读详情、收藏。
- 统计布局、收藏与插件开关保存在服务器。遵循系统减少动态效果设置。
- 小彤桌面图标、Web Push 通知连接与延迟测试、设备显示回执。

**收益、持仓和资讯均为明确标注的演示数据。尚未接入真实行情、个人持仓或平台采集。**

旧版小步的任务、长期目标、成长积分与提醒调度已移除。升级保留原私人入口及通知订阅；旧数据在部署前归档，新服务不读取旧计划数据库。

## 本机运行

需要 Node.js 22.13+。

```sh
npm ci
npm run build
PUBLIC_ORIGIN=http://127.0.0.1:18788 npm start
```

首次启动生成 `state/secrets.json` 与私人入口。控制台显示访问地址。运行数据、推送密钥和私人入口不得提交至公开仓库。

```sh
npm test
```

测试覆盖逐日收益一致性、角色场景、动画阶段、设置持久化、通知重试与回执、升级身份保留、旧接口关闭、PWA 图标尺寸。

## 部署

前端由同一 Node 服务提供，使用 HTTPS 反向代理，服务器仅监听本机端口。示例服务文件位于 `deploy/`。

生产升级前停止服务并备份整个项目及 `state/`。部署新的 `dist/`、`server/` 和依赖清单，保留 `state/secrets.json`、`state/public-origin.txt`。新服务自动创建 `state/xiaotong.json`；原 `planner.sqlite` 应归档到备份目录。升级失败可恢复备份。原服务名可继续保留，避免破坏既有代理与定时备份。

iOS 已安装网页 App 的图标或名称可能继续使用安装时的缓存。若旧图标未变化，从 Safari 打开原私人入口并重新添加到主屏幕，名称为“小彤”。新安装实例需要在设置里连接通知。

## 视觉资源

图像使用内置 image_gen 生成；PNG 原图位于 `src/home/art/`，页面使用压缩 WebP。图标母版位于 `docs/design/xiaotong-icon-master.png`，移动端使用 180/192/512 像素版本。

- 提示词：`docs/design/v3-prompts.txt`
- 设计参考及取舍：`docs/design/v3-references.json`
- Lusion v3：[Awwwards](https://www.awwwards.com/sites/lusion-v3)
- 交互与场景参考：[Apple Design Awards 2025](https://www.apple.com/newsroom/2025/06/apple-unveils-winners-and-finalists-of-the-2025-apple-design-awards/)
