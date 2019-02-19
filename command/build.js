const ora = require('ora')
const {prompt} = require('inquirer')
const chalk = require('chalk')
const branch = require('git-branch')
const webpack = require('webpack')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const CleanWebpackPlugin = require('clean-webpack-plugin')
const shell = require('shelljs')
const glob = require('glob')
const path = require('path')
const utils = require('../config/utils')



// 是否全量打包
let isBuildAll = process.argv[2] === 'all' ? true : false
// 运行参数获取指定的打包入口
let buildKeys = process.argv[2] && !isBuildAll ? process.argv[2].split(/[,-]/) : false

let modifiedEntry = null // 已修改的文件入口集合
let addEntry = {} // 新加的文件入口集合

const result = shell.exec('git status')
let match = null


// 获取修改的文件
let modifiedFiles = []
match = result.match(/modified:\s+(.+)/g)
for(let i = 0, len = match.length; i < len; i++) {
    if(/src\/(views|components)/.test(match[i])) {
        let path = match[i].match(/\s+(.+)/)[1]
        modifiedFiles.push(path)  
    }
}
modifiedEntry = utils.getModifiedEntry(modifiedFiles)


// 获取新加的文件
let addFiles = []
// 获取出新加的文件列表字符串
let r = /(?<=\(use "git add <file>\.\.\." to include in what will be committed\))((\n|\t|.)+)/.test(result)
// 获取新加文件路径
if(r) {
    let addFilesListStr = RegExp.$1
    match = addFilesListStr.match(/\n*\t+(.)+\n+/g)
    for(let i = 0, len = match.length; i < len; i++) {
      let path = match[i].replace(/(\t|\n)/g, '')
      let paths = glob.sync(`${path}/**/index.js`)
      for(let path of paths) {
        addFiles.push(path)
      }
    }
}
addEntry = utils.getAddEntry(addFiles)

let newEntry = {}
Object.assign(newEntry, addEntry, modifiedEntry)
if(Object.keys(newEntry).length > 0 && !isBuildAll) {
  // 增量打包
  webpackConfig.entry = newEntry
  let plugins = getHtmlWebpackPlugins(newEntry)
  webpackConfig.plugins = webpackConfig.plugins.concat(plugins)
} else {
  // 全量打包
  webpackConfig.entry = entries
  webpackConfig.plugins = webpackConfig.plugins
    .concat(plugins)
  webpackConfig.plugins.push(new CleanWebpackPlugin(['dist/*.*', 'dist/*/*.*']))
}

const spinner = ora('building....')
const question = [
    {
        type: 'input',
        name: 'commitMessage',
        message: 'Please input commit message:',
        validate(val) {
          if(val === ''){
            return 'commit messag is required'
          }
          return true
        }
    }
]


prompt(question).then(({commitMessage}) => {
    const branchName = branch.sync()
    spinner.start()
    // 先更新代码
    shell.exec('git pull')
    // 更新cdn代码
    shell.cd('cdn')
    let result = shell.exec('git checkout ' + branchName)
    // 如果未有分支，则需要新建
    if(result.code === 1) {
        shell.exec('git checkout -b' + branchName)
    }
    shell.exec('git pull')

    // 清理文件
    gulp.task("clean", function() {
        if(isBuildAll) {
            return gulp.src(config.build.outputPath + config.build.assetsSubDirectory)
                .pipe(clean())
        } else {
            let beforePath = __dirname
            for(let key in newEntry) {
                shell.cd(path.resolve(__dirname, config.build.outputPath, config.build.assetsSubDirectory))
                // 文件夹
                if(key.indexOf('/') > -1) {
                    let directory = key.substr(0, key.indexOf('/'))
                    shell.rm('-rf', directory)
                } else {
                    shell.exec(`rm -f ${key}*.(js|map)`)
                }
            }
            shell.cd(beforePath)
        }
        
    })

    gulp.task('webpack', function() {
        shell.cd('..')
        // 再打包
        webpack(webpackConfig, (err, stats) => {
            console.log(chalk.red(`times: ${(stats.endTime - stats.startTime) / 1000}s`))
            spinner.stop()
            if(err) throw err

            if(stats.hasErrors()) {
                console.log(chalk.red('build failed with errors \n'))
                console.log(stats)
                process.exit(1)
            }

            // 压缩 css 文件
            gulp.task('css', function () {
                gulp.src('src/css/**/*.css')
                    .pipe(base64({
                        baseDir: 'src/css',
                        extensions: ['png', 'jpg', 'jpeg'],
                        maxImageSize: 10 * 1024,  // bytes
                        debug: false
                    }))
                    .pipe(minifyCSS())
                    .pipe(preCssVersioner())
                    .pipe(cssVersioner({version: +(new Date())}))
                    .pipe(gulp.dest(`${destRoot}/css`))
            })

            // 压缩 assets文件夹下css 文件
            gulp.task('assetsCss', function () {
                gulp.src('src/assets/**/*.css')
                    .pipe(minifyCSS())
                    .pipe(preCssVersioner())
                    .pipe(cssVersioner({version: Math.random()}))
                    .pipe(gulp.dest(`${destRoot}`))
            })

            // 压缩images下的所有图片
            gulp.task('image', function(){
                return gulp.src('src/images/**/*.*')
                    // .pipe(imagemin({
                    //     progressive: true,
                    //     svgoPlugins: [{
                    //         removeViewBox: false
                    //     }],
                    //     use: [pngquant({
                    //         quality: '100'
                    //     })]
                    // }))
                    .pipe(gulp.dest(`${destRoot}/images`))
            })
            // 压缩img下的所有图片
            gulp.task('img',function(){
                return gulp.src('src/img/**/*.*')
                    // .pipe(imagemin({
                    //     progressive: true,
                    //     svgoPlugins: [{
                    //         removeViewBox: false
                    //     }],
                    //     use: [pngquant({
                    //         quality: '100'
                    //     })]
                    // }))
                    .pipe(gulp.dest(`${destRoot}/img`))
            })

            // 压缩assets文件夹下的所有图片
            gulp.task('assetsImg', function(){
                return gulp.src('src/assets/**/*.{png,jpg,gif,ico}')
                    // .pipe(imagemin({
                    //     progressive: true,
                    //     svgoPlugins: [{
                    //         removeViewBox: false
                    //     }],
                    //     use: [pngquant({
                    //         quality: '100'
                    //     })]
                    // }))
                    .pipe(gulp.dest(`${destRoot}`))
            })

            gulp.task('git', ['concat'], function() {
                // 提交cdn
                shell.cd('cdn')
                gitPush(branchName)
 
                // 提交代码
                shell.cd('..')
                gitPush(branchName)
            })

            // 提交到git上
            const gitPush = (branch = 'master') => {
                shell.exec('git add -A')
                shell.exec(`git commit -m \"${commitMessage}\" `)
                shell.exec('git push --set-upstream origin ' + branch)
            }

            // 合并css文件
            gulp.task("concatCss",function() {
                const entry = [`${destRoot}/css/style.css`, `${destRoot}/css/pendant.css`, `${destRoot}/css/pop-gus.css`,
                    `${destRoot}/css/pop.css`, `${destRoot}/css/pop-act.css`]
                gulp.src(entry).pipe(concat('combined.css')).pipe(gulp.dest(`${destRoot}/css`));
            })

            // 合并js文件
            gulp.task('concatJs', function () {
                return gulp.src(`${htmlPath}/**/*.html`)
                    .pipe(useref({
                        searchPath: '.'
                    }))
                    .pipe(gulp.dest(htmlPath));
            });

            gulp.task('concat', ['concatCss', 'concatJs'])

            // 在命令行使用 gulp 启动  'css', 'image', 'img', 'assetsCss', 'assetsImg'
            gulp.task('build', ['css', 'image', 'img', 'assetsCss', 'assetsImg'], function() { 
                gulp.start('git')
            })
            
            // 启动任务
            gulp.start('build')
        })
    })

    gulp.start('webpack', ['clean'])
})


