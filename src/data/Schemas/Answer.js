const { Schema, model } = require('mongoose')

const Answer =  new Schema({
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

module.exports = model('answer', Answer)
