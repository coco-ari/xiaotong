<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 触摸与键盘都完整的控件基线

分类：可用性 · 标签：触控、键盘、焦点 · 推荐 · 主观评分：9.5/10 · 整理：2026-10-13

可靠的触控与焦点反馈让精致外观成为真实可用的界面。

## 适用边界

- 适合：筛选；表单；移动端操作；图标按钮。
- 避免：只依赖 hover；隐藏默认焦点却不给替代；所有控件套同一种键盘规则。
- 实现成本：中；逐流程检查，不依赖整站换库。

## 可复制提示词

~~~~text
检查小彤的所有主要操作是否使用恰当的 button、link、input 或 select 语义。图标按钮有中文名称，表单标签关联输入；项目触摸目标按至少 44px 设计，相邻目标不重叠。焦点外环在深色和浅色表面都清晰，不能被圆角容器裁掉。输入、原生滑杆和单选组分别使用自身键盘规则，不劫持页面滚动键；触摸不需要先 hover 才看见功能。保留有用的浏览器自动填充，缩放页面仍能阅读。减少动态效果时保留选中与按下状态，用真实鼠标、触摸模拟和键盘验证核心路径。
~~~~

## 验收条件

- 不使用鼠标也能完成主要筛选和设置。
- 图标按钮均有可辨名称与足够命中区域。
- 触摸无悬停依赖，窄屏和 200% 缩放下内容可达。

## 本项目应用

- [src/home/ui/SegmentedControl.jsx](../../src/home/ui/SegmentedControl.jsx)
- [src/home/ui/Dialog.jsx](../../src/home/ui/Dialog.jsx)
- [src/home/refined.css](../../src/home/refined.css)

应用范围：本轮应用于分段控件、对话框及主要按钮的焦点和触控规则；不宣称已完成全产品无障碍认证。

## 参考来源

- [Rauno Web Interface Guidelines：行为与触摸细节](https://interfaces.rauno.me/) — Rauno Freiberg；查证 2026-10-13；有条件。
- [Vercel Web Interface Guidelines：定位到代码的 UI 审查](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) — Vercel；查证 2026-10-13；推荐。
- [Baseline UI：快速清理界面与状态基线](https://github.com/ibelick/ui-skills/blob/main/skills/baseline-ui/SKILL.md) — ibelick；查证 2026-10-13；有条件。
- [The A11Y Project 检查表](https://www.a11yproject.com/checklist/) — The A11Y Project；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
