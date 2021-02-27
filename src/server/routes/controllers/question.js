const Question = require('../../../data/Schemas/Question'),
  AnswerType = require('../../../data/Schemas/AnswerType'),
  Answer = require('../../../data/Schemas/Answer'),
  limit = +process.env.LIMIT_PAGINATION || 10

exports.store = (req, res) => {
  // OK

  try {

    const { text = '', lang = 'pt' } = req.body

    const errors = {
      provide_a_text: {
        pt: 'Forneça um texto',
        us: 'Provide a text'
      }
    }

    if (!text.pt.length || !text.us.length)
      return res.status(400).json({ ok: false, message: errors.provide_a_text[lang] })

      Question.create({ ...req.body, status: !!req.body.answers_id })
        .then(created => {
          res.status(201).json({ ok: true, data: created })
        })
        .catch(e => {
          res.status(500).send(e)    
        })

  } catch(err) {
    res.status(500).send()
  }
}


exports.indexAll = (req, res) => {
  // OK

  try {
    Question.countDocuments((err, count) => {
      if (err) {
        res.status(500).send()
      } else {
        const { page = 1 } = req.params

        Question.find()
          .limit(limit)
          .skip((limit * page) - limit)
          .sort('-created_at')
          .then(async Documents => {
            const answer_type_data = await AnswerType.find()

            Documents = Documents.map(document => {
              const answers_type = answer_type_data.find(({ _id }) => String(_id) === document.answers_id)

              return {
                ...{
                  _id: document._id,
                  text: document.text,
                  status: document.status,
                  answers_id: document.answers_id,
                },
                answers_type: answers_type ? {
                  _id: answers_type._id ,
                  title: answers_type.title
                } : undefined
              }
            })

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

exports.indexToApp = (req, res) => {
  // OK

  try {
    const getAlternatives = documents => {
      return new Promise(async resolve => {
        const answer_type_data = await AnswerType.find()

        const answer_data = await Answer.find()

        const clean = documents.map(document => {
  
          const answers = answer_type_data.find(({ _id }) => String(_id) === document.answers_id)
  
          const alternatives = answers.alternatives.map(alternative => {
  
            const answer = answer_data.find(({ _id }) => String(_id) === String(alternative.answer_id))
  
            return answer ? {
              ...{
                score: alternative.score,
                _id: alternative.answer_id
              },
              text: answer.text
            } : null
  
          })
  
          return {
            ...{
              text: document.text,
              _id: document._id
            },
            alternatives
          }
  
        })

        resolve(clean)
      })
    }

    Question.find({ status: true })
      // .sort('-created_at')
      .then(async Documents => {

        Documents = await getAlternatives(Documents)


        res.status(200).json({ ok: true, data: Documents })
      })
      .catch(e => {
        res.status(500).send(e)
      })
  } catch(e) {
    res.status(500).send(e)
  }
}

exports.single = (req, res) => {
  // OK

	try {
    const { id } = req.params
    
    Question.findById(id)
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

    const { text, answers_id = '', lang = 'pt' } = req.body

    const errors = {
      nothing_changed: {
        pt: 'Nada atualizado',
        us: 'Nothing updated'
      },
      response_package_not_present_in_the_system: {
        pt: 'Pacote de resposta não presente no sistema!',
        us: 'Response package not present in the system!'
      }
    }

    const ok = (props = {}) => {
      Question.updateOne({ _id }, { ...req.body, ...props})
        .then(({ nModified }) => {
          res.status(200).json({ ok: !!nModified, message: errors.nothing_changed[lang] })
        })
        .catch(e => {
          res.status(500).send(e)
        })
    }

    if (text) {

      if (!text.pt.length || !text.us.length)
        return res.status(400).send()

        ok()

    } else if (answers_id.length) {

      AnswerType.findOne({ _id: answers_id })
        .then(answer => {
          if (answer) {
            ok({ status: true })
          } else {
            res.status(200).json({ ok: false, message: errors.response_package_not_present_in_the_system[lang] })
          }
        })
        .catch(e => {
          res.status(500).send(e)
        })
    } else {
      ok({ status: false, answers_id })
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

    Question.deleteOne({ _id }, (err) => {
      if (err) {
        res.status(500).send(err)
      } else {

        res.status(200).json({ ok: true })

      }
    })

  } catch(e) {
    res.status(500).send(e)
  }
}

