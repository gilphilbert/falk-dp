/* global domBuilder, dataTools */

var vioSocket = (function () {
  /* ----------- PRIVATE VARIABLES ----------- */
  var _functions = []
  var _host = ''
  var _socket

  /* ----------- PRIVATE FUNCTIONS ----------- */

  // sends a command that has no data
  var sendOnly = function (cmd) {
    if (cmd !== undefined) {
      _socket.emit(cmd)
    }
  }

  // sends a command with data
  var sendData = function (cmd, data) {
    if (cmd !== undefined && data !== undefined) {
      _socket.emit(cmd, data)
    }
  }

  // store and assign provided functions
  var on = function (state, func) {
    _functions[state] = func
    if (_socket !== undefined) {
      _socket.on(state, _functions[state])
    }
  }

  /* ----------- PUBLIC FUNCTIONS ----------- */

  // initiate the connection to the host
  var init = function (host, onConnect) {
    _host = host
    on('connect', onConnect)
    window.loadJS('http://' + _host + '/socket.io/socket.io.js', () => {
      // this is the script we just loaded
      /* global io */
      _socket = io(host)
      _socket.on('connect', () => {
        if ('connect' in _functions) {
          _functions.connect()
          start()
        }
        _socket.on('pushToastMessage', toastHandler)
      })
    })
  }

  var browseLibrary = function (url) {
    sendData('browseLibrary', { uri: url })
  }

  var toastHandler = function (data) {
    console.log(data)
  }

  // request data (the underlying functions determine what's requested)
  var get = {
    state: function () {
      sendOnly('getState')
    },
    queue: function () {
      sendOnly('getQueue')
    },
    outputDevices: function () {
      sendOnly('getOutputDevices')
    },
    shares: function () {
      sendOnly('getListShares')
    },
    playlists: function (func) {
      // check to see if once was asked for (func is defined)
      // should check for type most likely
      if (func !== undefined) {
        _socket.once('pushListPlaylist', func)
      }
      sendOnly('listPlaylist')
    },
    playlist: function (name) {
      sendData('getPlaylistContent', { name: name })
    },
    files: function (folder) {
      var url = 'music-library' + ((folder !== undefined) ? folder : '')
      browseLibrary(url)
    },
    artists: function (name) {
      var url = 'artists://' + ((name !== undefined) ? name : '')
      browseLibrary(url)
    },
    albums: function (name) {
      var url = 'albums://' + ((name !== undefined) ? name : '')
      browseLibrary(url)
    },
    genres: function (name) {
      var url = 'genres://' + ((name !== undefined) ? name : '')
      browseLibrary(url)
    },
    version: function (func) {
      if (func !== undefined) {
        _socket.once('pushSystemVersion', func)
      }
      sendOnly('getSystemVersion')
    },
    deviceName: function (func) {
      on('pushDeviceName', func)
      sendOnly('getDeviceName')
    },
    audioDevices: function (func) {
      on('pushOutputDevices', func)
      sendOnly('getOutputDevices')
    },
    libraryStats: function (func) {
      on('pushMyCollectionStats', func)
      sendOnly('getMyCollectionStats')
    }
  }

  var set = {
    deviceName: function (name) {
      sendData('setDeviceName', { name: name })
    }
  }

  var action = {
    clearQueue: function () {
      sendOnly('clearQueue')
    },
    addPlay: function (tracks, index) {
      index = index || 0
      sendData('addPlay', { list: tracks, index: index })
    },
    replaceAndPlay: function (tracks, index) {
      index = index || 0
      sendData('replaceAndPlay', { list: tracks, index: index })
    },
    enqueue: function (tracks) {
      sendData('addToQueue', tracks)
    },
    removeFromQueue: function (position) {
      sendData('removeFromQueue', { value: position })
    },
    saveQueue: function (name) {
      if (name !== undefined) {
        sendData('saveQueueToPlaylist', { name: name })
      }
    },
    play: function (index) {
      console.log(index)
      if (index === undefined) {
        sendOnly('play')
      } else {
        sendData('play', { value: index })
      }
    },
    pause: function () {
      sendOnly('pause')
    },
    next: function () {
      sendOnly('next')
    },
    prev: function () {
      sendOnly('prev')
    },
    toggleRandom: function () {
      var rand = dataTools.getState().random
      sendData('setRandom', { value: !rand })
    },
    toggleRepeat: function () {
      var state = dataTools.getState()
      if (state.repeatSingle === true) {
        sendData('setRepeat', { value: false, repeatSingle: false })
      } else {
        if (state.repeat === true) {
          sendData('setRepeat', { value: true, repeatSingle: true })
        } else {
          sendData('setRepeat', { value: true, repeatSingle: false })
        }
      }
    },
    updateLibrary: function () {
      sendOnly('updateDB')
    },
    rescanLibrary: function () {
      sendOnly('rescanDB')
    },
    updateMetadata: function () {
      sendOnly('updateAllMetadata')
    },
    updateCheck: function () {
      sendOnly('updateCheck')
    },
    update: function () {
      sendData('update', { value: 'now ' })
    },
    addShare: function ({ name, ip, path, fstype, username, password, options } = {}) {
      sendData('addShare', { name, ip, path, fstype, username, password, options })
    },
    shudown: function () {
      sendOnly('shutdown')
    },
    reboot: function () {
      sendOnly('reboot')
    },
    addToPlaylist: function ({ name, service, uri }) {
      sendData('addToPlaylist', { name: name, service: service, uri: uri })
    },
    removeFromPlaylist: function ({ name, uri }) {
      sendData('removeFromPlaylist', { name: name, uri: uri })
    }
  }

  var getURL = function (partial) {
    return 'http://' + _host + partial
  }

  var start = function () {
    on('pushBrowseLibrary', domBuilder.page.build)
    on('pushListPlaylist', domBuilder.page.build)
    on('pushPlaylistContent', domBuilder.page.build)
    on('pushState', domBuilder.page.updateState)
    on('pushQueue', domBuilder.queueTable)
    get.state()
  }

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
