async function setup() {

  var WebSocket = require("ws")
  var mpdapi = require("mpd-api")

  const { mpd } = mpdapi
  const { cmd, MPDError } = mpd
  try {
    mpdc = await mpdapi.connect({ host: "localhost", port: 6600 })
  } catch (e) {
    if (e.errno === MPDError.CODES.PERMISSION) {
      console.log('no permission to connect, probably invalid/missing password')
    }
  }

  var wss = await new WebSocket.Server({ port: "8080" })

  function broadcast (event_name, event_data) {
    var payload = JSON.stringify({event:event_name, data: event_data})
    wss.clients.forEach(function each(client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload)
      }
    })
  }

  mpdc.on("system", (e) => {
    switch(e) {
      case "playlist":
        mpdc.api.queue.info()
          .then(d => {
            d.forEach((i) => {
	      i.albumart = "/art/album/" + encodeURIComponent(i.artist) + "/" + encodeURIComponent(i.album)
	    })
	    broadcast("pushQueue", d)
	  })
        break
      case "player":
        mpdc.api.status.get()
          .then(d => broadcast("pushStatus", d))
        break
      default:
        console.log("[MPD] Unknown State Change:" + e)
    }
  })

  wss.on("connection", function (ws) {
    var disp = new Dispatcher(ws)

    disp.bind("getStatus", function () {
      mpdc.api.status.get()
        .then(d => disp.send("pushStatus", d))
    })

    disp.bind("getStats", function () {
      mpdc.api.status.stats()
        .then(d => disp.send("pushStats", d))
    })

    disp.bind("rescanDB", function () {
      mpdc.api.db.rescan()
        .then(d => disp.send("notification", d))
    })

    disp.bind("updateDB", function () {
      mpdc.api.db.update()
        .then(d => disp.send("notification", d))
    })

    disp.bind("getArtists", function () {
      mpdc.api.db.list("artist")
        .then(async (d) => {
          mod = d.map(i => { return { title: i.artist, albumart: '/art/artist/' + encodeURIComponent(i.artist) } } )
          disp.send("pushLibrary", { artists: mod })
        })
    })

    disp.bind("getAlbums", function () {
      mpdc.api.db.list("album", null, "albumartist")
	.then((d) => {
          mod = d.reduce((arr, item) => {
            item.album.forEach((e) => {
              var flat = {
                title: e.album,
                artist: item.albumartist,
                albumart: "/art/album/" + encodeURIComponent(item.albumartist) + "/" + encodeURIComponent(e.album)
              }
              arr.push(flat)
            })
            return arr;
          }, []);
          mod.sort((a, b) => (a.title > b.title) ? 1 : -1)
          disp.send("pushLibrary", { albums: mod })
        })
    })

    disp.bind("getAlbum", function (data) {
      mpdc.api.db.find(`((album == "${data.title}") AND (albumartist == "${data.artist}"))`)
        .then((d) => {
          var out = {
            artist: data.artist,
            title: data.title,
            albumart: "/art/album/" + encodeURIComponent(data.artist) + "/" + encodeURIComponent(data.title),
            songs: d
          }
          disp.send("pushLibrary", { album: out })
        })
    })

    disp.bind("getArtistAlbums", function (data) {
      mpdc.api.db.list("album", `(albumartist == "${data.artist}")`)
        .then((d) => {
          mod = d.map((d) => {
	    return {
              title: d.album,
              albumart: "/art/album/" + encodeURIComponent(data.artist) + "/" + encodeURIComponent(d.album)
            }
	  })
          var out = {
            artist: {
              title: data.artist,
              albumart: "/art/artist/" + encodeURIComponent(data.artist)
            },
            albums: mod
          }
          disp.send("pushLibrary", out)
      })
    })

    disp.bind("getMounts", function () {
      mpdc.api.mounts.list()
        .then((data) => {
          mounts = data.filter(mount => mount.mount)
          disp.send("pushMounts", mounts)
        })
    })

    disp.bind("addMount", function (data) {
      var point = data.path.substr(data.path.lastIndexOf("/")+1, data.path.length)
      var share = data.type + "://" + data.host + data.path
      mpdc.api.mounts.mount(point, share)
	.then(() => {
          mpdc.api.mounts.list()
            .then((d) => {
              disp.send("pushMounts", d)
            })
        })
    })

    disp.bind("unmount", function (data) {
      mpdc.api.mounts.unmount(data.mountpoint)
	.then((resp) => {
          mpdc.api.mounts.list((d) => {
            disp.send("pushMounts", d)
          })
        })
    })

    disp.bind("getQueue", function () {
      mpdc.api.queue.info()
        .then((d) => {
          d.forEach((i) => {
            i.albumart = "/art/album/" + encodeURIComponent(i.artist) + "/" + encodeURIComponent(i.album)
          })
          disp.send("pushQueue", d)
        })
    })

    disp.bind("enqueue", function (data) {
      mpdc.api.queue.addid(data.uri)
    })

    disp.bind("clearQueue", function () {
      mpdc.api.queue.clear()
    })

    disp.bind("play", function () {
      mpdc.api.playback.play()
    })
    disp.bind("pause", function () {
      mpdc.api.playback.pause()
    })
    disp.bind("resume", function () {
      mpdc.api.playback.resume()
    })
    disp.bind("stop", function () {
      mpdc.api.playback.stop()
    })
    disp.bind("toggle", function () {
      mpdc.api.playback.toggle()
    })
    disp.bind("prev", function () {
      mpdc.api.playback.prev()
    })
    disp.bind("next", function () {
      mpdc.api.playback.next()
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
