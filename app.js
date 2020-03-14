var express = require('express')
var app = express()

// include the webservice
const ws = require('./lib/websocket')

// include the artcache
const artcache = require('./lib/artcache')
app.use('/art', artcache)

// serve the static files (the UI)
app.use(express.static('public'))

// start the app	
app.listen(3000, function () {
  console.log('Listening on port 3000')
})
