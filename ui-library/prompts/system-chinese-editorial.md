<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 适合中文的编辑式内容阅读

分类：设计系统 · 标签：中文排版、文章、信息密度 · 推荐 · 主观评分：9.1/10 · 整理：2026-10-13

从编辑式风格保留对齐、阅读顺序和留白，避免整套报纸装饰覆盖动漫主题。

## 适用边界

- 适合：资讯列表；长文阅读；研究笔记。
- 避免：照搬英文字距；大段正文每句卡片化；背景纹理干扰阅读。
- 实现成本：中；排版与内容结构调整。

## 可复制提示词

~~~~text
为资讯列表与文章详情建立中文阅读层级。列表清楚区分来源、标题、摘要和时间；标题是入口，收藏是独立操作，避免按钮嵌套。正文采用舒适的固定最大阅读宽度与充分行高，段落留白表达逻辑，不依赖过重阴影或每段一个容器。标题允许自然换行，正文不使用密集负字距，数字和英文名称保持可辨。角色品牌色用于少量引导，阅读表面用稳定纸白和深棕文字。展示真实来源或明确演示标记；收藏等待、成功、失败不打断正文。保留返回入口和阅读位置，键盘焦点始终可见。
~~~~

## 验收条件

- 长中文标题、英文来源和多段正文不截断。
- 文章正文与列表信息层级能快速分辨。
- 收藏控件与阅读入口可分别操作。

## 本项目应用

- [src/home/FeedPage.jsx](../../src/home/FeedPage.jsx)
- [src/home/refined.css](../../src/home/refined.css)

## 参考来源

- [DesignPrompts Newsprint / Swiss Minimalist：编辑式信息层级](https://www.designprompts.dev/) — mellowkenneth；查证 2026-10-13；推荐。
- [DesignPrompts Professional：克制排版，需消除规则冲突](https://www.designprompts.dev/) — mellowkenneth；查证 2026-10-13；推荐。
- [TypeUI Basic 页面中的 Editorial 说明](https://www.typeui.sh/design-skills/basic) — Bergside / TypeUI；查证 2026-10-13；有条件。
- [Details That Make Interfaces Feel Better：细节形成质感](https://github.com/jakubkrehel/make-interfaces-feel-better) — Jakub Krehel；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
