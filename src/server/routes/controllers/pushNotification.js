const { ObjectId } = require('mongodb'),
  functions = require('../../../functions'),
  firebase = require('../../../services/firebase')

exports.notify = async ({ 
  _id, preco_u, local, supermercado_id, moment, db,
  produto_nome = '', produto_sabor = '', produto_peso = '', 
  supermercado_nome = ''
}) => {
  try {
    // (END) VERIFICAR SE PRECISA NOTIFICAR ALGUEM SOBRE O NOVO PRECO
    console.log('notify', { _id, preco_u, local, supermercado_id, moment, produto_nome, supermercado_nome })

    if (functions.hasEmpty({
      produto_nome, supermercado_nome
    })) {
      throw new Error(JSON.stringify({
        produto_nome, supermercado_nome
      }))
    }

    // (END) NÃO TESTADO

    const watches = await db.watch.aggregate([{
      $match: {
        'produto_id._id': new ObjectId(_id),
        'local.estado.cache_id': {
          $in: [local.estado.cache_id, 0]
        },
        'local.cidade.cache_id': {
          $in: [local.cidade.cache_id, 0]
        },
        valor: {
          $lt: ['$valor', +preco_u]
        }
      }
    }]).toArray()

    console.log({ watches })

    const stack = watches.map(watch => ({
      async fn() {
        try {
          await firebase.messaging()
            .sendToDevice(watch.push_token, {
              data: {
                produto_id: _id
              }, notification: {
                title: `${ produto_nome }${ produto_nome.sabor.definido ? ` de ${ produto_sabor.nome }` : '' }${ functions.getWeight(produto_peso) } por ${ (preco_u).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'}) }`,
                body: `Em ${ supermercado_nome }(${ local.cidade.nome }/${ local.estado.sigla }) - ${ moment.dia }/${ moment.mes } - ${ moment.hora }`
              }
            })
        } catch(e) {
          console.error(e)
        }
      }
    }))

    await functions.middlewareAsync(...stack)

  } catch(e) {
    console.error(e)
  }
}


exports.test = async () => {
  try {
    await firebase.messaging()
      .sendToDevice('fBffx8s0SbuKedEoo1C3vb:APA91bFQVEGPaG6DRo7cPhsXFELsz5HAH0WQSAgoYm1sabiqOQtqlyc2foAMEv1gOHYFsZ-BeSTfMRIJK9tkmljclXlmHpsohRVmJGBwoCdOc5ZPi3ImvfiSTaRVH7Zj8jyRO72AD1iK', {
        notification: {
          title: `${ 'Biscoito' }${ ' de morango' }${ ' 13un' } por ${ (1.45).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'}) }`,
          body: `Em ${ 'Karla' }(${ 'Paulista' }/${ 'PE' }) - ${ 1 }/${ 9 } - ${ '10:55' }`
        }, data: {
          produto_id: '1'
        }
      })
    console.log('Notificação de teste')
  } catch(e) {
    console.log(e)
  }
}

