const route = require('express').Router(),
  productControllers = require('../controllers/product'),
  admControllers = require('../controllers/adm'),
  pushNotificationControllers = require('../controllers/pushNotification')

route
  .delete('/auth/admin/product/:id', productControllers.remove)
  .delete('/auth/admin/manager/:id', admControllers.removeAnotherAdm)
  .delete('/auth/admin/notification/:id', pushNotificationControllers.remove)
  // .delete('/auth/admin/user/:id', admControllers.removeUser)

module.exports = app => app.use(route)
