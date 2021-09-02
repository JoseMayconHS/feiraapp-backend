const { MongoClient, ServerApiVersion } = require('mongodb')

// const client = new MongoClient(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
const client = new MongoClient(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

module.exports = () => {
  return new Promise(resolve => {
    client.connect(err => {

      if (err) {
        return resolve()
      }

      console.log('Mongo conectado!')
  
      const db = client.db("app")
  
      let adm = db.collection("adm"),
        product = db.collection("product"),
        brand = db.collection("brand"),
        supermarket = db.collection("supermarket"),
        notification = db.collection("notification"),
        watch = db.collection("watch")
    
        if ([adm, product, brand, supermarket, notification, watch].includes(undefined)) {
          try {
            adm = db.createCollection('adm')
            product = db.createCollection('product')
            brand = db.createCollection('brand')
            supermarket = db.createCollection('supermarket')
            notification = db.createCollection('notification')
            watch = db.createCollection('watch')
          } catch(e) {
            console.log(e)
          }
        }

        resolve({
          adm, product, brand, supermarket, notification, watch
        })
        
      // perform actions on the collection object
      // client.close()
    });
  })
}

