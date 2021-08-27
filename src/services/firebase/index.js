const admin = require("firebase-admin")

const serviceAccount = require("./private_key.json")

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
})

module.exports = admin
