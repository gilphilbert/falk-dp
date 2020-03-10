var WebSocketServer = require('ws').Server
var wss = new WebSocketServer({port: 8080})
var mpdapi = require('mpd-api')

var mpdconfig = {
  host: 'localhost',
  port: 6600
}

var mpdui = {
  _config: {
    host: 'localhost',
    port: 6600
  },
  _connect: (callback) => {
    mpdapi.connect(mpdui.config)
    .then(callback)
  },
  status: (callback) => {
    mpdui._connect((mpdclient) => {
      mpdclient.api.status.get()
      .then(callback)
    })
  }
}

function formatMessage(event_name, data) {
  var str = JSON.stringify({
    event: event_name,
    data: data
  })
  return str
}

wss.on('connection', function (ws) {
  ws.on('message', function (message) {
    var msg = JSON.parse(message)
    var event = msg.event
    var data = msg.data
    switch(event) {
      case 'status':
        mpdui.status((statedata) => {
          ws.send(formatMessage('status', statedata))
	})
        break
      default:
        console.log('received: %s', message)
    }
  })

})
