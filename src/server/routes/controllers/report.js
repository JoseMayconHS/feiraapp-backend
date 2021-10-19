const { ObjectId } = require('mongodb'),
  { optionsCounted } = require('../../../utils')

exports.store = async (req, res) => {
  try {
    let ok = false

    const { _schema, push_token, texto, reporte_id } = req.body

    const itemExists = await req.db[ _schema === 'produto' ? 'product' : _schema === 'marca' ? 'brand' : 'supermarket' ].findOne({
      _id: new ObjectId(reporte_id)
    }, {
      projection: { _id: 1 }
    })

    if (itemExists) {
      await req.db.report.insertOne({
        reporte_id: itemExists._id,
        texto, _schema, push_token,
        created_at: Date.now()
      })

      ok = true
    }

    res.status(201).json({ ok, deleted: !itemExists })
  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}

exports.storeList = async (req, res) => {
  try {
    let { data = [], push_token } = req.body

    let ok = false

    if (data.length) {
      data = data
        .filter(({ reporte_id }) => reporte_id.length)
        .map(item => ({
          reporte_id: new ObjectId(item.reporte_id),
          texto: item.texto,
          _schema: req.body._schema,
          push_token,
          created_at: Date.now()
        }))

      await req.db.report.insert(data)

      ok = true
    }

    res.status(200).json({ ok })
    
  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}


exports.index = async (req, res) => {
  try {
    let { page = 1 } = req.params

    const { _schema = 'produto', texto = '' } = req.query

    page = +page
    
    const options = [{
      $sort: {
        created_at: -1
      }
    }]

    if (texto.length) {
      const $match = {}
      const name_regex = new RegExp(functions.keyWord(texto))

      $match.texto = { $regex: name_regex, $options: 'g' }

      options.unshift({
        $match
      })
    }

    options.unshift({
      $match: {
        _schema
      }
    })

    const optionsPaginated = [{
      $skip: (limit * page) - limit
    }, {
      $limit: limit 
    }]

    const optionsDocumentWithProductId = [{
      $lookup: {
        from: 'product',
        let: {
          'id': '$reporte_id'
        },
        pipeline: [{
          $match: {
            $expr: {
              $eq: ['$_id', '$$id']
            }
          }
        }, {
          $group: {
            _id: '$_id',
            doc: { $first: "$$ROOT" }
          }
        }, {
          $replaceRoot: {
            newRoot: { $mergeObjects: ['$doc', { precos: [] }] }
          }
        }, {
          $lookup: {
            from: 'brand',
            localField: 'marca_id._id',
            foreignField: '_id',
            as: 'marca_obj'
          }
        }],
        as: 'item'
      }
    }]

    const optionsDocumentWithSupermarketId = [{
      $lookup: {
        from: 'supermarket',
        let: {
          'id': '$reporte_id'
        },
        pipeline: [{
          $match: {
            $expr: {
              $eq: ['$_id', '$$id']
            }
          }
        }, {
          $group: {
            _id: '$_id',
            doc: { $first: "$$ROOT" }
          }
        }, {
          $replaceRoot: {
            newRoot: { $mergeObjects: ['$doc', { produtos: [] }] }
          }
        }],
        as: 'item'
      }
    }]

    const optionsDocumentWithBrandId = [{
      $lookup: {
        from: 'brand',
        localField: 'reporte_id',
        foreignField: '_id',
        as: 'item'
      }
    }]

    const optionsDocument = _schema === 'produto' ? 
      optionsDocumentWithProductId : _schema === 'supermercado' ?
        optionsDocumentWithSupermarketId : _schema === 'marca' ?
          optionsDocumentWithBrandId : []

    const [{ documents, postsCounted }] = await req.db.report.aggregate([{
      $facet: {
        documents: [
          ...options,
          ...optionsPaginated,
          ...optionsDocument,
          {
            $unwind: '$item'
          }
        ],
        postsCounted: [
          ...options,
          ...optionsCounted
        ]   
      }
    }]).toArray()

    let count = 0

    if (postsCounted.length) {
      count = postsCounted[0].count
    }

    res.status(200).json({ ok: true, data: documents, limit, count, page })

  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}

exports.remove = async (req, res) => {
  try {
    const { id } = req.params

    await req.db.report.deleteOne({ _id: new ObjectId(id) })

    res.status(200).json({ ok: true })

  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}
