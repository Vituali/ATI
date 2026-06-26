import gulp from 'gulp'
import zip from 'gulp-zip'
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import { join, dirname } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const extensionRoot = join(__dirname, '..')

const require = createRequire(import.meta.url)
const manifest = require(join(extensionRoot, 'build', 'manifest.json'))

const packageDir = join(extensionRoot, 'package')
const buildGlob = join(extensionRoot, 'build', '**').replaceAll('\\', '/')

gulp
  .src(buildGlob, { encoding: false })
  .pipe(zip(`${manifest.name.replaceAll(' ', '-')}-${manifest.version}.zip`))
  .pipe(gulp.dest(packageDir))
