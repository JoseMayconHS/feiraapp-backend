const { Schema, model } = require('mongoose')

const User = new Schema({
	expo_token: {
		type: String,
		default: ''
	},
	google_id: {
		type: String,
		default: ''
	},
	facebook_id: {
		type: String,
		default: ''
	},
	google_auth: {
		type: Boolean,
		default: false
	},
	facebook_auth: {
		type: Boolean,
		default: false
	},
	username: {
		type: String,
		required: true
	},
	email: {
		type: String,
		required: true,
		validate: /^[\w+.]+@\w+\.\w{2,}(?:\.\w{2})?$/,
		unique: true
	},
	password: {
		type: String,
		default: ''
	},
	second_password: {
		type: String,
		default: ''
	},
	pro: {
		type: Boolean,
		default: false
	},
	status: {
		type: Boolean,
		default: true
	},
	buy_date: {
		type: String,
		default: ''
	},
	language: {
		type: String,
		default: 'pt'
	},
	history: [{
		score: {
			type: Number,
			required: true
		}, 
		date: {
			day: {
				type: Number,
				required: true
			},
			month: {
				type: Number,
				required: true
			},
			year: {
				type: Number,
				required: true
			},
		},
		questions: [{
			question_id: {
				type: Schema.Types.ObjectId,
				required: false
			},
			answer_id: {
				type: Schema.Types.ObjectId,
				required: false
			}
		}]
	}]
}, {
	timestamps: { updatedAt: 'updated_at', createdAt: 'created_at' }
})

module.exports = model('user', User)
