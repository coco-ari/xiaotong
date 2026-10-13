<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 保持上下文的加载与刷新

分类：可用性 · 标签：骨架屏、刷新、空状态 · 推荐 · 主观评分：9.6/10 · 整理：2026-10-13

稳定空间和真实状态比持续闪动更容易让产品显得可靠。

## 适用边界

- 适合：新闻列表；财务概览；提示词库搜索；异步内容。
- 避免：每次刷新清空整屏；多个闪烁骨架同时争夺注意；无限假进度。
- 实现成本：低到中；区分初次加载与后台刷新。

## 可复制提示词

~~~~text
区分首次加载、后台刷新、成功、空结果和失败。首次没有内容时用与真实卡片尺寸一致的静态占位，避免虚构文字；后台刷新保留旧内容并明确显示更新时间与正在刷新状态，不把整页清空。请求成功轻淡入新增内容，保留稳定 key、滚动和当前选中项；失败给可用重试入口与可读错误。用 aria-busy 标记区域，结果播报简洁，不逐条朗读动画。不要模拟进度百分比。若保留微弱骨架明暗变化，数量和时间受限；减少动态效果使用完全静态骨架。

减少动态效果：静态骨架或加载文字，无 shimmer。

上述数值为项目起始参数，应结合真实设备调整；不增加与当前任务无关的效果。
~~~~

## 验收条件

- 慢网刷新不丢已有可读内容与滚动位置。
- 空数组、请求错误、首次加载能够明确区分。
- 完成、失败后所有加载动画与计时器都停止。

## 本项目应用

当前未标记为已应用。它是经过评审的候选规格，不能据此声称相关功能已经实现。

## 参考来源

- [The Role of Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/) — Page Laubheimer / Nielsen Norman Group；查证 2026-10-13；推荐。
- [How to create high-performance CSS animations](https://web.dev/articles/animations-guide) — Kayce Basques、Rachel Andrew / web.dev；查证 2026-10-13；推荐。
- [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations) — Emil Kowalski；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
