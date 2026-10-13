import {resolve} from 'node:path';
import {collectSceneSource, loadSceneSources} from '../server/scene-adapters.mjs';

const args = process.argv.slice(2);
const probe = args.includes('--probe');
const files = args.filter(arg => arg !== '--probe');
if (files.length !== 1 || files[0].startsWith('--')) {
  console.error('用法：npm run scene:check -- 配置文件路径 [--probe]');
  process.exitCode = 1;
} else {
  try {
    const sources = loadSceneSources(resolve(files[0]));
    console.log(`配置通过：${sources.length} 个数据源。`);
    if (probe) {
      // 探测只读取上游并验证映射，不修改首页配置或已保存的数据。
      await Promise.all(sources.map(async source => {
        try {
          const result = await collectSceneSource(source);
          console.log(`${source.id}：映射通过，${Object.keys(result.values).length} 个字段，数据时间 ${new Date(result.asOf).toISOString()}。`);
        } catch {
          console.error(`${source.id}：探测未通过，请检查连通性、凭据、业务状态、字段和数据时间。`);
          process.exitCode = 1;
        }
      }));
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
