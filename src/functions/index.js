const jwt = require('jsonwebtoken'),
  bcryptjs = require('bcryptjs'),
  remove_accents = require('remove-accents'),
  crypto = require('crypto'),
  algorithm = 'aes-256-ctr',
  iv = crypto.randomBytes(16)

exports.hasEmpty = values => {
  let has = false

  Object.values(values)
    .forEach((value) => {
      has = !has && (typeof value === 'string' && !value.length)
    })

  return has
}  

exports.middleware = (...steps) => {
  const stepByStep = index => {
    steps && index < steps.length && steps[index](() => stepByStep(index + 1))
  }

  stepByStep(0)
}

exports.tryExecute = (fn) => {
  return new Promise(async (resolve, reject) => {
    try {
      await fn()
      return resolve('')
    } catch(e) {
      return reject({ error: e.message, fn })
    }
  }) 
}

exports.middlewareAsync = (...steps) => {
  return new Promise(resolve => {
    steps.push({
      async fn() {
        resolve('')
      }
    })

    const stepByStep = (index) => {
      if (steps && index < steps.length) {
        
        const /* Callback */ callback = () => stepByStep(index + 1)
    
        const props = steps[index].props
  
        exports.tryExecute(async () => await steps[index].fn(props))
          .then(() => {})
          .catch(({ error }) => {})
          .finally(callback) /* Executando a callback */
  
      } 
    }
  
    stepByStep(0)
  })
}

exports.setUndefineds = ({
  data, undefineds
}) => {
  undefineds.forEach(key => {
    data[key] = undefined
  })

  return data
}

exports.keyWord = (word) => remove_accents(word).toLowerCase()

exports.capitalize = (val) => {
  if (typeof val !== 'string') val = ''
  return val.charAt(0).toUpperCase() + val.substring(1).toLowerCase()
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

exports.encrypt = (text) => {
  const cipher = crypto.createCipheriv(algorithm, process.env.SECRET_KEY || '', iv);

  const encrypted = Buffer.concat([cipher.update(text), cipher.final()]);

  return {
    iv: iv.toString('hex'),
    content: encrypted.toString('hex')
  };
};

exports.decrypt = (hash) => {
  const decipher = crypto.createDecipheriv(algorithm, process.env.SECRET_KEY || '', Buffer.from(hash.iv, 'hex'));

  const decrpyted = Buffer.concat([decipher.update(Buffer.from(hash.content, 'hex')), decipher.final()]);

  return decrpyted.toString();
};

exports.authenticate_request = (req, res, next) => {
  try {

    const { 
      iv, 
      content 
    } = req.headers

    // const { 
    //   iv: ivQuery, 
    //   content: contentQuery
    // } = req.query

    // const crypted = this.encrypt('GodisFaithful')

    // const decrypted = this.decrypt(crypted)

    // const iv = ivBody || ivQuery
    // const content = contentBody || contentQuery

    const decrypted = this.decrypt({ iv, content })

    // // console.log('next', decrypted === process.env.AUTHENTICATION_WORD)

    if (decrypted === process.env.AUTHENTICATION_WORD) {
      next()
    } else {
      res.status(401).send()
    }
  } catch(e) {
    // console.log(e)
    res.status(500).send()
  }
}
