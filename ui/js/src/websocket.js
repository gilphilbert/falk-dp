/* global domBuilder, dataTools */

var webSocket = (function () {
  /* ----------- PRIVATE VARIABLES ----------- */
  var _functions = []
  var _host = ''
  var server

  /* ----------- PRIVATE FUNCTIONS ----------- */

  var ServerEventsDispatcher = function(url){
    var url = url
    var conn = new WebSocket(url)

    var callbacks = {}
    var cbOnce = {}

    this.bind = function(event_name, callback){
      callbacks[event_name] = callbacks[event_name] || []
      callbacks[event_name].push(callback)
      return this;// chainable
    }

    this.bindOnce = function(event_name, callback){
      cbOnce[event_name] = callback
      return this;// chainable
    }

    this.send = function(event_name, event_data){
      var payload = JSON.stringify({event:event_name, data: event_data})
      conn.send( payload )
      return this;
    }

    var startup = function() {
      conn.onmessage = function(evt){
        var json = JSON.parse(evt.data)
        dispatch(json.event, json.data)
      }

      conn.onclose = function(e){dispatch('close',e)}
      conn.onopen = function(){dispatch('open',null)}
    }
    startup()

    this.bind("close", (e) => {
      if (e.code!=1000) {
        setTimeout(function(){
          conn = new WebSocket(url)
          startup()
        }, 3000)
      }
    })

    var dispatch = function(event_name, message){
      var chain = callbacks[event_name]
      if(typeof chain !== 'undefined') {
        for(var i = 0; i < chain.length; i++){
          chain[i]( message )
        }
      }
      var once = cbOnce[event_name]
      if(typeof once !== 'undefined') {
        once( message )
        cbOnce[event_name] = undefined
      }
    }
  }

  /* ----------- PUBLIC FUNCTIONS ----------- */

  // initiate the connection to the host
  var init = function (host, onConnect) {
    server = new ServerEventsDispatcher('ws://' + host + ':8080')
    server.bind('open', () => {
      onConnect()
      start()
    })
    server.bind('notification', (data) => notificationHandler)
  }

  var notificationHandler = function (data) {
    console.log(data)
  }

  // request data (the underlying functions determine what's requested)
  var get = {
    state: function () {
      server.send('getStatus')
    },
    queue: function () {
      server.send('getQueue')
    },
    shares: function () {
      server.send('getOutputs')
    },
    playlists: function () {
      server.send("getPlaylists")
    },
    playlist: function (name) {
      server.send('getPlaylist', { name: name })
    },
    artists: function () {
      server.send('getArtists')
    },
    artistAlbums: function (name) {
      server.send('getArtistAlbums', { artist: name })
    },
    album: function(artist, title) {
      server.send('getAlbum', { artist: artist, title: title })
    },
    albums: function () {
      server.send('getAlbums')
    },
    genres: function () {
      server.send('getGenres')
    },
    libraryStats: function (callback) {
      server.bindOnce('pushStats', callback)
      server.send('getStats')
    },
    outputDevices: function () {
      server.send('getOutputs')
    },
    // deviceName: function (func) {
    //   on('pushDeviceName', func)
    //   sendOnly('getDeviceName')
    // },
     audioDevices: function (func) {
      server.bindOnce('pushOutputs', func)
       server.send('getOutputs')
    },
    // version: function (func) {
    //   if (func !== undefined) {
    //     _socket.once('pushSystemVersion', func)
    //   }
    //   sendOnly('getSystemVersion')
    // },
  }

  var set = {
    // deviceName: function (name) {
    //   sendData('setDeviceName', { name: name })
    // }
  }

  var action = {
    clearQueue: function () {
      server.send('clearQueue')
    },
    addPlay: function (tracks, pos) {
      index = index || 0
      server.send('addPlay', { songs: tracks, pos: pos })
    },
    replaceAndPlay: function (songs, pos) {
      pos = pos || 0
      server.send('replaceAndPlay', { songs: songs, pos: pos })
    },
    enqueue: function (songs) {
      server.send('addToQueue', { songs: songs })
    },
    removeFromQueue: function (position) {
      server.send('removeFromQueue', { value: position })
    },
    saveQueue: function (name) {
      if (name !== undefined) {
        server.send('saveQueueToPlaylist', { name: name })
      }
    },
    play: function (pos) {
      if (pos === undefined) {
        server.send('play')
      } else {
        server.send('play', { pos: pos })
      }
    },
    pause: function () {
      server.send('pause')
    },
    next: function () {
      server.send('next')
    },
    prev: function () {
      server.send('prev')
    },
    toggleRandom: function () {
      var rand = dataTools.getState().random
      server.send('random', { state: !rand })
    },
    toggleRepeat: function () {
      var state = dataTools.getState()
       if (state.single === true) {
        server.send('repeat', { state: false })
        server.send('single', { state: false })
       } else {
         if (state.repeat === true) {
          server.send('single', { state: true })
         } else {
          server.send('repeat', { state: true })
         }
       }
    },
    updateLibrary: function () {
      server.send('updateDB')
    },
    rescanLibrary: function () {
      server.send('rescanDB')
    },
    addShare: function ({ host, path, type } = {}) {
      if (host && path && type) {
        server.send('addMount', { host, path, type })
      }
    },
    shudown: function () {
      server.send('shutdown')
    },
    reboot: function () {
      server.send('reboot')
    },
    addToPlaylist: function ({ name, service, uri }) {
      // server.send('addToPlaylist', { name: name, service: service, uri: uri })
    },
    removeFromPlaylist: function ({ name, uri }) {
      // sendData('removeFromPlaylist', { name: name, uri: uri })
    }
  }

  var getURL = function (partial) {
    return 'http://' + _host + partial
  }

  var start = function () {
    server.bind('pushArtists', domBuilder.page.build)
    .bind('pushAlbums', domBuilder.page.build)
    .bind('pushGenres', domBuilder.page.build)
    .bind('pushArtistAlbums', domBuilder.page.build)
    .bind('pushAlbum', domBuilder.page.build)
    .bind('pushPlaylists', domBuilder.page.build)
    .bind('pushPlaylist', domBuilder.page.build)
    .bind('pushStatus', domBuilder.page.updateState)
    .bind('pushQueue', domBuilder.queueTable)
    get.state()
  }

  /*
  So, it turns out this isn't needed, but I loved the exercise!
  -------------------------------------------------------------

  // this may be the most beautiful and, at the same time, horrible bit of code I've ever written
  // this function provides a way to attach a function to the socket, fire the command once then unattach the function
  var fireOnce = function (command, response, func) {
    // define our temporary function that fires the provided function and then immediately removes the temporary function
    var foFunc = (data) => {
      func(data)
      _socket.off(response, foFunc)
    }
    // tell the socket to attach the new function alongside the existing functions (if they exist)
    _socket.on(response, foFunc)
    // fire the command off
    _socket.emit(command)
  }
  */

  var getSocket = function () {
    return _socket
  }

  return {
    init: init,
    get: get,
    set: set,
    action: action,
    getURL: getURL,
    getSocket: getSocket
  }
})()
