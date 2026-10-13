<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 按频率分组的清晰设置

分类：可用性 · 标签：设置、渐进展开、保存状态 · 推荐 · 主观评分：8.7/10 · 整理：2026-10-13

明确常用、低频与危险操作的位置，比一套奢华控件皮肤更能降低配置负担。

## 适用边界

- 适合：个人设置；低频配置；有少量高级选项的工具。
- 避免：把全部选项塞进同级网格；折叠核心操作；输入变化却没有保存说明。
- 实现成本：中；调整信息分组与保存反馈。

## 可复制提示词

~~~~text
按用户操作频率整理设置：常用选项直接可见，低频高级项置于明确命名的可展开区域；不要折叠完成当前任务所必需的控件。每组有短标题，必要说明紧邻输入，保存方式是立即生效还是集中提交要清楚。危险操作单独说明后果，失败信息靠近相关字段并保留已输入内容。标签可点击聚焦，保留有用自动填充；折叠状态暴露 aria-expanded，隐藏内容不能继续获得焦点。手机单列与安全区可用，减少动态效果直接展开，颜色移除后仍能理解主次。
~~~~

## 验收条件

- 常用设置无需猜测分组即可找到。
- 保存失败保留输入并给出恢复方法。
- 展开、收起和提交均能由键盘完成。

## 本项目应用

当前未标记为已应用。它是经过评审的候选规格，不能据此声称相关功能已经实现。

## 参考来源

- [Better Web UI：层级优先与渐进公开](https://github.com/aladicf/better-web-ui) — aladicf；查证 2026-10-13；有条件。
- [Task-focused Frontend Design：围绕任务的清晰界面](https://github.com/Junaid-PK/frontend-design-skill/blob/main/frontend-design/SKILL.md) — Junaid-PK；查证 2026-10-13；推荐。
- [Accordion — Radix Primitives](https://www.radix-ui.com/primitives/docs/components/accordion) — Radix / WorkOS；查证 2026-10-13；推荐。
- [Rauno Web Interface Guidelines：行为与触摸细节](https://interfaces.rauno.me/) — Rauno Freiberg；查证 2026-10-13；有条件。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
