module.exports = {
  types: {
    GENERAL: 1,
    LIST_DIR: 501,
    COPY_FILE: 502,
    CREATE_DIR: 503,
    GET_DEPS: 504,
    USER_QUIT: 505,
    BAD_PATH: 506,
    BAD_GENERATOR_CONFIG: 507
  },
  details: {
    1: 'General Error 😳',
    501: 'Could not list directory',
    502: 'Could not copy file',
    503: 'Could not create directory',
    504: 'Could not get a list of global node modules',
    505: 'You have quit with CTRL-C ⚠️',
    506: 'You provided a bad path 😥',
    507: 'The generator has a bad configurations'
  }
}
