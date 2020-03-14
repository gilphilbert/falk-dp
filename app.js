var express = require('express')
var app = express()

// include the webservice
const ws = require('./lib/ws')

// include the artcache
const artcache = require('./lib/art')
app.use('/art', artcache)

// serve the static files (the UI)
app.use(express.static('public'))

// start the app	
app.listen(3000, function () {
  console.log('Listening on port 3000')
})
