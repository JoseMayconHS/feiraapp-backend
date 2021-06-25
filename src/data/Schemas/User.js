const { Schema, model } = require('mongoose')

const User = new Schema({
	expo_token: {
		type: String,
		default: ''
	},
	google_id: {
		type: String,
		default: ''
	},
	facebook_id: {
		type: String,
		default: ''
	},
	google_auth: {
		type: Boolean,
		default: false
	},
	facebook_auth: {
		type: Boolean,
		default: false
	},
	username: {
		type: String,
		required: true
	},
	email: {
		type: String,
		required: true,
		validate: /^[\w+.]+@\w+\.\w{2,}(?:\.\w{2})?$/,
		unique: true
	},
	password: {
		type: String,
		default: ''
	},
	second_password: {
		type: String,
		default: ''
	},
	pro: {
		type: Number,
		default: 0
	},
	status: {
		type: Boolean,
		default: true
	},
	local: {
		estado: {
			id: Number,
			nome: String,
			sigla: String,
		},
		cidade: {
			id: Number,
			nome: String,
		}
	},
	produtos: {
		type: [{
			cache_id: {
				type: Number,
				default: 0
			},
			_id: {
				type: String,
				default: ''
			}
		}],
		default: []
	},
	compras: {
		type: [{
			supermercado_id: {
				type: {
					cache_id: {
						type: Number,
						default: 0
					},
					_id: {
						type: String,
						default: ''
					}
				}, 
				default: {}
			},
			descricao: {
				type: String,
				default: ''
			},
			favorito: {
				type: Boolean,
				default: false
			},
			data: {
				type: {
					ano: {
						type: Number,
						required: true
					},
					dia: {
						type: Number,
						required: true
					},
					mes: {
						type: Number,
						required: true
					},
				}
			},
			produtos: {
				type: [{
					produto_id: {
						type: {
							cache_id: {
								type: Number,
								default: 0
							},
							_id: {
								type: String,
								default: ''
							}
						}
					},
					quantidade: {
						type: Number,
						default: 1,
					},
					preco: {
						type: String,
						default: '0'
					}
				}],
				default: []
			} 
		}],
		default: []
	}
}, {
	timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

module.exports = model('user', User)
