const remove_accents = require('remove-accents'),
  Brand = require('../../../data/Schemas/Brand'),
  functions = require('../../../functions'),
  limit = +process.env.LIMIT_PAGINATION || 10

exports.store = async (req, res) => {
  // Ok
  try {

    const { 
      nome,  descricao, cache_id = 0, hash_identify_device = ''
    } = req.body

    const checkEmpty = {
      nome
    }

    if (functions.hasEmpty(checkEmpty)) {
      return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
    }

    console.log('brand.store ', req.body)

    Brand.create({ 
        nome, descricao, cache_id, hash_identify_device 
      })
      .then(brand => {
        res.status(201).json({ ok: true, data: brand._doc })
      })
      .catch(e => {
        console.error(e)
        res.status(400).send()
      })

  } catch(err) {
    console.log(err)
    res.status(500).send()
  }
}

exports.index = (req, res) => {
  // OK

  try {
    let {
      limit: limitQuery,
      nome = ''
    } = req.query

    const countCallback = async (err, count, filter = {}) => {
      if (err) {
        res.status(500).send()
      } else {
        const { page = 1 } = req.params

        if (!limitQuery) {
          limitQuery = limit
        }

        Brand.find(filter)
          .limit(limitQuery)
          .skip((limitQuery * page) - limitQuery)
          .sort('-created_at')
          .then(Documents => {
            res.status(200).json({ ok: true, data: Documents, count, limit: limitQuery, page })
          })
          .catch(_ => {
            res.status(500).send()
          })

      }
    }

    if (nome.length) {
      const regex = new RegExp(remove_accents(body.where.nome).toLocaleLowerCase())

      Brand.countDocuments({
        nome_key: { $regex: regex, $options: 'g' }
      }, (err, count) => countCallback(err, count, {
        nome_key: { $regex: regex, $options: 'g' }
      }))
    } else {
      Brand.countDocuments(countCallback)
    }

  } catch(err) {
    console.error(err)
    res.status(500).send()
  }
}

exports.all = (_, res) => {
  // OK

  try {

    Brand.find()
      .sort('-created_at')
      .then(Documents => {
        res.status(200).json({ ok: true, data: Documents })
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
    const { id: _id } = req.params
    
    Brand.findById(_id)
      .then(single => {
        if (single) {
          res.status(200).json({ ok: true, data: single })
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

exports.indexBy = (req, res) => {
  // OK

	try {
    let { where = {} } = req.body

    const { page = 1 } = req.params

    let {
      limit: limitQuery
    } = req.query

    if (!limitQuery) {
      limitQuery = limit
    }
    
    if (where.nome_key) {
      // RESOLVER PAGINACAO
      const regex = new RegExp(`${ where.nome_key }+`)
      
      where.nome_key = { $regex: regex, $options: 'g' }
    }
    
    console.log({ where, page })

    Brand.countDocuments(where, (err, count) => {
      if (err) {
        res.status(400).send()
      } else {
        Brand.find(where)
          .limit(limitQuery)
          .skip((limitQuery * page) - limitQuery)
          .sort('-created_at')
          .then(Documents => {
            const data = where._id ? Documents[0] : Documents
    
            res.status(200).json({ 
              ok: true, 
              data, 
              count,
              page, limit: limitQuery
            })
          })
          .catch(_ => {
            res.status(500).send()
          })
      }
    })
    
			
	} catch(error) {
    console.error(error)
		res.status(500).send()
	}

}

exports.update = (req, res) => {
  // OK
  try {

    const { id: _id } = req.params

    Brand.findOneAndUpdate({ _id }, req.body)
      .then(() => {
        res.status(200).send()
      })
      .catch(err => {
        console.error(err)
        res.status(400).send()
      })
  } catch(e) {
    res.status(500).send()
  }
}

exports.remove = (req, res) => {
  // OK
  try {

    const { id: _id } = req.params

    Brand.findByIdAndDelete(_id)
    .then(() => {
      res.status(200).send()
    })
    .catch(err => {
      console.error(err)
      res.status(400).send()
    })

  } catch(e) {
    res.status(500).send(e)
  }
}

