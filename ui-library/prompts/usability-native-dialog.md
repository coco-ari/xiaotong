<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 保留焦点与阅读位置的原生弹窗

分类：可用性 · 标签：弹窗、手机面板、焦点恢复 · 推荐 · 主观评分：9.6/10 · 整理：2026-10-13

原生模态能力减少焦点和背景隔离错误，适合项目现有设置与场景选择。

## 适用边界

- 适合：心情预览；首页统计编辑；短设置。
- 避免：自画遮罩但背景仍可操作；打开就丢失原页面位置；把手机底部布局当手势实现。
- 实现成本：中；滚动锁、焦点和关闭边界需实际验证。

## 可复制提示词

~~~~text
使用原生 dialog.showModal 实现短设置面板，标题通过 aria-labelledby 关联，描述按需提供。桌面居中、手机靠底，但始终保留可见的 44px 关闭按钮。打开后焦点置于适当标题或控件，背景不能获得焦点或交互；关闭后恢复触发器焦点和原浏览位置。锁定背景滚动并补偿消失的滚动条，内部长内容能独立滚动。Esc 和真正点击遮罩均可关闭；从内容拖到遮罩不算点击关闭。关闭过渡简短，不推迟数据结果，减少动态效果立即关闭。不要为普通弹窗额外加入未要求的拖拽手势。
~~~~

## 验收条件

- Esc、关闭按钮和真实遮罩点击都能关闭。
- 跨边界拖动不误关，背景无法被聚焦。
- 关闭后焦点、滚动与页面宽度恢复；手机长内容可滚动。

## 本项目应用

- [src/home/ui/Dialog.jsx](../../src/home/ui/Dialog.jsx)

## 参考来源

- [Dialog — Radix Primitives](https://www.radix-ui.com/primitives/docs/components/dialog) — Radix / WorkOS；查证 2026-10-13；推荐。
- [Building a drawer component](https://emilkowal.ski/ui/building-a-drawer-component) — Emil Kowalski；查证 2026-10-13；有条件。
- [Vercel Web Interface Guidelines：定位到代码的 UI 审查](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) — Vercel；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
