const { ObjectId } = require('mongodb'),
  functions = require('../../../functions'),
  pushNotificationControllers = require('./pushNotification'),
  limit = +process.env.LIMIT_PAGINATION || 10

exports.save = async ({ 
    data, hash_identify_device = '', local, db
  }) => {
  try {

    const { 
      peso = {}, nome, sabor, tipo, sem_marca,
      marca: marca_obj,
      marca_id: marca = {},
      cache_id = 0, precos = [], status, nivel = 4
    } = data

    console.log('product.save()', data)

    const { tipo: peso_tipo } = peso

    const checkEmpty = {
      nome, tipo, peso_tipo
    }

    if (!sem_marca && marca_obj) {
      checkEmpty.marca_nome = marca_obj.nome
    }

    if (functions.hasEmpty(checkEmpty)) {
      return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
    }

    tipo.texto = functions.capitalize(tipo.texto)
    tipo.texto_key = functions.keyWord(tipo.texto)

    let criar = !sem_marca
    
    let data_marca = false
    if (!sem_marca) {
      let brand = false

      const { 
        _id: marca_id
      } = marca

      if (marca_id && marca_id.length) {
  
        brand = await db.brand.findOne({ _id: new ObjectId(marca_id)}, { projection: { _id: 1 } })
    
        if (brand) {
          criar = false
        } 
      } 
  
      if (criar) {
        if (marca_obj) {
          data_marca = await db.brand.findOne({
            nome_key: functions.keyWord(marca_obj.nome)
          }, { projection: { nome: 1 } })

          if (!data_marca) {
            const { insertedId } = await db.brand.insertOne({
              nome: marca_obj.nome,
              nome_key: functions.keyWord(marca_obj.nome)
            })

            data_marca = {
              _id: insertedId
            }
          }

        }
      } else {
        data_marca = brand
      }
    }

    const item = {
      nome, nome_key: functions.keyWord(nome), 
      sem_marca, cache_id, hash_identify_device, precos, status, nivel: +nivel, peso: { ...peso, valor: String(peso.valor) },
      tipo, sabor: { definido: false },
      created_at: Date.now()
    }

    if (sabor.definido) {
      sabor.nome = functions.capitalize(sabor.nome)
      sabor.nome_key = functions.keyWord(sabor.nome)
      sabor.definido = true

      item.sabor = sabor
    }

    // if (!sem_marca) {
    //   item.marca_id = {
    //     _id: new ObjectId(data_marca ? data_marca._id : ''),
    //     cache_id: 0
    //   }
    // }

    item.marca_id = {
      _id: data_marca && data_marca._id ? new ObjectId(data_marca._id) : '',
      cache_id: 0
    }

    // console.log('product.save ', item)

    const alreadyExists = async () => {
      let response
      try {
        const already = await db.product.findOne({ nome_key: item.nome_key })

        console.log({ already, item })

        if (already) {

          const verifyType = () => {
            return (item.tipo.texto_key === already.tipo.texto_key)
          }

          const verifyWeight = () => {
            if (item.peso.tipo === already.peso.tipo) {
              if (item.peso.valor == already.peso.valor && item.peso.force_down === already.peso.force_down) {
                return true
              }
            }

            return false
          }

          const verifyBrand = () => {
            if (String(item.marca_id._id).length) {
              return String(item.marca_id._id) === String(already.marca_id._id)
            } else {
              return already.sem_marca
            }
          }

          const verifyFlavor = () => {
            if (item.sabor) {
              if (item.sabor.definido && already.sabor.definido) {
                return functions.keyWord(item.sabor.nome) === already.sabor.nome_key
              } else {
                return (item.sabor.definido === already.sabor.definido)
              }
            } else {
              return !already.sabor.definido
            }
          }

          if (String(item.marca_id._id).length) {
            if (verifyBrand() && verifyWeight() && verifyType() && verifyFlavor()) {
              response = already
            }
          } else {
            if (already.sem_marca) {
              if (verifyType() && verifyWeight() && verifyFlavor()) {
                response = already
              }
            }
          }

          console.log(item.nome, {
            Brand: verifyBrand(),
            Type: verifyType(),
            Flavor: verifyFlavor(),
            Weight: verifyWeight()
          }, { already: !!response })
        }

      } catch(e) {
        console.error('product.alreadyExists()', e)
      } finally {

        return response
      }
    }

    let response = await alreadyExists() 

    if (response) {
      // // console.log('item.precos', item.precos)
      if (item.precos.length) {
        // // console.log('item.precos.cidades', item.precos[0].cidades)
        // // console.log('item.precos.cidades.historico', item.precos[0].cidades[0].historico)
        await this._update({
          data: item, local, mongo_data: response, db
        })
      }

      const updateData = { cache_id, hash_identify_device, nivel: nivel > 2 ? 2 : nivel }

      await db.product.updateOne({
        _id: response._id
      }, {
        $set: updateData
      })

      return { ...response, ...updateData }
    } else {

      const { insertedId } = await db.product.insertOne(item)

      return { ...item, _id: insertedId }
    }

  } catch(err) {
    console.log(err)
    return
  }
}

exports._update = async ({
  data, hash_identify_device = '', local, mongo_data, db
}) => {
  try {
    // console.log('product._update', { data, local, mongo_data })

    let response = data

    if (!mongo_data) {
      mongo_data = await db.product.findOne({ _id: new ObjectId(data.api_id) })
    }

    if (mongo_data) {
    
      const mongo_precos = mongo_data.precos
      const precos = data.precos

      // console.log('product._update()', { mongo_precos, precos })
    
      const mongo_state_index = mongo_precos.findIndex(preco => preco.estado_id === local.estado._id)
      const state_index = precos.findIndex(preco => preco.estado_id === local.estado._id)
  
      if (mongo_state_index !== -1 && state_index !== -1) {
        const state = mongo_precos[mongo_state_index]
  
        const mongo_region_index = mongo_precos[mongo_state_index].cidades.findIndex(({ cidade_id }) => cidade_id === local.cidade._id)
        const region_index = precos[state_index].cidades.findIndex(({ cidade_id }) => cidade_id === local.cidade._id)
  
        if (mongo_region_index !== -1 && region_index !== -1) {
          const mongo_price = mongo_precos[mongo_state_index].cidades[mongo_region_index]
          let price = precos[state_index].cidades[region_index]

          // console.log('price.historico antes', price.historico)
          price.historico = price.historico.filter(historico => !historico.api)
          // console.log('price.historico depois', price.historico)
  
          // (EX) SE ESTA FUNCIONANDO CERTO
          // console.log('historico antes')
    
          const atualizado = functions.date() 
      
          const updatePricesInSupermarkets = price.historico
            .filter(historico => historico.supermercado_id._id.length)
            .map(({ preco_u, supermercado_id }) => ({
              async fn() {
                try {
                  const supermarket = await db.supermarket.findOne({
                    _id: new ObjectId(supermercado_id._id)
                  }, { produtos: 1, nome: 1 })
          
                  let products = supermarket.produtos
          
                  // console.log('updatePricesInSupermarkets products', products)
          
                  const productIndex = products.findIndex(({ produto_id }) => String(produto_id._id) === String(mongo_data._id))
          
                  if (productIndex !== -1) {
                    products[productIndex].preco_u = preco_u 
                    products[productIndex].atualizado = atualizado 
                  } else {
                    products = [ ...products, {
                      produto_id: {
                        _id: new ObjectId(mongo_data._id),
                        cache_id: 0
                      },
                      preco_u, atualizado
                    }]
                  }
                  
                  await db.supermarket.updateOne({
                    _id: new ObjectId(supermercado_id._id)
                  }, {
                    $set: { produtos: products }
                  })
          
                  await pushNotificationControllers
                    .notify({ 
                      _id: mongo_data ? mongo_data._id : data.api_id, 
                      produto_nome: mongo_data ? mongo_data.nome : data.nome,
                      produto_peso: mongo_data ? mongo_data.peso : data.peso,
                      produto_sabor: mongo_data ? mongo_data.sabor : data.sabor,
                      preco_u, local, 
                      supermercado_nome: supermarket.nome,
                      moment: atualizado, db
                    })
          
                } catch(e) {
                  console.error(e)
                }
              }
            }))

          await functions.middlewareAsync(...updatePricesInSupermarkets)

          price.historico = [...price.historico, ...mongo_price.historico].sort((a, b) => {
            if (a.data.ano === b.data.ano) {
              if (a.data.mes === b.data.mes) {
                if (a.data.dia === b.data.dia) {
                  return 0
                } else if (a.data.dia < b.data.dia) {
                  return -1
                } else {
                  return 1
                }
              } else if (a.data.mes < b.data.mes) {
                return -1
              } else {
                return 1
              }
            } else if (a.data.ano < b.data.ano) {
              return -1
            } else {
              return 1
            }
          })

          // // console.log('historico depois')
          // // console.log(price.historico)

          
          // // console.log('antes', { mongo_price, price })

          // (END) ATUALIZAR O PRECO NOS SUPERMERCADOS 
          
          if (
            (+mongo_price.menor_preco.preco_u === 0) || 
            (+price.menor_preco.preco_u < +mongo_price.menor_preco.preco_u)
          ) {
            if (+mongo_price.maior_preco.preco_u === 0) {
              // @ts-ignore
              mongo_price.maior_preco.preco_u = mongo_price.menor_preco.preco_u
              // @ts-ignore
              mongo_price.maior_preco.supermercado_id = mongo_price.menor_preco.supermercado_id
            }

            mongo_price.menor_preco.preco_u = price.menor_preco.preco_u
            mongo_price.menor_preco.supermercado_id = price.menor_preco.supermercado_id
          } else if (
            (+mongo_price.maior_preco.preco_u === 0) || 
            (+price.maior_preco.preco_u > +mongo_price.maior_preco.preco_u)
          ) {
            if (price.maior_preco.supermercado_id) {
              mongo_price.maior_preco.preco_u = price.maior_preco.preco_u
              mongo_price.maior_preco.supermercado_id = price.maior_preco.supermercado_id
            } else {
              mongo_price.maior_preco.preco_u = price.menor_preco.preco_u
              mongo_price.maior_preco.supermercado_id = price.menor_preco.supermercado_id
            }
          }

          mongo_price.historico = price.historico

          mongo_price.maior_preco.supermercado_id = {
            ...mongo_price.maior_preco.supermercado_id,
            _id: new ObjectId(mongo_price.maior_preco.supermercado_id._id)
          }

          mongo_price.menor_preco.supermercado_id = {
            ...mongo_price.menor_preco.supermercado_id,
            _id: new ObjectId(mongo_price.menor_preco.supermercado_id._id)
          }

          // // console.log('depois', { mongo_price, price })
  
          const cidades = mongo_precos[mongo_state_index].cidades
  
          cidades.splice(mongo_region_index, 1, mongo_price)
  
          mongo_precos[mongo_state_index].cidades = cidades
        } else {
          // SE NAO TIVER ESSE cidade

          if (region_index !== -1) {
            const price = precos[state_index].cidades[region_index]

            price.maior_preco.supermercado_id = {
              ...price.maior_preco.supermercado_id,
              _id: new ObjectId(price.maior_preco.supermercado_id._id)
            }
  
            price.menor_preco.supermercado_id = {
              ...price.menor_preco.supermercado_id,
              _id: new ObjectId(price.menor_preco.supermercado_id._id)
            }
    
            const _result = {
              cidade_id: local.cidade._id,
              menor_preco: price.menor_preco,
              maior_preco: price.maior_preco || { 
                supermercado_id: {
                  _id: '',
                  cache_id: 0
                },
                preco_u: '0' 
              },
              historico: price.historico || []
            }
    
            state.cidades.push(_result)
    
            mongo_precos.splice(mongo_state_index, 1, state)
          }
  
        }
      } else {
        // SE NAO TIVER ESSE ESTADO

        if (state_index !== -1) {
          const region_index = precos[state_index].cidades.findIndex(({ cidade_id }) => cidade_id === local.cidade._id)

          if (region_index !== -1) {
            const price = precos[state_index].cidades[region_index]

            price.maior_preco.supermercado_id = {
              ...price.maior_preco.supermercado_id,
              _id: new ObjectId(price.maior_preco.supermercado_id._id)
            }
  
            price.menor_preco.supermercado_id = {
              ...price.menor_preco.supermercado_id,
              _id: new ObjectId(price.menor_preco.supermercado_id._id)
            }
  
            const _result = {
              estado_id: local.estado._id,
              cidades: [{
                cidade_id: local.cidade._id,
                menor_preco: price.menor_preco,
                maior_preco: price.maior_preco || { 
                  supermercado_id: {
                    _id: '',
                    cache_id: 0
                  },
                  preco_u: '0' 
                },
                historico: price.historico || []
              }]
            }
      
            mongo_precos.push(_result)
          }

        }
  
      }

      // // console.log('product._update end', { mongo_precos })

      const updateData = { precos: mongo_precos, nivel: mongo_precos && mongo_data.nivel > 2 ? 2 : mongo_data.nivel }

      await db.product.updateOne({
          _id: new ObjectId(mongo_data ? mongo_data._id : data.api_id)
        }, { $set: updateData })

      response = { ...mongo_data, ...updateData }
    }

    return { ...response, cache_id: data.cache_id }

  } catch(e) {
    console.error(e)
    return data
  }
}

exports.updatePrices = async ({ 
  _id, local = {}, preco_u, moment,
  finished, db,
  supermercado_id, supermercado_nome
}) => {
  return new Promise(async (resolve, reject) => {
    const produto = await db.product.findOne({
      _id: new ObjectId(_id)
    }, { precos: 1, nivel: 1, nome: 1, peso: 1, sabor: 1 })

    if (produto) {
        const { estado, cidade } = local

        const prices = [ ...produto.precos ]
        
        let newPrices = []

        if (!moment) {    
          moment = functions.date()
        }

        const historico = {
          data: moment,
          preco_u,
          supermercado_id:  {
            ...supermercado_id,
            _id: new ObjectId(supermercado_id._id)
          }
        }
     
        const state_index = prices.findIndex(preco => preco.estado_id === estado._id)

        if (state_index !== -1) {
          const state = prices[state_index]

          const region_index = prices[state_index].cidades.findIndex(({ cidade_id }) => cidade_id === cidade._id)

          if (region_index !== -1) {
            const price = prices[state_index].cidades[region_index]

            price.historico = [historico, ...price.historico]

            if ((+price.menor_preco.preco_u === 0) || (+price.menor_preco.preco_u > +preco_u)) {
              if (+price.maior_preco.preco_u === 0) {
                // @ts-ignore
                price.maior_preco.preco_u = price.menor_preco.preco_u
                // @ts-ignore
                price.maior_preco.supermercado_id = price.menor_preco.supermercado_id
              }

              price.menor_preco.preco_u = preco_u
              price.menor_preco.supermercado_id = supermercado_id

              // @ts-ignore
            } else if ((+price.maior_preco.preco_u === 0) || (+price.maior_preco.preco_u < +preco_u)) {
              // @ts-ignore
              price.maior_preco.preco_u = preco_u
              // @ts-ignore
              price.maior_preco.supermercado_id = supermercado_id
            }

            const cidades = prices[state_index].cidades

            price.maior_preco.supermercado_id = {
              ...price.maior_preco.supermercado_id,
              _id: new ObjectId(price.maior_preco.supermercado_id._id)
            }
  
            price.menor_preco.supermercado_id = {
              ...price.menor_preco.supermercado_id,
              _id: new ObjectId(price.menor_preco.supermercado_id._id)
            }

            cidades.splice(region_index, 1, price)

            prices[state_index].cidades = cidades
          } else {
            // SE NAO TIVER ESSE cidade

            const menor_preco = {
              preco_u,
              supermercado_id: {
                ...supermercado_id,
                _id: new ObjectId(supermercado_id._id)
              }
            }

            const maior_preco = {
              supermercado_id: {
                _id: '',
                cache_id: 0
              }, preco_u: '0' 
            }

            const _result = {
              cidade_id: cidade._id,
              menor_preco,
              maior_preco,
              historico: [historico]
            }

            state.cidades.push(_result)

            prices.splice(state_index, 1, state)
          }
        } else {
          // SE NAO TIVER ESSE ESTADO

          const menor_preco = {
            preco_u,
            supermercado_id: {
              ...supermercado_id,
              _id: new ObjectId(supermercado_id._id)
            }
          }

          const maior_preco = {
            supermercado_id: {
              _id: '',
              cache_id: 0
            }, preco_u: '0' 
          }

          const _result = {
            estado_id: estado._id,
            cidades: [{
              cidade_id: cidade._id,
              menor_preco,
              maior_preco,
              historico: [historico]
            }]
          }

          prices.push(_result)
        }

        newPrices = [ ...prices ]
                
        const data_update = {
          precos: newPrices
        }
        
        if (finished) {
          data_update.presenca = produto.presenca + 1
        }
        
        // console.log('updatePrices ', data_update.precos)

        const updateData = { ...data_update, nivel: prices.length && produto.nivel > 2 ? 2 : produto.nivel }

        await db.product.updateOne({
          _id: new ObjectId(_id)
        }, {
          $set: updateData
        })

        await pushNotificationControllers
          .notify({ 
            _id, preco_u, local, moment, db,
            supermercado_nome, 
            produto_nome: produto.nome,
            produto_peso: produto.peso,
            produto_sabor: produto.sabor
          })

        resolve('')

    } else {
      reject('')
    }
  })
}

exports.store = async (req, res) => {
  // Ok
  try {

    const { 
      hash_identify_device = ''
    } = req.body

    // console.log('product.store ', req.body)

    const data = await save({
      data: req.body, hash_identify_device, db: req.db
    })

    res.status(201).json({ ok: !!data, data })

  } catch(err) {
    console.log(err)
    res.status(500).send()
  }
}

exports.index = async (req, res) => {
  // OK

  try {
    let { page = 1 } = req.params

    page = +page

    let {
      limit: limitQuery,
      nome = '', nivel
    } = req.query

    if (!limitQuery) {
      limitQuery = limit
    }

    const options = [{
      $sort: {
        created_at: -1
      }
    }]

    if (nome.length || nivel) {

      const $match = {}

      if (nome.length) {
        const regex = new RegExp(functions.keyWord(nome))

        $match.nome_key = {
          $regex: regex, $options: 'gi'
        }
      }

      if (nivel) {
        $match.nivel = +nivel
      }

      options.unshift({
        $match
      })
    }

    options.push({
      $group: {
        _id: '$_id',
        doc: { $first: "$$ROOT" }
      }
    }, {
      $replaceRoot: {
        newRoot: { $mergeObjects: ['$doc', { precos: [] }] }
      }
    }, {
      $lookup: {
        from: 'brand',
        foreignField: '_id',
        localField: 'marca_id._id',
        as: 'marca_obj'
      }
    })

    const optionsPaginated = [{
      $skip: (limitQuery * page) - limitQuery
    }, {
      $limit: limitQuery 
    }]

    const optionsCounted = [{
      $group: {
        _id: null,
        count: { $sum: 1 }
      }
    }, {
      $project: {
        _id: 0,
        count: 1
      }
    }]

    const [{ documents, postsCounted }] = await req.db.product.aggregate([{
      $facet: {
        documents: [
          ...options,
          ...optionsPaginated
        ],
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

    res.status(200).json({ ok: true, data: documents, limit: limitQuery, count, page })

  } catch(err) {
    console.log(err)
    res.status(500).send()
  }
}

exports.all = async (req, res) => {
  // OK
  // (DESC) BUSCAR PARA DOWNLOAD AUTOMATICO SOMENTE PRODUTOS APROVADOS PELO GESTOR

  const { status } = req.query

  const { locale, noIds = [], enable_prices } = req.body

  const where = {}

  if (status) {
    where.status = true
  }

  if (!locale) {
    throw new Error('Localização vazia')
  }

  const { uf, mn } = locale

  try {

    let documents = await req.db.product.aggregate([{
      $match: {
        nivel: {
          $in: [1]
        },
        _id: {
          $nin: noIds.map(_id => new ObjectId(_id))
        }
      }
    }, {
        $sort: {
          created_at: -1
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
    ]).toArray()

    documents = documents.map(document => {

      const preco = {
        preco_u: '0',
        supermercado_id: {
          cache_id: 0,
          _id: ''
        }
      }

      const response = {
        estado_id: uf,
        cidades: [{
          cidade_id: mn,
          menor_preco: preco,
          maior_preco: preco,
          historico: []
        }]
      }

      const state_index = document.precos.findIndex(({ estado_id }) => estado_id === uf)
        
      if (state_index !== -1) {
        const state = document.precos[state_index]
  
        const region_index = state.cidades.findIndex(({ cidade_id }) => cidade_id === mn)
  
        if (region_index !== -1) {
          const region = state.cidades[region_index]

          response.cidades = [region]          
        }
      }

      // (END) LOGICA DE ENTREGAR OU NÃO OS PREÇOS JÁ REGISTRADOS
      document.precos = enable_prices ? [response] : []

      return document
    })

    res.status(200).json(documents)
  } catch(err) {
    console.error(err)
    res.status(500).send()
  }
}

exports.single = async (req, res) => {
	try {
    let { id, page = 1 } = req.params
    page = +page

    let {
      select = '',
      target, 
      limit: limitQuery
    } = req.query

    const {
      local,
      undefineds = []
    } = req.body

    if (!limitQuery) {
      limitQuery = limit
    }

    // console.log('product.single query', req.query)
    // console.log('product.single params', req.params)
    // console.log('product.single body', req.body)

    const options = {}

    if (select.length) {
      options.projection = functions.stringToObj(select)
    }

    const single = await req.db.product.findOne({
      _id: new ObjectId(id),
      nivel: {
        $in: [1, 2]
      }
    }, options)

    if (single) {
      switch (target) {
        case 'app-single-product' :
        case 'app-prices-update' :
          const prices = single.precos

          const { estado = {}, cidade = {} } = local

          const { _id: uf } = estado
          const { _id: mn } = cidade

          if (!uf || !mn) {
            return res.status(400).send()
          }
        
          let historic = [], 
            menor_preco, 
            count = 0,
            range = {}

          const state_index = prices.findIndex(({ estado_id }) => estado_id === uf)
      
          if (state_index !== -1) {
            const state = prices[state_index]
      
            const region_index = state.cidades.findIndex(({ cidade_id }) => cidade_id === mn)
      
            if (region_index !== -1) {
              const region = state.cidades[region_index]

              count = region.historico.length

              menor_preco = region.historico[0]
              
              range = {
                menor_preco: region.menor_preco,
                maior_preco: region.maior_preco
              }
              
              if (target === 'app-single-product') {

                // (END) REFATORAR PARA UMA UNICA CONSULTA
                const historic_paginaed = region.historico.slice((page * limitQuery) - limitQuery, (page * limitQuery))

                const supermarketsMiddleware = historic_paginaed.map((preco, index) => ({
                  async fn() {
                    const [supermarket] = await req.db.supermarket.aggregate([{
                      $match: {
                        _id: new ObjectId(preco.supermercado_id._id)
                      }
                    }, {
                      $group: {
                        _id: '$_id',
                        doc: { $first: "$$ROOT" }
                      }
                    }, { 
                      $replaceRoot: {
                        newRoot: { $mergeObjects: ['$doc', { produtos: [] }] }
                      }
                    }]).toArray()
                  
                    historic[index] = {
                      ...preco,
                      supermercado_obj: {
                        ...supermarket,
                        produtos: [],
                        _id: 0,
                        api: true,
                        api_id: supermarket._id
                      },
                      // preco_u: preco.preco,
                      // supermercado_id: preco.supermercado_id,
                      // data: preco.data
                    }
                  }
                }))
      
                supermarketsMiddleware.length && await functions.middlewareAsync(...supermarketsMiddleware)
              } else {
                historic = region.historico
              }
            }
          }
          res.status(200).json({ 
            ok: true, data: historic,
            menor_preco, range,
            limit: limitQuery, count
          })
          break
        case 'app-single-product-watch': 
          const getLocale = (precos = []) => {
            const state = precos.find(({ estado_id }) => estado_id === local.estado._id)
        
            if (state) {
              const region = state.cidades.find(({ cidade_id }) => cidade_id === local.cidade._id)
        
              if (region) {
      
                return {
                  menor_preco: region.menor_preco,
                  maior_preco: region.maior_preco
                }
              }
            }
          }

          const data = getLocale(single.precos)

          // console.log('response', data)

          res.status(200).json({ ok: !!data, data })

          break
        default:
          single = functions.setUndefineds({
            data: single,
            undefineds
          })

          res.status(200).json({ ok: true, data: single })
      }

    } else {
      console.log('Produto não aprovado ou interagido')
      res.status(400).send()
    }
			
	} catch(error) {
    console.error(error)
		res.status(500).send()
	}
}

exports.indexBy = async (req, res) => {
	try {

    const { body } = req

    const { page = 1 } = req.params

    let { limit: limitQuery } = req.query

    if (!limitQuery) {
      limitQuery = limit
    }

    // {
    //   where: { 
      //   tipos: [Array], 
      //   nome: '', 
      //   favorito: false ,
      //   observados: false
      // },
    //   push_token: 'expotoken-fake',
    //   ids: []
      // supermercado_id: '',
      // marca_id: '',
    // }

    console.log('product.indexBy', { body: req.body, page, query: req.query, limitQuery })

    const where = {
      request_ids: body.where.ids || [],
      observer_ids: [],
      types_ids: [],
      names_ids: [],
      supermarket_ids: [],
      brand_ids: [],
      favorites_ids: body.where.favoritos || [],
      not_ids: body.ids || []
    }
    const { local } = body

    if (body.where.nome && body.where.nome.length) {

      const regex = new RegExp(functions.keyWord(body.where.nome))

      const products_by_name = await req.db.product.aggregate([
        {
          $match: {
            nome_key: { $regex: regex, $options: 'g' }
          }
        }, {
          $project: {
            _id: 1
          }
        }
      ]).toArray()

        if (products_by_name) {
          products_by_name.forEach(({ _id }) => {
            where.names_ids.push(_id)
          })
        }
    }

    if (body.where.observados) {
      // PEGAR ids DOS PRODUTOS OBSERVADOR POR ESSE push_token E local

      const observer_products = await req.db.watch.aggregate({
        $match: {
          push_token: body.push_token,
          'local.estado.cache_id': {
            $in: [local.estado.cache_id, 0]
          },
          'local.cidade.cache_id': {
            $in: [local.cidade.cache_id, 0]
          }
        }
      }, {
        $project: {
          _id: 0,
          produto_id: 1
        }
      }).toArray()
      
      if (observer_products) {
        observer_products.forEach(({ produto_id }) => {
          where.observer_ids.push(produto_id._id)
        })
      }
    }

    if (typeof body.supermercado_id === 'string' && body.supermercado_id.length) {
      // PEGAR ids DOS PRODUTOS DO SUPERMERCADO

      const products_by_supermarket = await req.db.supermarket.findOne({
        _id: new ObjectId(body.supermercado_id)
      }, {
        projection: {
          produtos: 1
        }
      })

      if (products_by_supermarket) {
        // const newIds = products_by_supermarket.produtos.filter(({
        //   produto_id
        // }) => {
        //   const index = where.ids
        //     .findIndex(_id => String(_id) === String(produto_id._id))

        //   return index === -1
        // }).map(({ produto_id }) => produto_id._id)
        const newIds = products_by_supermarket.produtos
          .map(({ produto_id }) => produto_id._id)

        where.supermarket_ids = newIds
      }
    }

    if (typeof body.marca_id === 'string' && body.marca_id.length) {
      // PEGAR ids DOS PRODUTOS DO MARCA

      const products_by_brand = await req.db.product.aggregate([{
        $match: {
          'marca_id._id': new ObjectId(body.marca_id)
        }
      }, {
        $project: {
          _id: 1
        }
      }]).toArray()

      if (products_by_brand) {
        // const newIds = products_by_brand.filter(({
        //   _id
        // }) => {
        //   const index = where.ids
        //     .findIndex(where_id => String(where_id) === String(_id))

        //   return index === -1
        // }).map(({ _id }) => _id)
        const newIds = products_by_brand.map(({ _id }) => _id)

        where.brand_ids = newIds
      }
    }

    // if (body.ids) {
    //   if (body.ids.length) {
    //     // DEIXANDO SOMENTE ids QUE NAO ESTAO DENTRO DO ARRAY DE body.ids
    //     // console.log('removendo', { selects: where.all_ids, req: body.ids })
    //     where.all_ids = where.all_ids.filter(_id => {
    //       const index = body.ids.findIndex(not_id => String(not_id) === String(_id))
  
    //       return index === -1
    //     })
    //   } else {
    //     // where.ids = []
    //   }
    // }


    if (body.where.tipos && body.where.tipos.length) {
      const product_by_types = await req.db.product.aggregate([{
        $match: {
          'tipo.texto_key': {
            $in: body.where.tipos.map(v => functions.keyWord(v))
          }
        }
      }, {
        $project: {
          _id: 1
        }
      }]).toArray()

      if (product_by_types) {
        // const newIds = product_by_types.filter(({
        //   _id
        // }) => {
        //   const index = where.ids
        //     .findIndex(where_id => String(where_id) === String(_id))

        //   let index2 = -1
        //   if (ids_from_request) {
        //     index2 = ids_from_request
        //       .findIndex(where_id => String(where_id) === String(_id))
        //   }

        //   return index === -1 || index2 !== -1
        // })
        // .map(({ _id }) => _id)

        where.types_ids = product_by_types
          .map(({ _id }) => _id)

        // if (ids_from_request) {
        //   where.ids = newIds
        // } else {
        //   where.ids = [ ...where.ids, ...newIds ]
        // }
      }
    }

    const then = async documents => {
      // let data = [ ...documents ]

      // data = data.map(item => ({
      //   ...item, 
      //   precos: []
      // }))

      // const brandObjMiddleware = data.map(({ sem_marca, marca_id }, index) => ({
      //   async fn() {

      //     if (!sem_marca) {
      //       let brand = await Brand.findById(marca_id._id)

      //       data[index].marca_obj = brand
      //     }
      //   }
      // }))

      // const watchObjMiddleware = data.map(({ _id }, index) => ({
      //   async fn() {

      //     let watch = await Watch.findOne()
      //       .where('produto_id._id', _id)
      //       .populate()
      //       .where('local.estado.cache_id', local.estado.cache_id)
      //       .where('local.cidade.cache_id', local.cidade.cache_id)

      //     if (watch) {       
      //       data[index].notificacao = watch
      //     }

      //   }
      // }))

      // await functions.middlewareAsync(...brandObjMiddleware, ...watchObjMiddleware)

      // data.precos = []

      res.status(200).json({ ok: true, data: documents, limit: limitQuery })
    }

    const _catch = e => {
      console.error(e)
      res.status(500).send()
    }
    
    let ids = [...new Set([
      ...where.names_ids,
      ...where.types_ids,
      ...where.supermarket_ids,
      ...where.observer_ids,
      ...where.brand_ids,
      ...where.favorites_ids,
      ...where.request_ids
    ].map(_id => new ObjectId(_id)))]

    // console.log({ where, ids })

    if (body.where.favoritos) {
      ids = ids.filter(_id => where.favorites_ids.some(w_id => String(w_id) === String(_id)))
    }

    if (body.where.observados) {
      ids = ids.filter(_id => where.observer_ids.some(w_id => String(w_id) === String(_id)))
    }

    if (body.where.tipos && body.where.tipos.length) {
      ids = ids.filter(_id => where.types_ids.some(w_id => String(w_id) === String(_id)))
    }

    if (body.where.nome && body.where.nome.length) {
      ids = ids.filter(_id => where.names_ids.some(w_id => String(w_id) === String(_id)))
    }

    if (typeof body.marca_id === 'string' && body.marca_id.length) {
      ids = ids.filter(_id => where.brand_ids.some(w_id => String(w_id) === String(_id)))
    }

    if (typeof body.supermercado_id === 'string' && body.supermercado_id.length) {
      ids = ids.filter(_id => where.supermarket_ids.some(w_id => String(w_id) === String(_id)))
    }

    // console.log({ ids })

    const filterMatch = {
      _id: {
        $nin: where.not_ids.map(_id => new ObjectId(_id))
      }
    }

    const optionsMatch = {
      nivel: {
        $in: [1, 2]
      }
    }
    
    const optionsDocuments = [{
        $sort: {
          created_at: -1
        }
      }, {
        $lookup: {
          from: 'brand',
          localField: 'marca_id._id',
          foreignField: '_id',
          as: 'marca_obj'
        }
      }, {
        $lookup: {
          from: 'watch',
          localField: '_id',
          foreignField: 'produto_id._id',
          pipeline: [{
            $match: {
              'local.estado.cache_id': {
                $in: [local.estado.cache_id, 0]
              },
              'local.cidade.cache_id': {
                $in: [local.cidade.cache_id, 0]
              }
            }
          }],
          as: 'notificacao'
        }
      }, 
      // (DESC) COMENTEI PRA EVITAR QUE PRODUTOS SEM MARCA E SEM NOTIFICAÇÃO NÃO FOSSEM LISTADOS
      // {
      //   $unwind: '$marca_obj'
      // }, {
      //   $unwind: '$notificacao'
      // }, 
      {
        $group: {
          _id: '$_id',
          doc: { $first: '$$ROOT' }
        }
      }, {
        $replaceRoot: {
          newRoot: { $mergeObjects: ['$doc', { precos: [] }] }
        }
      }
    ]

    const optionsPaginated = [{
      $skip: (limitQuery * page) - limitQuery
    }, {
      $limit: limitQuery 
    }]

    const clean_search = async () => {
      const documents = await req.db.product.aggregate([
        {
          $match: {
            ...optionsMatch,
          }
        },
        ...optionsDocuments,
        ...optionsPaginated
      ]).toArray()

      await then(documents)

      // Product.find()
      //   .populate()
      //   .where('nivel').in([1, 2])
      //   .where('_id').nin(where.not_ids)
      //   .limit(limitQuery)
      //   .skip((limitQuery * page) - limitQuery)
      //   .sort('-created_at')
      //   .then(then)
      //   .catch(_catch)
    }

    const filter_search = async () => {
      const options = {
        $match: {
          ...optionsMatch,
          ...filterMatch
        }
      }

      if (body.no_page) {

        const documents = await req.db.product.aggregate([
          options,
          ...optionsDocuments
        ]).toArray()
  
        await then(documents)
        // Product.find()
        //   .populate()
        //   .where('nivel').in([1, 2])
        //   .where('_id').in(ids)
        //   .where('_id').nin(where.not_ids)
        //   .sort('-created_at')
        //   .then(then)
        //   .catch(_catch)
      } else {
        const documents = await req.db.product.aggregate([
          options,
          ...optionsDocuments,
          ...optionsPaginated
        ]).toArray()
  
        await then(documents)
      }
    }

    
    if (ids.length) {
      await filter_search()
    } else {
      if (
        (
          body.where.favoritos ||
          body.where.observados ||
          body.where.nome.length ||
          body.where.marca_id ||
          body.where.supermercado_id ||
          body.where.ids
        ) && body.where.tipos.length
      ) {
        await filter_search()
      } else {
        await clean_search()
      }
    }

	} catch(error) {
    console.error(error)
		res.status(500).send()
	}

}

exports.update = async (req, res) => {
  // OK

  try {

    const { id } = req.params

    if (typeof id !== 'string')
      throw new Error()

    const { preco } = req.body

    // console.log('product.update ', req.body)
    if (preco) {
      const { 
        estado = {}, cidade = {}, 
        supermercado_id, preco_u,
      } = preco

      const { nome: estado_nome } = estado
      const { nome: cidade_nome } = cidade

      if (functions.hasEmpty({
        estado_nome, cidade_nome, supermercado_id, id
      })) {
        return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
      }
    
      const atualizado = functions.date()

      const supermarket = await req.db.supermarket.findOne({
        _id: new ObjectId(supermercado_id)
      }, { produtos: 1, nome: 1 })

      let products = supermarket.produtos

      // console.log('supermarket.produtos ', products)
      const productIndex = products.findIndex(({ produto_id }) => String(produto_id._id) === String(id))

      if (productIndex !== -1) {
        products[productIndex].preco_u = preco_u 
      } else {
        products = [ ...products, {
          produto_id: {
            _id: new ObjectId(id), cache_id: 0
          },
          preco_u,
          atualizado
        }]
      }

      await req.db.supermarket.updateOne({
        _id: new ObjectId(supermarket._id)
      }, {
        $set: {
          produtos: products
        }
      })

      try {
        // console.log('updatePrices props ', {
        //   _id, 
        //   local: { estado, cidade }, 
        //   supermercado_id, preco_u 
        // })
        await this.updatePrices({
          _id: id, local: { estado, cidade }, 
          supermercado_id, preco_u, db: req.db,
          supermercado_nome: supermarket.nome, moment: atualizado
        })

        res.status(200).json({ ok: true, message: 'Dados atualizados!' })
      } catch(e) {
        console.error(e)
        res.status(500).send()
      }

    } else {
      const data = req.body
      delete data._id
      delete data.marca

      if (data.marca_id) {
        data.marca_id = {
          _id: new ObjectId(data.marca_id._id),
          cache_id: 0
        }

        data.sem_marca = false
      }

      const sem_marca = !(data.marca && data.marca.nome.length)
    
      if (!sem_marca) {
        const marca_nome = data.marca.nome

        let data_marca = await db.brand.findOne({
          nome_key: functions.keyWord(marca_nome)
        }, { projection: { nome: 1 } })

        if (!data_marca) {
          const { insertedId } = await db.brand.insertOne({
            nome: marca_nome,
            nome_key: functions.keyWord(marca_nome)
          })

          data_marca = {
            _id: insertedId
          }

        } 

        data.marca_id = {
          _id: data_marca._id,
          cache_id: 0
        }

        data.sem_marca = sem_marca
      }

      if (data.sabor && data.sabor.nome.length) {
        data.sabor = {
          nome: data.sabor.nome, nome_key: functions.keyWord(data.sabor.nome),
          definido: true
        }
      }

      await req.db.product.updateOne({
        _id: new ObjectId(id)
      }, {
        $set: data
      })

      res.status(200).send()
    }
  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}

exports.updateMany = async (req, res) => {
  try {
    // (END) SEM USO

    const {
      data = [], local, moment, campo, supermercado_id, finished
    } = req.body

    // console.log('updateMany', req.body)

    const updates = data.map(({ produto_id, data }) => ({
      async fn() {
        try {

          if (campo == 'precos') {
            await this.updatePrices({
              _id: produto_id._id,
              local, moment, preco_u: data.preco_u, supermercado_id, finished, db: req.db
            })
          }

        } catch(e) {
          console.error(e)
        }
      }
    }))

    updates.length && await functions.middlewareAsync(...updates)

    res.status(200).json({ ok: true })

  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}

exports.remove = async (req, res) => {
  // OK

  try {

    const { id } = req.params

    if (typeof id !== 'string')
      throw new Error()

    await req.db.product.deleteOne({
      _id: new ObjectId(id)
    })

    res.status(200).send()

  } catch(e) {
    res.status(500).send(e)
  }
}

