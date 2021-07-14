const bcryptjs = require('bcryptjs'),
  { Types } = require('mongoose'),
  remove_accents = require('remove-accents'),
  Product = require('../../../data/Schemas/Product'),
  Brand = require('../../../data/Schemas/Brand'),
  Supermarket = require('../../../data/Schemas/Supermarket'),
  Watch = require('../../../data/Schemas/Watch'),
  functions = require('../../../functions'),
  supermarketControllers = require('./supermarket'),
  productControllers = require('./product'),
  service_email = require('../../../services/email'),
  limit = +process.env.LIMIT_PAGINATION || 10,
  service_email_token = process.env.SERVICE_EMAIL_TOKEN || ''

exports.cacheToAPI = async (req, res) => {
  try {
    const { hash: hash_identify_device = '' } = req.params
    const { cache = {} } = req.body

    if (functions.hasEmpty({
      hash_identify_device
    })) {
      return res.status(400).send()
    }

    const { supermercado, marca, produto, notificacao } = cache

    console.log('Finalizar cache', { hash_identify_device, cache })

    if (produto) {
      
      // COISAS QUE DEVO FAZER
      // - MUDAR O cache_id DO SUPERMERCADO NA ESTRUTURA DE PRECOS DOS PRODUTOS COM ESSE HASH PARA O _id DO SUPERMERCADO JÁ INSERIDO NO BANDO DE DADOS
      // - ADICIONAR O PRODUTOS E VALORES NOS SUPERMERCADOS
      // - VERIFICAR SE DEVO NOTIFICAR ALGUEM

      // const supermarkets = await Supermarket
      //   .find({ hash_identify_device })
      //   .select('produtos _id')

      // const supermarkets_middleware = supermarkets.map(({ produtos = [], _id }) => ({
      //   async fn() {
      //     try {
      //       const new_products = []
  
      //       const products_middleware = produtos.map(product => ({
      //         async fn() {
      //           try {
      //             // console.log('cacheToApi()', { product })

      //             if (product.produto_id._id.length) {
      //               new_products.push({
      //                 ...product._doc,
      //                 produto_id: {
      //                   cache_id: 0,
      //                   _id: product.produto_id._id
      //                 }
      //               })
      //             } else {
      //               const product_data = await Product
      //                 .findOne({ hash_identify_device, cache_id: product.produto_id.cache_id })
      //                 .select('_id')
                      
      //                 if (product_data) {
      //                   new_products.push({
      //                     ...product._doc,
      //                     produto_id: {
      //                       cache_id: 0,
      //                       _id: product_data._id
      //                     }
      //                   })
      //                 } else {
      //                   new_products.push(product._doc)
      //                 }
      //             }
                  
      //           } catch(e) {
      //             console.error(e)
      //           }
      //         }
      //       }))
  
      //       await functions.middlewareAsync(...products_middleware)
    
      //       await Supermarket.findByIdAndUpdate(_id, { produtos: new_products, hash_identify_device: '', cache_id: 0 })
      //     } catch(e) {
      //       console.error(e)
      //     }
      //   }
      // }))

      // await functions.middlewareAsync(...supermarkets_middleware)

      await Product.updateMany({ hash_identify_device }, { hash_identify_device: '', cache_id: 0 })
    }
    
    if (marca) {
      // COISAS QUE DEVO FAZER
      // BUSCAR PRODUTOS NO CACHE E SETAR NO _id NO marca_id._id DELES


      await Brand.updateMany({ hash_identify_device }, { hash_identify_device: '', cache_id: 0 })
    }

    if (supermercado) {
      // COISAS QUE DEVO FAZER
      // PEGAR PRECOS DOS PRODUTOS E SETAR O supermercado_id._id

      // item.precos.estado_id
      // item.precos.cidades.cidade_id.menor_preco.supermercado_id._id
      // item.precos.cidades.cidade_id.maior_preco.supermercado_id._id
      // item.precos.cidades.cidade_id.historico.supermercado_id._id

      await Supermarket.updateMany({ hash_identify_device }, { hash_identify_device: '', cache_id: 0 })
    }

    if (notificacao) {
      await Watch.updateMany({ hash_identify_device }, { hash_identify_device: '', cache_id: 0 })
    }

    res.status(200).json({ ok: true })

  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}

exports.finishShopping = async (req, res) => {
  try {
    const stepProducts = async () => {
      try {
        const props = req.body.products
    
        const {
          data = [], local, moment, campo, supermercado_id, finished
        } = props
    
        // console.log('updateMany', req.body)
    
        const updates = data.map(({ produto_id, data }) => ({
          async fn() {
            try {
    
              if (campo == 'precos') {
                await productControllers.updatePrices({
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
    
      } catch(e) {
        console.error(e)
      }
    }

    const stepSupermarkets = async () => {
      try {
        await supermarketControllers.updateProducts(req.body.supermarkets)
      } catch(e) {
        console.error(e)
      }
    }

    await stepProducts()
    await stepSupermarkets()

    res.status(200).send()

  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}

exports.shopping = async (req, res) => {
  // (END) SEM USO

  try {
    const { 
      descricao, local, produtos, 
      supermercado_id, favorito, data, 
      hash_identify_device = ''
    } = req.body

    // console.log('user.shopping ', req.body)
    // {
    //   _id: 1,
    //   finalizado: false,
    //   descricao: '',
    //   supermercado_id: { cache_id: 3, _id: '6078740082845f0928edf233', status: true },
    //   favorito: false,
    //   valor: '25.5',
    //   api: false,
    //   api_id: '',
    //   data: { dia: 15, mes: 4, ano: 2021, status: true },
    //   status: true,
    //   produtos: [
    //     {
    //       _id: 1,
    //       nome: 'Sorvete',
    //       meu: true,
    //       tipo: [Object],
    //       favorito: false,
    //       presenca: 0,
    //       sabor: [Object],
    //       peso: [Object],
    //       marca_id: [Object],
    //       sem_marca: false,
    //       api: true,
    //       api_id: '607871d482845f0928edf22f',
    //       nome_key: 'sorvete',
    //       status: true,
    //       marca_obj: [Object],
    //       preco_u: '8.5',
    //       quantidade: 3
    //     }
    //   ],
    //   hash_identify_device: '0d364761ffce22681f453850062f984d4481edd75b48d045d2c7edf6238943b0'
    // }
    
    let supermarket = {}
    
    if (supermercado_id._id.length) {
      supermarket = await Supermarket.findById(supermercado_id._id)
    }

    const compra = {
      descricao, local, favorito, data, produtos: [], supermercado_id: {}
    }

    if (supermarket && supermarket._doc) {
      compra.supermercado_id._id = supermarket._doc._id
    } else {
      compra.supermercado_id.cache_id = supermercado_id.cache_id
    }

    const productsMiddleware = produtos.map(({ api_id, quantidade, preco_u }) => ({
      async fn() {
        try {
          let product = await Product.findById(api_id)

          if (product) {
            const produto_rest = {}

            if (typeof produto_id === 'number') {
              produto_rest.cache_id = produto_id
            }

            compra.produtos.push({
              produto_id: {
                _id: product._doc._id, ...produto_rest
              },
              quantidade, preco_u
            })
          } else {
            compra.produtos.push({
              produto_id: {
                cache_id: produto_id
              },
              quantidade, preco_u
            })
          }

        } catch(e) {
          console.error(e)
        }
      }
    }))

    await functions.middlewareAsync(...productsMiddleware) 

    // const { compras: shoppings } = await User.findById(req._id).select('compras')

    // console.log('user.shopping - compra', compra)

    // const { compras } = await User.findByIdAndUpdate(req._id, { compras: [compra, ...shoppings] }, { new: true }).select('compras')
    
    res.status(200).json({ ok: true, data: '_id provisorio' })

  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}
