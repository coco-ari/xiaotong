<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 以角色开场的安静个人首页

分类：场景方案 · 标签：首页、角色场景、信息主次 · 推荐 · 主观评分：9.2/10 · 整理：2026-10-13

尊重本项目从人物场景开始的习惯，把氛围与真实内容分出明确主次。

## 适用边界

- 适合：小彤首页；陪伴型个人空间；内容与角色并存。
- 避免：品牌栏抢占首屏；照搬 SaaS 侧栏；把宣传标语放进个人任务。
- 实现成本：中；重排层次与响应式，不更改数据接口。

## 可复制提示词

~~~~text
重构小彤个人首页时，直接从人物场景开始，不加品牌栏、欢迎标题、头像铃铛或底部导航。封面维持文案左上、角色右侧的构图，统计条在下缘承接内容；往下依次阅读收益、资讯和设置。卡片直接展示金额、趋势与文章标题，用少量明确标签说明数据含义，演示内容持续标注。深暖墨画布与浅纸阅读表面协调，朱红只强调当前动作。点击卡片进入详情，返回恢复原来的浏览位置。手机不横向溢出；键盘能抵达主要内容、卡片和设置；关闭动态效果仍保留完整场景和信息层级。
~~~~

## 验收条件

- 首页首个可见主体仍是角色场景。
- 卡片进入详情并返回后位置保持。
- 标题、人物和统计条在窄屏互不遮挡。

## 本项目应用

- [src/home/Home.jsx](../../src/home/Home.jsx)
- [src/home/refined.css](../../src/home/refined.css)

## 参考来源

- [Frontend Design：从产品主题形成视觉语言](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) — Anthropic；查证 2026-10-13；推荐。
- [Taste Skill：布局、动效、信息密度三项控制](https://github.com/Leonxlnx/taste-skill/blob/main/skills/taste-skill/SKILL.md) — Leonxlnx / Taste Skill 团队；查证 2026-10-13；有条件。
- [TypeUI：把视觉方向和页面结构分开](https://www.typeui.sh/docs/creative/ui-prompts) — Bergside / TypeUI；查证 2026-10-13；推荐。
- [Task-focused Frontend Design：围绕任务的清晰界面](https://github.com/Junaid-PK/frontend-design-skill/blob/main/frontend-design/SKILL.md) — Junaid-PK；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
