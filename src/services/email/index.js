const axios = require('axios')

module.exports = axios.create({
  baseURL: 'http://agenciacapiba.com.br/app/qad/email.php',
  timeout: 10000
})
