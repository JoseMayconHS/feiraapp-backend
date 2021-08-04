const { Schema, model } = require('mongoose')

const Notfication = new Schema({
  date: String,
  success: Boolean,
  title: String,
  body: String,
  adm_id: Schema.Types.ObjectId,
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

module.exports = model('notification', Notfication)
