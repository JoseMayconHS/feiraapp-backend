const route = require('express').Router(),
	userControllers = require('../controllers/user'),
	productControllers = require('../controllers/product'),
	admControllers = require('../controllers/adm')

route
	.put('/app/user/forgot', userControllers.generate)
	// App
	.put('/auth/user/user', userControllers.update)
	// Dashboard
	.put('/auth/admin/product/:id', productControllers.update)
	.put('/auth/admin/user/status/:id', admControllers.toggleUserSignUp)

module.exports = app => app.use(route)
