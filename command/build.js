const ora = require('ora')
const {prompt} = require('inquirer')
const chalk = require('chalk')
const branch = require('git-branch')
const webpack = require('webpack')
const shell = require('shelljs')
const glob = require('glob')
const utils = require('../config/utils')

// 是否全量打包
let isBuildAll = process.argv[2] === 'all'
// 运行参数获取指定的打包入口
// let buildKeys = process.argv[2] && !isBuildAll ? process.argv[2].split(/[,-]/) : false

let webpackConfig = require('../build/webpack.prod.conf')
let entry = utils.getEntry()
let modifiedEntry = null // 已修改的文件入口集合
let addEntry = {} // 新加的文件入口集合

if (!isBuildAll) {
  const result = shell.exec('git status')
  let match = null

  // 获取修改的文件
  let modifiedFiles = []
  match = result.match(/modified:\s+(.+)/g)
  if (match) {
    for (let i = 0, len = match.length; i < len; i++) {
      if (/src\/(views|components)/.test(match[i])) {
        let path = match[i].match(/\s+(.+)/)[1]
        modifiedFiles.push(path)
      }
    }
    modifiedEntry = utils.getModifiedEntry(modifiedFiles)
  }

  // 获取新加的文件
  let addFiles = []
  // 获取出新加的文件列表字符串
  let r = /(?<=\(use "git add <file>\.\.\." to include in what will be committed\))((\n|\t|.)+)/.test(result)
  // 获取新加文件路径
  if (r) {
    let addFilesListStr = RegExp.$1
    match = addFilesListStr.match(/\n*\t+(.)+\n+/g)
    for (let i = 0, len = match.length; i < len; i++) {
      let path = match[i].replace(/(\t|\n)/g, '')
      let paths = glob.sync(`${path}/**/index.js`)
      for (let path of paths) {
        addFiles.push(path)
      }
    }
  }
  addEntry = utils.getEntry(addFiles)
}

let newEntry = {}
Object.assign(newEntry, addEntry, modifiedEntry)

if (Object.keys(newEntry).length > 0 && !isBuildAll) {
  // 精准&增量打包
  webpackConfig.entry = newEntry
  let plugins = utils.getHtmlWebpackPlugins(newEntry)
  webpackConfig.plugins = webpackConfig.plugins.concat(plugins)
} else {
  // 全量打包
  let plugins = utils.getHtmlWebpackPlugins(entry)
  webpackConfig.plugins = webpackConfig.plugins
    .concat(plugins)
}

const spinner = ora('building....')
const question = [{
  type: 'input',
  name: 'commitMessage',
  message: 'Please input commit message:',
  validate (val) {
    if (val === '') {
      return 'commit messag is required'
    }
    return true
  }
}]

prompt(question).then(({commitMessage}) => {
  const branchName = branch.sync()
  spinner.start()
  // 先更新代码
  shell.exec('git pull')
  let result = shell.exec('git checkout ' + branchName)
  // 如果未有分支，则需要新建
  if (result.code === 1) {
    shell.exec('git checkout -b' + branchName)
  }
  webpack(webpackConfig, (err, stats) => {
    console.log(chalk.red(`times: ${(stats.endTime - stats.startTime) / 1000}s`))
    spinner.stop()
    if (err) throw err

    if (stats.hasErrors()) {
      console.log(chalk.red('build failed with errors \n'))
      console.log(stats)
      process.exit(1)
    }

    // 提交到git上
    const gitPush = (branch = 'master') => {
      shell.exec('git add -A')
      shell.exec(`git commit -m "${commitMessage}" `)
      shell.exec('git push --set-upstream origin ' + branch)
    }

    gitPush(branchName)
  })
})

