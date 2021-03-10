const { Schema, model } = require('mongoose')

const Supermarket =  new Schema({
	cache_id: {
		type: Number,
		default: 0
	},
	hash_identify_device: {
		type: String,
		default: ''
	},
	nome: {
		type: String,
		required: true
	},
	local: {
		estado: {
			id: Number,
			nome: String,
			sigla: String,
		},
		municipio: {
			id: Number,
			nome: String,
		}
	},
	classificacao: {
		type: Number,
		default: 0
	},
	produtos: {
		type: [{
			produto_id: {
				type: String,
				required: true
			},
			preco: {
				type: String,
				required: true
			}
		}],
		default: []
	}
}, {
	timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

module.exports = model('supermercado', Supermarket)
