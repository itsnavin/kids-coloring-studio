import { readFile, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
const notices = ['Little Lines - production dependency license notices', 'Original artwork: CC0-1.0. Application code: MIT. See repository LICENSE.'];
for (const [directory, info] of Object.entries(lock.packages)) {
  if (!directory || info.dev) continue;
  const files = (await readdir(directory, { withFileTypes: true }))
    .filter(entry => entry.isFile() && /^licen[cs]e(?:[.-]|$)/i.test(entry.name));
  if (!files.length) throw new Error(`Missing upstream license text: ${directory}`);
  notices.push(`\n${'='.repeat(72)}\n${directory} ${info.version} (${info.license ?? 'see license below'})\n`);
  for (const file of files) notices.push(await readFile(path.join(directory, file.name), 'utf8'));
}
await writeFile(path.join('dist', 'THIRD-PARTY-LICENSES.txt'), notices.join('\n\n'));
