const remove_accents = require('remove-accents'),
  Product = require('../../../data/Schemas/Product'),
  Watch = require('../../../data/Schemas/Watch'),
  Brand = require('../../../data/Schemas/Brand'),
  Supermarket = require('../../../data/Schemas/Supermarket'),
  functions = require('../../../functions'),
  limit = +process.env.LIMIT_PAGINATION || 10

function updatePrices({ 
  _id, local = {}, supermercado_id, preco_u, moment,
  finished
}) {
  return new Promise((resolve, reject) => {
    Product.findById(_id)
      .select('precos presenca')
      .then(product => {
        const { estado, municipio } = local

        // (XD) ERRO
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
      peso = {}, nome, sabor, tipo, favorito, sem_marca,
      marca: { 
        nome: marca_nome
      },
      marca_id: marca = {},
    } = req.body

    const body = {
      peso: { tipo: 'unidade', valor: '1', force_down: false },
      favorito: true,
      nome: 'Barbeador',
      meu: true,
      sem_marca: false,
      sabor: { definido: true, nome: 'Chocolate' },
      tipo: { texto: 'Lanche', texto_key: 'lanche' },
      nome_key: 'barbeador',
      marca_id: { _id: '', cache_id: 1 },
      marca: { nome: 'Vale' }
    }

    console.log('product.store ', req.body)

    const { tipo: peso_tipo } = peso

    const checkEmpty = {
      nome, tipo, peso_tipo
    }

    if (!sem_marca) {
      checkEmpty.marca_nome = marca_nome
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

      if (marca_id.length) {
  
        brand = await Brand.findById(marca_id)
    
        if (brand) {
          criar = false
        } 
      } 
  
      if (criar) {
        data_marca = await Brand.create({
          nome: marca_nome
        })
      } else {
        data_marca = brand
      }
    }

    const data = {
      nome, favorito, tipo, peso, sem_marca
    }

    if (sabor.definido) {
      data.sabor = sabor
    }

    if (!sem_marca) {
      data.marca_id = {
        _id: data_marca._doc._id,
        cache_id: marca.cache_id
      }
    }

    const data_produto = await Product.create(data)

    res.status(201).json({ ok: true, data: data_produto._doc })

  } catch(err) {
    console.log(err)
    res.status(500).send()
  }
}

exports.saveFromCache = async (req, res) => {
  try {
    // const { 
    //   favorito,
    //   fixado,
    //   marca_id = {},
    //   peso = {},
    //   preco_u,
    //   produto_nome,
    //   tipo,
    //   local = {},
    //   supermercado_id,
    //   cache,
    // } = req.body

    // const body = {
    //   peso: { tipo: 'unidade', valor: '1', force_down: false },
    //   favorito: true,
    //   nome: 'Barbeador',
    //   meu: true,
    //   sem_marca: false,
    //   tipo: { texto: 'Lanche', texto_key: 'lanche' },
    //   precos: [ { estado_id: 12, municipios: [Array] } ],
    //   nome_key: 'barbeador',
    //   marca_id: { _id: '', cache_id: 1 }
    // }

    // console.log('product.store ', req.body)

    // const { 
    //   _id: marca_id, 
    //   cache_id: marca_cache_id
    // } = marca_id
    // const { tipo: peso_tipo } = peso
    // const { estado = {}, municipio = {} } = local

    // const { id: estado_id, nome: estado_nome, sigla: estado_sigla } = estado
    // const { id: municipio_id, nome: municipio_nome } = municipio

    // const checkEmpty = {
    //   produto_nome, tipo, marca_nome, peso_tipo
    // }

    // if (functions.hasEmpty(checkEmpty)) {
    //   return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
    // }

    // let data_marca = false

    // let cache_id = 0
    // let hash_identify_device = ''
    // let supermercado_cache_id = ''

    // if (cache) {
    //   cache_id = req.body.id
    //   hash_identify_device = req.body.hash_identify_device
    //   supermercado_cache_id = supermercado_id
    // }

    // let criar = true
    // let brand = false

    // if ((cache && marca_id_cache) || !marca_id) {

    //   if (cache) {
    //     brand = await Brand.findById(marca_id_cache)

    //     if (brand) {
    //       criar = false
    //     }
    //   } 

      
    // } else if (marca_id) {
    //   brand = await Brand.findById(String(marca_id))
      
    //   if (brand) {
    //     criar = false
    //   }
    // }

    // if (criar) {
    //   data_marca = await Brand.create({
    //     nome: marca_nome,
    //     nome_key: marca_nome.toLowerCase(),
    //     descricao: marca_descricao,
    //     hash_identify_device
    //   })
    // } else {
    //   data_marca = brand
    // }

    // const precos = Object.values(local).length ? [{
    //   estado_id,
    //   nome: estado_nome,
    //   sigla: estado_sigla,
    //   municipios: [{
    //     nome: municipio_nome,
    //     municipio_id,
    //     menor_preco: {
    //       supermercado_id,
    //       preco: preco_u
    //     },
    //     maior_preco: {
    //       supermercado_id: '',
    //       preco: '0'
    //     }
    //   }]
    // }] : []

    // const marca_obj = {
    //   marca_id: data_marca._doc._id,
    //   nome: marca_nome
    // }

    // const data = {
    //   nome: produto_nome, nome_key: remove_accents(produto_nome).toLocaleLowerCase(),
    //   favorito, fixado, precos, marca: marca_obj, tipo, peso, 
    //   cache_id, hash_identify_device, supermercado_cache_id
    // }

    // const data_produto = await Product.create(data)

    // const user = await User.findById(user_id).select('produtos')

    // const user_products = [ {
    //   _id: data_produto._doc._id
    // }, ...user.produtos ]

    // await User.updateOne({ _id: user_id }, { produtos: user_products })

    // if (!cache) {
    //   if (supermercado_id) {
    //     Supermarket
    //       .findById(supermercado_id)
    //       .select('produtos')
    //       .then(supermarket => {
    
    //         let products = [ ...supermarket.produtos ]
    
    //         const productIndex = products.findIndex(({ produto_id }) => produto_id === String(data_produto._doc._id))
    
    //         if (productIndex !== -1) {
    //           products[productIndex] = {
    //             ...products[productIndex],
    //             preco: preco_u
    //           }
    //         } else {
    //           products = [ ...products, {
    //             produto_id: data_produto._doc._id,
    //             preco: preco_u
    //           }]
    //         }
    
    //         Supermarket.findByIdAndUpdate(supermercado_id, {
    //           produtos: products
    //         })
    //       })
    //       .catch(console.error)
    //       .finally(() => {
    //         res.status(201).json({ ok: true, data: data_produto._doc })
    //       })
    //   } else {
    //     res.status(201).json({ ok: true, data: data_produto._doc })
    //   }
    // } else {
    //   res.status(201).json({ ok: true, data: data_produto._doc })
    // }
  } catch(e) {
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
      local
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
            
              let historic = []
  
              const state_index = prices.findIndex(({ estado_id }) => estado_id === uf)
          
              if (state_index !== -1) {
                const state = prices[state_index]
          
                const region_index = state.municipios.findIndex(({ municipio_id }) => municipio_id === mn)
          
                if (region_index !== -1) {
                  const region = state.municipios[region_index]

                  const historic_paginaed = region.historico.slice((page * limitQuery) - limitQuery, (page * limitQuery))
          
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
                ok: true, data: historic,
                limit: limitQuery, count: historic.length
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
              res.status(200).json({ ok: true, data: single })
          }
  
        } else {
          res.status(400).send()
        }

      })
      .catch(e => {
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
      favorito: body.where.favorito,
      ids: [],
      not_ids: body.ids || []
    }
    const { local, where: { ids: products_by_shopping }} = body

    if (body.where.nome && body.where.nome.length) {

      const regex = new RegExp(remove_accents(body.where.nome) .toLocaleLowerCase())

      const products_by_name = await Product
        .find({ nome_key: { $regex: regex, $options: 'g' } })
        .select('_id')

        if (products_by_name) {
          products_by_name.forEach(({ _id }) => {
            where.ids.push(_id)
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
      
      console.log({ observer_products })

      if (observer_products) {
        observer_products.forEach(({ produto_id }) => {
          where.ids.push(produto_id._id)
        })
      }
    }

    if (typeof body.supermercado_id === 'string' && body.supermercado_id.length) {
      // PEGAR ids DOS PRODUTOS DO SUPERMERCADO

      const products_by_supermarket = await Supermarket.findById(body.supermercado_id)
        .select('produtos')

      if (products_by_supermarket) {
        const newIds = products_by_supermarket.produtos.filter(({
          produto_id
        }) => {
          const index = where.ids
            .findIndex(_id => String(_id) === String(produto_id._id))

          return index === -1
        }).map(({ produto_id }) => produto_id._id)

        where.ids = [ ...where.ids, ...newIds ]
      }
    }

    if (body.ids && body.ids.length) {
      // DEIXANDO SOMENTE ids QUE NAO ESTAO DENTRO DO ARRAY DE body.ids
      console.log('removendo', { selects: where.ids, req: body.ids })
      where.ids = where.ids.filter(_id => {
        const index = body.ids.findIndex(not_id => String(not_id) === String(_id))

        return index === -1
      })
    }

    if (typeof body.marca_id === 'string' && body.marca_id.length) {
      // PEGAR ids DOS PRODUTOS DO MARCA

      const products_by_brand = await Product
        .find()
        .where('marca_id._id', body.marca_id)
        .select('_id')

      if (products_by_brand) {
        const newIds = products_by_brand.filter(({
          _id
        }) => {
          const index = where.ids
            .findIndex(where_id => String(where_id) === String(_id))

          return index === -1
        }).map(({ _id }) => _id)

        where.ids = [ ...where.ids, ...newIds ]
      }
    }

    if (body.where.tipos && body.where.tipos.length) {
      const product_by_types = await Product
        .find()
        .where('tipo.texto_key').in(body.where.tipos)
        .select('_id')

      if (product_by_types) {
        const newIds = product_by_types.filter(({
          _id
        }) => {
          const index = where.ids
            .findIndex(where_id => String(where_id) === String(_id))

          return index === -1
        }).map(({ _id }) => _id)

        where.ids = [ ...where.ids, ...newIds ]
      }
    }

    const then = async Documents => {
      let data = [ ...Documents ]

      data = data.map(item => ({
        ...item._doc,
        // precos: undefined,
        // api_id: item._doc._id,
        // api: true,
        // _id: 0,
        // blocked: true
      }))


      const brandObjMiddleware = data.map(({ sem_marca, marca_id }, index) => ({
        async fn() {

          if (!sem_marca) {
            let brand = await Brand.findById(marca_id._id)

            // brand = {
            //   ...brand._doc,
            //   api_id: brand._doc._id,
            //   api: true,
            //   _id: 0
            // }

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
            // watch = {
            //   ...watch._doc,
            //   local: {
            //     estado: {
            //       ...watch._doc.local.estado,
            //       _id: watch._doc.local.estado.cache_id,
            //     },
            //     municipio: {
            //       ...watch._doc.local.municipio,
            //       _id: watch._doc.local.municipio.cache_id,
            //     }
            //   },
            //   api_id: watch._doc._id,
            //   api: true,
            //   _id: 0
            // }
        
            data[index].notificacao = watch
          }


        }
      }))

      await functions.middlewareAsync(...brandObjMiddleware, ...watchObjMiddleware)

      res.status(200).json({ ok: true, data })
    }

    const _catch = e => {
      console.error(e)
      res.status(500).send()
    }

    if (
      !products_by_shopping 
      && (body.where.tipos && !body.where.tipos.length) 
      && !where.ids.length && !body.where.observados
      ) {
      Product.find()
        .populate()
        .where('status', true)
        .where('favorito', !!where.favorito)
        .where('_id').nin(where.not_ids)
        .limit(limitQuery)
        .skip((limitQuery * page) - limitQuery)
        .sort('-created_at')
        .then(then)
        .catch(_catch)
    } else {
      if (products_by_shopping) {
        Product.find()
          .populate()
          .where('status', true)
          .where('_id').in(products_by_shopping)
          .where('_id').nin(where.not_ids)
          .sort('-created_at')
          .then(then)
          .catch(_catch)
      } else {
        Product.find()
          .populate()
          .where('status', true)
          .where('favorito', !!where.favorito)
          .where('_id').in(where.ids)
          .where('_id').nin(where.not_ids)
          .limit(limitQuery)
          .skip((limitQuery * page) - limitQuery)
          .sort('-created_at')
          .then(then)
          .catch(_catch)
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
                estado, municipio, 
                supermercado_id, preco_u 
              })
              await updatePrices({
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



  } catch(e) {
    res.status(500).send(e)
  }
}

