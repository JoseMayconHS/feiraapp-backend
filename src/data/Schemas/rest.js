
module.exports = {
  _default: {
    cache_id: {
      type: Number,
      default: 0
    },
    hash_identify_device: {
      type: String,
      default: ''
    },
    status: {
      type: Boolean,
      default: true
    },
    info: {
      type: String,
      default: ''
    }
  },
  identify: {
    cache_id: {
      type: Number,
      default: 0
    },
    _id: {
      type: String,
      default: ''
    }
  },
  locale: {
		estado: {
			cache_id: Number,
			nome: String,
			sigla: String,
		},
		cidade: {
			estado_id: Number,
			cache_id: Number,
			nome: String,
		}
	}
}
