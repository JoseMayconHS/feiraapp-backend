const { ObjectId } = require('mongodb'),
  functions = require('../../../functions'),
  firebase = require('../../../services/firebase')

exports.notify = async ({ 
  _id, preco_u, local, moment, db,
  produto_nome = '', produto_sabor = {}, produto_peso = {}, 
  supermercado_nome = '', push_token = ''
}) => {
  try {
    // (END) VERIFICAR SE PRECISA NOTIFICAR ALGUEM SOBRE O NOVO PRECO
    console.log('notify', { _id, preco_u, local, moment, produto_nome, supermercado_nome, produto_peso, produto_sabor })

    if (functions.hasEmpty({
      produto_nome, supermercado_nome
    })) {
      throw new Error(JSON.stringify({
        produto_nome, supermercado_nome
      }))
    }

    const $match_default = {
      'produto_id._id': new ObjectId(_id),
      push_token: {
        $nin: [push_token]
      }
    }

    // MATCHES
    // PLANO ESTADUAL E NACIONAL JUNTOS, SOMENTE ESTADUAL OU NENHUM DOS DOIS
    // VERIFICAÇÃO NORMAL
    const $match = {
      'local.estado.cache_id': {
        $in: [local.estado.cache_id, 0]
      },
      'local.cidade.cache_id': {
        $in: [local.cidade.cache_id, 0]
      },
    }

    // MATCHES
    // PLANO NACIONAL
    // UMA EXCEÇÃO CASO O PLANO NACIONAL ESTEJA ATIVO E O ESTADUAL NÃO
    // SÓ PEGA TODAS AS CIDADES DE OUTRO ESTADO, CASO SEJÁ O MESMO ESTADO, CAIRÁ NO $match
    const $match_state_zero = {
      'local.estado.cache_id': 0,
      'local.estado.sigla': {
        $nin: [local.estado.sigla]
      },
      'local.cidade.cache_id': {
        $nin: [0]
      },
    }

    const watches = await db.watch.aggregate([{
      $facet: {
        state_zero: [{
          $match: {
            ...$match_default,
            ...$match_state_zero
          }
        }],
        normal: [{
          $match: {
            ...$match_default,
            ...$match
          }
        }]
      }
    }]).toArray()

    console.log({ watches })

    const { state_zero, normal } = watches[0]

    const stack = [...state_zero, ...normal]
    .filter(watch => +preco_u < watch.valor)
    .map(watch => ({
      async fn() {
        const notification = {
          title: `${ produto_peso.tipo === 'pacote' ? 'Pacote de ' : '' }${ produto_nome }${ produto_sabor.definido ? ` sabor ${ produto_sabor.nome }, ` : ' ' }${ functions.getWeight(produto_peso) } por ${ (+preco_u).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'}) }`,
          body: `Em ${ supermercado_nome }(${ local.cidade.nome }/${ local.estado.sigla }) - ${ moment.dia< 10 ? `0${ moment.dia }` : moment.dia }/${ moment.mes < 10 ? `0${ moment.mes }` : moment.mes } - ${ moment.hora }`
        }

      // console.log(notification)

        try {
          await firebase.messaging()
            .sendToDevice(watch.push_token, {
              data: {
                produto_id: String(_id)
              }, notification
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
      .sendToDevice('edhjCSyuSc282R9iyDvoOr:APA91bGW2NWZQPnO6tr2Kx-u9ongYL_YMuvenpI1pP7WcKfgo5JjUPnAqw2y0i3zSM4jNKh6JDtEbQNh9xhGe5MEBQ3_gEGWTG-bx7jof--EVEWgIzesShPAbkY7xnRwcm4LXu3cerym', {
        notification: {
          title: `${ 'Biscoito' }${ ' de morango' }${ ' 13un' } por ${ (1.45).toLocaleString('pt-br',{style: 'currency', currency: 'BRL'}) }`,
          body: `Em ${ 'Karla' }(${ 'Paulista' }/${ 'PE' }) - 01/09 - ${ '10:55' }`
        }, data: {
          produto_id: '61703e74f58dab35e1cf2f85'
        }
      })
  // console.log('Notificação de teste')
  } catch(e) {
    console.error(e)
  }
}

exports.send = async (req, res) => {
  try {
    const { title, body, push_token, data = {} } = req.body

    if (functions.hasEmpty({
      title, body, push_token
    })) {
      return res.status(200).json({ ok: false, message: 'Existe campos vazios!' })
    }

    await firebase.messaging()
      .sendToDevice(push_token, {
        notification: {
          title, body
        }, data
      })

    res.status(200).json({ ok: true })
  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}

