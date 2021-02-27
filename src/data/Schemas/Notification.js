const { Schema, model } = require('mongoose')

const Notfication = new Schema({
  date: String,
  success: Boolean,
  title: String,
  body: String,
  adm_id: Schema.Types.ObjectId
}, {
  timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

module.exports = model('notification', Notfication)
