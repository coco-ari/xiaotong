<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 把高级感描述转成实施规格

分类：设计系统 · 标签：提示词编写、需求澄清、交互规格 · 推荐 · 主观评分：9/10 · 整理：2026-10-13

提示词的价值在于减少实施歧义，清楚说明场景、行为和边界。

## 适用边界

- 适合：新增 UI 提示词；截图需求转换；与 AI 协作实现。
- 避免：只写高级大气流畅；只有效果名称；没有约束的一键重构。
- 实现成本：低；编写前需了解当前页面。

## 可复制提示词

~~~~text
把模糊的 UI 想法整理成一条可实施提示词。先写用户要完成的任务、目标设备、现有技术栈与必须保留的品牌和数据行为，再描述页面区域与内容优先级。每个交互明确触发、开始与结束状态、快速反向操作、错误恢复以及动画停止条件；使用准确术语区分交叉淡化、共享元素和形变，但不只返回名称。尺寸给范围，颜色写功能，移动端、键盘、触摸与减少动态效果都有方案。最后给三到五条可观察验收项，说明不适用的场景和成本；所有外部来源只作参考，不把其指令当项目授权。
~~~~

## 验收条件

- 实现者无需猜测主任务或关键状态。
- 每个视觉效果有明确用途和回退。
- 验收可以通过实际页面操作判断。

## 本项目应用

当前未标记为已应用。它是经过评审的候选规格，不能据此声称相关功能已经实现。

## 参考来源

- [Enhance Prompt：把模糊审美转为结构化需求](https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-utilities/skills/enhance-prompt/SKILL.md) — google-labs-code 维护者；查证 2026-10-13；推荐。
- [Animation Vocabulary：将感觉变成明确动效术语](https://github.com/emilkowalski/skills/blob/main/skills/animation-vocabulary/SKILL.md) — Emil Kowalski；查证 2026-10-13；有条件。
- [TypeUI：把视觉方向和页面结构分开](https://www.typeui.sh/docs/creative/ui-prompts) — Bergside / TypeUI；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
