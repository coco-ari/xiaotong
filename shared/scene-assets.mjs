// 新增人物时在这里登记元信息，并把对应人物与背景文件放入 src/home/art。
// 人物与背景可在模块规则中独立选取，校验和界面共用此注册表。
export const SCENE_ASSETS=[
 {id:'greeting',label:'打个招呼',file:'red-maid.png',eyebrow:'Hello, 亲爱的自己 ♡',lines:['把喜欢的','都放在','这里。'],note:'一点好奇，一点期待。',english:['little joys,','every day.'],caption:'收集日常里的闪光。',alt:'红发女仆少女微笑着向你招手',background:'scene-pastel-greeting-v7.png',tone:'vermilion',sceneLines:['很高兴，','又见到你。']},
 {id:'happy',label:'赚钱开心',file:'red-maid-happy.png',eyebrow:'今天的小确幸 ♡',lines:['又多了','一点点','小确幸。'],note:'今日收益已准备好 · 演示',english:['a little gain,','a big smile.'],caption:'示例今日收益 +368.24 元。',alt:'红发女仆少女开心地闭眼微笑，握起双拳庆祝',background:'scene-pastel-happy-v7.png',tone:'vermilion',sceneLines:['今天的收益，','准备好啦。']},
 {id:'sad',label:'亏损落泪',file:'red-maid-sad.png',eyebrow:'没关系，我在这里 ♡',lines:['起起落落','都陪你','慢慢来。'],note:'今天有点小回撤 · 表情演示',english:['take it slow,','I am here.'],caption:'仅预览亏损表情，不代表实际收益。',alt:'红发女仆少女眼含泪水，轻轻擦去脸颊的眼泪',background:'scene-pastel-sad-v7.png',tone:'silver',sceneLines:['慢一点，','也没关系。']},
 {id:'excited',label:'发现惊喜',file:'red-maid-excited.png',eyebrow:'快看，我发现了！✦',lines:['你的喜欢','有新的','小回音。'],note:'有你感兴趣的内容 · 演示',english:['oh, look!','a little spark.'],caption:'3 条示例灵感，等你来翻开。',alt:'红发女仆少女兴奋地睁大眼睛，竖起手指分享新发现',background:'scene-pastel-excited-v7.png',tone:'vermilion',sceneLines:['发现了，','你的喜欢。']},
 {id:'reading',label:'认真阅读',file:'red-maid-reading.png',eyebrow:'陪你读一点喜欢的',lines:['给好奇心','留一段','好时光。'],note:'慢一点，发现更多小世界。',english:['one more page,','one more world.'],caption:'把值得读的，留给现在的自己。',alt:'红发女仆少女双手拿着一本书，温柔而专注地阅读',background:'scene-pastel-reading-v7.png',tone:'silver',sceneLines:['把时间，','留给喜欢。']},
 {id:'sleepy',label:'温柔晚安',file:'red-maid-sleepy.png',eyebrow:'今天也辛苦啦 ☾',lines:['把忙碌','轻轻放下','晚安呀。'],note:'未完的小事，明天再慢慢来。',english:['sweet dreams,','dear you.'],caption:'给自己一个安静的夜晚。',alt:'红发女仆少女闭上眼睛，双手轻握在围裙前，温柔地说晚安',background:'scene-pastel-sleepy-v7.png',tone:'night',sceneLines:['把今天，','轻轻放下。']},
];
