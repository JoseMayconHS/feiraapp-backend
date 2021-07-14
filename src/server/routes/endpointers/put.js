const route = require('express').Router(),
	productControllers = require('../controllers/product'),
	supermarketControllers = require('../controllers/supermarket'),
	userControllers = require('../controllers/user'),
	admControllers = require('../controllers/adm')

route
	.put('/auth/app/supermercado/:id', supermarketControllers.update)
	.put('/auth/app/produto/varios', productControllers.updateMany)
	.put('/auth/app/produto/:id', productControllers.update)
	.put('/auth/app/feira/finalizar', userControllers.finishShopping)
	// Dashboard
	.put('/auth/admin/product/:id', productControllers.update)
	.put('/auth/admin/user/status/:id', admControllers.toggleUserSignUp)
	// Ambos
	.put('/auth/admin/product/:id', productControllers.update)

module.exports = app => app.use(route)
