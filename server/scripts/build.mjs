// Construit dist/index.js. Les dépendances npm restent externes ; le paquet partagé
// (TypeScript source) est intégré au bundle pour pouvoir tourner en production.
import { readFileSync } from 'node:fs';
import { build } from 'esbuild';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const external = Object.keys(pkg.dependencies ?? {}).filter((name) => name !== '@medsuivi/shared');

await build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  format: 'esm',
  target: 'node20',
  outfile: 'dist/index.js',
  sourcemap: true,
  external,
});
console.log('Serveur construit dans dist/index.js');
