const path = require('path'),
	fs = require('fs'),
	functions = require('../../functions')

const files = fs.readdirSync(path.resolve(__dirname, 'endpointers'))

module.exports = app => {
	// app.use('/auth/user', functions.authenticate_user)
	app.use('/auth/admin', functions.authenticate_adm)
	app.use('/auth/app', functions.authenticate_request)
	app.use('/', (req, res, next) => {
		if (!req.db) {
			res.status(500).send()
		} else {
			next()
		}
	})

	files
		.forEach(file => require(path.resolve(__dirname, 'endpointers', file))(app))
}
