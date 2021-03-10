const { resolve } = require('path')

const bcryptjs = require('bcryptjs'),
  functions = require('../../../functions'),
  User = require('../../../data/Schemas/User'),
  generatePassword = require('generate-password'),
  service_email = require('../../../services/email'),
  limit = +process.env.LIMIT_PAGINATION || 10,
  service_email_token = process.env.SERVICE_EMAIL_TOKEN || ''

exports.generate = (req, res) => {
  // OK

  try {
    const { email, lang = 'pt' } = req.body

    const errors = {
      nobody_with_this_email: {
        pt: 'Ninguém com este e-mail',
        us: 'No one with this email'
      },
      error_new_password_generator: {
        pt: 'Erro ao gerar nova senha!',
        us: 'Error generating new password!'
      },
      google_authenticated: {
        pt: 'Essa conta é uma conta da Google',
        us: 'This account is a Google account'
      },
      facebook_authenticated: {
        pt: 'Essa conta é uma conta da Facebook',
        us: 'This account is a Facebook account'
      }
    }

    User.findOne({ email }, '_id username google_auth facebook_auth', (error, user) => {
      if (error) {
        res.status(500).send()
      } else {

        if (!user) {
          res.status(200).json({ ok: false, message: errors.nobody_with_this_email[lang] })
        } else {

          if (user.google_auth) {
            return res.status(200).json({ ok: false, message: errors.google_authenticated[lang] })
          }

          if (user.facebook_auth) {
            return res.status(200).json({ ok: false, message: errors.facebook_authenticated[lang] })
          }

          const password = generatePassword.generate({
            length: 4,
            numbers: true,
            uppercase: false
          })
      
          const password_crypt = functions.criptor(password)

          User.updateOne({ _id: user._id }, { second_password: password_crypt }, async (error) => {
            if (error) {
              res.status(200).json({ ok: false, message: errors.error_new_password_generator[lang] })
            } else {

              try {
                // NÃO DA PRA POR POST PORQUÊ FormData NÃO EXISTE NO CONTEXTO DO NODE

                const title = lang === 'us' ? 'Redefine password' : 'Redefinir senha'

                const query = `titulo=${ title }&senha=${ password }&destinatario=${ email }&nome=${ user.username }&token=${ service_email_token }&lang=${ lang }`
                
                await service_email(`?${ query }`)

                res.status(200).json({ ok: true, data: password }) 
              } catch(e) {
                res.status(500).send()
              }
      
            }
          })

        }

      }
    })


  } catch(e) {
    res.status(500).send(e)
  }
}


exports.qtd = (req, res) => {
  try {

      User.countDocuments((err, count) => {
        if (err) {
          res.status(500).send(err)
        } else {
          res.status(200).json({ count })
        }
      })
    
  } catch(err) {
    res.status(500).send(err)
  }
}

exports.indexAll = (req, res) => {
  // OK

  try {

    User.countDocuments((err, count) => {
      if (err) {
        res.status(500).send()
      } else {
        const { page } = req.params

        User.find()
          .limit(limit)
          .skip((limit * page) - limit)
          .sort('-created_at')
          .then(Documents => {
            res.status(200).json({ ok: true, data: Documents, limit, count })
          })
          .catch(_ => {
            res.status(500).send()
          })
      }
    })

  } catch(e) {
    res.status(500).send()
  }
}

exports.single = (req, res) => {
  // OK

  try {

    const { id } = req.params

    User.findById(id)
      .then(single => {
        if (single) {
          res.status(200).json(single)
        } else {
          res.status(400).send()  
        }
      })
      .catch(_ => {
        res.status(500).send()
      })

  } catch(e) {
    res.status(500).send()
  }
}

exports.store = async (req, res) => {
  // ok

  try {    
    const { 
      username, email, expo_token = 'sem-token', lang = 'pt',
      local = {},
      facebook_id = '', google_id = ''
    } = req.body

    let { password = '' } = req.body

    const { estado = {}, municipio = {} } = local

    let status = 500

    if (functions.hasEmpty({
      username, email, 
    })) {
      return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
    }

    if (!facebook_id.length && !google_id.length) {
      if (!Object.values(estado).length || !Object.values(municipio).length) {
        return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
      }
    }

    User.findOne({ email })
      .select('local _id facebook_auth google_auth')
      .then(async userByEmail => {

        if (
          (!userByEmail) || (facebook_id.length || google_id.length)
        ) {

          try {
            
            let expo_tokenAlreadyExists = false
            
            if (!google_id.length && !facebook_id.length) {
              password = functions.criptor(password)
            }
            
            User.findOne({ expo_token })
            .select('_id')
            .then(userByExpoToken => {
              expo_tokenAlreadyExists = !!userByExpoToken
            }).catch(() => {})
            .finally(async () => {
              try {
                let newUser 

                const data = { 
                  username: username.trim(), 
                  email, password, local,
                  expo_token: expo_tokenAlreadyExists ? '' : expo_token,
                  facebook_auth: !!facebook_id.length,
                  google_auth: !!google_id.length,
                  facebook_id, google_id
                }

                if (
                  (userByEmail) && (facebook_id.length || google_id.length) && (!userByEmail.facebook_auth && !userByEmail.google_auth)
                  ) {
                    console.log(`Transformar em login com o ${ facebook_id.length ? 'Facebook' : 'Google' }`)

                    delete data.local

                    newUser = await User.findByIdAndUpdate(userByEmail._id, data, { new: true })

                  } else if (userByEmail && (userByEmail.facebook_auth || userByEmail.google_auth)) {
                    if (Object.values(estado).length) {
                      newUser = await User.findByIdAndUpdate(userByEmail._id, { local }, { new: true })
                    } else {
                      return res.status(200).json({ 
                        ok: false, message: 'E-mail já cadastrado', 
                        social_network: true,
                        localSeted: userByEmail.local
                      })
                    }
                  } else {
                    newUser = await User.create(data)
                  }

                  const token = await functions.token(newUser._doc._id)

                  res.status(201).json({ 
                    ok: true, 
                    data: { ...newUser._doc, password: undefined }, 
                    token 
                  })
                } catch(e) {
                  res.status(400).json({ ok: false, message: 'Não criado!' })
                }
              })
            
          } catch(error) {
            res.status(status).send()
          }

        } else {
          res.status(200).json({ 
            ok: false, message: 'E-mail já cadastrado', 
            social_network: !!google_id.length || !!facebook_id.length,
            localSeted: userByEmail.local
          })
        }

      }).catch(e => {
        res.status(500).send(e)
      })

  } catch(error) {
    res.status(500).send()
  }
}

exports.update = (req, res) => {
  // OK

  try {

    if (!req._id) throw new Error()

    const errors = {
      changed_success: {
        pt: 'Alterado com sucesso',
        us: 'Successfully changed'
      }
    }

    User.findById(req._id)
      .then(user => {
        try {

          const { lang = 'pt' } = req.body

          if (req.body.username) {
            if (req.body.username === user.username)
              throw lang === 'us' ? 'The name is the same' : 'O nome é o mesmo'
          }

          if (req.body.email) {
            if (req.body.email === user.email)
              throw lang === 'us' ? 'The email is the same' : 'O e-mail é o mesmo'
          }

          if (req.body.password) {
            req.body.password = functions.criptor(req.body.password)
          }

          User.updateOne({ _id: req._id }, req.body)
            .then(_ => {
              res.status(200).json({ ok: true, message: errors.changed_success[lang] })
            })
            .catch(e => {
              res.status(500).send(e)
            })

        } catch(message) {
          res.status(200).json({ ok: false, message })
        }
      })    

  } catch(e) {
    res.status(500).send()
  }
}


exports.sign = (req, res) => {
  // OK

  try {

    const { 
      email, password, 
      expo_token = 'sem-token', lang = 'pt', 
      google_id, facebook_id
    } = req.body

    const errors = {
      error_generating_token: {
        pt: 'Erro ao gerar token! 💥',
        us: 'Error generating token! 💥'
      },
      no_user: {
        pt: 'Ninguém com este e-mail',
        us: 'No one with this email'
      },
      invalid_password: {
        pt: 'Senha inválida',
        us: 'invalid password'
      },
      disabled: {
        pt: 'No momento, sua conta está desativada! ⏳',
        us: 'Your account is currently disabled! ⏳'
      },
      is_a_facebook_account: {
        pt: 'Conecte através do Facebook',
        us: 'Connect via Facebook'
      },
      is_a_google_account: {
        pt: 'Conecte através do Google',
        us: 'Connect via Google'
      },

    }

    User.findOne({ email: email.trim() })
      .then(user => {

        try {
          let bySecondPassword = false

          let updateExpoToken = false

          let error = false

          if (!user) {
           throw errors.no_user[lang]
          } 

          if (!user.google_auth && !user.facebook_auth) {
            if (bcryptjs.compareSync(password.trim().toLowerCase(), user._doc.second_password)) {
              bySecondPassword = true
            }
  
            if (!bySecondPassword && !bcryptjs.compareSync(password.trim().toLowerCase(), user._doc.password)) {
              throw errors.invalid_password[lang]
            }
          } else {
            if (user.google_auth) {
              if (user.google_id !== google_id) {
                throw errors.is_a_google_account[lang]
              }
            }

            if (user.facebook_auth) {
              if (user.facebook_id !== facebook_id) {
                throw errors.is_a_facebook_account[lang]
              }
            }
          }

          if (!user.status)
            throw errors.disabled[lang]

          const ok = async () => {

            User.findOne({ expo_token })
              .select('_id')
              .then(async userByExpoToken => {
                try {
                  updateExpoToken = !userByExpoToken || (String(userByExpoToken._id) === String(user._doc._id) && expo_token !== user._doc.expo_token)

                  if (updateExpoToken) {
                    await User.findByIdAndUpdate(user._id, { expo_token }).exec()
                  }
                } catch(e) {
                  
                }
              })
              .catch(() => {})
              .finally(() => {
                if (!error) {
                  functions.token(user._doc._id)
                    .then(token => {
                      res.status(200).json(
                        { ok: true, 
                          data: { ...user._doc, password: undefined, second_password: undefined }, 
                          token, 
                          second_password: bySecondPassword 
                        }
                      )
                    })
                    .catch(() => {
                      res.status(200).json({ ok: false, message: errors.error_generating_token[lang] })
                    }) 
                } else {
                  res.status(200).json({ ok: false, message: lang === 'pt' ? 'Ocorreu um erro' : 'An error has occurred' })
                }
              })

          }

          if (bySecondPassword) {
            User.updateOne(({ _id: user._doc._id }, { second_password: '' }), ok)
          } else {
            ok()
          }        
                    
        } catch(message) {
          res.status(200).json({ ok: false, message: typeof message === 'string' ? message : lang === 'pt' ? 'Ocorreu um erro' : 'An error has occurred' })
        }
      })
      .catch(_ => {
        res.status(500).send()
      })


  } catch(error) {
    res.status(500).send()
  }
}

exports.logout = (req, res) => {
  try {

    if (!req._id) throw new Error();

    User.findByIdAndUpdate(req._id, { expo_token: 'token-retirado' })
      .then(() => {})
      .catch(() => {})
      .finally(() => {
        res.status(200).send()
      })

  } catch(e) {
    res.status(500).send()
  }
}

exports.remove = (req, res) => {
  // OK

  try {

    const { id: _id } = req.params

    User.deleteOne({ _id })
      .then(() => {
        res.status(200).send()
      })
      .catch(() => {
        res.status(500).send()
      })

  } catch(e) {
    res.status(500).send()
  }
}



exports.reconnect = (req, res) => {
  // OK

  try {
    if (!req._id) throw new Error();

    const errors = {
      error_generating_token: {
        pt: 'Erro ao gerar token! 💥',
        us: 'Error generating token! 💥'
      },
      account_disabled: {
        pt: 'A sua conta está desativada!',
        us: 'Your account is disabled!'
      },
      your_account_not_exists: {
        pt: 'Sua conta foi excluída',
        us: 'Your account has been deleted'
      }
    }

    User.findById(req._id)
      .then((user) => {
        if (user) {

          if (!user.status) {
            return res.status(200).json({
              ok: false,
              message: errors.account_disabled[user.language]
            })
          }

          functions
            .token(req._id)
            .then((token) => {
              res
                .status(200)
                .json({
                  ok: true,
                  data: {
                    ...user._doc,
                    password: undefined,
                  },
                  token
                });
            })
            .catch(() => {
              res
                .status(200)
                .json({ ok: false, message: errors.error_generating_token[user.language] });
            }); 
        } else {
          res.status(200).json({
            ok: false,
            message: errors.your_account_not_exists[user.language]
          })
        }
        
      })
      .catch(() => {
        res.status(500).send();
      });
  } catch (err) {
    res.status(500).send(err);
  }
};

exports.search = (req, res) => {
  // OK

	try {

		const { word } = req.params

    const condition = new RegExp(word.trim(), 'gi')
    
		User.find()
			// .limit(limit)
			// .skip((limit * page) - limit)
			.sort('-created_at')
			.then(all => all.filter(({ username, email }) => username.search(condition) >= 0 ||  email.search(condition) >= 0))
			.then(filtered => res.status(200).json({ ok: true, data: filtered, limit, count: filtered.length }))
			.catch(err => res.status(400).send(err))

	} catch(err) {
		res.status(500).json(err)
	}
}

exports.cacheToAPI = async (req, res) => {
  try {
    console.log('Finalizar cache')
    console.log(req.params)
    
  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}

