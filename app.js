const port = 3000
const http = require('http')
const express = require('express')
const app = express()

// include the webservice
const httpServer = http.createServer(app)
const socketserver = require('./websocket')
socketserver.setup(httpServer)

// start the remote service
const remote = require('./remote')
remote.setup()

// include the artcache
const artcache = require('./artcache')
app.use('/art', artcache)

// serve the static files (the UI)
app.use('/dev', express.static('public'))

app.use(express.static('ui'))

app.use('/lcd', express.static('lcd'))

// start the app
httpServer.listen(port, function listening () {
  console.log('listening on ' + port)
})
