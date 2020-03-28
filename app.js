var express = require('express')
var app = express()

// include the webservice
// const ws = require('./websocket')
require('./websocket')

// include the artcache
const artcache = require('./artcache')
app.use('/art', artcache)

// serve the static files (the UI)
app.use('/dev', express.static('public'))

app.use(express.static('ui'))

// start the app
app.listen(3000, function () {
  console.log('Listening on port 3000')
})
