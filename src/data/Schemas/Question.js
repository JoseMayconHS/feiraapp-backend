const { Schema, model } = require('mongoose')

const Question = new Schema({
  answers_id: {
    type: String,
    default: ''
  },
  status: {
    type: Boolean,
    default: false
  },
  text: {
    us: {
      type: String,
      default: ''
    },
    pt: {
      type: String,
      default: ''
    }
  }
}, {
  timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

module.exports = model('question', Question)
