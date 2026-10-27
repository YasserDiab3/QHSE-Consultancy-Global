import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

test('brand logos are lightweight vector SVGs under 20KB', () => {
  const brandDir = path.resolve(process.cwd(), 'public/brand')
  const logos = ['qhsse-logo-mark.svg', 'qhsse-logo-header.svg', 'qhsse-logo-stacked.svg']

  for (const logoName of logos) {
    const fullPath = path.join(brandDir, logoName)
    assert.equal(fs.existsSync(fullPath), true, `${logoName} must exist`)

    const stats = fs.statSync(fullPath)
    // Must be under 20KB (far below the previous 926KB bloated raster)
    assert.equal(stats.size < 20 * 1024, true, `${logoName} size ${stats.size} must be < 20KB`)

    const content = fs.readFileSync(fullPath, 'utf8')
    assert.equal(content.includes('<svg'), true, `${logoName} must be valid SVG`)
    assert.equal(content.includes('viewBox'), true, `${logoName} must have viewBox`)
    assert.equal(content.includes('base64'), false, `${logoName} must not embed heavy base64 rasters`)
  }
})
