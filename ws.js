var WebSocketServer = require('ws').Server

var wss = new WebSocketServer({ port: '8080' })

var mpdapi = require('mpd-api')
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
  },
  mounts: {
    list: (callback) => {
      mpdui._connect((mpdclient) => {
        mpdclient.api.mounts.list()
        .then(callback)
      })  
    },
    mount: (data, callback) => {
      mpdui._connect((mpdclient) => {
        mpdclient.mounts.mount(data)
        .then(callback)
      })
    }
  }
}

//wss.on('connection', function (ws) {
//  console.log('connected')
//  ws.addEventListener('getStatus', () => {
//    console.log('got request');
//  })
//})

function formatMessage(event_name, data) {
  var str = JSON.stringify({
    type: event_name,
    data: data
  })
  return str
}

wss.on('connection', function (ws) {
  ws.on('message', function (message) {
    var msg = JSON.parse(message)
    var type = msg.type
    var data = msg.data
    switch(type) {
      case 'getStatus':
        mpdui.status((d) => {
          ws.send(formatMessage('pushStatus', d))
	})
        break
      case 'getMounts':
        mpdui.mounts.list((d) => {
          ws.send(formatMessage('pushMounts', d))
	})
        break
      case 'addMount':
        mpdui.mounts.add(data, (d) => {
          ws.send(formatMessage('mounts', d))
	})
        break
      default:
        console.log('received: %s', message)
    }
  })
})

