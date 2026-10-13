<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 朱红、纸白与暖墨的设计尺度

分类：设计系统 · 标签：设计变量、角色品牌、表面层次 · 推荐 · 主观评分：9.4/10 · 整理：2026-10-13

把高级感落实为可复用的色彩、排版、间距与状态关系，能持续约束后续页面。

## 适用边界

- 适合：多页视觉统一；长期产品维护；角色陪伴工具。
- 避免：为了流行更换角色品牌；混用互相冲突的视觉主题。
- 实现成本：中；先提取变量，再逐组件替换。

## 可复制提示词

~~~~text
为小彤建立一套小而完整的设计变量。保留朱红角色、米白茶室与暖棕氛围：深暖墨作主画布，浅纸色用于需要长时间阅读的局部表面；每种表面绑定自己的正文、次要文字、边界和焦点颜色。区分品牌红、错误语义与本项目盈利红，状态同时带文字或符号。统一字号阶梯、中文行高、间距、卡片和控件圆角、两级阴影与短反馈时长，用语义变量表达用途，不在组件里不断增加相似颜色。真实检查长中文、数字、窄屏和明暗表面反差；减少动态效果保留全部静态层次。
~~~~

## 验收条件

- 同用途控件跨页使用一致颜色、尺寸和状态。
- 纸色卡片的次要文字不沿用深色画布上的浅灰。
- 普通正文对比度与 320px 窄屏实际检查通过。

## 本项目应用

- [src/home/refined.css](../../src/home/refined.css)

## 参考来源

- [Frontend Design：从产品主题形成视觉语言](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) — Anthropic；查证 2026-10-13；推荐。
- [UI UX Pro Max：场景匹配的设计系统提示词](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) — NextLevelBuilder；查证 2026-10-13；推荐。
- [Details That Make Interfaces Feel Better：细节形成质感](https://github.com/jakubkrehel/make-interfaces-feel-better) — Jakub Krehel；查证 2026-10-13；推荐。
- [TypeUI：把视觉方向和页面结构分开](https://www.typeui.sh/docs/creative/ui-prompts) — Bergside / TypeUI；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
