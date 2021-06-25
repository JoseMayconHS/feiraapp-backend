const Product = require('../../../data/Schemas/Product'),
  Supermarket = require('../../../data/Schemas/Supermarket'),
  Brand = require('../../../data/Schemas/Brand'),
  functions = require('../../../functions'),
  limit = +process.env.LIMIT_PAGINATION || 10

exports.save = async ({ data, hash_identify_device = '' }) => {
  try {
    const { 
      nome, local,  produtos = [], cache_id = 0, status
    } = data

    const { estado = {}, cidade = {} } = local
    
    const { nome: estado_nome, sigla: estado_sigla, _id: estado_id } = estado
    const { nome: cidade_nome, _id: cidade_id } = cidade
    
    const checkEmpty = {
      nome, cidade_nome, estado_nome, estado_sigla
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
        cidade: {
          cache_id: cidade_id,
          nome: cidade_nome,
          estado_id
        }
      },
    }
        
    const alreadyExists = async () => {
      let response
      try {
        const already = await Supermarket.findOne({ nome_key: functions.keyWord(item.nome) })

        if (already) {
          const { _doc } = already

          if (_doc.local.estado.cache_id === item.local.estado.cache_id) {
            if (_doc.local.cidade.cache_id === item.local.cidade.cache_id) {
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

    // // console.log('supermarket.response', response)
    // // console.log('segundos', new Date().getSeconds())

    if (response) {

      const { _doc: new_doc } = await Supermarket.findByIdAndUpdate(response._id, { cache_id, hash_identify_device, descricao: item.descricao }, { new: true })

      if (item.produtos.length) {
        await this._update({ hash_identify_device, data: item, mongo_data: new_doc })
      }

      return { ...new_doc, cache_id }

    } else {
      const { _doc } = await Supermarket.create(item)
  
      return { ..._doc, cache_id }
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
        // // console.log('data.produtos.produto', produto)

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
            // // console.log('products_middleware.product', product)

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


    const produtos_join = [...new_products, ...mongo_data.produtos]

    // const produtos_clean = produtos_join.filter((product, index) => {
    //   return produtos_join.findIndex(_product => String(_product.produto_id._id) === String(product.produto_id._id)) === index
    // })

    const { _doc } = await Supermarket
      .findByIdAndUpdate(
        mongo_data ? mongo_data._id : data.api_id, 
        { produtos: produtos_join, hash_identify_device: '', cache_id: 0 }, 
        { new: true }
      )

      return { ..._doc, cache_id: data.cache_id }
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
    // console.log(err)
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

    // console.log({ where })

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
        .where('local.cidade.cache_id', where.local_cidade_id)
        .then(Documents => {
          const count = Documents.length

          Supermarket.find(find)
            .populate()
            .where('status', true)
            .where('_id')[where.favorito ? 'in' : 'nin'](where.favoritos_ids || [])
            .where('local.estado.cache_id', where.local_estado_id)
            .where('local.cidade.cache_id', where.local_cidade_id)
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

exports.single = async (req, res) => {

	try {
    const { id: _id } = req.params

    // NO MOMENTO SO PREVEJO (produtos)
    const {
      select = '',
      graphic
    } = req.query

    const {
      undefineds = [],
      full_products = [],
      noClassification
    } = req.body

    if (graphic) {

      const single = await Supermarket.findById(_id).select('produtos local')

      if (single) {
        const { produtos, local } = single

        const fulls = []

        const setFulls = async () => {
          const stack = produtos
            .filter(({ produto_id }) => !full_products.some(_id => _id === produto_id._id))
            .map(({ produto_id }) => ({
              async fn() {
                // @ts-ignore
                const { _doc } = await Product.findOne({ _id: produto_id._id, status: true })
        
                if (_doc) {
  
                  if (_doc.marca_id._id.length) {
                    const { _doc: brand } = await Brand.findById(_doc.marca_id._id)
  
                    _doc.marca_obj = brand
                  }
  
                  fulls.push(_doc)
                }
              }
            }))
  
          await functions.middlewareAsync(...stack)
        }

        const classification = {
          melhores_precos: [],
          piores_precos: []
        }

        const setClassifications = async () => {
          const query = produtos
            .map(({ produto_id,  }) => produto_id._id)
            .filter(v => v.length)

          const mongo_produtos = await Product
            .find()
            .populate()
            .where('_id').in(query)

          const stack = mongo_produtos.map(produto => ({
            async fn() {
              try {
                produto = produto._doc
  
                const { preco_u, produto_id } = produtos
                  .find(({ produto_id }) => String(produto_id._id) === String(produto._id)) || {}
  
                if (!preco_u || !produto_id) throw new Error(`produto_id ou preco_u estao vazios`)

                const { precos, sem_marca, marca_id } = produto
  
                const state_index = precos.findIndex(preco => preco.estado_id === local.estado.cache_id)
  
                const response_item = {
                  nome: produto.nome,
                  sabor: produto.sabor.nome || '',
                  peso: produto.peso,
                  marca: '',
                  preco_u, 
                  produto_id
                }
  
                if (state_index !== -1) {
  
                  const region_index = precos[state_index].cidades.findIndex(({ cidade_id }) => cidade_id === local.cidade.cache_id)
  
                  if (region_index !== -1) {
                    const price = precos[state_index].cidades[region_index]

                    if (!sem_marca && marca_id._id.length) {
                      const mongo_marca = await Brand.findById(marca_id._id).select('nome')

                      if (mongo_marca) {
                        response_item.marca = mongo_marca.nome
                      }
                    }
  
                    // (END) ANALIZAR SE OS VALORES ESTAO CERTOS
                    
                    const my_last_price = price.historico.find(({ supermercado_id: history_supermercado_id }) => {
                      return (String(single._id) === String(history_supermercado_id._id))
                    })
        
                    const last_price = price.historico.find(({ supermercado_id: history_supermercado_id }) => {
                      return (String(single._id) !== String(history_supermercado_id._id))
                    })
        
                    if (my_last_price) {
                      if (last_price) {
                        if (+last_price.preco_u >= +my_last_price.preco_u) {
                          // menor preco
            
                          classification.melhores_precos.push(response_item)
                        } else if (+last_price.preco_u < +my_last_price.preco_u) {
                          // maior preco
            
                          classification.piores_precos.push(response_item)
                        } 
                      } else {
                        classification.melhores_precos.push(response_item)
                      }
                    }
  
                  } else {
                    // SE NAO TIVER ESSE MUNICIPIO
  
                  }
                } else {
                  // SE NAO TIVER ESSE ESTADO
  
                }
  
              } catch(e) {
                console.error(e)
              }
            }
          }))

          await functions.middlewareAsync(...stack)
        }

        await setFulls()

        !noClassification && await setClassifications()

        const data = {
          fulls,
          field: produtos,
          classification
        }

        console.log(data)

        res.status(200).json({ ok: true, data })

      } else {
        res.status(400).send()
      }

    } else {
      let single = await Supermarket.findById(_id)
        .select(select)
      
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

    }
    		
	} catch(error) {
    console.error(error)
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
                  preco_u: product_in_request.preco_u,
                  atualizado
                }
              } else {
                return product
              }
            })
    
            data.produtos.forEach(({ produto_id, preco_u }) => {
              const productIndex = products
                .findIndex(({ produto_id: { _id } }) => String(_id) === String(produto_id._id))
    
              if (productIndex === -1) {
                products.push({
                  produto_id,
                  preco_u,
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

