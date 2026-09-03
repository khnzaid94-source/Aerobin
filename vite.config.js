import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { cpSync, createReadStream, existsSync, mkdirSync, statSync } from 'node:fs'
import { createRequire } from 'node:module'
import { join, resolve } from 'node:path'

// onnxruntime-web's WASM backend must be served as a plain static file (it is
// ~13 MB — bundling/inlining would corrupt it and bloat the JS chunk). The
// runtime is told to fetch it from /models/ort/, so both dev and build need
// those files present at that path. Copying at build time (instead of
// committing the binary) keeps the repo lean and the wasm version locked to
// package-lock.
const ORT_ASSETS = ['ort-wasm-simd-threaded.wasm', 'ort-wasm-simd-threaded.mjs']
const ORT_DIST_DIR = '/models/ort'
const MIME = { '.wasm': 'application/wasm', '.mjs': 'text/javascript' }

// Serve /models/ort/<asset> by streaming the file from node_modules. Used by
// BOTH dev and preview servers (build also copies the same files into dist/,
// but preview keeps this middleware so behavior is identical either way).
function serveOrtAssets(ortDist, distFallback) {
  // Note: connect's use(path, fn) strips the mount prefix from req.url, so
  // inside this handler req.url is just "/<asset>" (no /models/ort prefix).
  return (req, res, next) => {
    let pathname
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    } catch {
      next()
      return
    }
    const file = pathname.replace(/^\/+/, '')
    if (!ORT_ASSETS.includes(file)) {
      next()
      return
    }
    // dev: stream from node_modules; preview: prefer the built copy in dist/
    let src = join(ortDist, file)
    if (distFallback && existsSync(join(distFallback, 'models', 'ort', file))) {
      src = join(distFallback, 'models', 'ort', file)
    }
    res.setHeader('Content-Type', MIME[file.slice(file.lastIndexOf('.'))] ?? 'application/octet-stream')
    res.setHeader('Content-Length', statSync(src).size)
    createReadStream(src).pipe(res)
  }
}

function ortWasmAssets() {
  const require = createRequire(import.meta.url)
  // ORT doesn't export './package.json' — resolve an exported entry (lands
  // inside dist/) and use its directory.
  const ortDist = resolve(require.resolve('onnxruntime-web/wasm'), '..')
  if (!existsSync(join(ortDist, ORT_ASSETS[0]))) {
    throw new Error(`onnxruntime-web wasm asset not found in ${ortDist} — package layout changed?`)
  }

  const copyAssets = (destDir) => {
    mkdirSync(destDir, { recursive: true })
    for (const file of ORT_ASSETS) {
      const src = join(ortDist, file)
      if (!existsSync(src)) throw new Error(`onnxruntime-web asset missing: ${src} (check the installed version)`)
      cpSync(src, join(destDir, file))
    }
  }

  return {
    name: 'ort-wasm-assets',
    configureServer(server) {
      // Mount path prefix + stream handler: dev serves straight from
      // node_modules (no copy needed on every boot).
      server.middlewares.use(ORT_DIST_DIR, serveOrtAssets(ortDist))
    },
    configurePreviewServer(server) {
      server.middlewares.use(ORT_DIST_DIR, serveOrtAssets(ortDist, resolve(server.config.root, 'dist')))
    },
    // build: copy into dist/models/ort/ once the bundle is written
    writeBundle(options) {
      const outDir = resolve(options.dir || 'dist')
      const dest = join(outDir, 'models', 'ort')
      copyAssets(dest)
      const wasm = join(dest, ORT_ASSETS[0])
      const mb = (statSync(wasm).size / (1024 * 1024)).toFixed(1)
      console.log(`[ort-wasm-assets] copied ${ORT_ASSETS.length} runtime files to ${dest} (${mb} MB wasm)`)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  // The extern-wasm condition makes `import('onnxruntime-web')` resolve to
  // ort.min.mjs (which fetches the wasm binary from ort.env.wasm.wasmPaths)
  // instead of ort.bundle.min.mjs (which inlines ~28MB of wasm into the JS).
  resolve: {
    conditions: ['onnxruntime-web-use-extern-wasm'],
  },
  plugins: [react(), tailwindcss(), ortWasmAssets()],
})
