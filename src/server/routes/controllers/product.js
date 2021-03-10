const Product = require('../../../data/Schemas/Product'),
  Brand = require('../../../data/Schemas/Brand'),
  Supermarket = require('../../../data/Schemas/Supermarket'),
  functions = require('../../../functions'),
  limit = +process.env.LIMIT_PAGINATION || 10


function updateProduct({ 
  _id, estado, municipio, supermercado_id, preco_u, feira_id = '0',
  finished
}) {
  return new Promise((resolve, reject) => {
    Product.findById(_id)
      .select('precos presenca')
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

        const data_update = {
          precos: newPrices
        }

        if (finished) {
          data_update.presenca = product.presenca + 1
        }

        Product
          .updateOne({ _id }, data_update)
          .then(resolve)
          .catch(reject)
      })
      .catch((e) => {
        console.error(e)
        reject('')
      })
  })
}

exports.store = async (req, res) => {
  // Ok
  try {

    const { 
      favorito,
      fixado,
      marca = {},
      peso = {},
      preco_u,
      produto_nome,
      tipo,
      local,
      supermercado_id,
      cache
    } = req.body

    const { 
      nome: marca_nome, 
      id: marca_id, 
      descricao: marca_descricao 
    } = marca
    const { tipo: peso_tipo } = peso
    const { estado = {}, municipio = {} } = local

    const { id: estado_id, nome: estado_nome, sigla: estado_sigla } = estado
    const { id: municipio_id, nome: municipio_nome } = municipio

    const checkEmpty = {
      produto_nome, tipo, marca_nome, peso_tipo
    }

    if (functions.hasEmpty(checkEmpty)) {
      return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
    }

    let data_marca = false

    if (!marca_id) {
      data_marca = await Brand.create({
        nome: marca_nome,
        descricao: marca_descricao
      })

    }

    const precos = [{
      estado_id,
      nome: estado_nome,
      sigla: estado_sigla,
      municipios: [{
        nome: municipio_nome,
        municipio_id,
        menor_preco: {
          supermercado_id,
          preco: preco_u
        }
      }]
    }]

    const marca_obj = {
      marca_id: data_marca._doc._id,
      nome: marca_nome
    }

    let cache_id = 0
    let hash_identify_device = ''
    let supermercado_cache_id = ''

    if (cache) {
      cache_id = req.body.id,
      hash_identify_device = req.body.hash_identify_device
      supermercado_cache_id = supermercado_id
    }

    const data = {
      nome: produto_nome, favorito, fixado, precos, marca: marca_obj, tipo, peso, 
      cache_id, hash_identify_device, supermercado_cache_id
    }

    const data_produto = await Product.create(data)

    if (!cache) {
      Supermarket
        .findById(supermercado_id)
        .select('produtos')
        .then(supermarket => {
  
          let products = [ ...supermarket.produtos ]
  
          const productIndex = products.findIndex(({ produto_id }) => produto_id === String(data_produto._doc._id))
  
          if (productIndex !== -1) {
            products[productIndex] = {
              ...products[productIndex],
              preco: preco_u
            }
          } else {
            products = [ ...products, {
              produto_id: data_produto._doc._id,
              preco: preco_u
            }]
          }
  
          Supermarket.findByIdAndUpdate(supermercado_id, {
            produtos: products
          })
        })
        .catch(console.error)
        .finally(() => {
          res.status(201).json({ ok: true, data: data_produto._doc })
        })
    } else {
      res.status(201).send()
    }

  } catch(err) {
    console.log(err)
    res.status(500).send()
  }
}


exports.indexAll = (req, res) => {
  // OK

  try {

    Product.countDocuments((err, count) => {
      if (err) {
        res.status(500).send()
      } else {
        const { page = 1 } = req.params

        Product.find()
          .limit(limit)
          .skip((limit * page) - limit)
          .sort('-created_at')
          .then(Documents => {
            res.status(200).json({ ok: true, data: Documents, count, limit })
          })
          .catch(_ => {
            res.status(500).send()
          })

      }
    })

  } catch(err) {
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
      const { 
        estado = {}, municipio = {}, 
        supermercado_id, preco: preco_u,
      } = preco

      const { nome: estado_nome } = estado
      const { nome: municipio_nome } = municipio

      if (functions.hasEmpty({
        estado_nome, municipio_nome, supermercado_id, _id
      })) {
        return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
      }

      Supermarket
        .findById(supermercado_id)
        .select('produtos')
        .then(supermarket => {

          let products = [ ...supermarket.produtos ]

          const productIndex = products.findIndex(({ produto_id }) => produto_id === _id)

          if (productIndex !== -1) {
            products[productIndex] = {
              ...products[productIndex],
              preco: preco_u
            }
          } else {
            products = [ ...products, {
              produto_id: _id,
              preco: preco_u
            }]
          }

          Supermarket.findByIdAndUpdate(supermercado_id, {
            produtos: products
          })
          .then(async () => {
            try {
              await updateProduct({
                _id, 
                estado, municipio, 
                supermercado_id, preco_u 
              })

              res.status(200).json({ ok: true, message: 'Dados atualizados!' })
            } catch(e) {
              console.error(e)
              res.status(500).send()
            }

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

    await updateProduct({ 
      _id, estado, municipio, 
      supermercado_id, feira_id, preco_u,
      finished: true
    })

    res.status(200).json({ ok: true, message: 'Feira finalizada!' })
      
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

