<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 稳定展开的阅读摘要

分类：交互动效 · 标签：摘要、展开、阅读 · 推荐 · 主观评分：9.6/10 · 整理：2026-10-13

先扫描再深入，能降低信息密度；展开动作解释内容位置。

## 适用边界

- 适合：资讯摘要；背景说明；长提示词预览。
- 避免：短文也强制折叠；正在阅读时自动收起；固定高度截掉完整文本。
- 实现成本：低到中；原生 details 或受控面板。

## 可复制提示词

~~~~text
为长摘要增加明确的“展开全文／收起”按钮，默认显示真实摘要，不用仅靠渐隐遮住半行文字。展开后完整正文进入正常文档流；约 180ms 的高度变化只是辅助，不能压扁文字或复制两份可朗读内容。按钮使用 aria-expanded 和 aria-controls，Enter/Space 可操作，焦点保持在触发器；展开内容里的链接只在可见时可聚焦。处理异步图片与字体改变高度的情况。收起时若内容会跳出视野，保留用户阅读位置并让触发器可见，不主动滚动整个页面。减少动态效果时立即更新。

减少动态效果：直接展开和收起，保留焦点和完整正文。

上述数值为项目起始参数，应结合真实设备调整；不增加与当前任务无关的效果。
~~~~

## 验收条件

- 不同长度正文与图片加载后都不溢出或被截断。
- 重复展开不会丢失焦点或重置整个页面滚动。
- 折叠内容不可见时不留下隐藏可聚焦元素。

## 本项目应用

当前未标记为已应用。它是经过评审的候选规格，不能据此声称相关功能已经实现。

## 参考来源

- [Accordion — Radix Primitives](https://www.radix-ui.com/primitives/docs/components/accordion) — Radix / WorkOS；查证 2026-10-13；推荐。
- [The Role of Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/) — Page Laubheimer / Nielsen Norman Group；查证 2026-10-13；推荐。
- [How to create high-performance CSS animations](https://web.dev/articles/animations-guide) — Kayce Basques、Rachel Andrew / web.dev；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
