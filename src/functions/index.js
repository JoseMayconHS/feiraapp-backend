require('dotenv').config()

const jwt = require('jsonwebtoken'),
  bcryptjs = require('bcryptjs')

exports.middleware = (...steps) => {
  const stepByStep = index => {
    steps && index < steps.length && steps[index](() => stepByStep(index + 1))
  }

  stepByStep(0)
}

exports.token = _id => {
  return new Promise((resolve, reject) => {
    try {
      const exp = Math.floor((Date.now() / 1000) + (60 * 60 * 24 * 7))

      jwt.sign({ _id, exp }, process.env.WORD_SECRET || 'feiraapp', (err, token) => {
        if (err)
          return reject()
  
        resolve(`Bearer ${ token }`)
      })
    } catch(e) {
      reject()
    }
  })
}

exports.verifyToken = token => {
  return new Promise((resolve, reject) => {
    try {
      jwt.verify(token, process.env.WORD_SECRET || 'feiraapp', (err, decoded) => {
        if (err)
          return reject()

        resolve(decoded)
      })
    } catch(e) {
      reject()
    }
  })
}

exports.authenticate_user = (req, res, next) => {
  try {

    const { authorization } = req.headers

    if (authorization.split(' ').length !== 2)
      throw 'Token mal formatado'

    const [ Bearer, hash ] = authorization.split(' ')

    if (!/^Bearer$/.test(Bearer))
      throw 'Token não é desta aplicação'

    this.verifyToken(hash)  
      .then(decoded => {
        req._id = decoded._id

        if (decoded._id.adm) req.adm = true

        next()
      })
      .catch(() => {
        res.status(401).send()
      })

  } catch(e) {
    res.status(500).send(e)
  }
}

exports.authenticate_adm = (req, res, next) => {
  try {

    const { authorization } = req.headers

    if (authorization.split(' ').length !== 2)
      throw 'Token mal formatado'

    const [ Bearer, hash ] = authorization.split(' ')

    if (!/^Bearer$/.test(Bearer))
      throw 'Token não é desta aplicação'

    this.verifyToken(hash)  
      .then(decoded => {
        if (decoded._id.adm) {
          req._id = decoded._id.value
          req.adm = true

          return next()
        }
        
        res.status(401).send()
      })
      .catch(() => {
        res.status(401).send()
      })

  } catch(e) {
    res.status(401).send(e)
  }
}

exports.criptor = password => {
  const salt = bcryptjs.genSaltSync(10)

  return bcryptjs.hashSync(password.trim().toLowerCase(), salt)
}
