var path = require('path')
var glob = require('glob')
var fs = require('fs')
var config = require('../config')
var ExtractTextPlugin = require('extract-text-webpack-plugin')

exports.assetsPath = function (_path) {
  var assetsSubDirectory = process.env.NODE_ENV === 'production'
    ? config.build.assetsSubDirectory
    : config.dev.assetsSubDirectory
  return path.posix.join(assetsSubDirectory, _path)
}

exports.cssLoaders = function (options) {
  options = options || {}

  var cssLoader = {
    loader: 'css-loader',
    options: {
      minimize: process.env.NODE_ENV === 'production',
      sourceMap: options.sourceMap
    }
  }

  // generate loader string to be used with extract text plugin
  function generateLoaders (loader, loaderOptions) {
    var loaders = [cssLoader]
    if (loader) {
      loaders.push({
        loader: loader + '-loader',
        options: Object.assign({}, loaderOptions, {
          sourceMap: options.sourceMap
        })
      })
    }

    // Extract CSS when that option is specified
    // (which is the case during production build)
    if (options.extract) {
      return ExtractTextPlugin.extract({
        use: loaders,
        fallback: 'vue-style-loader'
      })
    } else {
      return ['vue-style-loader'].concat(loaders)
    }
  }

  // https://vue-loader.vuejs.org/en/configurations/extract-css.html
  return {
    css: generateLoaders(),
    postcss: generateLoaders(),
    less: generateLoaders('less'),
    sass: generateLoaders('sass', { indentedSyntax: true }),
    scss: generateLoaders('sass'),
    stylus: generateLoaders('stylus'),
    styl: generateLoaders('stylus')
  }
}

// Generate loaders for standalone style files (outside of .vue)
exports.styleLoaders = function (options) {
  var output = []
  var loaders = exports.cssLoaders(options)
  for (var extension in loaders) {
    var loader = loaders[extension]
    output.push({
      test: new RegExp('\\.' + extension + '$'),
      use: loader
    })
  }
  return output
}

// 获取入口文件
exports.getEntry = function () {
  let globPath = './src/views/**/index.js'
  return glob.sync(globPath)
    .reduce(function (entry, path) {
      let key = exports.getKey(path)
      entry[key] = path
      return entry
    }, {})
}

// 获取单个入口文件对应的key
exports.getKey = (filePath) => {
    let startIndex = path.indexOf('views') + 6
    let endIndex = 0
    if(path.indexOf('component') > -1){
        // 如果修改的是组件
        endIndex = path.indexOf('component')
    } else {
        endIndex = path.lastIndexOf('/')
    }
    return path.substring(startIndex, endIndex)
}

// 获取所有入口文件对应的keys
exports.getKeys = (filesPath) => {
    let result = []
    for(let path of filesPath) {
        let key = export.getKey(path)
        if(result.indexOf(key) === -1) {
            result.push(key)
        }
    }
    return result
}

// 根据入口文件生成HtmlWebpackPlugins
exports.getHtmlWebpackPlugins = () => {
  let entyies = exports.getEntry()
  let keys = Object.keys(entry)
  let plugins = keys
    .map((key) => {
      // ejs模板，要和index.js在同个目录下
      let template = exports.getTemplate(entyies[key])
      let filename = `${__dirname}/dist/${key}.html`
      return new HtmlWebpackPlugin({
        filename,
        template: template,
        inject: true,
        minify: {
          removeComments: true,
          collapseWhitespace: true,
          removeAttributeQuotes: true
        },
        // chunks: globals.concat([key]),
        chunksSortMode: 'dependency',
        excludeChunks: keys.filter(e => e != key)
      })
  })
  return plugins
}


// 获取入口文件对应的模板
exports.getTemplate = (path) => {
  path = path.subStr(0, path.lastIndexOf('/'))
  var path = glob.sync(path + '/index.html')
  if(path.length > 0) {
    return path[0]
  } else {
    //取上级目录下的模板文件路径
    if(path.lastIndexOf('/') !== -1) {
      path = path.substr(0, path.lastIndexOf('/'))
      return exports.getTemplate(path)
    }
  }
}

// 获取修改的entry
exports.getModifiedEntry = (modifiedFiles) => {
  let modifiedKeys = exports.getKeys(modifiedFiles)
  let modifiedEntry = {}
  // 全量entry
  let webpackEntry = utils.getEntry()
  for(let key of modifiedKeys) {
      modifiedEntry[key] = webpackEntry[key]
  }
  return modifiedEntry
}

exports.getAddEntry = (addFiles) => {
  let addKeys = exports.getKeys(addFiles)
  let addEntry = {}
  for(let i of addKeys) {
    let key = addKeyArr[i]
    addEntry[key] = addFiles[key]
  }
  return addEntry
}
