
import { join, resolve } from 'path'
import { readdirSync, statSync, copyFileSync, existsSync, mkdirSync } from 'fs'

const ROOT_DIR = 'fir dicembre 25/fine dicembre finale'
const TARGET_DIR = 'out/temp_ocr_stage_final'

function getAllImages(dir: string, list: string[] = []): string[] {
  const files = readdirSync(dir)
  for (const f of files) {
    const fullPath = join(dir, f)
    if (statSync(fullPath).isDirectory()) {
      getAllImages(fullPath, list)
    } else {
      if (/\.(jpg|jpeg|png|pdf)$/i.test(f)) {
        list.push(fullPath)
      }
    }
  }
  return list
}

function main() {
  if (!existsSync(TARGET_DIR)) mkdirSync(TARGET_DIR, { recursive: true })
  
  const root = resolve(process.cwd(), ROOT_DIR)
  const images = getAllImages(root)
  console.log(`Found ${images.length} images to process`)

  // Copy to a flat directory to make OCR script happy
  let idx = 0
  for (const img of images) {
    const ext = img.split('.').pop()
    const name = `scan_${idx++}.${ext}`
    copyFileSync(img, join(TARGET_DIR, name))
  }
  
  console.log(`Staged ${idx} files in ${TARGET_DIR}`)
}

main()
