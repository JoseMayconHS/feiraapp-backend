const route = require('express').Router(),
  productControllers = require('../controllers/product'),
  supermarketControllers = require('../controllers/supermarket'),
  brandControllers = require('../controllers/brand'),
  admControllers = require('../controllers/adm'),
  reportControllers = require('../controllers/report'),
  watchControllers = require('../controllers/watch')

route
  // Dashboard
  .delete('/auth/admin/produto/:id', productControllers.remove)
  .delete('/auth/admin/supermercado/:id', supermarketControllers.remove)
  .delete('/auth/admin/marca/:id', brandControllers.remove)
  .delete('/auth/admin/gestor/:id', admControllers.remove)
  .delete('/auth/admin/reporte/:id', reportControllers.remove)
  // App
  .delete('/auth/app/observar/:id', watchControllers.remove)
  .delete('/auth/app/observacoes', watchControllers.removes)

module.exports = app => app.use(route)
