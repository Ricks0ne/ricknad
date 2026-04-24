/* eslint-disable */
/**
 * Web Worker that loads the canonical Solidity compiler binary
 * (soljson) from binaries.soliditylang.org and compiles sources via
 * the standard-JSON input/output interface.
 *
 * Kept in /public so Vite serves it as a plain script — no bundling,
 * no TypeScript compile step. The main thread instantiates it with
 * `new Worker("/solc-worker.js")` and posts messages of the shape:
 *
 *   { id: string, compilerUrl: string, input: <solc standard json> }
 *
 * The worker responds with:
 *
 *   { id, ok: true,  output: <solc standard json output> }
 *   { id, ok: false, error: string }
 */

let loadedCompilerUrl = null;
let compileFn = null;

function loadCompiler(url) {
  if (url === loadedCompilerUrl && compileFn) return;

  // soljson defines `Module` on the global scope (self) once loaded.
  // Reset it between different compiler versions so we don't pick up
  // stale state from a previous import.
  self.Module = undefined;
  importScripts(url);

  if (!self.Module) {
    throw new Error("soljson loaded but did not define Module");
  }

  // Since 0.5.x the canonical entry point is `solidity_compile`.
  compileFn = self.Module.cwrap("solidity_compile", "string", ["string", "number"]);
  loadedCompilerUrl = url;
}

self.onmessage = (e) => {
  const { id, compilerUrl, input } = e.data || {};
  try {
    if (!id) throw new Error("Missing id in worker message");
    if (!compilerUrl) throw new Error("Missing compilerUrl in worker message");
    if (!input) throw new Error("Missing input in worker message");

    loadCompiler(compilerUrl);

    const inputJson = typeof input === "string" ? input : JSON.stringify(input);
    const outputJson = compileFn(inputJson, 0);
    const output = JSON.parse(outputJson);
    self.postMessage({ id, ok: true, output });
  } catch (err) {
    const message = err && err.message ? err.message : String(err);
    self.postMessage({ id, ok: false, error: message });
  }
};
