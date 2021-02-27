const Answer = require('../../../data/Schemas/Answer'),
  AnswerType = require('../../../data/Schemas/AnswerType'),
  functions = require('../../../functions'),
  limit = +process.env.LIMIT_PAGINATION || 10

exports.store = (req, res) => {
  // Ok

  try {

    const { text } = req.body

    Answer.findOne({ text })
      .then(answerAllreadyExists => {
        if (answerAllreadyExists) {
          res.status(200).json({ ok: false, message: 'Resposta já existe' })
        } else {

          Answer.create({ text })
            .then(created => {
              res.status(201).json({ ok: true, data: created })
            })
            .catch(e => {
              res.status(500).send(e)    
            })

        }
         
      })
      .catch(() => {
        res.status(500).send()    
      })

  } catch(err) {
    res.status(500).send()
  }
}


exports.indexAll = (req, res) => {
  // OK

  try {

    Answer.countDocuments((err, count) => {
      if (err) {
        res.status(500).send()
      } else {
        const { page = 1 } = req.params

        Answer.find()
          .limit(limit)
          .skip((limit * page) - limit)
          .sort('-created_at')
          .then(Documents => {
            res.status(200).json({ ok: true, data: Documents, count, limit })
          })
          .catch(_ => {
            res.status(500).send()
          })

      }
    })

  } catch(err) {
    res.status(500).send()
  }
}

exports.all = (_, res) => {
  // OK

  try {

    Answer.find()
      .select('_id text')
      .sort('-created_at')
      .then(Documents => {
        res.status(200).json(Documents)
      })
      .catch(_ => {
        res.status(500).send()
      })

  } catch(err) {
    res.status(500).send()
  }
}

exports.single = (req, res) => {

	try {
    const { id } = req.params
    
    Answer.findById(id)
      .then(single => {
        res.status(200).json({ ok: true, data: single })
      })
      .catch(e => {
        res.status(500).send()
      })
			
	} catch(error) {
		res.status(500).send()
	}

}

exports.indexBy = (req, res) => {
  // NÃO UTILIZADO
  // NÃO TESTATO

	try {
    let where = req.query || {}
    
    Answer.find(where)
      .sort('-created_at')
      .then(Documents => {
        res.status(200).json({ ok: true, data: where._id ? Documents[0] : Documents })
      })
      .catch(_ => {
        res.status(500).send()
      })
			
	} catch(error) {
		res.status(500).send()
	}

}

exports.update = (req, res) => {
  // OK

  try {

    const { id: _id } = req.params

    if (typeof _id !== 'string')
      throw new Error()

    const { text } = req.body

    if (text) {

      Answer.findOne({ text })
        .then(answerExists => {
          if (answerExists) {
            res.status(200).json({ ok: false, message: 'Existe uma resposta igual!' })
          } else {
            Answer.updateOne({ _id }, { text })
              .then(() => {
                res.status(200).json({ ok: true })
              })
              .catch(e => {
                res.status(500).send(e)
              })
          }
        })

    } else {
      res.status(200).json({ ok: false, message: 'Requisição inválida!' })
    }

  } catch(e) {
    res.status(500).send()
  }
}

exports.remove = (req, res) => {
  // OK

  try {

    const { id: _id } = req.params

    if (typeof _id !== 'string')
      throw new Error()

    AnswerType.find()
      .then(answers_type => {

        let error = false

        const callbacks = answers_type.reduce((acc, curr) => {

          const index = curr.alternatives.findIndex(({ answer_id }) => String(answer_id) === _id)
          
          if (index < 0) {
            return acc
          }

         curr.alternatives.splice(index, 1)

          const newAcc = [ ...acc, cb => {
            
            AnswerType.updateOne({ _id: curr._id }, { alternatives: curr.alternatives })
              .then(() => {})
              .catch(e => {})
              .finally(() => {
                cb && cb()
              })

          }]

          return newAcc
        }, [])

        functions.middleware(
          ...callbacks, 
          (cb) => {

            Answer.deleteOne({ _id }, (err) => {
              if (err) {
                res.status(500).send(err)
              } else {

                if (cb) {
                  cb()
                } else {
                  res.status(200).json({ ok: true, message: error ? 'Ocorreu alguns erros' : 'Apagado com sucesso' })
                }
        
              }
            })
          },
          () => res.status(200).json({ ok: !error, message: error ? 'Ocorreu um erro' : 'Ok' })
        )
      })
      .catch(e => {
        res.status(500).send(e)
      })

  } catch(e) {
    res.status(500).send(e)
  }
}

