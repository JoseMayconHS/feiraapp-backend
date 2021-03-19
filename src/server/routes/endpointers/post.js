const route = require('express').Router(),
	userControllers = require('../controllers/user'),
	productControllers = require('../controllers/product'),
	brandControllers = require('../controllers/brand'),
	supermarketControllers = require('../controllers/supermarket'),
	admControllers = require('../controllers/adm'),
	pushNotificationControllers = require('../controllers/pushNotification'),
	paymentControllers = require('../controllers/payment')
		
route
	// App
	// .post('/app/signup', userControllers.store)
	// .post('/app/signin', userControllers.sign)
	.post('/auth/request/shopping/finish', userControllers.shopping)
	// .post('/auth/request/reconnect', userControllers.reconnect)
	// .post('/auth/request/payment', paymentControllers.buy)
	.post('/auth/request/product', productControllers.store)
	// .post('/auth/request/field/:field', userControllers.field)
	// Supermercado (Buscar por localizacao)
	.post('/auth/request/supermarket/:page', supermarketControllers.indexAll)
	// Marcas (Buscar por nome)
	.post('/auth/request/brand/where/:page', brandControllers.indexBy)
	// Dashboard
	.post('/dashboard/signin', admControllers.sign)
	.post('/dashboard/signup', admControllers.store)
	.post('/auth/admin/reconnect', admControllers.reconnect)
	.post('/auth/admin/expo', pushNotificationControllers.send)
	// Ambos
	.post('/auth/request/brand', brandControllers.store)
	.post('/auth/request/supermarket', supermarketControllers.store)
	// Do cache para a api, sem autênticação
	.post('/auth/request/cache/supermarket', supermarketControllers.store)
	.post('/auth/request/cache/product', productControllers.store)
	.post('/auth/request/cache/brand', brandControllers.store)
	.post('/auth/request/cache/cache-to-api/:hash', userControllers.cacheToAPI)

module.exports = app => app.use(route)
