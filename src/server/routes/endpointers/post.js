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
	.post('/app/signup', userControllers.store)
	.post('/app/signin', userControllers.sign)
	.post('/auth/user/reconnect', userControllers.reconnect)
	.post('/auth/user/payment', paymentControllers.buy)
	.post('/auth/user/product', productControllers.store)
	.post('/auth/user/product', productControllers.store)
	// Dashboard
	.post('/dashboard/signin', admControllers.sign)
	.post('/dashboard/signup', admControllers.store)
	.post('/auth/admin/reconnect', admControllers.reconnect)
	.post('/auth/admin/expo', pushNotificationControllers.send)
	// Ambos
	.post('/auth/user/brand', brandControllers.store)
	.post('/auth/user/supermarket', supermarketControllers.store)
	// Do cache para a api, sem autênticação
	.post('/user/supermarket', supermarketControllers.store)
	.post('/user/product', productControllers.store)
	.post('/user/cache-to-api/:hash', userControllers.cacheToAPI)

module.exports = app => app.use(route)
