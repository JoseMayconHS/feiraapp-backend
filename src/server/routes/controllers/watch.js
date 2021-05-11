const Watch = require('../../../data/Schemas/Watch'),
  functions = require('../../../functions')

exports.save = async ({
  data, hash_identify_device = ''
}) => {
  try {

    const {
      push_token,
      valor,
      produto_id,
      local, 
      cache_id = 0
    } = data

    console.log('watch.save', data)

    const { estado = {}, municipio = {} } = local

    const { nome: estado_nome, sigla: estado_sigla, _id: estado_id } = estado
    const { nome: municipio_nome, _id: municipio_id } = municipio

    const checkEmpty = {
      municipio_nome, estado_nome, estado_sigla, valor, push_token
    }

    if (functions.hasEmpty(checkEmpty)) {
      return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
    }

    const { _doc } = await Watch.create({
      push_token, valor, produto_id,
      cache_id, hash_identify_device,
      local: {
        estado: {
          cache_id: estado_id,
          nome: estado_nome,
          sigla: estado_sigla
        }, 
        municipio: {
          cache_id: municipio_id,
          nome: municipio_nome,
          estado_id
        }
      }
    })

    return _doc

  } catch(e) {
    console.error(e)
    return
  }
}

exports._update = async ({
  data, hash_identify_device = ''
}) => {
  try {
    console.log('watch._update', data)

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

    console.log('watch.create', req.body)

    const data = await save({
      data: req.body, hash_identify_device
    })

    res.status(201).json({ ok: !!data, data })
  } catch(e) {
    res.status(500).send()
  }
}

exports.index = async (req, res) => {
  try {
    // _id DO PRODUTO
    const { id: _id } = req.params

    const {
      local
    } = req.body

    if (!local) {
      return res.status(400).send()
    }

    Watch.findOne()
      .populate()
      .where('produto_id._id', _id)
      .where('local.estado.cache_id', local.estado._id)
      .where('local.municipio.cache_id', local.municipio._id)
      .then(watch => {
        console.log('watch.index watch', watch)

        if (watch) {
          res.status(200).json({ ok: true, data: watch })
        } else {
          res.status(200).json({ ok: true })
        }
      }).catch(e => {
        console.error(e)
        res.status(400).send()
      })

  } catch(e) {
    res.status(500).send()
  }
}

exports.remove = async (req, res) => {
  try {
    const { id: _id } = req.params

    Watch.findByIdAndDelete(_id)
      .then(() => {
        res.status(200).json({ ok: true })
      }).catch(e => {
        console.error(e)
        res.status(400).send()
      })

  } catch(e) {
    res.status(500).send()
  }
}

exports.removes = async (req, res) => {
  try {
    const { ids = [] } = req.headers

    console.log('watch.removes ids', ids)

    if (ids.length) {
      await Watch
        .deleteMany()
        .where('_id').in(ids)
    }

    res.status(200).send()

  } catch(e) {
    console.error('watch.removes catch', e)
    res.status(500).send()
  }
}
