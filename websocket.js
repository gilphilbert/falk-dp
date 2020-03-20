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

  async function getStatus () {
    var status = await mpdc.api.status.get()
    var queue = await mpdc.api.queue.info()
    if (status.song !== undefined && status.state != "stop") {
      songdetail = queue.filter((qs) => {
        return qs.pos == status.song
      })[0]

      status.title = songdetail.title
      status.artist = songdetail.artist
      status.album = songdetail.album
      status.genre = songdetail.genre
      status.date = songdetail.date
      status.albumart = "/art/album/" + songdetail.artist + "/" + songdetail.album

      status.duration = status.time.total
      status.elapsed = status.time.elapsed
      delete(status.time)

      status.sampleRate = status.audio.sampleRate
      status.bits = status.audio.bits
      status.channels = status.audio.channels
      delete(status.audio)
      delete(status.playlist)
      delete(status.songid)
    }
    return status
    //disp.send("pushStatus", status)
  }

  mpdc.on("system", (e) => {
    switch(e) {
      case "playlist":
        mpdc.api.queue.info()
          .then(d => {
            d.forEach((i) => {
	            i.albumart = "/art/album/" + encodeURIComponent(i.artist) + "/" + encodeURIComponent(i.album)
	          })
	          broadcast("pushQueue", { queue: d })
	        })
        break
      case "player":
      case "options":
        getStatus().then(status => broadcast("pushStatus", status))
        break
      case "stored_playlist":
        mpdc.api.playlists.get()
          .then(d => broadcast("pushPlaylist", d))
      default:
        console.log("[MPD] Unknown State Change:" + e)
    }
  })

  wss.on("connection", function (ws) {
    var disp = new Dispatcher(ws)
    ws.on('error', (e) => console.log(e));

    // system
    disp.bind("getStatus", function () {
      getStatus().then(status => disp.send("pushStatus", status))
    })

    // db management
    disp.bind("getStats", function () {
      mpdc.api.status.stats()
        .then(d => disp.send("pushStats", d))
    })

    disp.bind("rescanDB", function () {
      mpdc.api.db.rescan()
        .then(d => disp.send("notification", d))
    })

    disp.bind("updateDB", function () {
      mpdc.api.mounts.list()
        .then((mounts) => {
          netmount = mounts.filter((m) => {
            if ("storage" in m) {
              return m.storage.startsWith("smb") || m.storage.startsWith("nfs")
	          }
            return false
	        }).map((m) => {
            return m.mount
          })
          netmount.forEach(i => mpdc.api.db.update(i).then(d => console.log(d)))
	      })
    })

    // db listing
    disp.bind("getArtists", function () {
      mpdc.api.db.list("artist")
        .then(async (d) => {
          mod = d.map(i => { return { title: i.artist, albumart: '/art/artist/' + encodeURIComponent(i.artist) } } )
          disp.send("pushArtists", mod)
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
          disp.send("pushAlbums", mod)
        })
    })

    disp.bind("getGenres", function () {
      mpdc.api.db.list("genre")
	      .then((d) => {
          var mod = d.map(i => i.genre)
          disp.send("pushGenres", mod)
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
          disp.send("pushAlbum", out)
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
          disp.send("pushArtistAlbums", out)
      })
    })

    //mounts
    disp.bind("getMounts", function () {
      mpdc.api.mounts.list()
        .then((data) => {
          mounts = data.filter(mount => mount.mount)
          disp.send("pushMounts", mounts)
        })
    })

    disp.bind("addMount", function (data) {
      var point = data.path.substr(data.path.lastIndexOf("/")+1, data.path.length)
      var share = data.type + "://" + data.host + "/" + data.path
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

    //queue
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

    disp.bind("addPlay", function (data) {
      if (data.uri) {
      } else if (data.songs) {
        var songs = data.songs
        var promises=[]
        for (i=0; i<songs.length; i++) {
          promises[i] = mpdc.api.queue.addid(songs[i].uri)
	      }
        Promise.all(promises).then((values) => {
          mpdc.api.playback.playid(values[0])
	      })
      }
    })

    disp.bind("removeFromQueue", function (data) {
      if (data.id) {
        mpdc.api.queue.deleteid(data.id)
      }
    })

    disp.bind("replaceAndPlay", function (data) {
      if (data.uri) {
        mpdc.api.queue.clear()
          .then(() => {
            mpdc.api.queue.addid(data.uri)
              .then(id => mpdc.api.playback.playid(id))
          })
      }
    })

    disp.bind("saveQueue", function (data) {
      if (data.name) {
        mpdc.api.playlists.save(data.name)
      }
    })

    // actions
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
    disp.bind("repeat", function (data) {
      if (data.state !== undefined) {
        mpdc.api.playback.repeat(data.state)
      }
    })
    disp.bind("single", function (data) {
      if (data.state !== undefined) {
        mpdc.api.playback.single(data.state)
      }
    })
    disp.bind("random", function (data) {
      if (data.state !== undefined) {
        mpdc.api.playback.random(data.state)
      }
    })

    // output devices
    disp.bind("getOutputs", function () {
      mpdc.api.outputs.list()
        .then(d => disp.send("pushOutputs", d))
    })


    // playlists
    disp.bind("getPlaylists", function () {
      mpdc.api.playlists.get()
        .then(d => { 
          mod = d.map(i => { return { name: i.playlist, last_modified: i.last_modified } })
          disp.send("pushPlaylists", mod)
        })
    })
    disp.bind("getPlaylist", function (data) {
      if (data.name) {
        mpdc.api.playlists.listinfo(data.name)
          .then(d => disp.send("pushPlaylist", { name: data.name, songs: d }))
      }
    })
    //usage: ws.send({ event_type: "addPlaylist", data: { uri: "<SONGURI>" } })
    disp.bind("addPlaylist", function (data) {
      if (data.name) {
        if (data.uri) {
          mpdc.api.playlists.add(data.name, data.uri)
        }
      }
    })
    disp.bind("addToPlaylist", function (data) {
      if (data.uri) {
        mpdc.api.playlists.add(data.name, data.uri)
      }
    })
    disp.bind("addToPlaylist", function (data) {
      if (data.uri) {
        mpdc.api.playlists.add(data.name, data.uri)
      }
    })
    disp.bind("removeFromPlaylist", function (data) {
      if (data.name && data.pos) {
        mpdc.api.playlists.deleteAt(data.name, data.pos)
      }
    })
    disp.bind("removePlaylist", function (data) {
      if (data.name) {
        mpdc.api.playlists.deleteAt(data.name)
      }
    })
    disp.bind("enqeuePlaylist", function (data) {
      if (data.name) {
        mpdc.api.playlists.load(data.name)
      }
    })
    disp.bind("playPlaylist", function (data) {
      if (data.name) {
        mpdc.api.queue.clear(data.name)
        .then(() => {
          mpdc.api.playlists.load(data.name)
          .then(() => {
            mpdc.api.playback.play()
          })
        })
      }
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
