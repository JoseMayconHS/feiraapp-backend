const { Schema, model } = require('mongoose')

const Brand =  new Schema({
	nome: {
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
