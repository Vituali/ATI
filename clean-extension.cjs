const { rmSync, existsSync } = require('fs')
const { join } = require('path')

const buildDir = join(__dirname, 'Extensao', 'build')

if (existsSync(buildDir)) {
  rmSync(buildDir, { recursive: true, force: true })
  console.log('✓ Extensao/build limpo.')
} else {
  console.log('ℹ️  Extensao/build não existe, nada a limpar.')
}
