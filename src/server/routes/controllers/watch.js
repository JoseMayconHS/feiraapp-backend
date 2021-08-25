const { ObjectId } = require('mongodb'),
  functions = require('../../../functions')

exports.save = async ({
  data, hash_identify_device = '', db
}) => {
  try {

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
      push_token, valor, produto_id: {
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
      }
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
      hash_identify_device = ''
    } = req.body

    // console.log('watch.create', req.body)

    const data = await save({
      data: req.body, hash_identify_device, db: req.db
    })

    res.status(201).json({ ok: !!data, data })
  } catch(e) {
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
        $in: [local.estado._id, 0]
      },
      'local.cidade.cache_id': {
        $in: [local.cidade._id, 0]
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
    let { ids = [] } = req.headers

    ids = ids.map(id => new ObjectId(id))

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
