const port = 3000
const http = require('http')
const express = require('express')
const compression = require('compression')
const app = express()
var serveStatic = require('serve-static')

// enable compression
app.use(compression())

// include the webservice
const httpServer = http.createServer(app)
const socketserver = require('./websocket')
socketserver.setup(httpServer)

// start the remote service
try {
  if (require.resolve('node-hid')) {
    const remote = require('./remote')
    remote.setup()
  }
} catch (e) {
  console.log('No remote support')
}

// include the artcache
const artcache = require('./artserver')
app.use('/art', artcache)

app.use('/lcd', express.static('lcd'))

//var file = new static.Server('./ui')
//http.createServer(function (request, response) {
//  request.addListener('end', function () {
//    file.serve(request, response)
//  }).resume()
//})
app.use(serveStatic('ui', { 'index': ['index.html'] }))

// serve the static files (the UI)
//app.use(express.static('ui'))
app.get('*', (req, res) => {
  res.sendFile('ui/index.html', { root: __dirname })
})

// start the app
httpServer.listen(port, function listening () {
  console.log('listening on ' + port)
})
