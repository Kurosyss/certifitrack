import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const backendDir = path.resolve(rootDir, 'backend');

console.log('🚀 Starting CertifiTrack Frontend & Backend...');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';
const npxCmd = isWindows ? 'npx.cmd' : 'npx';

const backend = spawn(npxCmd, ['tsx', 'watch', 'src/server.ts'], {
  cwd: backendDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

const frontend = spawn(npxCmd, ['astro', 'dev'], {
  cwd: rootDir,
  stdio: 'inherit',
  shell: true,
  env: { ...process.env }
});

const cleanup = () => {
  console.log('\n🛑 Shutting down CertifiTrack services...');
  backend.kill();
  frontend.kill();
  process.exit();
};

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
