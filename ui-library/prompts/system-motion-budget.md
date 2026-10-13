<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 按用途与可见性分配动效

分类：设计系统 · 标签：动效预算、减少动态、性能 · 推荐 · 主观评分：9.5/10 · 整理：2026-10-13

把装饰与信息反馈分开，既保留人物气氛，也避免消耗注意力和渲染资源。

## 适用边界

- 适合：角色氛围；多模块首页；长期使用的个人工具。
- 避免：所有组件持续摆动；后台页面继续帧循环；一刀切让所有动画变慢。
- 实现成本：中；建立可见性和用户偏好的明确停止条件。

## 可复制提示词

~~~~text
逐项列出角色背景、光线、文字、数字与控件动画的触发、信息职责、持续时间和停止条件。高频筛选立即生效；偶发场景切换维持空间关系；环境装饰只在首页可见、页面前台、没有打开模态面板且用户允许时运行。离屏、后台、关闭自动轮换或系统减少动态效果时暂停装饰位移与循环。保留状态文字和选择反馈，不能把减少动态理解为全部动画只是变慢。复用现有 Motion 与 CSS，优先 transform/opacity，集中读写布局，只在证实必要时使用 will-change。
~~~~

## 验收条件

- 页面隐藏、封面离屏和模态打开后装饰运动停止。
- 系统减少动态设置改变后界面响应。
- 停止动效不会隐藏操作结果或角色信息。

## 本项目应用

- [src/home/SceneCover.jsx](../../src/home/SceneCover.jsx)
- [src/home/Home.jsx](../../src/home/Home.jsx)

应用范围：本轮用于场景环境动画和自动轮换的暂停条件；其他动画仍按组件分别检查。

## 参考来源

- [Fixing Motion Performance：动画性能审查](https://github.com/ibelick/ui-skills/blob/main/skills/fixing-motion-performance/SKILL.md) — ibelick；查证 2026-10-13；推荐。
- [Emil Design Engineering：按使用频率选择动效](https://github.com/emilkowalski/skills/blob/main/skills/emil-design-eng/SKILL.md) — Emil Kowalski；查证 2026-10-13；推荐。
- [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations) — Emil Kowalski；查证 2026-10-13；推荐。
- [Create accessible animations in React](https://motion.dev/docs/react-accessibility) — Motion 官方文档团队；查证 2026-10-13；推荐。
- [Mercado Libre 团队的可访问动效实践](https://www.smashingmagazine.com/2023/11/creating-accessible-ui-animations/) — Smashing Magazine / Mercado Libre 设计实践；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
