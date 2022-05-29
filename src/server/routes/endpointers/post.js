const route = require('express').Router(),
	_defaultsControllers = require('../controllers/_defaults'),
	userControllers = require('../controllers/user'),
	productControllers = require('../controllers/product'),
	brandControllers = require('../controllers/brand'),
	supermarketControllers = require('../controllers/supermarket'),
	admControllers = require('../controllers/adm'),
	watchControllers = require('../controllers/watch'),
	reportControllers = require('../controllers/report'),
	pushNotificationControllers = require('../controllers/pushNotification')
		
route
	// App
	.post('/auth/app/notificacao', pushNotificationControllers.getPushToken)
	// Reporte
	.post('/auth/app/reporte', reportControllers.store)
	.post('/auth/app/reportes', reportControllers.storeList)
	// Supermercado
	.post('/auth/app/supermercado', _defaultsControllers.store(supermarketControllers.save))
	.post('/auth/app/supermercados', _defaultsControllers.storeList({ save: supermarketControllers.save, update: supermarketControllers._update }))
	.post('/auth/app/baixar/supermercado', supermarketControllers.all)
	.post('/auth/app/atualizar/supermercado', supermarketControllers.latest)
	// .post('/auth/admin/supermercado', _defaultsControllers.store(supermarketControllers.save))
	// Buscar sem produtos
	.post('/auth/app/supermercado/:id', supermarketControllers.single)
	.post('/auth/admin/supermercado', _defaultsControllers.store(supermarketControllers.save))
	// Supermercado (Buscar por localizacao)
	.post('/auth/app/supermercados/:page', supermarketControllers.index)
	// Observar
	.post('/auth/app/observar', watchControllers.store)
	.post('/auth/app/observacoes', _defaultsControllers.storeList({ save: watchControllers.save, update: watchControllers._update }))
	.post('/auth/app/observar/:id', watchControllers.index)
	// Marca
	.post('/auth/app/marca', brandControllers.store)
	.post('/auth/app/marcas', brandControllers.storeList)
	.post('/auth/admin/marca', brandControllers.store)
	.post('/auth/app/atualizar/marcas', brandControllers.latest)
	// Marcas (Buscar por nome)
	// .post('/auth/app/marcas/:page', brandControllers.indexBy)
	// Produto
	.post('/auth/app/produto', _defaultsControllers.store(productControllers.save))
	.post('/auth/app/produtos', _defaultsControllers.storeList({ save: productControllers.save, update: productControllers._update }))
	.post('/auth/app/produtos/:page', productControllers.indexBy)
	.post('/auth/app/feira/produtos', productControllers.indexList)
	.post('/auth/app/produto/:id/:page', productControllers.single)
	.post('/auth/app/produto/lista-de-precos', productControllers.prices)
	.post('/auth/app/atualizar/produtos', productControllers.latest)
	.post('/auth/app/baixar/produto', productControllers.all)
	.post('/auth/admin/produto', _defaultsControllers.store(productControllers.save))
	.post('/auth/admin/produto/:id', productControllers.single)
	// Dashboard
	.post('/dashboard/signin', admControllers.sign)
	.post('/dashboard/signup', admControllers.store)
	.post('/auth/admin/marca', brandControllers.store)
	.post('/auth/admin/notificacao', pushNotificationControllers.send)
	.post('/auth/admin/notificacoes', pushNotificationControllers.sendAll)
	// Do cache para a api
	.post('/auth/app/cache/produto', _defaultsControllers.store(productControllers.save))
	.post('/auth/app/cache/marca', brandControllers.store)
	.post('/auth/app/cache/supermercado', _defaultsControllers.store(supermarketControllers.save))
	.post('/auth/app/cache/cache-to-api/:hash', userControllers.cacheToAPI)

module.exports = app => app.use(route)
