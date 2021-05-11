const remove_accents = require('remove-accents'),
  Product = require('../../../data/Schemas/Product'),
  Watch = require('../../../data/Schemas/Watch'),
  Brand = require('../../../data/Schemas/Brand'),
  Supermarket = require('../../../data/Schemas/Supermarket'),
  functions = require('../../../functions'),
  pushNotificationControllers = require('./pushNotification'),
  limit = +process.env.LIMIT_PAGINATION || 10

exports.save = async ({ 
    data, hash_identify_device = '', local
  }) => {
  try {

    const { 
      peso = {}, nome, sabor, tipo, sem_marca,
      marca: marca_obj,
      marca_id: marca = {},
      cache_id = 0, precos = [], status
    } = data

    // console.log('product.save ', data)

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

    let criar = !sem_marca
    
    let data_marca = false
    if (!sem_marca) {
      let brand = false

      const { 
        _id: marca_id
      } = marca

      if (marca_id && marca_id.length) {
  
        brand = await Brand.findById(marca_id)
    
        if (brand) {
          criar = false
        } 
      } 
  
      if (criar) {
        if (marca_obj) {
          data_marca = await Brand.findOne({
            nome_key: functions.keyWord(marca_obj.nome)
          })

          if (!data_marca) {
            data_marca = await Brand.create({
              nome: marca_obj.nome
            })
          }

        }
      } else {
        data_marca = brand
      }
    }

    const item = {
      nome, tipo, peso, sem_marca, cache_id, hash_identify_device, precos, status
    }

    if (sabor.definido) {
      item.sabor = sabor
    }

    if (!sem_marca) {
      item.marca_id = {
        _id: data_marca ? data_marca._doc._id : '',
        cache_id: 0
      }
    }

    const alreadyExists = async () => {
      let response
      try {
        const already = await Product.findOne({ nome_key: functions.keyWord(item.nome) })

        if (already) {
          const { _doc } = already

          const verifyType = () => {
            return (functions.keyWord(item.tipo.texto) === _doc.tipo.texto_key)
          }

          const verifyWeight = () => {
            if (item.peso.tipo === _doc.peso.tipo) {
              if (item.peso.valor === _doc.peso.valor && item.peso.force_down === _doc.peso.force_down) {
                return true
              }
            }

            return false
          }

          const verifyBrand = () => {
            return String(item.marca_id._id) === String(_doc.marca_id._id)
          }

          if (item.marca_id) {
            if (verifyBrand()) {
              if (verifyWeight()) {
                if (verifyType()) {
                  response = _doc
                }
              }
            }
          } else {
            if (_doc.sem_marca) {
              if (verifyType()) {
                if (verifyWeight()) {
                  response = _doc
                }
              }
            }
          }

        }

      } catch(e) {
        console.error('product.alreadyExists()', e)
      } finally {
        return response
      }
    }

    let response = await alreadyExists() 

    if (response) {
      // console.log('item.precos', item.precos)
      if (item.precos.length) {
        // console.log('item.precos.municipios', item.precos[0].municipios)
        // console.log('item.precos.municipios.historico', item.precos[0].municipios[0].historico)
        await this._update({
          data: item, local, mongo_data: response
        })
      }

      const { _doc: new_doc } = await Product.findByIdAndUpdate(response._id, { cache_id, hash_identify_device }, { new: true })

      return { ...new_doc, cache_id }
    } else {
      const { _doc } = await Product.create(item)

      return _doc
    }

  } catch(err) {
    console.log(err)
    return
  }
}

exports._update = async ({
  data, hash_identify_device = '', local, mongo_data
}) => {
  try {
    console.log('product._update', { data, local, mongo_data })
    let response = data

    if (!mongo_data) {
      const { _doc } = await Product.findById(data.api_id)

      mongo_data = _doc
    }

    if (mongo_data) {
    
      const mongo_precos = mongo_data.precos
      const precos = data.precos

      // console.log('product._update()', { mongo_precos, precos })
    
      const mongo_state_index = mongo_precos.findIndex(preco => preco.estado_id === local.estado._id)
      const state_index = precos.findIndex(preco => preco.estado_id === local.estado._id)
  
      if (mongo_state_index !== -1 && state_index !== -1) {
        const state = mongo_precos[mongo_state_index]
  
        const mongo_region_index = mongo_precos[mongo_state_index].municipios.findIndex(({ municipio_id }) => municipio_id === local.municipio._id)
        const region_index = precos[state_index].municipios.findIndex(({ municipio_id }) => municipio_id === local.municipio._id)
  
        if (mongo_region_index !== -1 && region_index !== -1) {
          const mongo_price = mongo_precos[mongo_state_index].municipios[mongo_region_index]
          const price = precos[state_index].municipios[region_index]
  
          // (EX) SE ESTA FUNCIONANDO SERTO
          // console.log('historico antes')
          console.log([...price.historico, ...mongo_price.historico])
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

          // console.log('historico depois')
          // console.log(price.historico)

          
          // console.log('antes', { mongo_price, price })
          
          if (
            (+mongo_price.menor_preco.preco === 0) || 
            (+price.menor_preco.preco < +mongo_price.menor_preco.preco)
          ) {
            if (+mongo_price.maior_preco.preco === 0) {
              // @ts-ignore
              mongo_price.maior_preco.preco = mongo_price.menor_preco.preco
              // @ts-ignore
              mongo_price.maior_preco.supermercado_id = mongo_price.menor_preco.supermercado_id
            }

            mongo_price.menor_preco.preco = price.menor_preco.preco
            mongo_price.menor_preco.supermercado_id = price.menor_preco.supermercado_id
          } else if (
            (+mongo_price.maior_preco.preco === 0) || 
            (+price.maior_preco.preco > +mongo_price.maior_preco.preco) ||
            (+price.menor_preco.preco > +mongo_price.maior_preco.preco)
          ) {
            if (price.maior_preco.supermercado_id) {
              mongo_price.maior_preco.preco = price.maior_preco.preco
              mongo_price.maior_preco.supermercado_id = price.maior_preco.supermercado_id
            } else {
              mongo_price.maior_preco.preco = price.menor_preco.preco
              mongo_price.maior_preco.supermercado_id = price.menor_preco.supermercado_id
            }
          }

          mongo_price.historico = price.historico

          // console.log('depois', { mongo_price, price })
  
          const municipios = mongo_precos[mongo_state_index].municipios
  
          municipios.splice(mongo_region_index, 1, mongo_price)
  
          mongo_precos[mongo_state_index].municipios = municipios
        } else {
          // SE NAO TIVER ESSE MUNICIPIO

          if (region_index !== -1) {
            const price = precos[state_index].municipios[region_index]
    
            const _result = {
              municipio_id: local.municipio._id,
              menor_preco: price.menor_preco,
              maior_preco: price.maior_preco || { preco: '0' },
              historico: price.historico || []
            }
    
            state.municipios.push(_result)
    
            mongo_precos.splice(mongo_state_index, 1, state)
          }
  
        }
      } else {
        // SE NAO TIVER ESSE ESTADO

        if (state_index !== -1) {
          const region_index = precos[state_index].municipios.findIndex(({ municipio_id }) => municipio_id === local.municipio._id)

          if (region_index !== -1) {
            const price = precos[state_index].municipios[region_index]
  
            const _result = {
              estado_id: local.estado._id,
              municipios: [{
                municipio_id: local.municipio._id,
                menor_preco: price.menor_preco,
                maior_preco: price.maior_preco || { preco: '0' },
                historico: price.historico || []
              }]
            }
      
            mongo_precos.push(_result)
          }

        }
  
      }

      // console.log('product._update end', { mongo_precos })

      const { _doc } = await Product
        .findByIdAndUpdate(
          mongo_data ? mongo_data._id : data.api_id, 
          { precos: mongo_precos }, 
          { new: true }
        )

      response = _doc
    }

    // (END) ATUALIZAR OS PRECOS

    return response

  } catch(e) {
    console.error(e)
    return data
  }
}

function updatePrices({ 
  _id, local = {}, supermercado_id, preco_u, moment,
  finished
}) {
  return new Promise((resolve, reject) => {
    Product.findById(_id)
      .select('precos presenca')
      .then(product => {
        const { estado, municipio } = local

        const prices = [ ...product.precos ]
        
        let newPrices = []

        if (!moment) {
          const _d = new Date()
    
          moment = {
            dia: _d.getDate(),
            mes: _d.getMonth() + 1,
            ano: _d.getFullYear()
          }
        }

        const historico = {
          data: moment,
          preco: preco_u,
          supermercado_id
        }
     
        const state_index = prices.findIndex(preco => preco.estado_id === estado._id)

        if (state_index !== -1) {
          const state = prices[state_index]

          const region_index = prices[state_index].municipios.findIndex(({ municipio_id }) => municipio_id === municipio._id)

          if (region_index !== -1) {
            const price = prices[state_index].municipios[region_index]

            price.historico = [historico, ...price.historico]

            if ((+price.menor_preco.preco === 0) || (+price.menor_preco.preco > +preco_u)) {
              if (+price.maior_preco.preco === 0) {
                // @ts-ignore
                price.maior_preco.preco = price.menor_preco.preco
                // @ts-ignore
                price.maior_preco.supermercado_id = price.menor_preco.supermercado_id
              }

              price.menor_preco.preco = preco_u
              price.menor_preco.supermercado_id = supermercado_id

              // @ts-ignore
            } else if ((+price.maior_preco.preco === 0) || (+price.maior_preco.preco < +preco_u)) {
              // @ts-ignore
              price.maior_preco.preco = preco_u
              // @ts-ignore
              price.maior_preco.supermercado_id = supermercado_id
            }

            const municipios = prices[state_index].municipios

            municipios.splice(region_index, 1, price)

            prices[state_index].municipios = municipios
          } else {
            // SE NAO TIVER ESSE MUNICIPIO

            const menor_preco = {
              preco: preco_u,
              supermercado_id
            }

            const _result = {
              municipio_id: municipio._id,
              menor_preco,
              maior_preco: { preco: '0' },
              historico: [historico]
            }

            state.municipios.push(_result)

            prices.splice(state_index, 1, state)
          }
        } else {
          // SE NAO TIVER ESSE ESTADO

          const _result = {
            estado_id: estado._id,
            municipios: [{
              municipio_id: municipio._id,
              menor_preco: {
                preco: preco_u,
                supermercado_id
              },
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
          data_update.presenca = product.presenca + 1
        }
        
        console.log('updatePrices ', data_update.precos)

        Product
          .updateOne({ _id }, data_update)
          .then(async () => {
            await pushNotificationControllers
              .notify({ 
                _id, preco: preco_u, local, supermercado_id, moment
              })
          })
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
      hash_identify_device = ''
    } = req.body

    console.log('product.store ', req.body)

    const data = await save({
      data: req.body, hash_identify_device
    })

    res.status(201).json({ ok: !!data, data })

  } catch(err) {
    console.log(err)
    res.status(500).send()
  }
}

exports.index = (req, res) => {
  // OK

  try {

    Product.countDocuments((err, count) => {
      if (err) {
        res.status(500).send()
      } else {
        const { page = 1 } = req.params

        let {
          limit: limitQuery
        } = req.query

        if (!limitQuery) {
          limitQuery = limit
        }

        Product.find()
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
    let { id: _id, page = 1 } = req.params
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

    console.log('product.single query', req.query)
    console.log('product.single params', req.params)
    console.log('product.single body', req.body)

    Product.findById(_id)
      .select(select)
      .then(async single => {

        if (single) {
          switch (target) {
            case 'app-single-product':
              const prices = single._doc
                .precos

              const { estado = {}, municipio = {} } = local

              const { _id: uf } = estado
              const { _id: mn } = municipio

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
          
                const region_index = state.municipios.findIndex(({ municipio_id }) => municipio_id === mn)
          
                if (region_index !== -1) {
                  const region = state.municipios[region_index]

                  count = region.historico.length

                  const historic_paginaed = region.historico.slice((page * limitQuery) - limitQuery, (page * limitQuery))
                  
                  menor_preco = region.historico[0]

                  range = {
                    menor_preco: region.menor_preco,
                    maior_preco: region.maior_preco
                  }

                  const supermarketsMiddleware = historic_paginaed.map(preco => ({
                    async fn() {
                      const supermarket = await Supermarket.findById(preco.supermercado_id._id)
                    
                      historic.push({
                        ...preco._doc,
                        supermercado_obj: {
                          ...supermarket._doc,
                          produtos: [],
                          _id: 0,
                          api: true,
                          api_id: supermarket._doc._id
                        },
                        // preco: preco.preco,
                        // supermercado_id: preco.supermercado_id,
                        // data: preco.data
                      })
                    }
                  }))
        
                  supermarketsMiddleware.length && await functions.middlewareAsync(...supermarketsMiddleware)
                }
              }
              res.status(200).json({ 
                ok: true, data: historic, menor_preco, range,
                limit: limitQuery, count
              })
              break
            case 'app-single-product-watch': 
              const getLocale = (precos = []) => {
                const state = precos.find(({ estado_id }) => estado_id === local.estado._id)
            
                if (state) {
                  const region = state.municipios.find(({ municipio_id }) => municipio_id === local.municipio._id)
            
                  if (region) {
          
                    return {
                      menor_preco: region.menor_preco,
                      maior_preco: region.maior_preco
                    }
                  }
                }
              }

              const data = getLocale(single.precos)

              console.log('response', data)

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
          res.status(400).send()
        }

      })
      .catch(e => {
        console.error(e)
        res.status(500).send()
      })
			
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

    console.log('product.indexBy', { body: req.body, page })

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

      const regex = new RegExp(remove_accents(body.where.nome).toLocaleLowerCase())

      const products_by_name = await Product
        .find({ nome_key: { $regex: regex, $options: 'g' } })
        .select('_id')

        if (products_by_name) {
          products_by_name.forEach(({ _id }) => {
            where.names_ids.push(String(_id))
          })
        }
    }

    if (body.where.observados) {
      // PEGAR ids DOS PRODUTOS OBSERVADOR POR ESSE push_token E local

      const observer_products = await Watch
        .find({ push_token: body.push_token })
        .populate()
        .where('local.estado.cache_id', local.estado.cache_id)
        .where('local.municipio.cache_id', local.municipio.cache_id)
      
      if (observer_products) {
        observer_products.forEach(({ produto_id }) => {
          where.observer_ids.push(produto_id._id)
        })
      }
    }

    if (typeof body.supermercado_id === 'string' && body.supermercado_id.length) {
      // PEGAR ids DOS PRODUTOS DO SUPERMERCADO

      const products_by_supermarket = await Supermarket.findById(body.supermercado_id)
        .select('produtos')

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

      const products_by_brand = await Product
        .find()
        .where('marca_id._id', body.marca_id)
        .select('_id')

      if (products_by_brand) {
        // const newIds = products_by_brand.filter(({
        //   _id
        // }) => {
        //   const index = where.ids
        //     .findIndex(where_id => String(where_id) === String(_id))

        //   return index === -1
        // }).map(({ _id }) => _id)
        const newIds = products_by_brand.map(({ _id }) => String(_id))

        where.brand_ids = newIds
      }
    }

    // if (body.ids) {
    //   if (body.ids.length) {
    //     // DEIXANDO SOMENTE ids QUE NAO ESTAO DENTRO DO ARRAY DE body.ids
    //     console.log('removendo', { selects: where.all_ids, req: body.ids })
    //     where.all_ids = where.all_ids.filter(_id => {
    //       const index = body.ids.findIndex(not_id => String(not_id) === String(_id))
  
    //       return index === -1
    //     })
    //   } else {
    //     // where.ids = []
    //   }
    // }


    if (body.where.tipos && body.where.tipos.length) {
      const product_by_types = await Product
        .find()
        .where('tipo.texto_key').in(body.where.tipos)
        .select('_id')

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
        const newIds = product_by_types
          .map(({ _id }) => String(_id))

        where.types_ids = newIds

        // if (ids_from_request) {
        //   where.ids = newIds
        // } else {
        //   where.ids = [ ...where.ids, ...newIds ]
        // }
      }
    }

    const then = async Documents => {
      let data = [ ...Documents ]

      data = data.map(item => ({
        ...item._doc
      }))

      const brandObjMiddleware = data.map(({ sem_marca, marca_id }, index) => ({
        async fn() {

          if (!sem_marca) {
            let brand = await Brand.findById(marca_id._id)

            data[index].marca_obj = brand
          }
        }
      }))

      const watchObjMiddleware = data.map(({ _id }, index) => ({
        async fn() {

          let watch = await Watch.findOne()
            .where('produto_id._id', _id)
            .populate()
            .where('local.estado.cache_id', local.estado.cache_id)
            .where('local.municipio.cache_id', local.municipio.cache_id)

          if (watch) {       
            data[index].notificacao = watch
          }

        }
      }))

      await functions.middlewareAsync(...brandObjMiddleware, ...watchObjMiddleware)

      data.precos = []

      res.status(200).json({ ok: true, data, limit: limitQuery })
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
    ])]

    console.log({ where, ids })

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

    console.log({ ids })

    const clean_search = () => {
      Product.find()
        .populate()
        .where('status', true)
        .where('_id').nin(where.not_ids)
        .limit(limitQuery)
        .skip((limitQuery * page) - limitQuery)
        .sort('-created_at')
        .then(then)
        .catch(_catch)
    }

    const filter_search = () => {
      Product.find()
        .populate()
        .where('status', true)
        .where('_id').in(ids)
        .where('_id').nin(where.not_ids)
        .limit(limitQuery)
        .skip((limitQuery * page) - limitQuery)
        .sort('-created_at')
        .then(then)
        .catch(_catch)
    }

    
    if (ids.length) {
      filter_search()
    } else {
      if (
        body.where.favoritos ||
        body.where.observados ||
        body.where.nome.length ||
        body.where.tipos.length ||
        body.where.marca_id ||
        body.where.supermercado_id ||
        body.where.ids
      ) {
        filter_search()
      } else {
        clean_search()
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

    if (typeof _id !== 'string')
      throw new Error()

    const { preco } = req.body

    console.log('product.update ', req.body)
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
        .findOne({ _id: supermercado_id })
        .select('produtos')
        .then(supermarket => {

          console.log({ supermarket })

          let products = supermarket.produtos

          console.log('supermarket.produtos ', products)
          const productIndex = products.findIndex(({ produto_id }) => produto_id === _id)

          if (productIndex !== -1) {
            products[productIndex].preco = preco_u 
          } else {
            products = [ ...products, {
              produto_id: _id,
              preco: preco_u
            }]
          }


          Supermarket.findByIdAndUpdate(supermarket._id, {
            produtos: products
          })
          .then(async () => {
            try {
              console.log('updatePrices props ', {
                _id, 
                local: { estado, municipio }, 
                supermercado_id, preco_u 
              })
              await updatePrices({
                _id, local: { estado, municipio }, 
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
    } else {
      Product.findOneAndUpdate({
        _id
      }, req.body)
      .then(() => res.status(200).send())
      .catch(() => res.status(400).send())
    }
  } catch(e) {
    res.status(500).send()
  }
}

exports.updateMany = async (req, res) => {
  try {

    const {
      data = [], local, moment, campo, supermercado_id, finished
    } = req.body

    console.log('updateMany', req.body)

    const updates = data.map(({ produto_id, data }) => ({
      async fn() {
        try {

          if (campo == 'precos') {
            await updatePrices({
              _id: produto_id._id,
              local, moment, preco_u: data.preco_u, supermercado_id, finished
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

    await updatePrices({ 
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

      Product.findByIdAndDelete(_id)
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

