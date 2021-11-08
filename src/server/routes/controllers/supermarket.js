const { ObjectId }= require('mongodb'),
  functions = require('../../../functions'),
  { optionsCounted } = require('../../../utils'),
  limit = +process.env.LIMIT_PAGINATION || 10

exports.save = async ({ data, hash_identify_device = '', db }) => {
  try {
    const { 
      nome, local, produtos = [], cache_id = 0, nivel = 4
    } = data

  // console.log('supermarket.save()', data)

    const { estado = {}, cidade = {} } = local
    
    const { nome: estado_nome, sigla: estado_sigla, _id: estado_id } = estado
    const { nome: cidade_nome, _id: cidade_id } = cidade
    
    const checkEmpty = {
      nome, cidade_nome, estado_nome, estado_sigla
    }
    
    if (functions.hasEmpty(checkEmpty)) {
      throw new Error()
    }
    
    const item = {
      nome: functions.camellize(nome), nome_key: functions.keyWord(nome),
      cache_id, hash_identify_device, nivel,
      produtos: produtos.map(produto => ({
        ...produto,
        produto_id: {
          ...produto.produto_id,
          _id: produto.produto_id._id.length ? new ObjectId(produto.produto_id._id) : produto.produto_id._id
        }
      })),
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
      }, created_at: Date.now()
    }
        
    const alreadyExists = async () => {
      let response

      try {
        const already = await db.supermarket.findOne({ nome_key: functions.keyWord(item.nome) })

        if (already) {
          if (already.local.estado.cache_id === item.local.estado.cache_id) {
            if (already.local.cidade.cache_id === item.local.cidade.cache_id) {
              response = already
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

      const updateData = { cache_id, hash_identify_device, descricao: item.descricao }

      await db.supermarket.updateOne({
        _id: response._id
      }, {
        $set: updateData
      })

      const newData = { ...response, ...updateData }

      if (item.produtos.length) {
        await this._update({ hash_identify_device, data: item, mongo_data: newData, db })
      }

      return newData

    } else {
      const { insertedId } = await db.supermarket.insertOne(item)
  
      return { ...item, cache_id, _id: insertedId }
    }

  } catch(e) {
    console.error(e)
    return 
  }
}

exports._update = async ({
  data, hash_identify_device = '', mongo_data, db
}) => {
  try {

    // console.log('supermarket._update', { data, mongo_data, hash_identify_device })
    
    if (!mongo_data) {

      mongo_data = await db.supermarket.findOne({ _id: new ObjectId(data.api_id) })
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

              return (mongo_id_request.length && String(mongo_id) === String(mongo_id_request)) 
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
                api: true,
                produto_id: {
                  cache_id: 0,
                  _id: new ObjectId(product.produto_id._id)
                }
              })
            } else {
              const product_data = await db.product.findOne({
                hash_identify_device, cache_id: product.produto_id.cache_id
              }, { projection: { _id: 1 } })
              
              if (product_data) {
                new_products.push({
                  ...product,
                  api: true,
                  produto_id: {
                    cache_id: 0,
                    _id: new ObjectId(product_data._id)
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

    const updateData = { 
      produtos: produtos_join, 
      nivel: mongo_data.nivel > 2 ? 2 : mongo_data.nivel, 
      hash_identify_device: '', cache_id: 0 
    }

    await db.supermarket.updateOne({
      _id: mongo_data ? mongo_data._id : new ObjectId(data.api_id)
    }, {
      $set: updateData
    })

    return { ...mongo_data, ...updateData, cache_id: data.cache_id }
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

    const data = await this.save({
      data: req.body, hash_identify_device, db: req.db
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

          const save_response = await this.save({
            data: item, hash_identify_device, db: req.db
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


exports.index = async (req, res) => {
  // OK

  try {

    const { where, undefineds = [], produtos } = req.body
    let { page = 1 } = req.params

    page = +page

    let { 
      limit: limitQuery,
      nome = '', nivel,
      cidade_id, estado_id
    } = req.query

    if (!limitQuery) {
      limitQuery = limit
    }

    limitQuery = +limitQuery

    let $match = {}

    if (nome.length || nivel) {

      if (nome.length) {
        const regex = new RegExp(functions.keyWord(nome))

        $match.nome_key = {
          $regex: regex, $options: 'gi'
        }
      }

      if (nivel) {
        $match.nivel = +nivel
      }
    }

    if (+estado_id) {
      $match['local.estado.cache_id'] = +estado_id
    }

    if (+cidade_id) {
      $match['local.cidade.cache_id'] = +cidade_id
    }

    let bests 
    
    if (where) {
      bests = where.bests

      if (where.nome) {
        const regex = new RegExp(functions.keyWord(where.nome))

        $match.nome_key = { $regex: regex, $options: 'gi' }
      }

      if (where.favorito) {
        $match._id = {
          $in: where.favoritos_ids ? where.favoritos_ids.filter(v => v.length).map(_id => new ObjectId(_id)) : []
        }
      }

      $match['local.estado.cache_id'] = +where.local_estado_id
      $match['local.cidade.cache_id'] = +where.local_cidade_id
    }

    if (!req.payload) {
      $match.nivel = {
        $in: [1, 2]
      }
    }

    const options = [{
      $match
    }, {
      $sort: {
        created_at: -1
      }
    }, {
      $group: {
        _id: '$_id',
        doc: { $first: "$$ROOT" }
      }
    }, { 
      $replaceRoot: {
        newRoot: { $mergeObjects: ['$doc', produtos || bests ? {} : { produtos: [] }] }
      }
    }]

    const optionsPaginated = [{
      $skip: (limitQuery * page) - limitQuery
    }, {
      $limit: limitQuery 
    }]

    const [{ documents, postsCounted }] = await req.db.supermarket.aggregate([{
      $facet: {
        documents: options.concat(bests ? [] : optionsPaginated),
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

    // (DESC) ORDERNAR POR MELHORES
    let data = bests ? documents
        .map(item => ({
          ...item,
          __media: item.produtos.length ? (item.produtos.reduce((acc, curr) => {
            acc += +curr.preco_u

            return acc
          }, 0) / item.produtos.length).toFixed(2) : 0
        }))
        .sort((a,b) => {
          const v = a.__media - b.__media

          if (a.__media) {
            if (b.__media) {
              switch(true) {
                case (v < 0):
                  return -1
                case (v > 0):
                  return -1
                default:
                  return 1
              }
            } else {
              return -1
            }
          } else {
            return 1
          }

        })
        .map(item => {
          delete item.__media

          if (!produtos) {
            item.produtos = []
          }

          return item
        })
        .slice((page * limitQuery) - limitQuery, page * limitQuery) : 
        [ ...documents ]

    if (undefineds.length) {
      data = functions.setUndefineds({
        data, undefineds
      })
    }

    res.status(200).json({ ok: true, data, count, limit: limitQuery, page })
  } catch(err) {
    console.error(err)
    res.status(500).send()
  }
}

exports.all = async (req, res) => {
  // OK
  // (DESC) BUSCAR PARA DOWNLOAD AUTOMATICO SOMENTE PRODUTOS APROVADOS PELO GESTOR

  const { locale, noIds = [] } = req.body

  if (!locale) {
    throw new Error('Localização vazia')
  }

  const { uf, mn } = locale
  
  try {

    const documents = await req.db.supermarket.aggregate([{
      $match: {
        nivel: {
          $in: [1, 2]
        },
        'local.estado.cache_id': +uf,
        'local.cidade.cache_id': +mn,
        _id: {
          $nin: noIds.map(_id => new ObjectId(_id))
        }
      }
    }, {
        $sort: {
          created_at: -1
        }
      }
    ]).toArray()

    res.status(200).json(documents)

  } catch(err) {
    res.status(500).send()
  }
}

exports.single = async (req, res) => {

	try {
    const { id } = req.params

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

      const single = await req.db.supermarket.findOne({
        _id: new ObjectId(id),
        nivel: {
          $in: [1, 2]
        }
      }, {
        projection: {
          produtos: 1, local: 1
        }
      })

      if (single) {
        const { produtos, local } = single

        let fulls = []

        const setFulls = async () => {

          const _ids = produtos
            .filter(({ produto_id }) => !full_products.some(_id => String(_id) === String(produto_id._id)))
            .map(({ produto_id: { _id } }) => new ObjectId(_id))

          const documents = _ids.length ? await req.db.product.aggregate([{
            $match: {
              _id: {
                $in: _ids
              },
              nivel: {
                $in: [1, 2]
              },
              // status: true
            }
          }, {
            $lookup: {
              from: 'brand',
              localField: 'marca_id._id',
              foreignField: '_id',
              as: 'marca_obj'
            }
          }, 
          // (DESC) COMENTEI PRA EVITAR QUE PRODUTOS SEM MARCA E SEM NOTIFICAÇÃO NÃO FOSSEM LISTADOS
          // {
          //   $unwind: '$marca_obj'
          // }
          ]).toArray() : []

          fulls = documents
        }

        const classification = {
          melhores_precos: [],
          piores_precos: []
        }

        const setClassifications = async () => {
          const query = produtos
            .map(({ produto_id }) => produto_id._id)
            .filter(v => String(v).length)
            .map(v => new ObjectId(v))


          const mongo_produtos = await req.db.product.find({
            _id: {
              $in: query
            }
          }).toArray()

          const stack = mongo_produtos.map(produto => ({
            async fn() {
              try {
  
                const { preco_u, produto_id } = produtos
                  .find(({ produto_id }) => String(produto_id._id) === String(produto._id)) || {}
  
                if (!preco_u || !produto_id) throw new Error(`produto_id ou preco_u estao vazios`)

                const { precos, sem_marca, marca_id } = produto
  
                const state_index = precos.findIndex(preco => preco.estado_id === local.estado.cache_id)
  
                const response_item = {
                  nome: produto.nome,
                  sabor: produto.sabor.nome || '',
                  peso: functions.getWeight(produto.peso),
                  marca: '',
                  preco_u, 
                  produto_id
                }
  
                if (state_index !== -1) {
  
                  const region_index = precos[state_index].cidades.findIndex(({ cidade_id }) => cidade_id === local.cidade.cache_id)
  
                  if (region_index !== -1) {
                    const price = precos[state_index].cidades[region_index]

                    if (!sem_marca && marca_id._id.length) {
                      const mongo_marca = await req.db.brand.findOne({ _id: new ObjectId(marca_id._id) }, { projection: { nome: 1 } })

                      if (mongo_marca) {
                        response_item.marca = mongo_marca.nome
                      }
                    }
          
                    const last_price = price.historico.find(({ supermercado_id: history_supermercado_id }) => {
                      return (String(single._id) !== String(history_supermercado_id._id))
                    })
                    
                    if (last_price) {

                      if (+last_price.preco_u >= +preco_u) {
                        // menor preco

                        const latest_of_all_supermarkets = price.historico.filter(({ supermercado_id: id1 }, index) => {
                          return price.historico.findIndex(({ supermercado_id: id2 }) => {
                            return String(id2._id) === String(id1._id)
                          }) === index
                        })

                        let best_of_history_sorted = latest_of_all_supermarkets
                          .filter(({ supermercado_id: history_supermercado_id }) => {
                            return (String(single._id) !== String(history_supermercado_id._id))
                          })
                          .sort((a, b) => +b.preco_u - +a.preco_u)

                        const best_of_history = best_of_history_sorted[best_of_history_sorted.length - 1]

                        if (+best_of_history.preco_u >= +preco_u) {
                          classification.melhores_precos.push(response_item)
                        }
          
                      } else if (+last_price.preco_u < +preco_u) {
                        // maior preco
          
                        classification.piores_precos.push(response_item)
                      } 
                    } else {
                      classification.melhores_precos.push(response_item)
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

      // console.log(data)

        res.status(200).json({ ok: true, data })

      } else {
      // console.log('Supermercado não aprovado ou interagido')
        res.status(400).send()
      }

    } else {

      const options = {}

      if (select.length) {
        options.projection = functions.stringToObj(select)
      }

      let single = await req.db.supermarket.findOne({
        _id: new ObjectId(id)
      }, options)
      
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

exports.updateProducts = async ({ data, _id, db }) => {

  const supermarket = await db.supermarket.findOne({
    _id: new ObjectId(_id)
  }, {
    projection: {
      produtos: 1, nivel: 1
    }
  })

  if (supermarket) {

    let products = [ ...supermarket.produtos ]
  
    products = products.map(product => {
      const { produto_id: { _id } } = product
  
      const product_in_request = data.produtos.find(({ 
        produto_id
      }) => String(produto_id._id) === String(_id))
  
      if (product_in_request) {
        return {
          ...product,
          api: true,
          preco_u: product_in_request.preco_u,
          atualizado: product_in_request.atualizado
        }
      } else {
        return product
      }
    })
  
    data.produtos.forEach(({ produto_id, preco_u, atualizado }) => {
      const productIndex = products
        .findIndex(({ produto_id: { _id } }) => String(_id) === String(produto_id._id))
  
      if (productIndex === -1) {
        products.unshift({
          produto_id: {
            ...produto_id,
            _id: new ObjectId(produto_id._id)
          },
          preco_u,
          atualizado,
          api: true
        })
      }
    })

    const produtos = await db.product.aggregate([{
      $match: {
        _id: {
          $in: products
            .filter(({ produto_id: { _id } }) => String(_id).length)
            .map(({ produto_id: { _id } }) => new ObjectId(_id))
        }
      }
    }, {
      $project: {
        _id: 1
      }
    }]).toArray()

    // (DET) IMPEDIR QUE OS PRODUTOS DO SUPERMERCADO TENHA PRODUTOS QUE JÁ FORAM EXCLUIDOS
    products = products.filter(({ produto_id }) => produtos.some(({ _id }) => String(_id) === String(produto_id._id) ))

    await db.supermarket.updateOne({
      _id: new ObjectId(_id)
    }, {
      $set: {
        produtos: products, nivel: supermarket.nivel > 2 ? 2 : supermarket.nivel
      }
    })
  
  }

}

exports.update = async (req, res) => {
  // OK

  try {

    const { id } = req.params

    const { data = {}, campo } = req.body

    if (typeof id !== 'string')
      throw new Error()

    switch (campo) {
      case 'produtos':    
        await this.updateProducts({ _id, data, db: req.db })
        break
      default :
      
        const body = req.body
        
        delete body._id

        if (body.nome && body.nome.length) {
          body.nome = functions.camellize(body.nome)
          body.nome_key = functions.keyWord(body.nome)
        }

        if (body.nivel) {
          body.nivel = +body.nivel
        }

        await req.db.supermarket.updateOne({ _id: new ObjectId(id) }, { $set: body })
    }

    res.status(200).send()
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

    const deleteInProductPrices = async () => {
      const supermarket = await req.db.supermarket.findOne({
        _id: new ObjectId(id)
      }, {
        projection: {
          local: 1
        }
      })

      const findDefault = {
        'precos.estado_id': supermarket.local.estado.cache_id,
        'precos.cidades.cidade_id': supermarket.local.cidade.cache_id
      }

      const $or = [
        { 
          ...findDefault,
          'precos.cidades.menor_preco.supermercado_id._id': new ObjectId(id)
        },
        {
          ...findDefault,
          'precos.cidades.maior_preco.supermercado_id._id': new ObjectId(id)
        },
        {
          ...findDefault,
          'precos.cidades.historico.supermercado_id._id': new ObjectId(id)
        }
      ]

      try {
        const products = await req.db.product.find({
          $or
        }, {
          projection: {
            precos: 1
          }
        }).toArray()


        if (products.length) {
          const stack = products.map(product => ({
            async fn() {
              try {
                let precos = product.precos

                const state_index = precos.findIndex(preco => preco.estado_id === supermarket.local.estado.cache_id)

                if (state_index !== -1) {
                  const city_index = precos[state_index].cidades.findIndex(preco => preco.cidade_id === supermarket.local.cidade.cache_id)

                  if (city_index !== -1) {
                    const cidade = { ...precos[state_index].cidades[city_index] }

                    const default_value = {
                      supermercado_id: {
                        _id: '',
                        cache_id: 0
                      },
                      preco_u: '0',
                    }

                    cidade.historico = cidade.historico.filter(historico => String(historico.supermercado_id._id) !== id)
                    
                    if (String(cidade.maior_preco.supermercado_id._id) === id) {
                      cidade.maior_preco = cidade.historico.sort((a, b) => b.preco_u - a.preco_u)[0] || default_value
                    }
                    
                    if (String(cidade.menor_preco.supermercado_id._id) === id) {
                      cidade.menor_preco = cidade.historico.sort((a, b) => a.preco_u - b.preco_u)[0] || default_value
                    }

                    precos[state_index].cidades[city_index] = cidade

                  }

                }

                await req.db.product.updateOne({
                  _id: product._id
                }, {
                  $set: {
                    precos
                  }
                })

              } catch(e) {
                console.error(e)
              }
            }
          }))

          await functions.middlewareAsync(...stack)
        }
      } catch (e) {
        console.error(e)
      }
    }

    await deleteInProductPrices()

    await req.db.supermarket.deleteOne({
      _id: new ObjectId(id)
    })

    res.status(200).send()

  } catch(e) {
    res.status(500).send(e)
  }
}

