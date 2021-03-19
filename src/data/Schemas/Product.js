const { Schema, model } = require('mongoose')

const Product =  new Schema({
	cache_id: {
		type: Number,
		default: 0
	},
	supermercado_cache_id: {
		type: String,
		default: ''
	},
	hash_identify_device: {
		type: String,
		default: ''
	},
	nome: {
		type: String,
		required: true
	},
	nome_key: {
		type: String,
		required: true
	},
	favorito: {
		type: Boolean,
		default: false
	},
	fixado: {
		type: Boolean,
		default: false
	},
	presenca: {
		type: Number,
		default: 0
	},
	tipo: {
		type: String,
		required: true
	},
	peso: {
		tipo: {
			type: String,
			required: true,
			default: 'unidade'
		},
		valor: {
			type: Number,
			required: true,
			default: 1
		}
	},

	precos: {
		type: [{
			estado_id: Number,
			sigla: String,
			nome: String,
			municipios: [{
				nome: String,
				municipio_id: Number,
				menor_preco: {
					preco: String,
					supermercado_id: String
				},
				maior_preco: {
					preco: String,
					supermercado_id: String
				}
			}]
		}],
		default: []
	},
	marca: {
		marca_id: {
			type: String,
			required: true
		},
		nome: { 
			type: String,
			required: true
		}
	}
	
}, {
	timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

module.exports = model('produto', Product)
