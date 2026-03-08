import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { readFileSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const require = createRequire(import.meta.url)

const sharp = require('sharp')

const sizes = [72, 96, 128, 144, 152, 192, 384, 512]
const svgPath = join(__dirname, '../public/icons/icon.svg')
const outDir = join(__dirname, '../public/icons')

const svgBuffer = readFileSync(svgPath)

for (const size of sizes) {
  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(join(outDir, `icon-${size}x${size}.png`))
  console.log(`Generated icon-${size}x${size}.png`)
}

console.log('All icons generated!')
