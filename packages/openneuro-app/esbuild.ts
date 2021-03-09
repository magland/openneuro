import path from 'path'
import * as esbuild from 'esbuild'
import { Command } from 'commander'
import liveServer from 'live-server'
import { sassPlugin } from 'esbuild-sass-plugin'
import { copyFile } from 'fs/promises'
import { fixReactVirtualized } from './esbuild.plugin-fix-react-virtualized.js'

async function main(): Promise<void> {
  const command = new Command()
  command.option('-w, --watch', 'Enable watch mode')
  command.parse(process.argv)
  const options = command.opts()
  const outname = 'dist'
  const outdir = path.join(__dirname, outname)
  process.env.NODE_ENV = 'development'
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/scripts/client.jsx')],
    outdir,
    loader: {
      '.png': 'file',
      '.html': 'file',
    },
    define: {
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV),
      global: 'window',
    },
    bundle: true,
    plugins: [sassPlugin(), fixReactVirtualized()],
    watch: options.watch,
  })
  await copyFile(
    path.join(__dirname, 'src/index.html'),
    path.join(outdir, 'index.html'),
  )
  if (options.watch) {
    liveServer.start({ root: outname, port: 9876 })
  }
}

main()
