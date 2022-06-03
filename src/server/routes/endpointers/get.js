const route = require('express').Router(),
	productControllers = require('../controllers/product'),
	supermarketControllers = require('../controllers/supermarket'),
	brandControllers = require('../controllers/brand'),
	admControllers = require('../controllers/adm'),
	reportControllers = require('../controllers/report'),
	pushNotification = require('../controllers/pushNotification')

const html = `
	<div style='font-family: sans-serif;background: #73BE73;display: flex;justify-content: center;align-items: center;flex-direction: column;margin: 134px auto 20px auto;max-width: 500px;border-radius: 10px;box-shadow: 0 0 41px 20px #73BE73;border: 1px solid #CCC;'>
		<h1 style='margin-bottom: 0.6em; color: #FFF'>FeiraApp - 2.0.1</h1>
		<p style='max-width: 500px; line-height: 21px; font-weight: 600; color: #CCC'>Desenvolvido por 
		<a href='https://www.facebook.com/profile.php?id=100008160376957' target='_blank' style='color: tomato; text-decoration: none;'>Maycon Silva</a></p>
	</div>
`	

route
	.get('/__origin__', (req, res) => res.send(html))
	.get('/already', admControllers.qtd)
	.get('/auth/admin/reconnect', admControllers.reconnect)
	// Reporte
	.get('/auth/admin/reportes/:page', reportControllers.index)
	// Produto
	.get('/auth/admin/produtos/:page', productControllers.index)
	.get('/auth/admin/produto/todos', productControllers.all)
	.get('/auth/app/produto/interna/:id', productControllers.single)
	.get('/auth/admin/produto/interna/:id', productControllers.single)
	// Supermercado
	.get('/auth/app/supermercado/:id', supermarketControllers.single)
	.get('/auth/app/supermercados/:page', supermarketControllers.index)
	.get('/auth/admin/supermercados/:page', supermarketControllers.index)
	// Marca
	.get('/auth/admin/marca/:id', brandControllers.single)
	.get('/auth/admin/marcas/:page', brandControllers.index)	
	.get('/auth/app/marca/:id', brandControllers.single)
	.get('/auth/app/marcas/:page', brandControllers.index)
	// Notificações
	.get('/auth/admin/notificacoes', pushNotification.getRecents)
	.get('/auth/admin/push_tokens/:page', pushNotification.getPushToken)
	
module.exports = app => app.use(route)
