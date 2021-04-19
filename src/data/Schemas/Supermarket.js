const { Schema, model } = require('mongoose'),
	remove_accents = require('remove-accents'),
	{ locale, _default, identify } = require('./rest')

const Supermarket =  new Schema({
	nome: {
		type: String,
		required: true
	},
	nome_key: {
		type: String,
		required: true,
		default() {
			return remove_accents(this.nome).toLowerCase()
		}
	},
	local_estado_id: {
		type: Number,
		required: false,
	},
	local_municipio_id: {
		type: Number,
		required: false,
	},
	classificacao: {
		type: Number,
		default: 0
	},
	tot_produtos: {
		type: Number,
		deafult: 0
	},
	produtos: {
		type: [{
			produto_id: identify,
			preco: {
				type: String,
				required: true
			}, 
			atualizado: {
				dia: Number,
				mes: Number,
				ano: Number,
				hora: String
			}
		}],
		default: []
	},
	local: locale,
	..._default,
}, {
	timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

Supermarket.pre('findOneAndUpdate', function (next) {

	if (this._update.produtos) {
		this._update.tot_produtos = this._update.produtos.length
	}
	
	next()
})

module.exports = model('supermercado', Supermarket)
