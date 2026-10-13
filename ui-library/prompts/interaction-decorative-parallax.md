<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 受限的角色装饰视差

分类：交互动效 · 标签：视差、装饰、精细指针 · 有条件 · 主观评分：8/10 · 整理：2026-10-13

能增添插画层次，但必须只作用装饰层并可以完全关闭。

## 适用边界

- 适合：宽屏角色封面；低频品牌展示。
- 避免：新闻阅读区；财务图表；触摸页面滚动驱动；持续自动漂浮。
- 实现成本：中；分层边界、指针调度和偏好处理。

## 可复制提示词

~~~~text
只在支持 hover 的精细指针设备上为角色封面加入极轻视差。人物装饰层的位移总幅度限制在 4px 左右，背景更小；文案、按钮和命中范围完全固定，角色不跟随鼠标穿过内容。指针离开后平滑归中，使用 requestAnimationFrame 或 Motion 值更新，避免每帧触发整页 React 渲染；不持续随机摆动。图片边缘要覆盖位移余量，页面隐藏时停止计算。触屏、prefers-reduced-motion、用户关闭动效时使用同一静态构图；该效果不得承担任何信息或操作功能。

减少动态效果：完全静止；不以减速代替关闭。

上述数值为项目起始参数，应结合真实设备调整；不增加与当前任务无关的效果。
~~~~

## 验收条件

- 鼠标移动不会改变按钮命中位置或遮住文案。
- 封面边缘不露底，离开后归中。
- 触屏、减少动态效果和后台状态下没有视差更新。

## 本项目应用

当前未标记为已应用。它是经过评审的候选规格，不能据此声称相关功能已经实现。

## 参考来源

- [Create accessible animations in React](https://motion.dev/docs/react-accessibility) — Motion 官方文档团队；查证 2026-10-13；推荐。
- [useReducedMotion](https://motion.dev/docs/react-use-reduced-motion) — Motion 官方文档团队；查证 2026-10-13；推荐。
- [How to create high-performance CSS animations](https://web.dev/articles/animations-guide) — Kayce Basques、Rachel Andrew / web.dev；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
