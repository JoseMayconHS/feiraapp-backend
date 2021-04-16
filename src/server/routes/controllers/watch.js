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
