const { Schema, model } = require('mongoose'),
	{ _default } = require('./rest')

const Brand =  new Schema({
	nome: {
		type: String,
		required: true
	},
	nome_key: {
		type: String,
		default() {
			return remove_accents(this.nome).toLowerCase()
		}
	},
	descricao: {
		type: String,
		default: ''
	},
	..._default
}, {
	timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

module.exports = model('marca', Brand)
