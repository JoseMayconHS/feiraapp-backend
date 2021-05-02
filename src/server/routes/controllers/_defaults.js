const functions = require('../../../functions')

exports.storeList = (save) => {
  return async (req, res) => {
    // Ok
    try {
  
      const {
        data = [], hash_identify_device = ''
      } = req.body

      console.log('storeList ', req.body)
  
      const response = []
  
      const stacks = data.map(item => ({
        async fn() {
          try {   
  
            const save_response = await save({
              data: item, hash_identify_device
            })
        
            save_response && response.push(save_response)
  
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
