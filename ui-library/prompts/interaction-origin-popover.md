<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 从触发位置展开的浮层

分类：交互动效 · 标签：Popover、起点、设置 · 推荐 · 主观评分：9.2/10 · 整理：2026-10-13

合理起点建立空间关系，比所有元素从屏幕中心缩放更自然。

## 适用边界

- 适合：筛选浮层；轻量设置；信息说明。
- 避免：含按钮内容塞入 tooltip；漂离触发器的弹窗；hover 是唯一打开方式。
- 实现成本：中；定位、碰撞与焦点行为。

## 可复制提示词

~~~~text
让筛选或轻设置浮层从实际触发器方向出现。以锚点为 transform-origin，约 150ms 从轻微缩小和透明到正常；碰到屏幕边缘时自动翻转或调整，起点同步改变。内容与交互不等待动画，触发器用 button 并暴露展开状态。含可操作内容时使用 popover 或非模态 dialog，不用 tooltip；纯说明才使用 aria-describedby。支持点击、键盘打开与 Esc 关闭，关闭后焦点返回触发器；移动端用点击并控制最大宽高。连续开关不中断到错误位置，减少动态效果取消缩放。

减少动态效果：取消缩放，仅直接出现或短淡入。

上述数值为项目起始参数，应结合真实设备调整；不增加与当前任务无关的效果。
~~~~

## 验收条件

- 四个屏幕边缘附近打开都不截断操作。
- 弹层内部按钮可用键盘访问，关闭后焦点返回。
- 触摸设备无需 hover 也能访问全部信息。

## 本项目应用

当前未标记为已应用。它是经过评审的候选规格，不能据此声称相关功能已经实现。

## 参考来源

- [Good vs Great Animations](https://emilkowal.ski/ui/good-vs-great-animations) — Emil Kowalski；查证 2026-10-13；推荐。
- [Dialog — Radix Primitives](https://www.radix-ui.com/primitives/docs/components/dialog) — Radix / WorkOS；查证 2026-10-13；推荐。
- [Tooltip Pattern — ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) — W3C WAI / ARIA Authoring Practices Task Force；查证 2026-10-13；有条件。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
