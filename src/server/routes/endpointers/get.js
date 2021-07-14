const route = require('express').Router(),
	productControllers = require('../controllers/product'),
	supermarketControllers = require('../controllers/supermarket'),
	brandControllers = require('../controllers/brand'),
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
	// Produto
	.get('/auth/admin/produto/:page', productControllers.index)
	.get('/auth/admin/produto/todos', productControllers.all)
	.get('/auth/app/produto/interna/:id', productControllers.single)
	.get('/auth/admin/produto/interna/:id', productControllers.single)
	// Supermercado
	.get('/auth/app/supermercado/:id', supermarketControllers.single)
	.get('/auth/app/supermercados/:page', supermarketControllers.index)
	.get('/auth/app/marcas/:page', brandControllers.index)
	.get('/auth/admin/supermercados/:page', supermarketControllers.index)
	// Marca
	.get('/auth/admin/marca/:id', brandControllers.single)
	.get('/auth/app/marca/:id', brandControllers.single)
	// Notificações
	.get('/auth/admin/notifications', pushNotificationControllers.recents)
	// Gestores
	.get('/auth/admin/manager/:page', admControllers.indexAll)
	// .get('/auth/admin/qtd/expo', userControllers.qtd)
	.get('/auth/admin/cards', admControllers.cards)

module.exports = app => app.use(route)
