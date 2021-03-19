const { Schema, model } = require('mongoose')

const Brand =  new Schema({
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
	nome_key: {
		type: String,
		required: true
	},
	descricao: {
		type: String,
		default: ''
	}
}, {
	timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

module.exports = model('marca', Brand)
