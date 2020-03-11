async function setup() {

  var WebSocketServer = require("ws").Server
  var wss = await new WebSocketServer({ port: "8080" })

  var mpdapi = require("mpd-api")
  var mpd = await mpdapi.connect({ host: "localhost", port: 6600 })


  wss.on("connection", function (ws) {
    var disp = new Dispatcher(ws)

    disp.bind("getStatus", function () {
      mpd.api.status.get()
        .then(d => disp.send("pushStatus", d))
    })

    disp.bind("getStats", function () {
      mpd.api.status.stats()
        .then(d => disp.send("pushStats", d))
    })

    disp.bind("rescanDB", function () {
      mpd.api.db.rescan()
        .then(d => disp.send("notification", d))
    })

    disp.bind("updateDB", function () {
      mpd.api.db.update()
        .then(d => disp.send("notification", d))
    })

    disp.bind("getArtists", function () {
      mpd.api.db.list("artist")
        .then(async (d) => {
          mod = d.map(i => i.artist)
          disp.send("pushArtists", mod)
        })
    })

    disp.bind("getAlbums", function () {
      mpd.api.db.list("album", null, "albumartist")
	.then((d) => {
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

    disp.bind("getArtistAlbums", function (data) {
      mpd.api.db.list("album", "albumartist" + data.artist)
        .then(d => disp.send("pushList", d))
    })

    disp.bind("getList", function (...data) {
      mpd.api.db.list(data)
        .then(d => disp.send("pushList", d))
    })

    disp.bind("getMounts", function () {
      mpd.api.mounts.list()
        .then((d) => disp.send("pushMounts", d))
    })

    disp.bind("addMount", function (data) {
      var point = data.path.substr(data.path.lastIndexOf("/")+1, data.path.length)
      var share = data.type + "://" + data.host + data.path
      mpd.api.mounts.mount(point, share)
	.then(() => {
          mpd.api.mounts.list()
            .then((d) => {
              disp.send("pushMounts", d)
            })
        })
    })

    disp.bind("unmount", function (data) {
      mpd.api.mounts.unmount(data.mountpoint)
	.then((resp) => {
          mpd.api.mounts.list((d) => {
            disp.send("pushMounts", d)
          })
        })
    })
  })
}

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

setup()
