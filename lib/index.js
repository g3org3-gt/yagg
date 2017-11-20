const path = require('path')
const fs = require('fs')
const Promise = require('bluebird')
const Enquirer = require('enquirer')
const chalk = require('chalk')
const glob = Promise.promisify(require('glob'))

const utils = require('./utils')
const ErrorType = utils.errors.types
const logger = utils.logger
const execPromise = utils.execPromise
const transformContextIntoSedString = utils.transformContextIntoSedString

const enquirer = new Enquirer()
const globConfig = { dot: true }

enquirer.register('checkbox', require('prompt-checkbox'))
enquirer.register('confirm', require('prompt-confirm'))
enquirer.register('list', require('prompt-list'))
enquirer.register('radio', require('prompt-radio'))

function copyFile (originFile, newFile) {
  if (!originFile) return Promise.reject(new Error('`filename` is undefined'))

  const filename = path.basename(originFile)
  const extension = path.extname(originFile)
  const isImage =
    extension === '.jpg' ||
    extension === '.png' ||
    extension === '.jpeg' ||
    extension === '.gif' ||
    extension === '.ico' ||
    filename === '.DS_Store'
  const replaceWithContext = isImage
    ? ''
    : transformContextIntoSedString(this.answers)

  return execPromise(`cat ${originFile} ${replaceWithContext} > ${newFile}`)
    .then(() => console.log(`  copy file: [ ✅  ] ${filename}`))
    .catch(err => {
      if (process.env.YAGG_SKIP === 'true') {
        console.log(`  copy file: [ ❌  ] ${filename}`)
        return
      }
      logger.error(err, ErrorType.COPY_FILE, {
        command: `cat ${originFile} ${replaceWithContext} > ${newFile}`,
        sedString: replaceWithContext
      })
    })
}

const createDir = fullpath => {
  if (!fullpath) return Promise.reject(new Error('`name` is undefined'))

  return execPromise(`mkdir ${fullpath}`)
    .then(() => console.log(` create dir: [ ✅  ] ${fullpath}`))
    .catch(err => {
      if (err.message.indexOf('File exists') !== -1) {
        console.log(` create dir: [ 🔅  ] ${fullpath}`)
      } else {
        logger.error(err, ErrorType.CREATE_DIR)
      }
    })
}

const mapPathsToStats = paths =>
  paths.map(path => ({
    path,
    stats: fs.statSync(path)
  }))

function copyPath (pt, appPath) {
  if (pt.stats.isDirectory()) {
    return createDir(
      path.normalize(pt.path.replace(appPath, this.config.folderPath))
    )
  }
  return this.copyFile(
    pt.path,
    path.normalize(pt.path.replace(appPath, this.config.folderPath))
  )
}

function copy () {
  logger.success()
  const appPath = path.join(this.config.__dirname, 'app')
  return glob(path.join(appPath, '**/**'), globConfig)
    .then(mapPathsToStats)
    .then(paths =>
      paths.reduce(
        (promise, pt) =>
          promise.then(() => {
            return this.copyPath(pt, appPath)
          }),
        Promise.resolve()
      )
    )
}

// TODO: check/validate user input
function installDependencies () {
  return (
    this.config.dependencies &&
    utils.installDependencies(this.config.dependencies)
  )
}
function installDevDependencies () {
  return (
    this.config.devDependencies &&
    utils.installDependencies(this.config.devDependencies, { dev: true })
  )
}

const defaultQuestions = {
  projectName: {
    message: 'What is the project name?'
  }
}

const parseConfig = config => {
  // TODO: make a better parser and validator
  defaultQuestions.projectName.default =
    config.projectName || './' + config.pwd.split('/').pop()
  const questions = Object.assign({}, defaultQuestions, config.questions || {})
  if (questions) {
    Object.keys(questions || [])
      .map(key => ({
        name: key,
        type: questions[key].type || 'input',
        message: questions[key].message,
        default: questions[key].default
      }))
      .forEach(question => enquirer.question(question))
  }
  config.questions = questions
  return config
}

exports.setup = config => ({
  config: parseConfig(config),
  run,
  copy,
  copyFile,
  copyPath,
  installDependencies,
  installDevDependencies
})

function run () {
  enquirer
    .prompt(Object.keys(this.config.questions))
    .then(answers => {
      this.answers = answers
      this.config.folderPath = this.config.pwd

      // Do not use current directory
      if (answers.projectName.substr(0, 2) !== './') {
        this.config.folderPath = path.resolve(
          this.config.pwd,
          answers.projectName
        )
      }
    })
    .then(() => this.copy())
    .then(() => this.installDependencies())
    .then(() => this.installDevDependencies())
    .then(() => {
      console.log()
      console.log(chalk.bold('Success! ✨🌟 happy coding 🎉'))
      console.log(`  ${chalk.cyan('cd')} ${this.answers.projectName}`)
      console.log()
    })
    .catch(err =>
      logger.error(err, ErrorType.GENERAL, { details: 'function run' })
    )
}
