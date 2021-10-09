const route = require('express').Router(),
	productControllers = require('../controllers/product'),
	brandControllers = require('../controllers/brand'),
	supermarketControllers = require('../controllers/supermarket'),
	userControllers = require('../controllers/user'),
	watchControllers = require('../controllers/watch')

route
	.put('/auth/app/supermercado/:id', supermarketControllers.update)
	.put('/auth/app/feira/finalizar', userControllers.finishShopping)
	.put('/auth/app/observacoes', watchControllers.updateLocale)
	.put('/auth/app/observar/:id', watchControllers.update)
	// Dashboard
	.put('/auth/admin/produto/:id', productControllers.update)
	.put('/auth/admin/marca/:id', brandControllers.update)
	.put('/auth/admin/supermercado/:id', supermarketControllers.update)

module.exports = app => app.use(route)
