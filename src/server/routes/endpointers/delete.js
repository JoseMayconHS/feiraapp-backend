const route = require('express').Router(),
  productControllers = require('../controllers/product'),
  supermarketControllers = require('../controllers/supermarket'),
  brandControllers = require('../controllers/brand'),
  admControllers = require('../controllers/adm'),
  pushNotificationControllers = require('../controllers/pushNotification'),
  watchControllers = require('../controllers/watch')

route
  .delete('/auth/admin/produto/:id', productControllers.remove)
  .delete('/auth/admin/supermercado/:id', supermarketControllers.remove)
  .delete('/auth/admin/marca/:id', brandControllers.remove)
  .delete('/auth/admin/gestor/:id', admControllers.removeAnotherAdm)
  .delete('/auth/admin/notificacao/:id', pushNotificationControllers.remove)
  // App
  .delete('/auth/app/observar/:id', watchControllers.remove)
  .delete('/auth/app/observacoes', watchControllers.removes)
  // .delete('/auth/admin/user/:id', admControllers.removeUser)

module.exports = app => app.use(route)
