<!-- 此文件由 scripts/build-ui-library.mjs 生成；请修改 ui-library/catalog.json。 -->

# 首轮演示回放与稳定的收益详情

分类：场景方案 · 标签：收益概览、真实读值、返回稳定 · 推荐 · 主观评分：9.2/10 · 整理：2026-10-13

保留项目规定的首轮叙事，同时让重复浏览和详情核对回到即时、稳定的体验。

## 适用边界

- 适合：本项目演示收益卡片；有历史序列的概览。
- 避免：把插值当实时行情；每次返回都重播；用户调节数值仍追随弹簧。
- 实现成本：中；回放状态、可见性和详情控件协同。

## 可复制提示词

~~~~text
保留收益卡片既有首轮演示顺序：按实际示例日期与历史序列展示累计值，结束后累计区域收小并出现今日收益，清楚标注演示。只在字体稳定且卡片可见时开始，离屏或后台暂停；本轮会话已经播放完成后，从详情返回保持最终状态，不反复重播。读屏提供固定的最终摘要，不逐帧播报。详情使用原生 range 即时检查日期和精确金额，aria-valuetext 包含日期与单位，分段控件切换周期即更新数据，不对滑杆数值加弹簧。系统减少动态效果时概览直接显示最终结果。
~~~~

## 验收条件

- 初次演示使用已有日期序列，不伪装实时行情。
- 播放完成后进入详情再返回不会重播。
- 原生滑杆键盘和指针即时改变同一准确读值；减少动态时直接最终态。

## 本项目应用

- [src/home/FinanceCard.jsx](../../src/home/FinanceCard.jsx)
- [src/home/FinancePage.jsx](../../src/home/FinancePage.jsx)

## 参考来源

- [NumberFlow for React](https://number-flow.barvian.me/) — Maxwell / Max Barvian；查证 2026-10-13；推荐。
- [Good vs Great Animations](https://emilkowal.ski/ui/good-vs-great-animations) — Emil Kowalski；查证 2026-10-13；推荐。
- [You Don't Need Animations](https://emilkowal.ski/ui/you-dont-need-animations) — Emil Kowalski；查证 2026-10-13；推荐。
- [Vercel Web Interface Guidelines：定位到代码的 UI 审查](https://github.com/vercel-labs/web-interface-guidelines/blob/main/command.md) — Vercel；查证 2026-10-13；推荐。

本条为本项目原创综合改写，来源用于说明参考原则；不表示原作者写过、认可或担保本提示词。评分不是用户测试或行业排名，动效参数需要按设备与内容验证。
