const webpack = require('@nativescript/webpack')
const { dirname } = require('node:path')
const webpackPackage = dirname(require.resolve('@nativescript/webpack/package.json'))

module.exports = env => {
  webpack.init(env)
  webpack.useConfig('vue')
  webpack.chainWebpack(config => {
    config.module.rule('ts').use('ts-loader').loader(require.resolve('ts-loader', { paths: [webpackPackage] }))
  })
  return webpack.resolveConfig()
}
