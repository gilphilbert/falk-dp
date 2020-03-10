var WebSocketServer = require("ws").Server

var wss = new WebSocketServer({ port: "8080" })

var mpdapi = require("mpd-api")

class MPD {
  constructor({ host, port }={}) {
    host = host || "localhost"
    port = port || 6600
    mpdapi.connect({ host: host, port: port })
    .then((con) => {
      console.log('Connected to MPD')
      this._con=con
    })
  }

  status (callback) {
    this._con.api.status.get()
      .then(callback)
  }
  stats (callback) {
    this._con.api.status.stats()
      .then(callback)
  }

  rescandb (callback) {
    this._con.api.db.rescan()
      .then(callback)
  }
  updatedb (callback) {
    this._con.api.db.update()
      .then(callback)
  }

  listdb (data, callback) {
    this._con.api.db.list(data)
      .then(callback)
  }

  listmounts (callback) {
    this._con.api.mounts.list()
      .then(callback)
  }
  addmount (data, callback) {
    this._con.api.mounts.mount(data[0], data[1])
      .then(callback)
  }
}
var mpd = new MPD({ host: "localhost", port: 6600 })

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
  ws.on("message", (evt) => {
    var json = JSON.parse(evt)
    dispatch(json.event, json.data)
  })

  var dispatch = function(event_name, message){
    var chain = callbacks[event_name];
    if(typeof chain == "undefined") return; // no callbacks for this event
    for(var i = 0; i < chain.length; i++){
      chain[i]( message )
    }
  }
}

wss.on("connection", function (ws) {
  var disp = new Dispatcher(ws)

  disp.bind("getStatus", function() {
    mpd.status((d) => {
      disp.send("pushStatus", d)
    })
  })

  disp.bind("getStats", function() {
    mpd.stats((d) => {
      disp.send("pushStats", d)
    })
  })

  disp.bind("rescanDB", function() {
    mpd.rescandb((d) => {
      disp.send("notification", d)
    })
  })

  disp.bind("updateDB", function() {
    mpd.updatedb((d) => {
      disp.send("notification", d)
    })
  })

  disp.bind("getArtists", function() {
    mpd.listdb("artist", (d) => {
      mod = d.map(i => i.artist)
      disp.send("pushArtists", mod)
    })
  })

  disp.bind("getAlbums", function() {
    mpd.listdb("album", (d) => {
      mod = d.map(i => i.album)
      disp.send("pushAlbums", mod)
    })
  })

  disp.bind("getList", function(data) {
    mpd.listdb(data, (d) => {
      disp.send("pushList", d)
    })
  })

  disp.bind("getMounts", function() {
    mpd.listmounts((d) => {
      disp.send("pushMounts", d)
    })
  })

  disp.bind("addMount", function (data) {
    var type = data.type
	host = data.host
	path = data.path
	point = data.path.substr(data.path.lastIndexOf("/")+1, data.path.length)
    var str = type + "://" + host + path
    var payload = [ point, str ]
    mpd.addmount(payload, () => {
      mpd.listmounts((d) => {
        disp.send("pushMount", d)
      })
    })
  })
/*
        mpdui.mounts.add(data, (d) => {
          ws.send(formatMessage("mounts", d))
	})
*/
})

