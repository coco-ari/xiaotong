<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 详情返回时恢复上下文

分类：可用性 · 标签：返回、阅读位置、浏览历史 · 推荐 · 主观评分：9.5/10 · 整理：2026-10-13

返回能继续原来的阅读，比华丽页面转场更直接改善日常体验。

## 适用边界

- 适合：文章列表到正文；首页到收益详情；连续浏览内容。
- 避免：每次返回都跳回顶部；用平滑滚动强迫用户等待；只保存单一全局位置。
- 实现成本：中；路由条目、滚动与焦点联合管理。

## 可复制提示词

~~~~text
为每次浏览历史条目记录自己的滚动位置与触发控件标识。进入新的详情时把焦点交给页面标题，返回列表时先恢复筛选与内容，再恢复对应触发器焦点和滚动位置；聚焦使用 preventScroll，避免二次跳动。浏览器后退、前进和页面返回按钮遵循同一行为。直接进入详情时提供合理返回落点；原条目已不存在时回到列表标题，不让焦点消失。不要只使用一个全局 scrollY，不为恢复位置播放长滚动动画。减少动态效果下保持完全相同的导航功能。
~~~~

## 验收条件

- 从列表中部打开文章再返回，仍在相同条目附近。
- 浏览器前进后退与页面按钮结果一致。
- 焦点回到原入口，失效入口有可用回退。

## 本项目应用

- [src/home/useNavigation.js](../../src/home/useNavigation.js)
- [src/home/FeedPage.jsx](../../src/home/FeedPage.jsx)

## 参考来源

- [Vercel Web Interface Guidelines：定位到代码的 UI 审查](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) — Vercel；查证 2026-10-13；推荐。
- [Rauno Web Interface Guidelines：行为与触摸细节](https://interfaces.rauno.me/) — Rauno Freiberg；查证 2026-10-13；有条件。
- [The Role of Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/) — Page Laubheimer / Nielsen Norman Group；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
