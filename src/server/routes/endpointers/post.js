const route = require('express').Router(),
	userControllers = require('../controllers/user'),
	answerControllers = require('../controllers/answer'),
	questionControllers = require('../controllers/question'),
	answerTypeControllers = require('../controllers/answer_type'),
	admControllers = require('../controllers/adm'),
	pushNotificationControllers = require('../controllers/pushNotification'),
	paymentControllers = require('../controllers/payment')
		
route
	// App
	.post('/app/signup', userControllers.store)
	.post('/app/signin', userControllers.sign)
	.post('/auth/user/reconnect', userControllers.reconnect)
	.post('/auth/user/payment', paymentControllers.buy)
	// Dashboard
	.post('/dashboard/signin', admControllers.sign)
	.post('/dashboard/signup', admControllers.store)
	.post('/auth/admin/reconnect', admControllers.reconnect)
	.post('/auth/admin/answer', answerControllers.store)
	.post('/auth/admin/answer-type', answerTypeControllers.store)
	.post('/auth/admin/question', questionControllers.store)
	.post('/auth/user/avaliable', userControllers.avaliable)
	.post('/auth/admin/expo', pushNotificationControllers.send)

module.exports = app => app.use(route)
