module.exports = {
  apps : [
      {
        name: "feiraapp-api",
        script: "./src/server/index.js",
        watch: true,
        env: {
            'PORT': 8888,
            'MONGO_URL':  'mongodb+srv://feiraappadm:feiraappadm@feira-app.90cyd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
            'WORD_SECRET': 'feiraapp-develompent',
            'LIMIT_PAGINATION': 20,
            'NODE_ENV': 'development',
            'AUTHENTICATION_WORD': '3334E5D751CA7D5CEB5E8511DA38FFAA9B18E74692204112E686EA63ADD5F5DF2BD766DD8725D9AB6EB588D71F57A9E88C3EAB0CCDD21B9806E40E75631638A2'
        },
        env_production: {
          'PORT': 3000,
          'MONGO_URL':  'mongodb+srv://feiraappadm:feiraappadm@feira-app.90cyd.mongodb.net/myFirstDatabase?retryWrites=true&w=majority',
          'WORD_SECRET': 'feiraapp-avaliable',
          'LIMIT_PAGINATION': 20,
          'NODE_ENV': 'production',
          'AUTHENTICATION_WORD': '3334E5D751CA7D5CEB5E8511DA38FFAA9B18E74692204112E686EA63ADD5F5DF2BD766DD8725D9AB6EB588D71F57A9E88C3EAB0CCDD21B9806E40E75631638A2'
        }
      }
  ]
}
