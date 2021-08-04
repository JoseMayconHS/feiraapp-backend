const { Expo } = require('expo-server-sdk'),
  Notification = require('../../../data/Schemas/Notification'),
  User = require('../../../data/Schemas/User'),
  functions = require('../../../functions'),
  expo = new Expo()

exports.send = (req, res) => {
  try {

    const { title, body, date } = req.body

    if (!title || !body) 
      throw new Error()

    if (typeof title !== 'string' || typeof body !== 'string')
      throw new Error()

    if (!title.length || !body.length)
      throw new Error()

    User.find({}, 'expo_token')
      .then(async tokens => {
        const messagens = []

        for (let token_obj of tokens) {
          
          const { expo_token } = token_obj

          if (Expo.isExpoPushToken(expo_token)) {
            messagens.push({
              to: expo_token,
              priority: 'high',
              sound: 'default',
              title, body
            })
          }

        }

        const addInNotificationSchema = (success, send) => {
          Notification.find()
            .sort('-createdAt')
            .then(notifications => {
              try {

              let newArray = [ ...notifications]

              const data = {
                success,
                title, body,
                date,
                adm_id: req._id
              }

              let callbacks = []

              if (newArray.length === 10) {
                callbacks.push(cb => {

                  Notification.deleteOne({ _id: newArray[newArray.length - 1]._id }, () => {
                    cb && cb()
                  })

                })
              }

              functions.middleware(...callbacks, (cb) => {

                Notification.create(data)
                  .then(() => {})
                  .catch(() => {})
                  .finally(() => {
                    cb && cb()
                  })

              }, () => send())


            } catch(e) {
              send()
            }
          })
          .catch(() => {
            send()
          })
        }

        const chunks = expo.chunkPushNotifications(messagens)

        for (let chunk of chunks) {
          try {
            await expo.sendPushNotificationsAsync(chunk)
          } catch(e) {
            return addInNotificationSchema(false, () => res.status(500).send())
          }
        }

        return addInNotificationSchema(true, () => res.status(200).send())
    
      })
      .catch(e => {
        res.status(500).send()
      })

  } catch(e) {
    res.status(500).send()
  }
}

exports.recents = (req, res) => {
  try {

    Notification.find()
      .sort('-created_at')
      .then(notifications => {
        try {
          if (!notifications) 
            throw new Error()

          res.status(200).json({ ok: true, data: notifications })

        } catch(e) {
          res.status(200).json({ ok: false })
        }
      })
      .catch(e => {
        res.status(200).json({ ok: false })
      })

  } catch(e) {
    res.status(200).json({ ok: false })
  }
}

exports.remove = (req, res) => {
  try {

    const { id: _id } = req.params

    Notification.deleteOne({ _id }, (err) => {
      res.status(err ? 500 : 200).send()
    })

  } catch(e) {
    res.status(500).send()
  }
}

exports.notify = async ({ _id, preco, local, supermercado_id, moment }) => {
  try {
    // (END) VERIFICAR SE PRECISA NOTIFICAR ALGUEM SOBRE O NOVO PRECO
    console.log('notify', { _id, preco, local, supermercado_id, moment })
  } catch(e) {
    console.error(e)
  }
}

