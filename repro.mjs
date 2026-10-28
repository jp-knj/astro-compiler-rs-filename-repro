import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { transform } from '@astrojs/compiler-rs';

const require = createRequire(import.meta.url);
const { version } = require('@astrojs/compiler-rs/package.json');
const source = readFileSync(new URL('./input.astro', import.meta.url), 'utf8');
const outputDirectory = new URL('./output/', import.meta.url);
mkdirSync(outputDirectory, { recursive: true });

console.log(`Node ${process.version} (${process.platform}/${process.arch})`);
console.log(`@astrojs/compiler-rs ${version}`);

const cases = [
  { label: 'control', filename: 'example.astro' },
  { label: 'double-quote', filename: 'exa"mple.astro' },
];
const results = [];

for (const { label, filename } of cases) {
  const { code, diagnostics } = transform(source, { filename });
  writeFileSync(new URL(`${label}.mjs`, outputDirectory), code);
  writeFileSync(
    new URL(`${label}.diagnostics.json`, outputDirectory),
    `${JSON.stringify(diagnostics, null, 2)}\n`,
  );
  assert.deepEqual(diagnostics, [], `${label}: expected no diagnostics`);

  const checked = spawnSync(process.execPath, ['--check', '--input-type=module'], {
    input: code,
    encoding: 'utf8',
    timeout: 10_000,
  });
  if (checked.error) throw checked.error;
  assert.notEqual(checked.status, null, `${label}: Node exited without a status`);

  console.log(`\n${label}: filename=${JSON.stringify(filename)}`);
  console.log(`diagnostics=${JSON.stringify(diagnostics)}`);
  console.log(`node --check exit status=${checked.status}`);
  if (checked.stderr) process.stderr.write(checked.stderr);
  results.push(checked.status);
}

assert.equal(results[0], 0, 'The control must generate valid JavaScript');

if (results[1] !== 0) {
  console.error('\nReproduced: the quoted filename generates invalid JavaScript without diagnostics.');
  process.exitCode = 1;
} else {
  console.log('\nBoth filenames generate valid JavaScript.');
}
