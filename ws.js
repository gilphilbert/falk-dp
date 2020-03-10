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

  listdb ({ tag, filter, group }={}, callback) {
    if (!filter && !group) {
      this._con.api.db.list(tag).then(callback)
    } else if (!group) {
      this._con.api.db.list(tag, filter).then(callback)
    } else {
      this._con.api.db.list(tag, filter, group).then(callback)
    }
  }

  listmounts (callback) {
    this._con.api.mounts.list()
      .then(callback)
  }
  addmount ({ mountpoint, share }={}, callback) {
    this._con.api.mounts.mount(mountpoint, share)
      .then(callback)
  }
  unmount (data, callback) {
    this._con.api.mounts.unmount(data)
      .then(callback)
  }
}
var mpd = new MPD({ host: "localhost", port: 6600 })

var Dispatcher = function (ws) {
  var callbacks = {}

  this.bind = function(event_name, callback){
    callbacks[event_name] = callbacks[event_name] || []
    callbacks[event_name].push(callback)
    return this
  }

  this.send = (event_name, event_data) => {
    var payload = JSON.stringify({event:event_name, data: event_data})
    ws.send( payload )
    return this
  }

  // dispatch to the right handlers
  ws.on("message", (evt) => {
    var json = JSON.parse(evt)
    dispatch(json.event, json.data)
  })

  var dispatch = function(event_name, message){
    var chain = callbacks[event_name]
    if(typeof chain == "undefined") return
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
    mpd.listdb({ tag: "artist" }, async (d) => {
      mod = d.map(i => i.artist)
      disp.send("pushArtists", mod)
    })
  })

  disp.bind("getAlbums", function() {
    mpd.listdb({ tag: "album", group: "albumartist" }, (d) => {
      //mod = d.map(i => i.album)
      mod = d.reduce((arr, item) => {
        item.album.forEach((e) => {
          var flat = { title: e.album, artist: item.albumartist }
          arr.push(flat)
        })
        return arr;
      }, []);
      mod.sort((a, b) => (a.title > b.title) ? 1 : -1)
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
    var point = data.path.substr(data.path.lastIndexOf("/")+1, data.path.length)
    var shr = data.type + "://" + data.host + data.path
    var payload = { mountpoint: point, share: shr }
    mpd.addmount(payload, (resp) => {
      mpd.listmounts((d) => {
        disp.send("pushMounts", d)
      })
    })
  })
  disp.bind("unmount", function (data) {
    mpd.unmount(data.mountpoint, (resp) => {
      mpd.listmounts((d) => {
        disp.send("pushMounts", d)
      })
    })
  })
/*
        mpdui.mounts.add(data, (d) => {
          ws.send(formatMessage("mounts", d))
	})
*/
})
