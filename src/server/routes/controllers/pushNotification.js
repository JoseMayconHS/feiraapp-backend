const functions = require('../../../functions'),
  firebase = require('../../../services/firebase')

exports.notify = async ({ 
  _id, preco, local, supermercado_id, moment, db,
  produto_nome = '', produto_sabor = '', produto_peso = '', 
  supermercado_nome = ''
}) => {
  try {
    // (END) VERIFICAR SE PRECISA NOTIFICAR ALGUEM SOBRE O NOVO PRECO
    console.log('notify', { _id, preco, local, supermercado_id, moment, produto_nome, supermercado_nome })

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
          $lt: ['$valor', +preco]
        }
      }
    }]).toArray()

    const stack = watches.map(watch => ({
      async fn() {
        try {
          await firebase.messaging()
            .sendToDevice(watch.push_token, {
              data: {
                produto_id: _id
              }, notification: {
                title: `${ produto_nome }${ produto_nome.sabor.definido ? ` de ${ produto_sabor.nome }` : '' }${ functions.getWeight(produto_peso) } por ${ (preco).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'}) }`,
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
      .sendToDevice('czi7TjF9S02eanVHgykwJK:APA91bGI6f_abYLlFxNJjV1zvqy4H_zPNP5hktxcmADQcOe-Hs96uReDrBwWMjjdRqR6Zkeo342pExqEGbe3BSG3_i62tSJfT62mZfNGyMsqfiH4OGvX27ZxYnBVyGmb-YQOLhdgAwiu', {
        notification: {
          title: `${ 'Biscoito' }${ ' de morango' }${ ' 13un' } por ${ (1.45).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'}) }`,
          body: `Em ${ 'Karla' }(${ 'Paulista' }/${ 'PE' }) - ${ 1 }/${ 9 } - ${ '10:55' }`
        }
      })
  } catch(e) {
    console.log(e)
  }
}

