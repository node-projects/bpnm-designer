import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const siteDir = join(rootDir, 'site');

const packageCopies = [
  ['es-module-shims'],
  ['monaco-editor'],
  ['@node-projects', 'base-custom-webcomponent'],
  ['@node-projects', 'web-component-designer'],
  ['@node-projects', 'web-component-designer-codeview-monaco']
];

const copyDirectory = (sourceRelativeParts, targetRelativeParts) => {
  const sourceDir = join(rootDir, 'node_modules', ...sourceRelativeParts);
  const targetDir = join(siteDir, ...targetRelativeParts);
  mkdirSync(dirname(targetDir), { recursive: true });
  cpSync(sourceDir, targetDir, { recursive: true });
};

rmSync(siteDir, { recursive: true, force: true });
mkdirSync(siteDir, { recursive: true });

cpSync(join(rootDir, 'dist'), join(siteDir, 'dist'), { recursive: true });

const productionIndex = readFileSync(join(rootDir, 'index.html'), 'utf8').replaceAll('./node_modules/', './vendor/');
writeFileSync(join(siteDir, 'index.html'), productionIndex);
writeFileSync(join(siteDir, '.nojekyll'), '');

for (const packageParts of packageCopies) {
  copyDirectory(packageParts, ['vendor', ...packageParts]);
}

console.log(`Prepared GitHub Pages artifact in ${siteDir}`);