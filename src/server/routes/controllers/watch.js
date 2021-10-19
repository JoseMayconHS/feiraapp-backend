const { ObjectId } = require('mongodb'),
  functions = require('../../../functions')

exports.save = async ({
  data, hash_identify_device = '', db
}) => {
  try {

    let ok = false

    const {
      push_token,
      valor,
      produto_id,
      local, 
      cache_id = 0
    } = data

    // console.log('watch.save', data)

    const { estado = {}, cidade = {} } = local

    const { nome: estado_nome, sigla: estado_sigla, _id: estado_id } = estado
    const { nome: cidade_nome, _id: cidade_id } = cidade

    const checkEmpty = {
      cidade_nome, estado_nome, estado_sigla, valor, push_token
    }

    if (functions.hasEmpty(checkEmpty)) {
      return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
    }

    const response = {
      push_token, valor: +valor, produto_id: {
        ...produto_id,
        _id: new ObjectId(produto_id._id)
      },
      cache_id, hash_identify_device,
      local: {
        estado: {
          cache_id: estado_id,
          nome: estado_nome,
          sigla: estado_sigla
        }, 
        cidade: {
          cache_id: cidade_id,
          nome: cidade_nome,
          estado_id
        }
      },
      created_at: Date.now()
    }

    const { insertedId } = await db.watch.insertOne(response)

    response._id = insertedId

    return response

  } catch(e) {
    console.error(e)
    return
  }
}

exports._update = async ({
  data, hash_identify_device = ''
}) => {
  try {
  // console.log('watch._update', data)


  } catch(e) {
    console.error(e)
  }
}

exports.store = async (req, res) => {
  try {
    // {
    //   push_token,
    //   valor,
    //   produto_id: {
    //     cache_id,
    //     _id
    //   },
    //   local
    // }

    const { 
      hash_identify_device = '', produto_id
    } = req.body

    const itemExists = await req.db.product.findOne({
      _id: new ObjectId(produto_id._id)
    }, {
      projection: { _id: 1 }
    })

    if (itemExists) {
      const data = await this.save({
        data: req.body, hash_identify_device, db: req.db
      })
  
      res.status(201).json({ ok: !!data, data })
    } else {
      res.status(200).json({ ok: false, message: 'Este produto já foi excluído!', deleted: true })
    }

    // console.log('watch.create', req.body)

  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}

exports.index = async (req, res) => {
  try {
    // _id DO PRODUTO
    const { id } = req.params

    const {
      local, push_token
    } = req.body

    if (!local) {
      return res.status(400).send()
    }

    const watch = await req.db.watch.findOne({
      'produto_id._id': new ObjectId(id),
      push_token,
      'local.estado.cache_id': {
        $in: [+local.estado._id, 0]
      },
      'local.cidade.cache_id': {
        $in: [+local.cidade._id, 0]
      }
    })

    res.status(200).json({ ok: true, data: watch })

  } catch(e) {
    res.status(500).send()
  }
}

exports.remove = async (req, res) => {
  try {
    const { id } = req.params

    await req.db.watch.deleteOne({ _id: new ObjectId(id) })

    res.status(200).json({ ok: true })

  } catch(e) {
    res.status(500).send()
  }
}

exports.removes = async (req, res) => {
  try {
    let { ids = JSON.stringify([]) } = req.headers

    ids = JSON.parse(ids).map(_id => new ObjectId(_id))

    if (ids.length) {
      await req.db.watch.deleteMany({
        _id: {
          $in: ids
        }
      })
      
    }

    res.status(200).send()

  } catch(e) {
    console.error('watch.removes catch', e)
    res.status(500).send()
  }
}

exports.update = async (req, res) => {
  try {
    const { id } = req.params

    const body = req.body

    delete body._id

    await req.db.watch.updateOne({ _id: new ObjectId(id) }, {
      $set: body
    })

    res.status(200).json({ ok: true })
  } catch(e) {
    res.status(500).send()
  }
}

exports.updateLocale = async (req, res) => {
  try {
  // console.log('watch.updateLocale', req.body)

    const { ids, local } = req.body

    await req.db.watch.updateMany({
      _id: {
        $in: ids.map(_id => new ObjectId(_id))
      }
    }, {
      $set: {
        local: {
          cidade: {
            cache_id: local.cidade._id,
            nome: local.cidade.nome,
            estado_id: local.cidade.estado_id
          },
          estado: {
            cache_id: local.estado._id,
            nome: local.estado.nome,
            sigla: local.estado.sigla
          }
        }
      }
    })

    res.status(200).send()
  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}
