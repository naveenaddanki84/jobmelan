import { build } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

const agentWorkerDir = path.join(rootDir, 'agents-worker');

await build({
  entryPoints: [
    path.join(agentWorkerDir, 'agent.ts'),
    path.join(agentWorkerDir, 'run.ts'),
  ],
  outdir: path.join(agentWorkerDir, 'dist'),
  bundle: false,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  sourcemap: true,
  logLevel: 'info',
});

console.log('Agent worker built successfully!');


