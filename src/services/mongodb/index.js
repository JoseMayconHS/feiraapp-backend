const { MongoClient, ServerApiVersion } = require('mongodb')

const client = new MongoClient(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });
// const client = new MongoClient(process.env.MONGO_URL, { useNewUrlParser: true, useUnifiedTopology: true });

module.exports = () => {
  return new Promise(resolve => {
    client.connect(err => {

      if (err) {
        console.error(err)
        return resolve()
      }

      console.log('Mongo conectado!')
      
      const db = client.db("app")
  
      let adm = db.collection("adm"),
        product = db.collection("product"),
        brand = db.collection("brand"),
        supermarket = db.collection("supermarket"),
        notification = db.collection("notification"),
        push_tokens = db.collection("push_tokens"),
        watch = db.collection("watch")
        report = db.collection("report")
    
        if ([adm, product, brand, supermarket, notification, watch, push_tokens].includes(undefined)) {
          try {
            adm = db.createCollection('adm')
            product = db.createCollection('product')
            brand = db.createCollection('brand')
            supermarket = db.createCollection('supermarket')
            notification = db.createCollection('notification')
            push_tokens = db.createCollection('push_tokens')
            watch = db.createCollection('watch')
            report = db.collection("report")
          } catch(e) {
            console.error(e)
          }
        }

        resolve({
          adm, product, brand, supermarket, notification, watch, report, push_tokens
        })
        
      // perform actions on the collection object
      // client.close()
    });
  })
}

