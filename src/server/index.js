require('dotenv').config()
const express = require('express'),
  path = require('path'),
  cors = require('cors'),
  port = process.env.PORT || 3030,
  app = express()

let db

require('../services/mongodb')()
  .then(mongo => {
    db = mongo
  }).catch(console.error)

app.use(cors())
app.use(express.json())
// app.use('/files', express.static(path.resolve(__dirname, '..', 'static')))

// require('./routes/controllers/pushNotification').test()

app.use('/', (req, res, next) => {
  req.db = db

  next()
})

require('./routes')(app)

app.listen(port, err => console.log(err ? 'Ocorreu um erro' : `Servidor online na porta ${port}`))
