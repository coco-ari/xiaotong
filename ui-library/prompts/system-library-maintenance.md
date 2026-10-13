<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 可追溯的 UI 提示词仓库

分类：设计系统 · 标签：提示词库、来源评价、长期维护 · 推荐 · 主观评分：9/10 · 整理：2026-10-13

来源、判断和应用记录并存，后续才能筛掉过时规则并持续积累。

## 适用边界

- 适合：团队设计知识库；个人 UI 资源库；周期性收集。
- 避免：收录数量代替质量；同仓库星数反复计算；把原创改写标为原作者作品。
- 实现成本：低到中；需要固定数据字段与审核流程。

## 可复制提示词

~~~~text
维护 UI 提示词库时，将来源评审和可执行提示词分开。来源记录直达链接、作者、阅读范围、日期、可核验热度、优点、限制、场景和复用边界；打不开的资料标待读，不参与推荐。原创提示词关联来源 id，包含适用和不适用、明确行为、无障碍与性能回退、成本及验收。按实际任务合并重复条目，不靠改名扩充数量。分别统计评审记录、唯一 URL、同源作者或机构族；星数与票数不替代质量评分。应用位置只写真实使用的文件，未做能力不打已应用标记。
~~~~

## 验收条件

- 所有推荐提示词的来源 id 均可解析且不是待读。
- 同源条目和热度来源能被识别。
- 搜索、复制、修改数据与重新构建均有明确路径。

## 本项目应用

当前未标记为已应用。它是经过评审的候选规格，不能据此声称相关功能已经实现。

## 参考来源

- [22 UI Prompts：工程化界面改进工作流](https://www.codewithkhosro.dev/blog/post/shipping-solid-ui-as-a-back-end-developer-using-llms-part-2-a-practical-daily-workflow-using-22-prompts) — Khosro Pakmanesh；查证 2026-10-13；有条件。
- [Impeccable：设计批评、系统化和有目的的动效](https://github.com/pbakaus/impeccable) — Paul Bakaus；查证 2026-10-13；推荐。
- [Enhance Prompt：把模糊审美转为结构化需求](https://github.com/google-labs-code/stitch-skills/blob/main/plugins/stitch-utilities/skills/enhance-prompt/SKILL.md) — google-labs-code 维护者；查证 2026-10-13；推荐。
- [DesignPrompts：同一内容的多风格比较](https://www.designprompts.dev/) — mellowkenneth；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
