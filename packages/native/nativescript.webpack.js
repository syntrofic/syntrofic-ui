import { fileURLToPath } from 'node:url'

function configure(webpack) {
  webpack.Utils.addCopyRule({
    from: fileURLToPath(new URL('./fonts/', import.meta.url)),
    to: 'fonts',
  })
}

export { configure as 'module.exports' }
