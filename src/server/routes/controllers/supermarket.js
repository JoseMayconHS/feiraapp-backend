const Product = require('../../../data/Schemas/Product'),
  Supermarket = require('../../../data/Schemas/Supermarket'),
  functions = require('../../../functions'),
  limit = +process.env.LIMIT_PAGINATION || 10

exports.save = async ({ data, hash_identify_device = '' }) => {
  try {
    const { 
      nome, local,  produtos = [], cache_id = 0, status
    } = data

    
    const { estado = {}, municipio = {} } = local
    
    const { nome: estado_nome, sigla: estado_sigla, _id: estado_id } = estado
    const { nome: municipio_nome, _id: municipio_id } = municipio
    
    const checkEmpty = {
      nome, municipio_nome, estado_nome, estado_sigla
    }
    
    if (functions.hasEmpty(checkEmpty)) {
      return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
    }
    
    const item = {
      nome, cache_id, hash_identify_device, produtos, status,
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
      },
    }
    
    // console.log('supermarket.save() item', item)
    
    const alreadyExists = async () => {
      let response
      try {
        const already = await Supermarket.findOne({ nome_key: functions.keyWord(item.nome) })

        if (already) {
          const { _doc } = already

          if (_doc.local.estado.cache_id === item.local.estado.cache_id) {
            if (_doc.local.municipio.cache_id === item.local.municipio.cache_id) {
              response = _doc
            }
          }

        }

      } catch(e) {
        console.error('supermarket.alreadyExists()', e)
      } finally {
        return response
      }
    }

    const response = await alreadyExists()

    // console.log('supermarket.response', response)
    // console.log('segundos', new Date().getSeconds())

    if (response) {

      const { _doc: new_doc } = await Supermarket.findByIdAndUpdate(response._id, { cache_id, hash_identify_device, descricao: item.descricao }, { new: true })

      if (item.produtos.length) {
        await this._update({ hash_identify_device, data: item, mongo_data: new_doc })
      }

      return { ...new_doc, cache_id }

    } else {
      const { _doc } = await Supermarket.create(item)
  
      return _doc
    }

  } catch(e) {
    console.error(e)
    return 
  }
}

exports._update = async ({
  data, hash_identify_device = '', mongo_data
}) => {
  try {
    // console.log('supermarket._update', { data, mongo_data, hash_identify_device })

    if (!mongo_data) {
      const { _doc } = await Supermarket.findById(data.api_id)

      mongo_data = _doc
    }

    // (END) ATUALIZAR A LISTA DE PRODUTOS
    // COLA
    const produtos = data.produtos
      .filter((produto) => {
        // console.log('data.produtos.produto', produto)

        if (mongo_data) {
          const { produto_id: produto_id_request } = produto
          return mongo_data
            .produtos
            .findIndex(({ produto_id }) => {
  
              const  { cache_id, _id: mongo_id } = produto_id
              const  { cache_id: cache_id_request, _id: mongo_id_request } = produto_id_request
  
              // || cache_id_request && (cache_id_request === cache_id) 

              return (mongo_id_request.length && mongo_id === mongo_id_request) 
            }) === -1
        } else {
          return false
        }

      })

      const new_products = []
  
      const products_middleware = produtos.map(product => ({
        async fn() {
          try {
            // console.log('products_middleware.product', product)

            // (END) PERSISIR hash_identify_device E cache_id
            // PARA AJUDAR A LOCALIZAR OS ITENS

            if (product.produto_id._id.length) {
              new_products.push({
                ...product,
                produto_id: {
                  cache_id: 0,
                  _id: product.produto_id._id
                }
              })
            } else {
              const product_data = await Product
                .findOne({ hash_identify_device, cache_id: product.produto_id.cache_id })
                .select('_id')
              
              if (product_data) {
                new_products.push({
                  ...product,
                  produto_id: {
                    cache_id: 0,
                    _id: product_data._id
                  }
                })
              } else {
                new_products.push(product)
              }
            }
            
          } catch(e) {
            console.error(e)
          }
        }
      }))

    await functions.middlewareAsync(...products_middleware)

    // console.log('new_products[0]', new_products[0])

    const produtos_join = [...new_products, ...mongo_data.produtos]

    // console.log('produtos_join', produtos_join)

    const produtos_clean = produtos_join.filter((product, index) => {
      return produtos_join.findIndex(_product => String(_product.produto_id._id) === String(product.produto_id._id)) === index
    })

    // console.log('produtos_clean', produtos_clean)

    const { _doc } = await Supermarket
      .findByIdAndUpdate(
        mongo_data ? mongo_data._id : data.api_id, 
        { produtos: produtos_clean, hash_identify_device: '', cache_id: 0 }, 
        { new: true }
      )

    return _doc
  } catch(e) {
    console.error(e)
    return data
  }
}

exports.store = async (req, res) => {
  // Ok
  try {

    const { 
      hash_identify_device = ''
    } = req.body

    const data = await save({
      data: req.body, hash_identify_device
    })

    res.status(201).json({ ok: !!data, data })

  } catch(err) {
    console.log(err)
    res.status(500).send()
  }
}

exports.storeList = async (req, res) => {
  // Ok
  try {

    const {
      data = [], hash_identify_device = ''
    } = req.body

    const response = []

    const stacks = data.map(item => ({
      async fn() {
        try {   

          const save_response = await save({
            data: item, hash_identify_device
          })
      
          save_response && response.push(save_response)

        } catch(e) {
          console.error(e)
        }
      }
    }))

    stacks.length && await functions.middlewareAsync(...stacks)

    res.status(201).json({ ok: true, data: response })

  } catch(err) {
    console.log(err)
    res.status(500).send()
  }
}


exports.index = (req, res) => {
  // OK

  try {

    const { where, undefineds = [] } = req.body
    const { page = 1 } = req.params
    let { limit: limitQuery } = req.query

    if (!limitQuery) {
      limitQuery = limit
    }

    console.log({ where })

    if (where) {
      let find = {}

      if (where.nome) {
        const regex = new RegExp(where.nome)

        find.nome_key = { $regex: regex, $options: 'g' }
      }

      Supermarket.find(find)
        .populate()
        .where('status', true)
        .where('_id')[where.favorito ? 'in' : 'nin'](where.favoritos_ids || [])
        .where('local.estado.cache_id', where.local_estado_id)
        .where('local.municipio.cache_id', where.local_municipio_id)
        .then(Documents => {
          const count = Documents.length

          Supermarket.find(find)
            .populate()
            .where('status', true)
            .where('_id')[where.favorito ? 'in' : 'nin'](where.favoritos_ids || [])
            .where('local.estado.cache_id', where.local_estado_id)
            .where('local.municipio.cache_id', where.local_municipio_id)
            .limit(limitQuery)
            .skip((limitQuery * page) - limitQuery)
            .sort('-created_at')
            .then(Documents => {

              let data = Documents.map(doc => ({
                ...doc._doc,
                produtos: []
              }))

              data = functions.setUndefineds({
                data, undefineds
              })

              res.status(200).json({ ok: true, data, count, limit: limitQuery })
            })
            .catch(e => {
              console.error(e)
              res.status(400).send()
            })
        }).catch(e => {
          console.error(e)
          res.status(400).send()
        })
    } else {
      Supermarket.countDocuments((err, count) => {
        if (err) {
          res.status(500).send()
        } else {  
          Supermarket.find()
            .limit(limitQuery)
            .skip((limitQuery * page) - limitQuery)
            .sort('-created_at')
            .then(Documents => {

              Documents = Documents.map(data => ({
                ...functions.setUndefineds({
                  data, undefineds
                }),
                produtos: []
              }))

              res.status(200).json({ ok: true, data: Documents, count, limit: limitQuery })
            })
            .catch(_ => {
              res.status(500).send()
            })
  
        }
      })
    }


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
    const { id: _id } = req.params

    // NO MOMENTO SO PREVEJO (produtos)
    const {
      select = ''
    } = req.query

    const {
      undefineds = []
    } = req.body
    
    Supermarket.findById(_id)
      .select(select)
      .then(single => {
        if (single) {

          single = functions.setUndefineds({
            data: single, undefineds
          })

          if (select !== '') {
            res.status(200).json({ ok: true, data: single[select] })
          } else {
            res.status(200).json({ ok: true, data: single })
          }
        } else {
          res.status(400).send()
        }
      })
      .catch(e => {
        console.error(e)
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

    const { data = {}, campo } = req.body

    if (typeof _id !== 'string')
      throw new Error()

    switch (campo) {
      case 'produtos':    
        const _d = new Date()
    
        const atualizado = {
          dia: _d.getDate(), 
          mes: _d.getMonth() + 1, 
          ano: _d.getFullYear(), 
          hora: `${ _d.getHours() < 10 ? `0${ _d.getHours() }` : _d.getHours() }:${ _d.getMinutes() < 10 ? `0${ _d.getMinutes() }` : _d.getMinutes() }`
        }
    
        Supermarket
          .findById(_id)
          .select('produtos')
          .then(supermarket => {
    
            let products = [ ...supermarket.produtos ]
    
            products = products.map(product => {
              const { produto_id: { _id } } = product

              const product_in_request = data.produtos.find(({ 
                produto_id
              }) => String(produto_id._id) === String(_id))
  
              if (product_in_request) {
                return {
                  ...product._doc,
                  preco: product_in_request.preco,
                  atualizado
                }
              } else {
                return product
              }
            })
    
            data.produtos.forEach(({ produto_id, preco }) => {
              const productIndex = products
                .findIndex(({ produto_id: { _id } }) => String(_id) === String(produto_id._id))
    
              if (productIndex === -1) {
                products.push({
                  produto_id,
                  preco,
                  atualizado
                })
              }
            })
        
            Supermarket.findOneAndUpdate({ _id }, {
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
        break
      default :
          Supermarket.findOneAndUpdate({ _id }, req.body)
            .then(() => res.status(200).send())
            .catch(() => res.status(400).send())
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

      Supermarket.findByIdAndDelete(_id)
        .then(() => {
          res.status(200).send()
        })
        .catch(err => {
          console.error(err)
          res.status(400).send()
        })

  } catch(e) {
    res.status(500).send(e)
  }
}

