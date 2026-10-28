# compiler-rs filename escaping reproduction

`@astrojs/compiler-rs@0.5.2` generates invalid JavaScript when the `filename` option contains a double quote. The compiler reports no diagnostics.

## Run

Using Node 24.8.0 and npm 11.6.0:

```sh
npm ci
npm run repro
```

The affected version exits with status **1**. A fixed compiler should make the same check exit with status **0**.

## Expected and actual results

Both cases compile the same `input.astro`:

```astro
<div>Hello</div>
```

Only the `filename` option changes:

| Filename | Expected JS syntax | Actual on 0.5.2 | Diagnostics |
| --- | --- | --- | --- |
| `example.astro` | Valid | Valid | `[]` |
| `exa"mple.astro` | Valid | Invalid | `[]` |

The quoted case emits:

```js
export const $$metadata = $$createMetadata("exa"mple.astro", { /* ... */ });
```

Node rejects this with `SyntaxError: missing ) after argument list`.

`repro.mjs` checks each generated module with `node --check --input-type=module`. It saves the complete generated modules and diagnostics under `output/`. The script passes the filename as an API argument, so no file with a special name is needed.

## Evidence and limits

The case was reproduced on macOS arm64 with Node 24.8.0. The dependency and lockfile pin compiler-rs to 0.5.2. Other platforms have not been tested.

Static inspection of [compiler-rs main at `5627e84`](https://github.com/withastro/compiler-rs/blob/5627e84dad90d02809d27c9702aab9351b257781/crates/astro_codegen/src/printer/mod.rs#L867-L869) shows that the metadata filename is wrapped in double quotes after `escape_single_quote` is applied. That commit has not been built or executed for this reproduction.

This reproduces the compiler API failure. A full Astro project build has not been tested. Existing issue and PR searches did not identify the same report; that search does not establish that the bug has never been reported.

See [repro-output.txt](./repro-output.txt) for the recorded run and [ISSUE.md](./ISSUE.md) for a standalone issue draft.
