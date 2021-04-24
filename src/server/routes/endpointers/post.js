const route = require('express').Router(),
	userControllers = require('../controllers/user'),
	productControllers = require('../controllers/product'),
	brandControllers = require('../controllers/brand'),
	supermarketControllers = require('../controllers/supermarket'),
	admControllers = require('../controllers/adm'),
	pushNotificationControllers = require('../controllers/pushNotification'),
	watchControllers = require('../controllers/watch'),
	paymentControllers = require('../controllers/payment')
		
route
	// App
	// Supermercado
	.post('/auth/app/supermercado', supermarketControllers.store)
	// Buscar sem produtos
	.post('/auth/app/supermercado/:id', supermarketControllers.single)
	.post('/auth/admin/supermercado', supermarketControllers.store)
	// Supermercado (Buscar por localizacao)
	.post('/auth/app/supermercados/:page', supermarketControllers.index)
	.post('/auth/admin/supermercados/:page', supermarketControllers.index)
	// Observar
	.post('/auth/app/observar', watchControllers.create)
	.post('/auth/app/observar/:id', watchControllers.index)
	// Marca
	.post('/auth/app/marca', brandControllers.store)
	.post('/auth/admin/marca', brandControllers.store)
	// Marcas (Buscar por nome)
	.post('/auth/app/marcas/:page', brandControllers.indexBy)
	// Produto
	.post('/auth/app/feira/finalizar', userControllers.shopping)
	.post('/auth/app/produto', productControllers.store)
	.post('/auth/admin/produto', productControllers.store)
	.post('/auth/app/produtos/:page', productControllers.indexBy)
	.post('/auth/admin/produtos/:page', productControllers.indexBy)
	.post('/auth/app/produto/:id/:page', productControllers.single)
	.post('/auth/admin/produto/:id', productControllers.single)
	// Dashboard
	.post('/dashboard/signin', admControllers.sign)
	.post('/dashboard/signup', admControllers.store)
	.post('/auth/admin/reconnect', admControllers.reconnect)
	.post('/auth/admin/expo', pushNotificationControllers.send)
	.post('/auth/admin/marca', brandControllers.store)
	// Do cache para a api
	.post('/auth/app/cache/produto', productControllers.store)
	.post('/auth/app/cache/marca', brandControllers.store)
	.post('/auth/app/cache/supermercado', supermarketControllers.store)
	.post('/auth/app/cache/cache-to-api/:hash', userControllers.cacheToAPI)

module.exports = app => app.use(route)
