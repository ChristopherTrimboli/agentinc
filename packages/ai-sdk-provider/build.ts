import { rm, readFile, writeFile, copyFile } from "fs/promises";
import { Glob, $ } from "bun";

const PKG_PATH = `${import.meta.dir}/package.json`;
const DIST = `${import.meta.dir}/dist`;

const EXTERNAL = [
  "@ai-sdk/openai-compatible",
  "@ai-sdk/provider",
  "@ai-sdk/provider-utils",
  "@solana/kit",
];

await rm(DIST, { recursive: true, force: true });

// Bun caches package.json at process startup, so "sideEffects: false" causes
// Bun.build to tree-shake barrel re-exports even when modified at runtime.
// Strip it BEFORE spawning the bun build subprocess.
const originalPkg = await readFile(PKG_PATH, "utf-8");
const pkg = JSON.parse(originalPkg);
const hadSideEffects = "sideEffects" in pkg;

if (hadSideEffects) {
  delete pkg.sideEffects;
  await writeFile(PKG_PATH, JSON.stringify(pkg, null, 2) + "\n");
}

const ext = EXTERNAL.flatMap((e) => ["--external", e]);
const cwd = import.meta.dir;

try {
  // ── CJS bundle first (bun outputs as index.js, rename to .cjs) ────────
  await $`bun build src/index.ts --outdir dist --format cjs --target node --sourcemap=external ${ext}`.cwd(cwd).quiet();
  await $`mv dist/index.js dist/index.cjs && mv dist/index.js.map dist/index.cjs.map`.cwd(cwd);
  console.log("  CJS  → dist/index.cjs");

  // ── ESM bundle (overwrites any leftover index.js) ─────────────────────
  await $`bun build src/index.ts --outdir dist --format esm --target node --sourcemap=external ${ext}`.cwd(cwd).quiet();
  console.log("  ESM  → dist/index.js");

  // ── Type declarations via tsc ─────────────────────────────────────────
  await $`tsc --emitDeclarationOnly`.cwd(cwd);

  // Copy .d.ts → .d.cts so CJS consumers resolve types correctly
  const glob = new Glob("*.d.ts");
  for await (const file of glob.scan({ cwd: DIST })) {
    await copyFile(`${DIST}/${file}`, `${DIST}/${file.replace(/\.d\.ts$/, ".d.cts")}`);
  }
  console.log("  DTS  → dist/*.d.ts + *.d.cts");

  console.log("\n  Build complete.");
} finally {
  if (hadSideEffects) {
    await writeFile(PKG_PATH, originalPkg);
  }
}
