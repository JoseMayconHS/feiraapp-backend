const Product = require('../../../data/Schemas/Product'),
  Brand = require('../../../data/Schemas/Brand'),
  Supermarket = require('../../../data/Schemas/Supermarket'),
  functions = require('../../../functions'),
  limit = +process.env.LIMIT_PAGINATION || 10

exports.store = async (req, res) => {
  // Ok
  try {

    const { 
      nome, local, cache
    } = req.body

    const { estado = {}, municipio = {} } = local

    const { nome: estado_nome, sigla: estado_sigla } = estado
    const { nome: municipio_nome } = municipio

    const checkEmpty = {
      nome, municipio_nome, estado_nome, estado_sigla
    }

    if (functions.hasEmpty(checkEmpty)) {
      return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
    }

    let cache_id = 0
    let hash_identify_device = ''

    if (cache) {
      cache_id = req.body.id,
      hash_identify_device = req.body.hash_identify_device
    }

    Supermarket.create({ nome, local, cache_id, hash_identify_device })
      .then(supermarket => {
        res.status(201).json({ ok: true, data: supermarket._doc })
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


exports.indexAll = (req, res) => {
  // OK

  try {

    Supermarket.countDocuments((err, count) => {
      if (err) {
        res.status(500).send()
      } else {
        const { page = 1 } = req.params
        let { limit: limitQuery } = req.query

        if (!limitQuery) {
          limitQuery = limit
        }

        Supermarket.find()
          .limit(limitQuery)
          .skip((limitQuery * page) - limitQuery)
          .sort('-created_at')
          .then(Documents => {
            res.status(200).json({ ok: true, data: Documents, count, limit: limitQuery })
          })
          .catch(_ => {
            res.status(500).send()
          })

      }
    })

  } catch(err) {
    console.error(err)
    res.status(500).send()
  }
}

exports.all = (_, res) => {
  // OK

  try {

    Product.find()
      .sort('-created_at')
      .then(Documents => {
        res.status(200).json(Documents)
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
    const { id } = req.params
    
    Product.findById(id)
      .then(single => {
        res.status(200).json({ ok: true, data: single })
      })
      .catch(e => {
        res.status(500).send()
      })
			
	} catch(error) {
		res.status(500).send()
	}

}

exports.indexBy = (req, res) => {
  // NÃO UTILIZADO
  // NÃO TESTATO

	try {
    let where = req.query || {}
    
    Product.find(where)
      .sort('-created_at')
      .then(Documents => {
        res.status(200).json({ ok: true, data: where._id ? Documents[0] : Documents })
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

    const { preco } = req.body

    if (preco) {
      const { supermercado_id, preco: preco_u, produto_id } = preco

      Supermarket
        .findById(supermercado_id)
        .select('produtos')
        .then(supermarket => {

          let products = [ ...supermarket.produtos ]

          const productIndex = products.findIndex(({ produto_id: produto_id_1 }) => produto_id_1 === produto_id)

          if (productIndex !== -1) {
            products[productIndex] = {
              ...products[productIndex],
              preco: preco_u
            }
          } else {
            products = [ ...products, {
              produto_id,
              preco: preco_u
            }]
          }

          Supermarket.findByIdAndUpdate(supermercado_id, {
            produtos: products
          })
          .then(() => {
            res.status(200).json({ ok: true, message: 'Supermercado atualizado!' })
          })
          .catch((e) => {
            console.error(e)
            res.status(500).send()  
          })
        })
        .catch(e => {
          console.error(e) 
          res.status(500).send()
        })
    }
  } catch(e) {
    res.status(500).send()
  }
}

exports.finishShopping = async (req, res) => {
  try {
    const { preco } = req.body

    const { 
      estado = {}, municipio = {}, 
      preco: preco_u, supermercado_id, feira_id
    } = preco

      const { nome: estado_nome } = estado
      const { nome: municipio_nome } = municipio

      if (functions.hasEmpty({
        estado_nome, municipio_nome, supermercado_id
      })) {
        return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
      }

      Product.findById(_id)
        .select('precos')
        .then(product => {
          const prices = [ ...product.precos ]

          let newPrices = []

          const priceIndex = prices
            .findIndex(({ estado_id }) => estado_id === estado.id)

          if (priceIndex !== -1) {

            const regionIndex = prices[priceIndex].municipios
              .findIndex(({ municipio_id }) => municipio_id === municipio.id)

            let municipios = prices[priceIndex].municipios

            let menor_preco = municipios[regionIndex].menor_preco
            let maior_preco = municipios[regionIndex].maior_preco

            if (+maior_preco.preco < +preco_u) {
              maior_preco.preco = preco_u
              maior_preco.supermercado_id = supermercado_id
              maior_preco.feira_id = feira_id
            } else if (+menor_preco.preco > +preco_u) {
              menor_preco.preco = preco_u
              menor_preco.supermercado_id = supermercado_id
              menor_preco.feira_id = feira_id
            }
            
            if (regionIndex !== -1) {
              municipios[regionIndex] = {
                ...municipios[regionIndex],
                menor_preco, maior_preco
              }
            }

            prices[priceIndex] = {
              ...prices[priceIndex],
              municipios
            }

            newPrices = prices
          } else {
            newPices = [ ...prices, {
              estado_id: estado.id,
              sigla: estado.sigla,
              nome: estado.nome,
              municipios: [{
                municipio_id: municipio.id,
                nome: municipio.nome,
                menor_preco: {
                  preco: preco_u,
                  supermercado_id,
                  feira_id
                }
              }]
            }]
          }

          console.log({ newPrices })

          res.status(200).send()

        })
        .catch((e) => {
          console.error(e)
          res.status(500).send()
        })
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



  } catch(e) {
    res.status(500).send(e)
  }
}

