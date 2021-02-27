const route = require('express').Router(),
	userControllers = require('../controllers/user'),
	productControllers = require('../controllers/product'),
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
	// Dashboard
	.post('/dashboard/signin', admControllers.sign)
	.post('/dashboard/signup', admControllers.store)
	.post('/auth/admin/reconnect', admControllers.reconnect)
	.post('/auth/admin/expo', pushNotificationControllers.send)

module.exports = app => app.use(route)
