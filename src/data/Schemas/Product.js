const { Schema, model } = require('mongoose'),
	remove_accents = require('remove-accents'),
	{ _default, identify } = require('./rest'),
	functions = require('../../functions')

const preco_type = {
	preco_u: {
		type: String,
		default: '0'
	},
	supermercado_id: identify
}

const Product =  new Schema({
	supermercado_cache_id: {
		type: String,
		default: ''
	},
	nome: {
		type: String,
		set: functions.capitalize,
		required: true
	},
	nome_key: {
		type: String,
		default() {
			return remove_accents(this.nome).toLowerCase()
		}
	},
	nivel: {
		type: Number,
		default: 4
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
		type: {
			texto: {
				type: String,
				set: functions.capitalize,
				deafult: 'Utilitário'
			},
			texto_key: {
				type: String,
				default() {
					return remove_accents(this.tipo.texto).toLowerCase()
				}
			}
		}
	},
	sabor: {
		definido: {
			type: Boolean,
			default: false
		}, 
		nome: {
			type: String,
			set: functions.capitalize,
			default: ''
		},
		nome_key: {
			type: String,
			default() {
				return remove_accents(this.sabor.nome).toLowerCase()
			}
		}
	},
	peso: {
		tipo: {
			type: String,
			required: true,
			default: 'unidade'
		},
		valor: {
			type: String,
			required: true,
			default: '1'
		},
		force_down: {
      type: 'bool',
      default: false
    }
	},
	precos: {
		type: [{
			estado_id: Number,
			cidades: [{
				cidade_id: Number,
				menor_preco: preco_type,
				maior_preco: preco_type,
				historico: {
					type: [{
						...preco_type,
						data: {
							dia: {
								type: Number,
								required: true
							},
							mes: {
								type: Number,
								required: true
							},
							ano: {
								type: Number,
								required: true
							}
						}
					}],
					default: []
				}
			}]
		}],
		default: []
	},
	marca_id: identify,
	sem_marca: {
		type: Boolean,
		default: false
	},
	..._default
}, {
	timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

module.exports = model('produto', Product)
