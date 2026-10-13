<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 有分寸的按压反馈

分类：交互动效 · 标签：按钮、即时反馈、高频操作 · 推荐 · 主观评分：9.6/10 · 整理：2026-10-13

小范围按压能确认输入，成本低且不打断日常任务。

## 适用边界

- 适合：收藏按钮；复制提示词；确认设置；角色切换。
- 避免：整个表格行缩放；输入框文字形变；确认前模拟成功。
- 实现成本：低；原生按钮与 CSS 即可。

## 可复制提示词

~~~~text
为原生按钮增加克制的按压反馈，沿用项目配色和真实操作。按下时只让小按钮视觉层轻缩约 0.97，松开约 120ms 归位；不用整个大卡片缩放来移动阅读内容。键盘、触摸动作立即执行，focus-visible 清晰，命中区域至少按本项目 44px 目标设计。提交中防止重复请求，成功与失败以真实结果更新文字或选中状态。保持控件宽度，hover 只轻改表面颜色，触屏不依赖 hover。减少动态效果时取消缩放和过渡，但保留焦点及状态差异。
~~~~

## 验收条件

- 鼠标、触摸、Enter、Space 都只触发一次有效动作。
- 请求失败显示可理解文案，按钮尺寸不抖动。
- 减少动态效果时仍能辨认按下、禁用与成功状态。

## 本项目应用

- [src/home/refined.css](../../src/home/refined.css)

应用范围：小型按钮的按压、触摸尺寸、焦点与减少动态效果规则。

## 参考来源

- [Good vs Great Animations](https://emilkowal.ski/ui/good-vs-great-animations) — Emil Kowalski；查证 2026-10-13；推荐。
- [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations) — Emil Kowalski；查证 2026-10-13；推荐。
- [How to create high-performance CSS animations](https://web.dev/articles/animations-guide) — Kayce Basques、Rachel Andrew / web.dev；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
