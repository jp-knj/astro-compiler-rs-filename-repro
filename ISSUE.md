# transform() emits invalid JavaScript when filename contains a double quote

With `@astrojs/compiler-rs@0.5.2`, compiling `<div>Hello</div>` with `filename: 'exa"mple.astro'` returns `diagnostics: []`, but the generated JavaScript fails Node's syntax check. The same input with `filename: 'example.astro'` passes.

## Reproduction

Runnable reproduction: [jp-knj/astro-compiler-rs-filename-repro](https://github.com/jp-knj/astro-compiler-rs-filename-repro).

In an empty directory, install the affected version:

```sh
npm install --save-exact @astrojs/compiler-rs@0.5.2
```

Run:

```sh
node --input-type=module <<'JS'
import { spawnSync } from 'node:child_process';
import { transform } from '@astrojs/compiler-rs';

for (const filename of ['example.astro', 'exa"mple.astro']) {
  const { code, diagnostics } = transform('<div>Hello</div>', { filename });
  const checked = spawnSync(process.execPath, ['--check', '--input-type=module'], {
    input: code,
    encoding: 'utf8',
    timeout: 10_000,
  });
  if (checked.error) throw checked.error;
  console.log({ filename, diagnostics, syntaxStatus: checked.status });
  if (checked.stderr) process.stderr.write(checked.stderr);
}
JS
```

## Expected

Both filenames should produce valid JavaScript and no diagnostics. A double quote is a valid filename character on POSIX systems. The reproduction supplies the name through the API and does not need a physical file with that name.

## Actual

The control passes with syntax status 0. The quoted filename has no diagnostics but fails with syntax status 1:

```js
export const $$metadata = $$createMetadata("exa"mple.astro", { /* ... */ });
```

```text
SyntaxError: missing ) after argument list
```

## Environment and source inspection

- `@astrojs/compiler-rs`: 0.5.2
- Node: 24.8.0
- npm: 11.6.0
- OS/architecture: macOS arm64

[At main commit `5627e84`](https://github.com/withastro/compiler-rs/blob/5627e84dad90d02809d27c9702aab9351b257781/crates/astro_codegen/src/printer/mod.rs#L867-L869), the metadata filename is wrapped in double quotes after `escape_single_quote` is applied. This is static source evidence; the runtime reproduction above uses the published 0.5.2 package. I have not tested a full Astro project build or built that main commit.
