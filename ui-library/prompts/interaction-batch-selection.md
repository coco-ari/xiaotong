<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 立即生效的批量选择

分类：可用性 · 标签：批量、复选框、状态 · 推荐 · 主观评分：9/10 · 整理：2026-10-13

即时状态与轻微视觉强调组合，比慢慢勾完更适合真实任务。

## 适用边界

- 适合：批量收藏管理；材料筛选；待办勾选。
- 避免：为逐个打勾延迟真实选择；全屏庆祝；选择动效触发昂贵全列表重排。
- 实现成本：中；需要完整选择模型。

## 可复制提示词

~~~~text
完善批量选择反馈：点击全选时所有数据状态立即更新，并显示实际已选数量，不能等待逐项动画。复选框使用原生语义，支持全选、部分选择与全不选；行内其他操作不应误切选择。视觉上可让当前可见的少量选中背景以最多约 100ms 总差值轻淡入，离屏项目直接显示最终状态。筛选后明确全选作用范围，删除需符合既有确认策略，失败保留可恢复状态。键盘操作立刻反映焦点与选中值，触摸点击区域清晰；减少动态效果去掉级联。

减少动态效果：全部选择状态立即显示，无波浪和级联。

上述数值为项目起始参数，应结合真实设备调整；不增加与当前任务无关的效果。
~~~~

## 验收条件

- 全选后立即执行批量操作时使用完整正确集合。
- 部分选中显示 mixed 状态。
- 筛选前后选中数量和操作范围清楚且一致。

## 本项目应用

当前未标记为已应用。它是经过评审的候选规格，不能据此声称相关功能已经实现。

## 参考来源

- [The Role of Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/) — Page Laubheimer / Nielsen Norman Group；查证 2026-10-13；推荐。
- [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations) — Emil Kowalski；查证 2026-10-13；推荐。
- [How to create high-performance CSS animations](https://web.dev/articles/animations-guide) — Kayce Basques、Rachel Andrew / web.dev；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
