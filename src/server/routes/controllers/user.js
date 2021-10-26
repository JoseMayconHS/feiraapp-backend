const functions = require('../../../functions'),
  supermarketControllers = require('./supermarket'),
  productControllers = require('./product')

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

  // console.log('Finalizar cache', { hash_identify_device, cache })

    if (produto) {
      
      // COISAS QUE DEVO FAZER
      // - MUDAR O cache_id DO SUPERMERCADO NA ESTRUTURA DE PRECOS DOS PRODUTOS COM ESSE HASH PARA O _id DO SUPERMERCADO JÁ INSERIDO NO BANDO DE DADOS
      // - ADICIONAR O PRODUTOS E VALORES NOS SUPERMERCADOS
      // - VERIFICAR SE DEVO NOTIFICAR ALGUEM

      await req.db.product.updateMany({ hash_identify_device }, {
        $set: {
          hash_identify_device: '', cache_id: 0
        }
      })

    }
    
    if (marca) {
      // COISAS QUE DEVO FAZER
      // BUSCAR PRODUTOS NO CACHE E SETAR NO _id NO marca_id._id DELES


      await req.db.brand.updateMany({ hash_identify_device }, {
        $set: {
          hash_identify_device: '', cache_id: 0
        }
      })
    }

    if (supermercado) {
      // COISAS QUE DEVO FAZER
      // PEGAR PRECOS DOS PRODUTOS E SETAR O supermercado_id._id

      // item.precos.estado_id
      // item.precos.cidades.cidade_id.menor_preco.supermercado_id._id
      // item.precos.cidades.cidade_id.maior_preco.supermercado_id._id
      // item.precos.cidades.cidade_id.historico.supermercado_id._id

      await req.db.supermarket.updateMany({ hash_identify_device }, {
        $set: {
          hash_identify_device: '', cache_id: 0
        }
      })
    }

    if (notificacao) {
      await req.db.watch.updateMany({ hash_identify_device }, {
        $set: {
          hash_identify_device: '', cache_id: 0
        }
      })
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
                  local, moment, preco_u: data.preco_u, supermercado_id, 
                  finished, db: req.db, push_token: req.body.push_token
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
        await supermarketControllers.updateProducts({
          ...req.body.supermarkets,
          db: req.db
        })
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
