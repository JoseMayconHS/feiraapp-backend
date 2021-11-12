const { ObjectId } = require('mongodb'),
	functions = require('../../../functions'),
	{ optionsCounted } = require('../../../utils'),
	pushNotificationControllers = require('./pushNotification'),
	limit = +process.env.LIMIT_PAGINATION || 10

exports.save = async ({
	data, hash_identify_device = '', local, db, push_token
}) => {
	try {

		const {
			peso = {}, nome, sabor = {}, tipo, sem_marca,
			marca: marca_obj,
			marca_id: marca = {},
			cache_id = 0, precos = [], nivel = 4
		} = data

		// console.log('product.save()', data)

		const { tipo: peso_tipo } = peso

		const checkEmpty = {
			nome, tipo, peso_tipo
		}

		if (!sem_marca && marca_obj) {
			checkEmpty.marca_nome = marca_obj.nome
		}

		if (functions.hasEmpty(checkEmpty)) {
			throw new Error()
		}

		tipo.texto = functions.capitalize(tipo.texto)
		tipo.texto_key = functions.keyWord(tipo.texto)

		let criar = !sem_marca

		let data_marca = false
		if (!sem_marca) {
			let brand = false

			const {
				_id: marca_id
			} = marca

			if (marca_id && marca_id.length) {

				brand = await db.brand.findOne({ _id: new ObjectId(marca_id) }, { projection: { _id: 1 } })

				if (brand) {
					criar = false
				}
			}

			if (criar) {
				if (marca_obj) {
					data_marca = await db.brand.findOne({
						nome_key: functions.keyWord(marca_obj.nome)
					}, { projection: { nome: 1 } })

					if (!data_marca) {
						const { insertedId } = await db.brand.insertOne({
							nome: marca_obj.nome,
							nome_key: functions.keyWord(marca_obj.nome)
						})

						data_marca = {
							_id: insertedId
						}
					}

				}
			} else {
				data_marca = brand
			}
		}

		const item = {
			nome, nome_key: functions.keyWord(nome),
			sem_marca, cache_id, hash_identify_device, precos, nivel: +nivel, peso: { ...peso, valor: String(peso.valor) },
			tipo, sabor: { definido: false },
			created_at: Date.now()
		}

		if (sabor.definido) {
			sabor.nome = functions.capitalize(sabor.nome)
			sabor.nome_key = functions.keyWord(sabor.nome)
			sabor.definido = true

			item.sabor = sabor
		}

		// if (!sem_marca) {
		//   item.marca_id = {
		//     _id: new ObjectId(data_marca ? data_marca._id : ''),
		//     cache_id: 0
		//   }
		// }

		item.marca_id = {
			_id: data_marca && data_marca._id ? new ObjectId(data_marca._id) : '',
			cache_id: 0
		}

		item.sem_marca = !data_marca

		// console.log('product.save ', item)

		const alreadyExists = async () => {
			let response
			try {
				const already = await db.product.find({ 
					nome_key: item.nome_key,
					// peso: { valor: item.peso.valor, tipo: item.peso.tipo },
					// tipo: { texto_key: item.tipo.texto_key },
					// sabor: { texto_key: item.sabor.nome_key }
				}).toArray()

				if (already.length) {

					const verifyType = (v) => {
						return (item.tipo.texto_key === v.tipo.texto_key)
					}

					const verifyWeight = (v) => {
						if (item.peso.tipo === v.peso.tipo) {
							if (item.peso.valor == v.peso.valor && item.peso.force_down === v.peso.force_down) {
								return true
							}
						}

						return false
					}

					const verifyBrand = (v) => {
						if (String(item.marca_id._id).length) {
							return String(item.marca_id._id) === String(v.marca_id._id)
						} else {
							return v.sem_marca
						}
					}

					const verifyFlavor = (v) => {
						if (item.sabor) {
							if (item.sabor.definido && v.sabor.definido) {
								return functions.keyWord(item.sabor.nome) === v.sabor.nome_key
							} else {
								return (item.sabor.definido === v.sabor.definido)
							}
						} else {
							return !v.sabor.definido
						}
					}

					for (let i = 0; i < already.length; i++) {

						console.log('i', i)

						const v = already[i]

						if (String(item.marca_id._id).length) {
							if (verifyBrand(v) && verifyWeight(v) && verifyType(v) && verifyFlavor(v)) {
								response = v
							}
						} else {
							if (v.sem_marca) {
								if (verifyType(v) && verifyWeight(v) && verifyFlavor(v)) {
									response = v
								}
							}
						}

						if (response) break
					}

					// console.log({item, already}, { already: !!response })
				}

			} catch (e) {
				console.error('product.alreadyExists()', e)
			} finally {

				return response
			}
		}

		let response = await alreadyExists()

		if (response) {
			// // console.log('item.precos', item.precos)
			if (item.precos.length) {
				// // console.log('item.precos.cidades', item.precos[0].cidades)
				// // console.log('item.precos.cidades.historico', item.precos[0].cidades[0].historico)
				await this._update({
					data: item, local, mongo_data: response, db, push_token
				})
			}

			const updateData = { cache_id, hash_identify_device, nivel: nivel > 2 ? 2 : nivel }

			await db.product.updateOne({
				_id: response._id
			}, {
				$set: updateData
			})

			return { ...response, ...updateData }
		} else {

			const { insertedId } = await db.product.insertOne(item)

			return { ...item, _id: insertedId }
		}

	} catch (err) {
		console.log(err)
		return
	}
}

exports._update = async ({
	data, hash_identify_device = '', local, mongo_data, db, push_token, moment
}) => {
	try {
		// console.log('product._update', { data, local, mongo_data })

		let response = data

		if (!mongo_data) {
			mongo_data = await db.product.findOne({ _id: new ObjectId(data.api_id) })
		}

		if (mongo_data) {

			let history_latest_by_supermarket = []

			const mongo_precos = mongo_data.precos
			const precos = data.precos

			// console.log('product._update()', { mongo_precos, precos })

			const mongo_state_index = mongo_precos.findIndex(preco => preco.estado_id === local.estado._id)
			const state_index = precos.findIndex(preco => preco.estado_id === local.estado._id)

			if (mongo_state_index !== -1 && state_index !== -1) {
				const state = mongo_precos[mongo_state_index]

				const mongo_region_index = mongo_precos[mongo_state_index].cidades.findIndex(({ cidade_id }) => cidade_id === local.cidade._id)
				const region_index = precos[state_index].cidades.findIndex(({ cidade_id }) => cidade_id === local.cidade._id)

				if (mongo_region_index !== -1 && region_index !== -1) {
					const mongo_price = mongo_precos[mongo_state_index].cidades[mongo_region_index]
					let price = precos[state_index].cidades[region_index]

					// console.log('price.historico antes', price.historico)
					price.historico = price.historico.filter(historico => !historico.api)
					// console.log('price.historico depois', price.historico)

					// (EX) SE ESTA FUNCIONANDO CERTO
					// console.log('historico antes')
					const history_reversed = price.historico
						.filter(historico => String(historico.supermercado_id._id).length)

					history_latest_by_supermarket = history_reversed.reverse()
						.filter(({ supermercado_id: { _id: id1 } }, index) => history_reversed.findIndex(({ supermercado_id: { _id: id2 } }) => String(id1) === String(id2) === index))


					price.historico = functions.sortHistoric([...price.historico, ...mongo_price.historico])

					// console.log('antes', { mongo_price, price })

					// (END) VERIFICAR O TEMPO EM QUE FOI REGISTRADO E ZERAR OU ATUALIZAR POR UM MAIS RECENTE
					// IMPEDIR QUE UM PREÇO FIQUE SEMPRE COMO MENOR PREÇO POR CONTA DA INFLAÇÃO (VALORES TENDEM A SUBIR)

					if (
						+mongo_price.menor_preco.preco_u === 0 ||
						+price.menor_preco.preco_u < +mongo_price.menor_preco.preco_u ||
						functions.daysAgo(mongo_price.menor_preco.data) > process.env.DAYS_AGO
					) {
						if (
							+mongo_price.maior_preco.preco_u === 0 ||
							(
								functions.daysAgo(mongo_price.maior_preco.data) > process.env.DAYS_AGO &&
								functions.daysAgo(mongo_price.menor_preco.data) < process.env.DAYS_AGO
							)
						) {
							mongo_price.maior_preco.preco_u = mongo_price.menor_preco.preco_u
							mongo_price.maior_preco.supermercado_id = mongo_price.menor_preco.supermercado_id
							mongo_price.maior_preco.data = mongo_price.menor_preco.data
							mongo_price.maior_preco.api = true
						} else if (
							// (DESC) CASO O menor_preco SEJA ATUALIZADO SÓ PORQUE ESTÁ VENCIDO, ZERAR O maior_preco PRA NÃO TER INCONCISTÊNCIA
							functions.daysAgo(mongo_price.menor_preco.data) > process.env.DAYS_AGO
						) {
							mongo_price.maior_preco = {
								supermercado_id: {
									_id: '',
									cache_id: 0
								},
								preco_u: '0'
							}
						}

						mongo_price.menor_preco.preco_u = price.menor_preco.preco_u
						mongo_price.menor_preco.supermercado_id = price.menor_preco.supermercado_id
						mongo_price.menor_preco.data = new Date
						mongo_price.menor_preco.api = true
					} else if (
						+mongo_price.maior_preco.preco_u === 0 ||
						+price.maior_preco.preco_u > +mongo_price.maior_preco.preco_u ||
						functions.daysAgo(mongo_price.maior_preco.data) > process.env.DAYS_AGO
					) {
						if (price.maior_preco.supermercado_id) {
							mongo_price.maior_preco.preco_u = price.maior_preco.preco_u
							mongo_price.maior_preco.supermercado_id = price.maior_preco.supermercado_id
						} else {
							mongo_price.maior_preco.preco_u = price.menor_preco.preco_u
							mongo_price.maior_preco.supermercado_id = price.menor_preco.supermercado_id
						}

						mongo_price.maior_preco.data = new Date
						mongo_price.maior_preco.api = true
					}

					mongo_price.historico = price.historico

					mongo_price.maior_preco.supermercado_id = {
						...mongo_price.maior_preco.supermercado_id,
						_id: String(mongo_price.maior_preco.supermercado_id._id).length ? new ObjectId(mongo_price.maior_preco.supermercado_id._id) : ''
					}

					mongo_price.menor_preco.supermercado_id = {
						...mongo_price.menor_preco.supermercado_id,
						_id: String(mongo_price.menor_preco.supermercado_id._id).length ? new ObjectId(mongo_price.menor_preco.supermercado_id._id) : ''
					}

					// // console.log('depois', { mongo_price, price })

					const cidades = mongo_precos[mongo_state_index].cidades

					cidades.splice(mongo_region_index, 1, mongo_price)

					mongo_precos[mongo_state_index].cidades = cidades
				} else {
					// SE NAO TIVER ESSE cidade

					if (region_index !== -1) {
						const price = precos[state_index].cidades[region_index]

						price.maior_preco.supermercado_id = {
							...price.maior_preco.supermercado_id,
							_id: String(price.maior_preco.supermercado_id._id).length ? new ObjectId(price.maior_preco.supermercado_id._id) : ''
						}

						price.menor_preco.supermercado_id = {
							...price.menor_preco.supermercado_id,
							_id: String(price.menor_preco.supermercado_id._id).length ? new ObjectId(price.menor_preco.supermercado_id._id) : ''
						}

						price.maior_preco.api = !!String(price.maior_preco.supermercado_id._id).length
						price.menor_preco.api = !!String(price.menor_preco.supermercado_id._id).length

						price.historico = price.historico.filter(historico => !historico.api)

						const history_reversed = price.historico
							.filter(historico => String(historico.supermercado_id._id).length)

						history_latest_by_supermarket = history_reversed.reverse()
							.filter(({ supermercado_id: { _id: id1 } }, index) => history_reversed.findIndex(({ supermercado_id: { _id: id2 } }) => String(id1) === String(id2) === index))

						const _result = {
							cidade_id: local.cidade._id,
							menor_preco: {
								...price.menor_preco,
								data: new Date
							},
							maior_preco: price.maior_preco ? {
								...price.maior_preco,
								data: new Date
							} : {
								supermercado_id: {
									_id: '',
									cache_id: 0
								},
								preco_u: '0'
							},
							historico: functions.sortHistoric(price.historico || [])
						}

						state.cidades.push(_result)

						mongo_precos.splice(mongo_state_index, 1, state)
					}

				}
			} else {
				// SE NAO TIVER ESSE ESTADO

				if (state_index !== -1) {
					const region_index = precos[state_index].cidades.findIndex(({ cidade_id }) => cidade_id === local.cidade._id)

					if (region_index !== -1) {
						const price = precos[state_index].cidades[region_index]

						price.maior_preco.supermercado_id = {
							...price.maior_preco.supermercado_id,
							_id: String(price.maior_preco.supermercado_id._id).length ? new ObjectId(price.maior_preco.supermercado_id._id) : ''
						}

						price.menor_preco.supermercado_id = {
							...price.menor_preco.supermercado_id,
							_id: String(price.menor_preco.supermercado_id._id).length ? new ObjectId(price.menor_preco.supermercado_id._id) : ''
						}

						price.maior_preco.api = !!String(price.maior_preco.supermercado_id._id).length
						price.menor_preco.api = !!String(price.menor_preco.supermercado_id._id).length

						price.historico = price.historico.filter(historico => !historico.api)

						const history_reversed = price.historico
							.filter(historico => String(historico.supermercado_id._id).length)

						history_latest_by_supermarket = history_reversed.reverse()
							.filter(({ supermercado_id: { _id: id1 } }, index) => history_reversed.findIndex(({ supermercado_id: { _id: id2 } }) => String(id1) === String(id2) === index))

						const _result = {
							estado_id: local.estado._id,
							cidades: [{
								cidade_id: local.cidade._id,
								menor_preco: {
									...price.menor_preco,
									data: new Date
								},
								maior_preco: price.maior_preco.preco_u !== '0' ? {
									...price.maior_preco,
									data: new Date
								} : {
									supermercado_id: {
										_id: '',
										cache_id: 0
									},
									preco_u: '0'
								},
								historico: functions.sortHistoric(price.historico || [])
							}]
						}

						mongo_precos.push(_result)
					}

				}

			}

			const updatePricesInSupermarkets = history_latest_by_supermarket
				.map(({ preco_u, supermercado_id, atualizado }) => ({
					async fn() {
						try {
							const supermarket = await db.supermarket.findOne({
								_id: new ObjectId(supermercado_id._id)
							}, { produtos: 1, nome: 1 })

							let products = supermarket.produtos

							// console.log('updatePricesInSupermarkets products')
							// console.log(products)

							const productIndex = products.findIndex(({ produto_id }) => String(produto_id._id) === String(mongo_data._id))

							if (!atualizado) {
								if (moment) {
									atualizado = moment
								} else {
									atualizado = functions.date()
								}
							}

							if (productIndex !== -1) {
								products[productIndex].preco_u = preco_u
								products[productIndex].atualizado = atualizado
							} else {
								products = [...products, {
									produto_id: {
										_id: new ObjectId(mongo_data._id),
										cache_id: 0
									},
									preco_u, atualizado
								}]
							}

							const produtos = await db.product.aggregate([{
								$match: {
									_id: {
										$in: products
											.filter(({ produto_id: { _id } }) => String(_id).length)
											.map(({ produto_id: { _id } }) => new ObjectId(_id))
									}
								}
							}, {
								$project: {
									_id: 1
								}
							}]).toArray()

							// (DET) IMPEDIR QUE OS PRODUTOS DO SUPERMERCADO TENHA PRODUTOS QUE JÁ FORAM EXCLUIDOS
							products = products.filter(({ produto_id }) => produtos.some(({ _id }) => String(_id) === String(produto_id._id)))

							// console.log('antes de atualizar os produtos do supermercado')
							// console.log(products)

							await db.supermarket.updateOne({
								_id: new ObjectId(supermercado_id._id)
							}, {
								$set: { produtos: products }
							})

							await pushNotificationControllers
								.notify({
									_id: mongo_data ? mongo_data._id : data.api_id,
									produto_nome: mongo_data ? mongo_data.nome : data.nome,
									produto_peso: mongo_data ? mongo_data.peso : data.peso,
									produto_sabor: mongo_data ? mongo_data.sabor : data.sabor,
									preco_u, local: {
										estado: {
											...local.estado,
											cache_id: local.estado._id
										},
										cidade: {
											...local.cidade,
											cache_id: local.cidade._id
										}
									},
									supermercado_nome: supermarket.nome,
									moment: atualizado, db, push_token
								})

						} catch (e) {
							console.error(e)
						}
					}
				}))

			await functions.middlewareAsync(...updatePricesInSupermarkets)

			// // console.log('product._update end', { mongo_precos })

			const updateData = { precos: mongo_precos, nivel: mongo_precos && mongo_data.nivel > 2 ? 2 : mongo_data.nivel }

			const precos_response = [
				mongo_precos[state_index]
			]

			await db.product.updateOne({
				_id: new ObjectId(mongo_data ? mongo_data._id : data.api_id)
			}, { $set: updateData })

			response = { ...mongo_data, ...updateData, precos: precos_response }
		}

		return { ...response, cache_id: data.cache_id }

	} catch (e) {
		console.error(e)
		return data
	}
}

exports.updatePrices = async ({
	_id, local = {}, preco_u, moment,
	finished, db, push_token,
	supermercado_id, supermercado_nome
}) => {
	return new Promise(async (resolve, reject) => {
		const produto = await db.product.findOne({
			_id: new ObjectId(_id)
		}, { precos: 1, nivel: 1, nome: 1, peso: 1, sabor: 1 })

		const supermercado = await db.supermarket.findOne({
			_id: new ObjectId(supermercado_id._id)
		}, { _id: 1, produtos: 1, nome: 1, local: 1 })

		if (produto && supermercado) {

			const updateInProduct = async () => {
				try {
					const { estado, cidade } = supermercado.local

					const prices = [...produto.precos]

					let newPrices = []

					if (!moment) {
						moment = functions.date()
					}

					supermercado_id = {
						cache_id: supermercado_id.cache_id,
						_id: new ObjectId(supermercado_id._id)
					}

					const historico = {
						api: true,
						data: moment,
						preco_u,
						supermercado_id
					}

					const state_index = prices.findIndex(preco => preco.estado_id === estado.cache_id)

					if (state_index !== -1) {
						const state = prices[state_index]

						const region_index = prices[state_index].cidades.findIndex(({ cidade_id }) => cidade_id === cidade.cache_id)

						if (region_index !== -1) {
							const price = prices[state_index].cidades[region_index]

							price.historico = functions.sortHistoric([historico, ...price.historico])

							// (END) VERIFICAR O TEMPO EM QUE FOI REGISTRADO E ZERAR OU ATUALIZAR POR UM MAIS RECENTE
							// IMPEDIR QUE UM PREÇO FIQUE SEMPRE COMO MENOR PREÇO POR CONTA DA INFLAÇÃO (VALORES TENDEM A SUBIR)

							if (
								+price.menor_preco.preco_u === 0 ||
								+price.menor_preco.preco_u > +preco_u ||
								functions.daysAgo(price.menor_preco.data) > process.env.DAYS_AGO
							) {
								if (
									+price.maior_preco.preco_u === 0 ||
									(
										functions.daysAgo(price.maior_preco.data) > process.env.DAYS_AGO &&
										functions.daysAgo(price.menor_preco.data) < process.env.DAYS_AGO
									)
								) {
									price.maior_preco.preco_u = price.menor_preco.preco_u
									price.maior_preco.supermercado_id = price.menor_preco.supermercado_id
									price.maior_preco.data = price.menor_preco.data
									price.maior_preco.api = true
								} else if (
									// (DESC) CASO O menor_preco SEJA ATUALIZADO SÓ PORQUE ESTÁ VENCIDO, ZERAR O maior_preco PRA NÃO TER INCONCISTÊNCIA
									functions.daysAgo(price.menor_preco.data) > process.env.DAYS_AGO
								) {
									price.maior_preco = {
										supermercado_id: {
											_id: '',
											cache_id: 0
										},
										preco_u: '0',
										api: false
									}
								}

								price.menor_preco.preco_u = preco_u
								price.menor_preco.supermercado_id = supermercado_id
								price.menor_preco.data = new Date
								price.menor_preco.api = true

							} else if (
								+price.maior_preco.preco_u === 0 ||
								+price.maior_preco.preco_u < +preco_u ||
								functions.daysAgo(price.maior_preco.data) > process.env.DAYS_AGO
							) {

								price.maior_preco.preco_u = preco_u
								price.maior_preco.supermercado_id = supermercado_id
								price.maior_preco.data = new Date
								price.maior_preco.api = true
							}

							const cidades = prices[state_index].cidades

							price.maior_preco.supermercado_id = {
								...price.maior_preco.supermercado_id,
								_id: String(price.maior_preco.supermercado_id._id).length ? new ObjectId(price.maior_preco.supermercado_id._id) : ''
							}

							price.menor_preco.supermercado_id = {
								...price.menor_preco.supermercado_id,
								_id: String(price.menor_preco.supermercado_id._id).length ? new ObjectId(price.menor_preco.supermercado_id._id) : ''
							}

							cidades.splice(region_index, 1, price)

							prices[state_index].cidades = cidades
						} else {
							// SE NAO TIVER ESSE cidade

							const menor_preco = {
								api: true,
								data: new Date,
								preco_u,
								supermercado_id
							}

							const maior_preco = {
								supermercado_id: {
									_id: '',
									cache_id: 0
								}, preco_u: '0', api: false
							}

							const _result = {
								cidade_id: cidade.cache_id,
								menor_preco,
								maior_preco,
								historico: [historico]
							}

							state.cidades.push(_result)

							prices.splice(state_index, 1, state)
						}
					} else {
						// SE NAO TIVER ESSE ESTADO

						const menor_preco = {
							api: true,
							data: new Date,
							preco_u,
							supermercado_id
						}

						const maior_preco = {
							supermercado_id: {
								_id: '',
								cache_id: 0
							}, preco_u: '0', api: false
						}

						const _result = {
							estado_id: estado.cache_id,
							cidades: [{
								cidade_id: cidade.cache_id,
								menor_preco,
								maior_preco,
								historico: [historico]
							}]
						}

						prices.push(_result)
					}

					newPrices = [...prices]

					const data_update = {
						precos: newPrices
					}

					const updateData = { ...data_update, nivel: prices.length && produto.nivel > 2 ? 2 : produto.nivel }

					await db.product.updateOne({
						_id: new ObjectId(_id)
					}, {
						$set: updateData
					})
				} catch (e) {
					console.log(e)
				}
			}

			await updateInProduct()

			await pushNotificationControllers
				.notify({
					_id, preco_u, 
					moment, db,
					local: supermercado.local, 
					supermercado_nome: supermercado.nome,
					produto_nome: produto.nome,
					produto_peso: produto.peso,
					produto_sabor: produto.sabor,
					push_token
				})

			resolve('')

		} else {
			reject('')
		}
	})
}

exports.store = async (req, res) => {
	// Ok
	try {

		const {
			hash_identify_device = ''
		} = req.body

		// console.log('product.store ', req.body)

		const data = await this.save({
			data: req.body, hash_identify_device, db: req.db
		})

		res.status(201).json({ ok: !!data, data })

	} catch (err) {
		console.log(err)
		res.status(500).send()
	}
}

exports.index = async (req, res) => {
	// OK

	try {
		let { page = 1 } = req.params

		page = +page

		let {
			limit: limitQuery,
			nome = '', nivel
		} = req.query

		if (!limitQuery) {
			limitQuery = limit
		}

		limitQuery = +limitQuery

		const options = [{
			$sort: {
				created_at: -1
			}
		}]

		if (nome.length || nivel) {

			const $match = {}

			if (nome.length) {
				const regex = new RegExp(functions.keyWord(nome))

				$match.nome_key = {
					$regex: regex
				}
			}

			if (nivel) {
				$match.nivel = +nivel
			}

			options.unshift({
				$match
			})
		}

		options.push({
			$group: {
				_id: '$_id',
				doc: { $first: "$$ROOT" }
			}
		}, {
			$replaceRoot: {
				newRoot: { $mergeObjects: ['$doc', { precos: [] }] }
			}
		}, {
			$lookup: {
				from: 'brand',
				foreignField: '_id',
				localField: 'marca_id._id',
				as: 'marca_obj'
			}
		})

		const optionsPaginated = [{
			$skip: (limitQuery * page) - limitQuery
		}, {
			$limit: limitQuery
		}]

		const [{ documents, postsCounted }] = await req.db.product.aggregate([{
			$facet: {
				documents: [
					...options,
					...optionsPaginated
				],
				postsCounted: [
					...options,
					...optionsCounted
				]
			}
		}]).toArray()

		let count = 0

		if (postsCounted.length) {
			count = postsCounted[0].count
		}

		res.status(200).json({ ok: true, data: documents, limit: limitQuery, count, page })

	} catch (err) {
		console.log('index()', err)
		res.status(500).send()
	}
}

exports.all = async (req, res) => {
	// OK
	// (DESC) BUSCAR PARA DOWNLOAD AUTOMATICO SOMENTE PRODUTOS APROVADOS PELO GESTOR

	const { locale, noIds = [], enable_prices } = req.body

	if (!locale) {
		throw new Error('Localização vazia')
	}

	const { uf, mn } = locale

	try {

		let documents = await req.db.product.aggregate([{
			$match: {
				nivel: 1,
				_id: {
					$nin: noIds.map(_id => new ObjectId(_id))
				}
			}
		}, {
			$sort: {
				created_at: -1
			}
		}, {
			$lookup: {
				from: 'brand',
				localField: 'marca_id._id',
				foreignField: '_id',
				as: 'marca_obj'
			}
		}]).toArray()

		documents = documents.map(document => {
			// (DET) LOGICA DE ENTREGAR OU NÃO OS PREÇOS JÁ REGISTRADOS
			if (noIds.some(_id => _id === String(document._id))) {
				document.precos = []
			} else {
				const preco = {
					preco_u: '0',
					supermercado_id: {
						cache_id: 0,
						_id: ''
					}
				}
	
				const response = {
					estado_id: uf,
					cidades: [{
						cidade_id: mn,
						menor_preco: preco,
						maior_preco: preco,
						historico: []
					}]
				}
	
				const state_index = document.precos.findIndex(({ estado_id }) => estado_id === uf)
	
				if (state_index !== -1) {
					const state = document.precos[state_index]
	
					const region_index = state.cidades.findIndex(({ cidade_id }) => cidade_id === mn)
	
					if (region_index !== -1) {
						const region = state.cidades[region_index]
	
						response.cidades = [region]
					}
				}

				document.precos = [response]
			}

			return document
		})

		res.status(200).json(documents)
	} catch (err) {
		console.error(err)
		res.status(500).send()
	}
}

exports.single = async (req, res) => {
	try {
		let { id, page = 1 } = req.params
		page = +page

		let {
			select = '',
			target,
			limit: limitQuery
		} = req.query

		const {
			local,
			undefineds = []
		} = req.body

		if (!limitQuery) {
			limitQuery = limit
		}

		limitQuery = +limitQuery

		// console.log('product.single query', req.query)
		// console.log('product.single params', req.params)
		// console.log('product.single body', req.body)

		const options = {}

		if (select.length) {
			options.projection = functions.stringToObj(select)
		}

		let single = await req.db.product.findOne({
			_id: new ObjectId(id),
			nivel: {
				$in: [1, 2]
			}
		}, options)

		if (single) {
			switch (target) {
				case 'app-single-product':
				case 'app-prices-update':
					const prices = single.precos

					const { estado = {}, cidade = {} } = local

					const { _id: uf } = estado
					const { _id: mn } = cidade

					if (!uf || !mn) {
						return res.status(400).send()
					}

					let historic = [],
						menor_preco,
						count = 0,
						range = {}

					const state_index = prices.findIndex(({ estado_id }) => estado_id === uf)

					if (state_index !== -1) {
						const state = prices[state_index]

						const region_index = state.cidades.findIndex(({ cidade_id }) => cidade_id === mn)

						if (region_index !== -1) {
							const region = state.cidades[region_index]

							count = region.historico.length

							menor_preco = region.historico[0]

							range = {
								menor_preco: region.menor_preco,
								maior_preco: region.maior_preco
							}

							if (target === 'app-single-product') {

								// (END) REFATORAR PARA UMA UNICA CONSULTA
								const historic_paginaed = region.historico.slice((page * limitQuery) - limitQuery, (page * limitQuery))

								const supermarketsMiddleware = historic_paginaed.map((preco, index) => ({
									async fn() {
										const [supermarket] = await req.db.supermarket.aggregate([{
											$match: {
												_id: new ObjectId(preco.supermercado_id._id)
											}
										}, {
											$group: {
												_id: '$_id',
												doc: { $first: "$$ROOT" }
											}
										}, {
											$replaceRoot: {
												newRoot: { $mergeObjects: ['$doc', { produtos: [] }] }
											}
										}]).toArray()

										historic[index] = {
											...preco,
											supermercado_obj: {
												...supermarket,
												produtos: [],
												_id: 0,
												api: true,
												api_id: supermarket._id
											},
											// preco_u: preco.preco,
											// supermercado_id: preco.supermercado_id,
											// data: preco.data
										}
									}
								}))

								supermarketsMiddleware.length && await functions.middlewareAsync(...supermarketsMiddleware)
							} else {
								historic = region.historico
							}
						}
					}
					res.status(200).json({
						ok: true, data: historic,
						menor_preco, range,
						limit: limitQuery, count
					})
					break
				case 'app-single-product-watch':
					const getLocale = (precos = []) => {
						const state = precos.find(({ estado_id }) => estado_id === local.estado._id)

						if (state) {
							const region = state.cidades.find(({ cidade_id }) => cidade_id === local.cidade._id)

							if (region) {

								return {
									menor_preco: region.menor_preco,
									maior_preco: region.maior_preco
								}
							}
						}
					}

					const data = getLocale(single.precos)

					// console.log('response', data)

					res.status(200).json({ ok: !!data, data })

					break
				default:
					single = functions.setUndefineds({
						data: single,
						undefineds
					})

					res.status(200).json({ ok: true, data: single })
			}

		} else {
			console.log('Produto não aprovado ou interagido')
			res.status(400).send()
		}

	} catch (error) {
		console.error(error)
		res.status(500).send()
	}
}

exports.indexList = async (req, res) => {
	try {

		const { allLevel } = req.query

		const { ids = [] } = req.body

		const optionsMatch = [{
			$match: {
				nivel: {
					[allLevel ? '$nin' : '$in']: allLevel ? [0] : [1, 2]
				},
				_id: {
					[ids.length ? '$in' : '$nin']: ids.length ? ids.map(id => new ObjectId(id)) : []
				}
			}
		}]

		const optionsDocuments = [{
			$sort: {
				created_at: -1
			}
		}, {
			$lookup: {
				from: 'brand',
				localField: 'marca_id._id',
				foreignField: '_id',
				as: 'marca_obj'
			}
		}, {
			$group: {
				_id: '$_id',
				doc: { $first: '$$ROOT' }
			}
		}, {
			$replaceRoot: {
				newRoot: { $mergeObjects: ['$doc', { precos: [] }] }
			}
		}]

		const documents = await req.db.product.aggregate([
			...optionsMatch,
			...optionsDocuments
		]).toArray()

		res.status(200).json({ ok: true, data: documents })

	} catch (e) {
		console.log(e)
		res.status(500).send()
	}
}

exports.indexBy = async (req, res) => {
	try {

		const { body } = req

		const { page = 1 } = req.params

		let { limit: limitQuery } = req.query

		if (!limitQuery) {
			limitQuery = limit
		}

		limitQuery = +limitQuery

		const where = {
			request_ids: body.where.ids || [],
			observer_ids: [],
			types_ids: [],
			names_ids: [],
			supermarket_ids: [],
			brand_ids: [],
			favorites_ids: body.where.favoritos || [],
			not_ids: body.ids || []
		}
		const { local, no_page, allLevel, push_token = '' } = body

		if (body.where.nome && body.where.nome.length) {

			const regex = new RegExp(functions.keyWord(body.where.nome))

			const products_by_name = await req.db.product.aggregate([
				{
					$match: {
						nome_key: { $regex: regex }
					}
				}, {
					$project: {
						_id: 1
					}
				}
			]).toArray()

			if (products_by_name) {
				products_by_name.forEach(({ _id }) => {
					where.names_ids.push(_id)
				})
			}
		}

		if (body.where.observados) {
			// PEGAR ids DOS PRODUTOS OBSERVADOR POR ESSE push_token E local

			const observer_products = await req.db.watch.aggregate({
				$match: {
					push_token,
					'local.estado.cache_id': {
						$in: [+local.estado.cache_id, 0]
					},
					'local.cidade.cache_id': {
						$in: [+local.cidade.cache_id, 0]
					}
				}
			}, {
				$project: {
					_id: 0,
					produto_id: 1
				}
			}).toArray()

			if (observer_products) {
				observer_products.forEach(({ produto_id }) => {
					where.observer_ids.push(produto_id._id)
				})
			}
		}

		if (typeof body.supermercado_id === 'string' && body.supermercado_id.length) {
			// PEGAR ids DOS PRODUTOS DO SUPERMERCADO

			const products_by_supermarket = await req.db.supermarket.findOne({
				_id: new ObjectId(body.supermercado_id)
			}, {
				projection: {
					produtos: 1
				}
			})

			if (products_by_supermarket) {
				const newIds = products_by_supermarket.produtos
					.map(({ produto_id }) => produto_id._id)

				where.supermarket_ids = newIds
			}
		}

		if (typeof body.marca_id === 'string' && body.marca_id.length) {
			// PEGAR ids DOS PRODUTOS DO MARCA

			const products_by_brand = await req.db.product.aggregate([{
				$match: {
					'marca_id._id': new ObjectId(body.marca_id)
				}
			}, {
				$project: {
					_id: 1
				}
			}]).toArray()

			if (products_by_brand) {
				const newIds = products_by_brand.map(({ _id }) => _id)

				where.brand_ids = newIds
			}
		}

		if (body.where.tipos && body.where.tipos.length) {
			const product_by_types = await req.db.product.aggregate([{
				$match: {
					'tipo.texto_key': {
						$in: body.where.tipos.map(v => functions.keyWord(v))
					}
				}
			}, {
				$project: {
					_id: 1
				}
			}]).toArray()

			if (product_by_types) {
				where.types_ids = product_by_types
					.map(({ _id }) => _id)
			}
		}

		const then = async documents => {
			res.status(200).json({ ok: true, data: documents, limit: limitQuery })
		}

		let ids = [...new Set([
			...where.names_ids,
			...where.types_ids,
			...where.supermarket_ids,
			...where.observer_ids,
			...where.brand_ids,
			...where.favorites_ids,
			...where.request_ids
		].map(_id => new ObjectId(_id)))]

		// console.log({ where, ids })

		if (body.where.favoritos) {
			ids = ids.filter(_id => where.favorites_ids.some(w_id => String(w_id) === String(_id)))
		}

		if (body.where.observados) {
			ids = ids.filter(_id => where.observer_ids.some(w_id => String(w_id) === String(_id)))
		}

		if (body.where.tipos && body.where.tipos.length) {
			ids = ids.filter(_id => where.types_ids.some(w_id => String(w_id) === String(_id)))
		}

		if (body.where.nome && body.where.nome.length) {
			ids = ids.filter(_id => where.names_ids.some(w_id => String(w_id) === String(_id)))
		}

		if (typeof body.marca_id === 'string' && body.marca_id.length) {
			ids = ids.filter(_id => where.brand_ids.some(w_id => String(w_id) === String(_id)))
		}

		if (typeof body.supermercado_id === 'string' && body.supermercado_id.length) {
			ids = ids.filter(_id => where.supermarket_ids.some(w_id => String(w_id) === String(_id)))
		}

		const filterMatch = {
			_id: {
				$nin: where.not_ids.map(_id => new ObjectId(_id))
			}
		}

		const optionsMatch = allLevel ? {} : {
			nivel: {
				$in: [1, 2]
			}
		}

		const optionsDocuments = [{
			$sort: {
				created_at: -1
			}
		}, {
			$lookup: {
				from: 'brand',
				localField: 'marca_id._id',
				foreignField: '_id',
				as: 'marca_obj'
			}
		}, {
			$group: {
				_id: '$_id',
				doc: { $first: '$$ROOT' }
			}
		}, {
			$replaceRoot: {
				newRoot: { $mergeObjects: ['$doc', { precos: [] }] }
			}
		}]

		const optionsPaginated = [{
			$skip: (limitQuery * page) - limitQuery
		}, {
			$limit: limitQuery
		}]

		const clean_search = async () => {
			const documents = await req.db.product.aggregate([
				{
					$match: {
						...optionsMatch,
					}
				},
				...optionsDocuments,
				...optionsPaginated
			]).toArray()

			await then(documents)
		}

		const filter_search = async () => {
			const options = {
				$match: {
					...optionsMatch,
					...filterMatch
				}
			}

			if (no_page) {

				const documents = await req.db.product.aggregate([
					options,
					...optionsDocuments
				]).toArray()

				await then(documents)
			} else {
				const documents = await req.db.product.aggregate([
					options,
					...optionsDocuments,
					...optionsPaginated
				]).toArray()

				await then(documents)
			}
		}


		if (ids.length) {
			await filter_search()
		} else {
			if (
				(
					body.where.favoritos ||
					body.where.observados ||
					body.where.nome.length ||
					body.where.marca_id ||
					body.where.supermercado_id ||
					body.where.ids
				) && body.where.tipos.length
			) {
				await filter_search()
			} else {
				await clean_search()
			}
		}

	} catch (error) {
		console.log('indexBy()', error)
		res.status(500).send()
	}

}

exports.update = async (req, res) => {
	// OK

	try {

		const { id } = req.params

		if (typeof id !== 'string')
			throw new Error()

		const data = req.body

		delete data._id

		if (data.marca_id) {
			data.sem_marca = !data.marca_id._id.length

			data.marca_id = {
				_id: data.marca_id._id.length ? new ObjectId(data.marca_id._id) : '',
				cache_id: 0
			}
		}

		if (data.sem_marca) {
			data.marca_id = {
				_id: '',
				cache_id: 0
			}
		}

		// const sem_marca = !(data.marca && data.marca.nome.length)

		if (!data.sem_marca && data.marca) {
			const marca_nome = data.marca.nome

			let data_marca = await req.db.brand.findOne({
				nome_key: functions.keyWord(marca_nome)
			}, { projection: { nome: 1 } })

			if (!data_marca) {
				const { insertedId } = await req.db.brand.insertOne({
					nome: marca_nome,
					nome_key: functions.keyWord(marca_nome)
				})

				data_marca = {
					_id: insertedId
				}

			}

			data.marca_id = {
				_id: data_marca._id,
				cache_id: 0
			}
		}	

		delete data.marca

		if (data.sabor && data.sabor.nome.length) {
			data.sabor = {
				nome: data.sabor.nome, nome_key: functions.keyWord(data.sabor.nome),
				definido: true
			}
		}

		if (data.tipo && data.tipo.texto.length) {
			data.tipo = {
				texto: data.tipo.texto, texto_key: functions.keyWord(data.tipo.texto)
			}
		}

		if (data.nome && data.nome.length) {
			data.nome_key = functions.keyWord(data.nome)
		}

		await req.db.product.updateOne({
			_id: new ObjectId(id)
		}, {
			$set: data
		})

		res.status(200).send()
	} catch (e) {
		console.error(e)
		res.status(500).send()
	}
}

// exports.updateMany = async (req, res) => {
//   try {
//     // (END) SEM USO

//     const {
//       data = [], local, moment, campo, supermercado_id, finished
//     } = req.body

//     // console.log('updateMany', req.body)

//     const updates = data.map(({ produto_id, data }) => ({
//       async fn() {
//         try {

//           if (campo == 'precos') {
//             await this.updatePrices({
//               _id: produto_id._id,
//               local, moment, preco_u: data.preco_u, supermercado_id, finished, db: req.db
//             })
//           }

//         } catch(e) {
//           console.error(e)
//         }
//       }
//     }))

//     updates.length && await functions.middlewareAsync(...updates)

//     res.status(200).json({ ok: true })

//   } catch(e) {
//     console.error(e)
//     res.status(500).send()
//   }
// }

exports.remove = async (req, res) => {
	// OK

	try {

		const { id } = req.params

		if (typeof id !== 'string')
			throw new Error()

		const deleteBrand = async () => {
			try {
				const product = await req.db.product.findOne({
					_id: new ObjectId(id)
				}, {
					projection: {
						marca_id: 1
					}
				})

				if (String(product.marca_id._id).length) {
					const other = await req.db.product.findOne({
						_id: {
							$ne: new ObjectId(id)
						},
						'marca_id._id': product.marca_id._id
					}, {
						projection: {
							_id: 1
						}
					})

					if (!other) {
						await req.db.brand.deleteOne({
							_id: product.marca_id._id
						})
					}
				}
			} catch (e) {
				console.error(e)
			}
		}

		const deleteWatches = async () => {
			try {
				await req.db.watch.deleteMany({
					'produto_id._id': new ObjectId(id)
				})
			} catch (e) {
				console.error(e)
			}
		}

		const deleteInSupermarket = async () => {
			try {
				const supermarkets = await req.db.supermarket.aggregate([{
					$match: {
						'produtos.produto_id._id': new ObjectId(id)
					}
				}, {
					$project: {
						produtos: 1
					}
				}]).toArray()

				if (supermarkets.length) {
					const stack = supermarkets.map(supermarket => ({
						async fn() {
							try {
								const produtos = supermarket.produtos.filter(({ produto_id }) => String(produto_id._id) !== id)

								await req.db.supermarket.updateOne({
									_id: supermarket._id
								}, {
									$set: {
										produtos
									}
								})
							} catch (e) {
								console.error(e)
							}
						}
					}))

					await functions.middlewareAsync(...stack)
				}
			} catch (e) {
				console.error(e)
			}
		}

		!req.noDeleteReferences && await deleteBrand()

		await deleteInSupermarket()

		await deleteWatches()

		await req.db.product.deleteOne({
			_id: new ObjectId(id)
		})

		await req.db.report.deleteMany({
			reporte_id: new ObjectId(id)
		})

		!req.noDeleteReferences && res.status(200).send()

	} catch (e) {
		!req.noDeleteReferences ? res.status(500).send(e) : console.error(e)
	}
}

