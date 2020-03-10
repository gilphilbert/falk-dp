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
  stats: (callback) => {
    mpdui._connect((mpdclient) => {
      mpdclient.api.status.stats()
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
    add: (data, callback) => {
      mpdui._connect((mpdclient) => {
        mpdclient.api.mounts.mount(data[0], data[1])
        .then(callback)
      })
    }
  },
  db: {
    rescan: (callback) => {
      mpdui._connect((mpdclient) => {
        mpdclient.api.db.rescan()
        .then(callback)
      })
    },
    update: (callback) => {
      mpdui._connect((mpdclient) => {
        mpdclient.api.db.update()
        .then(callback)
      })
    },
    list: (data, callback) => {
      mpdui._connect((mpdclient) => {
        mpdclient.api.db.list(data)
        .then(callback)
      })

    }
  }
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

  disp.bind('getStats', function() {
    mpdui.stats((d) => {
      disp.send('pushStats', d)
    })
  })

  disp.bind('rescanDB', function() {
    mpdui.db.rescan((d) => {
      disp.send('notification', d)
    })
  })

  disp.bind('updateDB', function() {
    mpdui.db.update((d) => {
      disp.send('notification', d)
    })
  })

  disp.bind('getArtists', function() {
    mpdui.db.list('artist', (d) => {
      mod = d.map(i => i.artist)
      disp.send('pushArtists', mod)
    })
  })

  disp.bind('getAlbums', function() {
    mpdui.db.list('album', (d) => {
      mod = d.map(i => i.album)
      disp.send('pushAlbums', mod)
    })
  })

  disp.bind('getList', function(data) {
    mpdui.db.list(data, (d) => {
      disp.send('pushList', d)
    })
  })

  disp.bind('getMounts', function() {
    mpdui.mounts.list((d) => {
      disp.send('pushMounts', d)
    })
  })

  disp.bind('addMount', function (data) {
    var type = data.type
	host = data.host
	path = data.path
	point = data.path.substr(data.path.lastIndexOf('/')+1, data.path.length)
    var str = type + "://" + host + path
    var payload = [ point, str ]
    mpdui.mounts.add(payload, () => {
      mpdui.mounts.list((d) => {
        disp.send('pushMounts', d)
      })
    })
  })
/*
        mpdui.mounts.add(data, (d) => {
          ws.send(formatMessage('mounts', d))
	})
*/
})

