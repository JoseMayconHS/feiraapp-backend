const { Schema, model } = require('mongoose'),
  { identify, locale } = require('./rest')

const Watch = new Schema({
  push_token: {
    type: String,
    required: true
  },
  valor: {
    type: String,
    required: true
  },
  produto_id: identify,
  local: locale,
  cache_id: {
    type: Number,
    default: 0
  },
  hash_identify_device: {
    type: String,
    default: ''
  }
}, {
  timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

module.exports = model('observar', Watch)
