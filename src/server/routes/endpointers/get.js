const route = require('express').Router(),
	userControllers = require('../controllers/user'),
	productControllers = require('../controllers/product'),
	supermarketControllers = require('../controllers/supermarket'),
	admControllers = require('../controllers/adm'),
	pushNotificationControllers = require('../controllers/pushNotification')

const html = `
	<div style='font-family: sans-serif;background: #bafcff;display: flex;justify-content: center;align-items: center;flex-direction: column;margin: 134px auto 20px auto;max-width: 500px;border-radius: 10px;box-shadow: 0 0 41px 20px #bafcff;border: 1px solid #999;'>
		<h1 style='margin-bottom: 0.6em;'>FeiraApp - 1.0.0</h1>
		<p style='max-width: 500px; line-height: 21px; font-weight: 600;'>Desenvolvido por 
		<a href='https://www.facebook.com/profile.php?id=100008160376957' target='_blank' style='color: tomato; text-decoration: none;'>Maycon Silva</a></p>
	</div>
`	

route
	.get('/__origin__', (req, res) => res.send(html))
	.get('/already', admControllers.qtd)
	// Usuários
	.get('/auth/admin/user/:page', userControllers.indexAll)
	.get('/auth/admin/user/single/:id', userControllers.single)
	.get('/auth/admin/user/search/:word/:page', userControllers.search)
	// Produtos
	.get('/auth/admin/product/:page', productControllers.indexAll)
	.get('/auth/admin/all/product', productControllers.all)
	.get('/auth/admin/product/single/:id', productControllers.single)
	// Supermercados
	.get('/auth/user/supermarket/:page', supermarketControllers.indexAll)
	// Notificações
	.get('/auth/admin/notifications', pushNotificationControllers.recents)
	// Gestores
	.get('/auth/admin/manager/:page', admControllers.indexAll)
	.get('/auth/admin/qtd/expo', userControllers.qtd)
	.get('/auth/admin/cards', admControllers.cards)

	module.exports = app => app.use(route)
