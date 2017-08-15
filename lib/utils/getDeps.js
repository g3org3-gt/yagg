const logger = require('./logger')
const shell = require('./shell')
const GET_DEPS = require('./errors').types.GET_DEPS

module.exports = function getDeps() {
  return shell('npm list -g --depth=0 --json=true')
  .then(rawOutput => {
    const globalPackgeJson = JSON.parse(rawOutput)
    const depsKeys = Object.keys(globalPackgeJson.dependencies)
    .filter(key => key.indexOf('yagg') !== -1)
    .filter(key => key !== 'yagg')
    .map(key => {
      const _dep = globalPackgeJson.dependencies[key]
      _dep.id = key
      return _dep
    })
    return depsKeys
  })
  .catch(err => logger.error(err, GET_DEPS))
}