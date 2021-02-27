const { connect } = require('mongoose')

connect(process.env.MONGO_URL, {
	useNewUrlParser: true,
	useUnifiedTopology: true
})
.then(() => {
	console.log('conectado')
})
.catch(err => {
	console.log('erro ', err)
})

module.exports = connect
