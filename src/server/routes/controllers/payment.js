const Stripe = require('stripe'),
  User = require('../../../data/Schemas/User'),
  service_email = require('../../../services/email'),
  stripe = Stripe(process.env.STRIPE_SK || ''),
  service_email_token = process.env.SERVICE_EMAIL_TOKEN || ''

exports.buy = async (req, res) => {
  try {

    const { email, username, payment_token, lang = 'pt' } = req.body
    
    stripe.customers
      .create({
        name: username,
        email,
        source: payment_token,
        metadata: {
          _id: req._id
        }
      })
      .then(customer => 
        stripe.charges.create({
          amount: 100,
          currency: "usd",
          customer: customer.id
        })
      )
      .then(() => {

        const d = new Date()

        const day = +d.getDate()
        const month = +d.getMonth() + 1
        const year = +d.getFullYear()

        const buy_date = `${(day < 10) ? `0${day}` : day}/${(month < 10) ? `0${month}` : month}/${ year }`

        User.updateOne({ _id: req._id }, { pro: true, buy_date })
          .then(() => {})
          .catch(() => {})
          .finally(async () => {

            const title = lang === 'us' ? 'PRO plan successfully acquired!' : 'Plano PRO adquirido com sucesso!'

            const query = `titulo=${ title }&destinatario=${ email }&nome=${ username }&token=${ service_email_token }&lang=${ lang }`
            
            await service_email(`?${ query }`)

            res.status(200).json({ ok: true, metadata: { buy_date } })
          })

      })
      .catch(err => {
        console.log(err)
        res.status(200).json({ ok: false, message: err })
      });

  } catch(e) {
    res.status(500).send()
  }
}

