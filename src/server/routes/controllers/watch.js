const rest = require('../../../data/Schemas/rest')
const Watch = require('../../../data/Schemas/Watch')

exports.create = async (req, res) => {
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

    console.log('watch.create', req.body)

    Watch.create(req.body)
      .then(watch => {
        res.status(201).json({ ok: true, data: watch._doc })
      }).catch(e => {
        console.error(e)
        res.status(400).send()
      })

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
