const port = 3000
const http = require('http')
const express = require('express')
const app = express()

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
const artcache = require('./artcache')
app.use('/art', artcache)

app.use('/lcd', express.static('lcd'))

// serve the static files (the UI)
app.use(express.static('ui'))
app.get('*', (req, res) => {
  res.sendFile('ui/index.html', { root: __dirname })
})

// start the app
httpServer.listen(port, function listening () {
  console.log('listening on ' + port)
})
