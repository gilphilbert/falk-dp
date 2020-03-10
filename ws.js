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

function formatMessage(event_name, data) {
  var str = JSON.stringify({
    type: event_name,
    data: data
  })
  return str
}

var Dispatcher = function (ws) {
  var callbacks = {}

  this.bind = function(event_name, callback){
    callbacks[event_name] = callbacks[event_name] || [];
    callbacks[event_name].push(callback);
    return this;// chainable
  }

  this.send = (event_name, event_data) => {
    var payload = JSON.stringify({event:event_name, data: event_data});
    ws.send( payload ); // <= send JSON data to socket server
    return this;
  }

  // dispatch to the right handlers
  ws.on('message', (evt) => {
    var json = JSON.parse(evt)
    dispatch(json.event, json.data)
  })

  var dispatch = function(event_name, message){
    var chain = callbacks[event_name];
    if(typeof chain == 'undefined') return; // no callbacks for this event
    for(var i = 0; i < chain.length; i++){
      chain[i]( message )
    }
  }
}

wss.on('connection', function (ws) {
  var disp = new Dispatcher(ws)

  disp.bind('getStatus', function() {
    mpdui.status((d) => {
      disp.send('pushStatus', d)
    })
  })

  disp.bind('getMounts', function() {
    mpdui.mounts.list((d) => {
      disp.send('pushMounts', d)
    })
  })
/*
        mpdui.mounts.add(data, (d) => {
          ws.send(formatMessage('mounts', d))
	})
*/
})

