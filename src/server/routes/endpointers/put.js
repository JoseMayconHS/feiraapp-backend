const route = require('express').Router(),
	productControllers = require('../controllers/product'),
	admControllers = require('../controllers/adm')

route
	// .put('/app/user/forgot', userControllers.generate)
	// App
	// .put('/auth/user/user', userControllers.update)
	// .put('/auth/user/app/logout', userControllers.logout)
	// Dashboard
	.put('/auth/admin/product/:id', productControllers.update)
	.put('/auth/admin/user/status/:id', admControllers.toggleUserSignUp)
	// Ambos
	.put('/auth/admin/product/:id', productControllers.update)

module.exports = app => app.use(route)
