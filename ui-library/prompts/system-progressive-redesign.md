<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 有证据的渐进式 UI 重构

分类：设计系统 · 标签：重构、功能保留、设计评审 · 推荐 · 主观评分：9/10 · 整理：2026-10-13

先保留真实行为与数据路径，再按问题改善层级，变化才可审查、可验证。

## 适用边界

- 适合：已有产品改造；多人维护；长期迭代。
- 避免：先换框架再讨论问题；一轮混入多个审美主题；只凭截图删掉功能。
- 实现成本：中；需要清单和真实页面检查。

## 可复制提示词

~~~~text
重构已有页面前先盘点主要用户任务、当前入口、API、保存行为、返回路径和品牌资产。记录每个实际问题及其位置，按任务清晰度、信息层级、控件一致性和边界状态排序。沿用现有技术栈，先修主次与拥挤，再统一重复尺度，最后添加能解释状态的少量动效。不要为了新鲜改掉熟悉入口。每次变更说明解决了什么问题，并回归原有数据、键盘、触摸、网络失败与返回行为。用真实截图和操作结果复核，未验证的推断明确标记。
~~~~

## 验收条件

- 改造前后主要功能和数据保存路径可以逐项对照。
- 每一类视觉变化有具体问题依据。
- 源码、桌面和手机验证结果一起交付。

## 本项目应用

当前未标记为已应用。它是经过评审的候选规格，不能据此声称相关功能已经实现。

## 参考来源

- [Impeccable：设计批评、系统化和有目的的动效](https://github.com/pbakaus/impeccable) — Paul Bakaus；查证 2026-10-13；推荐。
- [Redesign Existing Projects：先审查再定点改造](https://github.com/Leonxlnx/taste-skill/blob/main/skills/redesign-skill/SKILL.md) — Leonxlnx / Taste Skill 团队；查证 2026-10-13；有条件。
- [22 UI Prompts：工程化界面改进工作流](https://www.codewithkhosro.dev/blog/post/shipping-solid-ui-as-a-back-end-developer-using-llms-part-2-a-practical-daily-workflow-using-22-prompts) — Khosro Pakmanesh；查证 2026-10-13；有条件。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
