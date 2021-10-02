const { ObjectId } = require('mongodb'),
  { optionsCounted } = require('../../../utils')

exports.store = async (req, res) => {
  try {
    let ok = false

    if (req.body.reporte_id.length) {
      await req.db.report.insertOne({
        reporte_id: new ObjectId(req.body.reporte_id),
        texto: req.body.texto,
        _schema: req.body._schema,
        push_token: req.body.push_token
      })

      ok = true
    }

    res.status(201).json({ ok })
  } catch(e) {
    console.log(e)
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
          texte: item.texto,
          _schema: req.body._schema,
          push_token
        }))

      await req.db.report.insert(data)

      ok = true
    }

    res.status(200).json({ ok })
    
  } catch(e) {
    console.log(e)
    res.status(500).send()
  }
}


exports.index = async (req, res) => {
  try {
    let { page = 1 } = req.params

    const { _schema = 'produto' } = req.query

    page = +page

    const options = [{
      $sort: {
        created_at: -1
      }
    }]

    const optionsPaginated = [{
      $skip: (limit * page) - limit
    }, {
      $limit: limit 
    }]

    const optionsDocumentWithProductId = [{
      $lookup: {
        from: 'product',
        localField: 'reporte_id',
        foreignField: '_id',
        pipeline: [{
          $group: {
            _id: '$_id',
            doc: { $first: "$$ROOT" }
          }
        }, {
          $replaceRoot: {
            newRoot: { $mergeObjects: ['$doc', { precos: [] }] }
          }
        }],
        as: 'item'
      }
    }]

    const optionsDocumentWithSupermarketId = [{
      $lookup: {
        from: 'supermarket',
        localField: 'reporte_id',
        foreignField: '_id',
        pipeline: [{
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
          ...optionsDocument
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
    res.status(500).send()
  }
}

exports.remove = async (req, res) => {
  try {
    const { id } = req.params

    await req.db.report.deleteOne({ _id: new ObjectId(id) })

    res.status(200).json({ ok: true })

  } catch(e) {
    res.status(500).send()
  }
}
