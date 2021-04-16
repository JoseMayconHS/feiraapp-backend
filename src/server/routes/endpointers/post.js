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
	.post('/auth/app/supermercados/:page', supermarketControllers.indexAll)
	.post('/auth/app/cache/supermercado', supermarketControllers.store)
	// Observar
	.post('/auth/app/observar', watchControllers.create)
	//
	.post('/auth/app/feira/finalizar', userControllers.shopping)
	.post('/auth/app/produto', productControllers.store)
	.post('/auth/app/produtos/:page', productControllers.indexBy)
	// Supermercado (Buscar por localizacao)
	// Marcas (Buscar por nome)
	.post('/auth/app/marcas/onde/:page', brandControllers.indexBy)
	// Dashboard
	.post('/dashboard/signin', admControllers.sign)
	.post('/dashboard/signup', admControllers.store)
	.post('/auth/admin/reconnect', admControllers.reconnect)
	.post('/auth/admin/expo', pushNotificationControllers.send)
	// Ambos
	.post('/auth/app/marca', brandControllers.store)
	// Do cache para a api, sem autênticação
	.post('/auth/app/cache/produto', productControllers.store)
	.post('/auth/app/cache/marca', brandControllers.store)
	.post('/auth/app/cache/cache-to-api/:hash', userControllers.cacheToAPI)

module.exports = app => app.use(route)
