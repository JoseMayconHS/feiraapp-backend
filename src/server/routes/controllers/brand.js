const { ObjectId } = require('mongodb'),
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

    // console.log('brand.store ', req.body)

    const response = await req.db.brand.findOne({ nome_key: functions.keyWord(nome) })
    
    if (response) {
      response.cache_id = cache_id

      res.status(201).json({ ok: true, data: response })
    } else {
      try {

        const data = { nome, descricao, cache_id, hash_identify_device, created_at: Date.now() }

        const { insertedId } = await req.db.brand.insertOne(data)

        data._id = insertedId

        res.status(201).json({ ok: true, data })
      } catch(e) {
        console.error(e)
        res.status(400).send()
      }
    }

  } catch(err) {
    // console.log(err)
    res.status(500).send()
  }
}

exports.storeList = async (req, res) => {
  // Ok
  try {

    const { 
      data = [], hash_identify_device = ''
    } = req.body

    // console.log('brand.storeList ', req.body)

    const response = []

    const stacks = data.map(item => ({
      async fn() {
        try {
          if (functions.hasEmpty({ nome: item.nome })) {
            throw new Error('Existe campos vazios!')
          }

          const already = await req.db.brand.findOne({ nome_key: functions.keyWord(nome) })

          // console.log('brand.storeList already', already)

          if (already) {
            already.cache_id = item.cache_id

            response.push(already)
          } else {
            const data = { ...item, hash_identify_device, created_at: Date.now() }

            const { insertedId } = await req.db.brand.insertOne(data)

            data._id = insertedId

            response.push(data)
          }

        } catch(e) {
          console.error(item, e)
        }
      }
    }))

    await functions.middlewareAsync(...stacks)

    res.status(201).json({ ok: true, data: response })

  } catch(err) {
    // console.log(err)
    res.status(500).send()
  }
}

exports.index = async (req, res) => {
  // OK

  try {
    let {
      limit: limitQuery,
      nome = ''
    } = req.query

    let { page = 1 } = req.params

    page = +page

    if (!limitQuery) {
      limitQuery = limit
    }

    if (nome.length) {
      const name_regex = new RegExp(functions.keyWord(body.where.nome))

      where.nome_key = { $regex: name_regex, $options: 'g' }
    }

    const options = [{
      $match: where
    }, {
      $sort: {
        created_at: -1
      }
    }]

    const optionsPaginated = [{
      $skip: (limitQuery * page) - limitQuery
    }, {
      $limit: limitQuery 
    }]

    const optionsCounted = [{
      $group: {
        _id: null,
        count: { $sum: 1 }
      }
    }, {
      $project: {
        _id: 0,
        count: 1
      }
    }]

    const [{ documents, postsCounted }] = await req.mongo.adm.aggregate([{
      $facet: {
        documents: [
          ...options,
          ...optionsPaginated
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

    res.status(200).json({ ok: true, data: documents, limit: limitQuery, count, page })

  } catch(err) {
    console.error(err)
    res.status(500).send()
  }
}

exports.all = async (_, res) => {
  // OK

  try {

    const documents = await req.db.brand.aggregate([
      {
        $sort: {
          created_at: -1
        }
      }
    ]).toArray()

    res.status(200).json({ ok: true, data: documents })

  } catch(err) {
    res.status(500).send()
  }
}

exports.single = async (req, res) => {

	try {
    const { id: _id } = req.params

    const single = await req.db.brand.findOne({ _id: new ObjectId(_id) })
    
    if (single) {
      res.status(200).json({ ok: true, data: single })
    } else {
      res.status(400).send()
    }
			
	} catch(error) {
		res.status(500).send()
	}

}

exports.indexBy = (req, res) => {
  // OK

	try {
    let { where = {} } = req.body

    const { page = 1 } = req.params

    page = +page

    let {
      limit: limitQuery
    } = where

    if (!limitQuery) {
      limitQuery = limit
    }

    const find = {}

    if (where.nome.length) {
      const name_regex = new RegExp(functions.keyWord(where.nome))

      where.nome_key = { $regex: name_regex, $options: 'g' }
    }

    const options = [{
      $match: find
    }, {
      $sort: {
        created_at: -1
      }
    }]

    const optionsPaginated = [{
      $skip: (limitQuery * page) - limitQuery
    }, {
      $limit: limitQuery 
    }]

    const optionsCounted = [{
      $group: {
        _id: null,
        count: { $sum: 1 }
      }
    }, {
      $project: {
        _id: 0,
        count: 1
      }
    }]

    const [{ documents, postsCounted }] = await req.mongo.brand.aggregate([{
      $facet: {
        documents: [
          ...options,
          ...optionsPaginated
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

    const data = where._id ? documents[0] : documents

    res.status(200).json({ ok: true, data, limit: limitQuery, count, page })

	} catch(error) {
    console.error(error)
		res.status(500).send()
	}

}

exports.update = async (req, res) => {
  // OK
  try {

    const { id } = req.params

    await req.mongo.adm.updateOne({ _id: new ObjectId(id) }, { $set: req.body })

    res.status(200).json({ ok: true })

  } catch(e) {
    res.status(500).send()
  }
}

exports.remove = async (req, res) => {
  // OK
  try {

    const { id } = req.params

    if (typeof id !== 'string')
      throw new Error()

    await req.mongo.adm.deleteOne({ _id: new ObjectId(id) })

    res.status(200).send()

  } catch(e) {
    res.status(500).send(e)
  }
}

