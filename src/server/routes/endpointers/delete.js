const route = require('express').Router(),
  answerControllers = require('../controllers/answer'),
  questionControllers = require('../controllers/question'),
  answerTypeControllers = require('../controllers/answer_type'),
  admControllers = require('../controllers/adm'),
  pushNotificationControllers = require('../controllers/pushNotification')

route
  .delete('/auth/admin/question/:id', questionControllers.remove)
  .delete('/auth/admin/answer/:id', answerControllers.remove)
  .delete('/auth/admin/manager/:id', admControllers.removeAnotherAdm)
  .delete('/auth/admin/notification/:id', pushNotificationControllers.remove)
  .delete('/auth/admin/answer-type/:id', answerTypeControllers.remove)
  .delete('/auth/admin/user/:id', admControllers.removeUser)

module.exports = app => app.use(route)
