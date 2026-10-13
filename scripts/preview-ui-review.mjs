import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import webpush from 'web-push';
import {createApp} from '../server/index.mjs';

// 独立的本地演示身份与数据目录，避免预览或自动验证读取个人运行数据。
const dataDir = resolve('.runtime/ui-review-state');
mkdirSync(dataDir, {recursive: true});
const secretsPath = resolve(dataDir, 'secrets.json');
if (!existsSync(secretsPath)) {
  writeFileSync(secretsPath, JSON.stringify({access: 'ui-review-local', vapid: webpush.generateVAPIDKeys(), subscription: null}));
}
const port = Number(process.env.UI_PREVIEW_PORT || 18890);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('预览端口无效');
const app = createApp({dataDir, origin: 'http://127.0.0.1:' + port, scheduler: false});
app.listen(port, '127.0.0.1', () => console.log('本地界面预览：http://127.0.0.1:' + port + '/app/ui-review-local/'));
