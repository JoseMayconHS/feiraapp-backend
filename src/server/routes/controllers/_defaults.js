const functions = require('../../../functions')

exports.storeList = ({
  save, update, schema
}) => {
  return async (req, res) => {
    // Ok
    try {
  
      const {
        data = [], hash_identify_device = '', local
      } = req.body
  
      const response = []
  
      const stacks = data.map(item => ({
        async fn() {
          try {
            let data

            if (item.api_id.length) {
              data = await update({
                data: item, hash_identify_device, local, db: req.db
              })
            } else {
              data = await save({
                data: item, hash_identify_device, local, db: req.db
              })
            }

            data && response.push(data)
  
          } catch(e) {
            console.error(e)
          }
        }
      }))
  
      stacks.length && await functions.middlewareAsync(...stacks)
  
      res.status(201).json({ ok: true, data: response })
  
    } catch(err) {
      console.log(err)
      res.status(500).send()
    }
  }
}

exports.store = save => {
  return async (req, res) => {
    try { 
      const { 
        hash_identify_device = ''
      } = req.body
  
      // console.log('_defaults.store', req.body)
      
      const data = await save({
        data: req.body, hash_identify_device, db: req.db
      })
  
      res.status(201).json({ ok: !!data, data })
    } catch(e) {
      res.status(500).send()
    }
  }
} 
