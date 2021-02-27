const { Schema, model } = require('mongoose')

const AnswerType =  new Schema({
	title: {
		type: String,
		default : ''
	},
	alternatives: [{
		score: Number,
		answer_id: {
			type: Schema.Types.ObjectId,
			required: true
		}
	}]
}, {
	timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

module.exports = model('answer-type', AnswerType)
