<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 资源就绪后的有序角色场景切换

分类：场景方案 · 标签：角色、场景、渐变 · 推荐 · 主观评分：9.5/10 · 整理：2026-10-13

符合项目角色品牌，连续场景变化比多层炫技更适合日常首页。

## 适用边界

- 适合：六种表情对应场景；主题卡片；封面氛围。
- 避免：全页持续缩放；先换人物后等背景；自动频繁切换心情。
- 实现成本：中；预加载与竞态处理比动画本身重要。

## 可复制提示词

~~~~text
改进角色表情与对应茶室背景的切换，保留现有六套素材、人物位置与文案安全区。用户选择心情后预加载并解码目标人物和背景，资源齐全才按旧人物退出、背景过渡、新人物与文字错峰入场的顺序提交；仅背景可交叉淡化，任何时刻禁止双人物重影。快速切换仅处理最后一次选择，不能出现错配场景或旧图闪回。加载失败保留当前场景并给文字反馈。固定容器比例避免页面跳动，完成后清理旧图层。选择器支持键盘并暴露选中状态，装饰图不重复朗读；减少动态效果时关闭视差、漂浮和大位移，资源准备好后直接更新。

减少动态效果：保持静态场景；用户切换时资源准备好后立即完整替换，不显示双人物。

上述数值为项目起始参数，应结合真实设备调整；不增加与当前任务无关的效果。
~~~~

## 验收条件

- 慢网连续切换表情时人物、背景、标签最终一一对应。
- 图片失败不产生空白封面。
- 减少动态效果与后台页面均无持续运动。

## 本项目应用

- [src/home/SceneCover.jsx](../../src/home/SceneCover.jsx)
- [src/home/Home.jsx](../../src/home/Home.jsx)

应用范围：沿用旧人物退出、背景过渡、新人物与文字入场的既有顺序；本轮补充心情场景预览和装饰暂停。

## 参考来源

- [Create accessible animations in React](https://motion.dev/docs/react-accessibility) — Motion 官方文档团队；查证 2026-10-13；推荐。
- [useReducedMotion](https://motion.dev/docs/react-use-reduced-motion) — Motion 官方文档团队；查证 2026-10-13；推荐。
- [How to create high-performance CSS animations](https://web.dev/articles/animations-guide) — Kayce Basques、Rachel Andrew / web.dev；查证 2026-10-13；推荐。
- [The Role of Animation and Motion in UX](https://www.nngroup.com/articles/animation-purpose-ux/) — Page Laubheimer / Nielsen Norman Group；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
