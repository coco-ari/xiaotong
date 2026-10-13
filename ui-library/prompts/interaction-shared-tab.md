<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 语义正确的滑动选中底板

分类：交互动效 · 标签：标签页、流动高亮、键盘 · 推荐 · 主观评分：9.7/10 · 整理：2026-10-13

选中位置连续可见，有精致感且帮助识别当前视图。

## 适用边界

- 适合：内容频道；时间区间；同页视图切换。
- 避免：将页面级链接伪装成 tabs；用切换动画拖延结果；水滴形变覆盖文字。
- 实现成本：低到中；复用 Motion layoutId 或 CSS。

## 可复制提示词

~~~~text
为同页筛选与周期选择实现稳定的分段控件：文字、位置和点击范围固定，只让暖红浅底指示器在选项间约 180ms 移动。筛选使用 radiogroup/radio、aria-checked 与单一 Tab 入口；方向键、Home/End 移动焦点并立即选中，不等待底板动画。只有确实切换关联内容面板的组件才使用 tablist/tab/tabpanel，并按加载延迟选择手动或自动激活。指针点击不额外抢焦点；Motion 的 layoutId 用组件实例 id 隔离，文字不拉伸。窄屏保证选项可横向浏览，焦点仍可见。减少动态效果或键盘连续选择时直接更新底板。
~~~~

## 验收条件

- 快速连点或连续按方向键，最终指示器和实际面板一致。
- 键盘能进入、切换并离开标签组。
- 手机宽度无截断的关键标签，焦点不被圆角容器裁掉。

## 本项目应用

- [src/home/ui/SegmentedControl.jsx](../../src/home/ui/SegmentedControl.jsx)
- [src/home/FinancePage.jsx](../../src/home/FinancePage.jsx)
- [src/home/FeedPage.jsx](../../src/home/FeedPage.jsx)

## 参考来源

- [The Magic of Clip Path](https://emilkowal.ski/ui/the-magic-of-clip-path) — Emil Kowalski；查证 2026-10-13；有条件。
- [Layout Animation — React FLIP & Shared Element](https://motion.dev/docs/react-layout-animations) — Motion 官方文档团队；查证 2026-10-13；推荐。
- [Tabs — Radix Primitives](https://www.radix-ui.com/primitives/docs/components/tabs) — Radix / WorkOS；查证 2026-10-13；推荐。
- [Tabs Pattern — ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) — W3C WAI / ARIA Authoring Practices Task Force；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
