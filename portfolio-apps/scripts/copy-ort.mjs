/**
 * The in-browser model runtime (onnxruntime-web) ships ~60 MB of WebAssembly.
 * It is served from this origin so the page's CSP can stay strict, but it is
 * not committed: this copies it out of node_modules before every build.
 */
import { cpSync, existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = dirname(dirname(fileURLToPath(import.meta.url)))
const from = join(root, 'node_modules', 'onnxruntime-web', 'dist')
const to = join(root, 'public', 'ort')

if (!existsSync(from)) {
  console.warn('[copy-ort] onnxruntime-web is not installed; skipping.')
  process.exit(0)
}

mkdirSync(to, { recursive: true })
const wanted = readdirSync(from).filter((f) => /^ort-wasm-simd-threaded(\.asyncify|\.jsep)?\.(wasm|mjs)$/.test(f))
let bytes = 0
for (const f of wanted) {
  cpSync(join(from, f), join(to, f))
  bytes += statSync(join(to, f)).size
}
console.log(`[copy-ort] ${wanted.length} files, ${(bytes / 1e6).toFixed(1)} MB → public/ort`)
