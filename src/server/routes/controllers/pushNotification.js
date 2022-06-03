const { ObjectId } = require("mongodb"),
  functions = require("../../../functions"),
  { optionsCounted } = require('../../../utils'),
  firebase = require("../../../services/firebase"),
  limit = +process.env.LIMIT_PAGINATION || 10

exports.notify = async ({
  _id,
  preco_u,
  local,
  moment,
  db,
  produto_nome = "",
  produto_sabor = {},
  produto_peso = {},
  supermercado_nome = "",
  push_token = "",
}) => {
  try {
    // (END) VERIFICAR SE PRECISA NOTIFICAR ALGUEM SOBRE O NOVO PRECO
    // console.log('notify', { _id, preco_u, local, moment, produto_nome, supermercado_nome, produto_peso, produto_sabor })

    if (
      functions.hasEmpty({
        produto_nome,
        supermercado_nome,
      })
    ) {
      throw new Error(
        JSON.stringify({
          produto_nome,
          supermercado_nome,
        })
      );
    }

    const $match_default = {
      "produto_id._id": new ObjectId(_id),
      push_token: {
        $nin: [push_token],
      },
    };

    // MATCHES
    // PLANO ESTADUAL E NACIONAL JUNTOS, SOMENTE ESTADUAL OU NENHUM DOS DOIS
    // VERIFICAÇÃO NORMAL
    const $match = {
      "local.estado.cache_id": {
        $in: [local.estado.cache_id, 0],
      },
      "local.cidade.cache_id": {
        $in: [local.cidade.cache_id, 0],
      },
    };

    // MATCHES
    // PLANO NACIONAL
    // UMA EXCEÇÃO CASO O PLANO NACIONAL ESTEJA ATIVO E O ESTADUAL NÃO
    // SÓ PEGA TODAS AS CIDADES DE OUTRO ESTADO, CASO SEJÁ O MESMO ESTADO, CAIRÁ NO $match
    const $match_state_zero = {
      "local.estado.cache_id": 0,
      "local.estado.sigla": {
        $nin: [local.estado.sigla],
      },
      "local.cidade.cache_id": {
        $nin: [0],
      },
    };

    const watches = await db.watch
      .aggregate([
        {
          $facet: {
            state_zero: [
              {
                $match: {
                  ...$match_default,
                  ...$match_state_zero,
                },
              },
            ],
            normal: [
              {
                $match: {
                  ...$match_default,
                  ...$match,
                },
              },
            ],
          },
        },
      ])
      .toArray();

    // console.log({ watches })

    const { state_zero, normal } = watches[0];

    const stack = [...state_zero, ...normal]
      .filter((watch) => +preco_u < watch.valor)
      .map((watch) => ({
        async fn() {
          const notification = {
            title: `${
              produto_peso.tipo === "pacote" ? "Pacote de " : ""
            }${produto_nome}${
              produto_sabor.definido ? ` sabor ${produto_sabor.nome}, ` : " "
            }${functions.getWeight(
              produto_peso
            )} por ${(+preco_u).toLocaleString("pt-br", {
              style: "currency",
              currency: "BRL",
            })}`,
            body: `Em ${supermercado_nome}(${local.cidade.nome}/${
              local.estado.sigla
            }) - ${moment.dia < 10 ? `0${moment.dia}` : moment.dia}/${
              moment.mes < 10 ? `0${moment.mes}` : moment.mes
            } - ${moment.hora}`,
          };

          // console.log(notification)

          try {
            await firebase.messaging().sendToDevice(watch.push_token, {
              data: {
                produto_id: String(_id),
                update: true,
              },
              notification,
            });
          } catch (e) {
            console.error(e);
          }
        },
      }));

    await functions.middlewareAsync(...stack);
  } catch (e) {
    console.error(e);
  }
};

exports.test = async () => {
  try {
    await firebase
      .messaging()
      .sendToDevice(
        "edhjCSyuSc282R9iyDvoOr:APA91bGW2NWZQPnO6tr2Kx-u9ongYL_YMuvenpI1pP7WcKfgo5JjUPnAqw2y0i3zSM4jNKh6JDtEbQNh9xhGe5MEBQ3_gEGWTG-bx7jof--EVEWgIzesShPAbkY7xnRwcm4LXu3cerym",
        {
          notification: {
            title: `${"Biscoito"}${" de morango"}${" 13un"} por ${(1.45).toLocaleString(
              "pt-br",
              { style: "currency", currency: "BRL" }
            )}`,
            body: `Em ${"Karla"}(${"Paulista"}/${"PE"}) - 01/09 - ${"10:55"}`,
          },
          data: {
            produto_id: "61703e74f58dab35e1cf2f85",
          },
        }
      );
    // console.log('Notificação de teste')
  } catch (e) {
    console.error(e);
  }
};

exports.send = async (req, res) => {
  try {
    const { title, body, push_token, data = {} } = req.body;

    if (
      functions.hasEmpty({
        title,
        body,
        push_token,
      })
    ) {
      return res
        .status(200)
        .json({ ok: false, message: "Existe campos vazios!" });
    }

    await firebase.messaging().sendToDevice(push_token, {
      notification: {
        title,
        body,
      },
      data,
    });

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).send();
  }
};

exports.sendAll = async (req, res) => {
  try {
    const { title, body } = req.body;

    if (
      functions.hasEmpty({
        title,
        body
      })
    ) {
      return res
        .status(200)
        .json({ ok: false, message: "Existe campos vazios!" });
    }

    const push_tokens = await req.db.push_tokens.find({}, { projection: { push_token: 1, data: 1, _id: 1 } }).toArray();

    // LIMITADO EM 450 TOKENS POR VEZ
    const messagens = push_tokens.reduce((acc, { push_token }, index) => {
      const i = Math.floor(index / 450);

      if (!acc[i]) {
        acc[i] = [];
      }

      acc[i].push({
        token: push_token, notification: {
          title, body
        }, android: {
          priority: "high",
        }
      });

      return acc;
    }, []);

    const push_tokens_to_delete = push_tokens
      .filter(({data }) => functions.daysAgo(data) > process.env.DAYS_AGO)
      .map(({ _id }) => _id)

    if (push_tokens_to_delete.length) {
      await req.db.push_tokens.deleteMany({ 
        _id: {
          $in: push_tokens_to_delete
        } 
      })
    }

    await functions.middlewareAsync(
      ...messagens.map((msgs) => ({
        async fn() {
          await firebase.messaging().sendAll(msgs, false)
        }
      }))
    ) 

    const _recents = await req.db.notification
      .find()
      .toArray()

    const recents = Array.from(_recents).reverse()

    const notification = {
      titulo: title,
      mensagem: body,
      data: new Date
    }
    
    if (recents.length > 5) {
      await req.db.notification.deleteMany({
        _id: {
          $in: recents.map(({ _id }) => _id)
        }
      })

      recents.pop()

      recents.unshift(notification)
  
      await req.db.notification.insertMany(
        recents
        .reverse()
        .map(({ titulo, mensagem, data }) => ({
          titulo, mensagem, data
        }))
      )
    } else {
      await req.db.notification.insertOne(notification)
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    console.error(e);
    res.status(500).send();
  }
}

exports.getRecents = async (req, res) => {
  try {
    const recents = await req.db.notification
      .find()
      .toArray()

    res.status(200).json({
      ok: true, data: Array.from(recents).reverse()
    })
  } catch(e) {
    console.error(e)
    res.status(500).send()
  }
}

exports.setPushToken = async (req, res) => {
  try {
    const { push_token, device_id } = req.body
    const { db } = req

    const notification = {
      device_id,
      push_token,
      data: new Date
    }

    await db.push_tokens.updateOne({ device_id }, {
      $set: notification
    }, { upsert: true })

    res.status(200).send()

  } catch (e) {
    console.error(e);
    res.status(500).send();
  }
}

exports.getPushToken = async (req, res) => {
   // OK

   try {
    let {
      limit: limitQuery
    } = req.query

    let { page = 1 } = req.params

    page = +page

    if (!limitQuery) {
      limitQuery = limit
    }

    limitQuery = +limitQuery

    const options = [{
      $sort: {
        data: -1
      }
    }, {
      $project: {
        push_token: 1, data: 1
      }
    }]

    const optionsPaginated = [{
      $skip: (limitQuery * page) - limitQuery
    }, {
      $limit: limitQuery 
    }]

    let response = []

    let count = 0

    const [{ documents, postsCounted }] = await req.db.push_tokens.aggregate([{
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

    if (postsCounted.length) {
      count = postsCounted[0].count
    }

    response = documents

    res.status(200).json({ ok: true, data: response, limit: limitQuery, count, page })

  } catch(err) {
    console.error(err)
    res.status(500).send()
  }
}
