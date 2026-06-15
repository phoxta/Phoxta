// One-off: convert oversized PNG/JPG sources in src/images to capped-width WebP.
// Usage: node scripts/compress-images.mjs
import { readdirSync, statSync, unlinkSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const IMAGES_DIR = fileURLToPath(new URL('../src/images', import.meta.url))
const SIZE_THRESHOLD = 300 * 1024
const MAX_WIDTH = 2560

const files = readdirSync(IMAGES_DIR)
  .filter((f) => /\.(png|jpe?g)$/i.test(f))
  .map((f) => join(IMAGES_DIR, f))
  .filter((f) => statSync(f).size > SIZE_THRESHOLD)

for (const file of files) {
  const before = statSync(file).size
  const out = file.replace(/\.(png|jpe?g)$/i, '.webp')
  const image = sharp(file)
  const meta = await image.metadata()
  const pipeline = meta.width > MAX_WIDTH ? image.resize({ width: MAX_WIDTH }) : image
  await pipeline.webp({ quality: 80, effort: 5 }).toFile(out)
  const after = statSync(out).size
  unlinkSync(file)
  console.log(
    `${file.split(/[\\/]/).pop()} -> .webp  ${(before / 1024 / 1024).toFixed(1)}MB => ${(after / 1024).toFixed(0)}KB`
  )
}
console.log(`Done: ${files.length} files converted`)
