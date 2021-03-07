const { Schema, model } = require('mongoose')

const Product =  new Schema({
	nome: {
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
			sigla: String,
			municipios: [{
				nome: String,
				estado_id: Number,
				menor_preco: {
					preco: Number,
					supermercado_id: String,
					feira_id: String
				},
				maior_preco: {
					preco: Number,
					supermercado_id: String,
					feira_id: String
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
	},
	

}, {
	timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

module.exports = model('produto', Product)
