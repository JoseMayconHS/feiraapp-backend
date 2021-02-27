const route = require('express').Router(),
	userControllers = require('../controllers/user'),
	answerControllers = require('../controllers/answer'),
	questionControllers = require('../controllers/question'),
	answerTypeControllers = require('../controllers/answer_type'),
	admControllers = require('../controllers/adm')

route
	// .put('/app/user/changepassword/:id', userControllers.changepassword)
	.put('/app/user/forgot', userControllers.generate)
	// App
	.put('/auth/user/user', userControllers.update)
	// Dashboard
	.put('/auth/admin/answer-type/:id', answerTypeControllers.update)
	.put('/auth/admin/answer/:id', answerControllers.update)
	.put('/auth/admin/question/:id', questionControllers.update)
	.put('/auth/admin/user/status/:id', admControllers.toggleUserSignUp)

module.exports = app => app.use(route)
