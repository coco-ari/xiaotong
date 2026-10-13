<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 稳定布局的筛选标签

分类：交互动效 · 标签：标签、筛选、轻反馈 · 推荐 · 主观评分：9.3/10 · 整理：2026-10-13

让选择状态明确，同时避免截图式标签扩散导致布局不稳定。

## 适用边界

- 适合：提示词库分类；场景筛选；资讯过滤。
- 避免：选中标签大幅膨胀挤走手指；无限弹簧；只用颜色表示选中。
- 实现成本：低；原生按钮组与 CSS。

## 可复制提示词

~~~~text
将分类筛选做成可扫描的标签组，标签文字与命中宽度保持稳定。选中时用浅暖红底、深红文字和小勾表示，不扩大到挤走邻居；有多个标签换行时保持自然文档布局。每个标签为带 aria-pressed 的 button，多选规则在文案里说明；单选则采用明确的 radio 或同页 tab 语义。点击、Space/Enter 后立刻更新结果与数量，当前结果区域保留高度，空结果给重置入口。键盘焦点始终可见，触摸范围不重叠；颜色过渡约 120ms，减少动态效果直接更新。

减少动态效果：直接改变填色、图标与选中状态。

上述数值为项目起始参数，应结合真实设备调整；不增加与当前任务无关的效果。
~~~~

## 验收条件

- 反复选择时触点不被挤走。
- 键盘与触摸获得相同筛选结果。
- 空结果可一键清除，状态不只依赖颜色。

## 本项目应用

当前未标记为已应用。它是经过评审的候选规格，不能据此声称相关功能已经实现。

## 参考来源

- [Layout Animation — React FLIP & Shared Element](https://motion.dev/docs/react-layout-animations) — Motion 官方文档团队；查证 2026-10-13；推荐。
- [Tabs — Radix Primitives](https://www.radix-ui.com/primitives/docs/components/tabs) — Radix / WorkOS；查证 2026-10-13；推荐。
- [How to create high-performance CSS animations](https://web.dev/articles/animations-guide) — Kayce Basques、Rachel Andrew / web.dev；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
