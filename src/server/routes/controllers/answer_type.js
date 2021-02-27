const Question = require('../../../data/Schemas/Question'),
  AnswerType = require('../../../data/Schemas/AnswerType'),
  limit = +process.env.LIMIT_PAGINATION || 10

exports.store = (req, res) => {
  // OK

  try {

    const { title = '' } = req.body

    AnswerType.findOne({ title })
      .then(answerTypeAllreadyExists => {
        if (answerTypeAllreadyExists) {
          res.status(200).json({ ok: false, message: 'Já existe um pacote de respostas com esse nome' })
        } else {

          AnswerType.create(req.body)
            .then(created => {
              res.status(201).json({ ok: true, data: created })
            })
            .catch(e => {
              res.status(500).send(e)    
            })

        }
         
      })
      .catch((e) => {
        res.status(500).send()    
      })

  } catch(err) {
    res.status(500).send()
  }
}


exports.indexAll = (req, res) => {
  // OK

  try {

    AnswerType.countDocuments((err, count) => {
      if (err) {
        res.status(500).send()
      } else {
        const { page = 1 } = req.params

        AnswerType.find()
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

  } catch(err) {
    res.status(500).send()
  }
}

exports.all = (_, res) => {
  // OK

  try {

    AnswerType.find()
      // .select('_id title')
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
    
    AnswerType.findById(id)
      .then(single => {
        if (single) {
          res.status(200).json(single)
        } else {
          res.status(400).send()  
        }
      })
      .catch(e => {
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

    const { title } = req.body

    if (title) {

      AnswerType.findOne({ title })
        .then(answerExists => {
          if (answerExists) {
            res.status(200).json({ ok: false, message: 'Existe um pacote de respostas com esse nome' })
          } else {
            AnswerType.updateOne({ _id }, { title })
              .then(({ nModified }) => {
                res.status(200).json({ ok: !!nModified, message: 'Nada atualizado' })
              })
              .catch(e => {
                res.status(500).send(e)
              })
          }
        })

    } else {
      AnswerType.updateOne({ _id }, req.body)
        .then(({ nModified }) => {
          res.status(200).json({ ok: !!nModified, message: 'Nada atualizado' })
        })
        .catch(e => {
          res.status(500).send(e)
        })
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

    Question.updateMany({ answers_id: _id }, { status: false, answers_id: '' })
      .then(() => {

        AnswerType.deleteOne({ _id }, (err) => {
          if (err) {
            res.status(500).send(err)
          } else {

            res.status(200).json({ ok: true })
    
          }
        })

      })
      .catch(e => {
        res.status(500).send()
      })

  } catch(e) {
    res.status(500).send(e)
  }
}

