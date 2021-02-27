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
		type: Schema.Types.ObjectId,
		required: true
	},
	peso: {
		tipo: {
			type: String,
			required: true
		},
		valor: {
			type: Number,
			required: true
		}
	},

	precos: {
		type: [{
			id: Schema.Types.ObjectId,
			sigla: String,
			municipios: [{
				nome: String,
				estado_id: Schema.Types.ObjectId,
				menor_preco: {
					preco: Number,
					supermercado_id: Schema.Types.ObjectId,
					feira_id: Schema.Types.ObjectId
				},
				maior_preco: {
					preco: Number,
					supermercado_id: Schema.Types.ObjectId,
					feira_id: Schema.Types.ObjectId
				}
			}]
		}],
		default: []
	},
	marca: {
		marca_id: {
			type: Schema.Types.ObjectId,
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
