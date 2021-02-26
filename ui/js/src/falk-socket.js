import { queueTable, mounts, database, page, disconnected, reconnected } from '/js/src/falk-dom.js'
import { initUI } from './falk-uitools.js'
import { initRouter } from './falk-router.js'
import { getState } from './falk-datatools.js'

/* ----------- PRIVATE VARIABLES ----------- */
const _host = ''
let server

/* ----------- PRIVATE FUNCTIONS ----------- */

const ServerEventsDispatcher = function (url) {
  let conn = new window.WebSocket(url)

  const callbacks = {}
  const cbOnce = {}

  this.bind = function (eventName, callback) {
    callbacks[eventName] = callbacks[eventName] || []
    callbacks[eventName].push(callback)
    return this
  }

  this.bindOnce = function (eventName, callback) {
    cbOnce[eventName] = callback
    return this
  }

  this.send = function (eventName, eventData) {
    const payload = JSON.stringify({ event: eventName, data: eventData })
    conn.send(payload)
    return this
  }

  const startup = function () {
    conn.onmessage = function (evt) {
      const json = JSON.parse(evt.data)
      dispatch(json.event, json.data)
    }

    conn.onclose = function (e) { dispatch('close', e) }
    conn.onopen = function () { dispatch('open', null); reconnected() }
  }
  startup()

  this.bind('close', (e) => {
    if (e.code !== 1000) {
      setTimeout(function () {
        disconnected()
        conn = new window.WebSocket(url)
        startup()
      }, 3000)
    }
  })

  const dispatch = function (eventName, message) {
    const chain = callbacks[eventName]
    if (typeof chain !== 'undefined') {
      for (let i = 0; i < chain.length; i++) {
        chain[i](message)
      }
    }
    const once = cbOnce[eventName]
    if (typeof once !== 'undefined') {
      once(message)
      cbOnce[eventName] = undefined
    }
  }
}

/* ----------- PUBLIC FUNCTIONS ----------- */

// initiate the connection to the host
const init = function (host, onConnect) {
  server = new ServerEventsDispatcher('ws://' + host)
  server.bind('open', () => {
    onConnect()
    start()
  })
  server.bind('notification', (data) => notificationHandler)
}

const notificationHandler = function (data) {
  console.log(data)
}

// request data (the underlying functions determine what's requested)
const get = {
  state: function () {
    server.send('getStatus')
  },
  queue: function () {
    server.send('getQueue')
  },
  playlists: function (callback) {
    server.bindOnce('pushPlaylists', callback)
    server.send('getPlaylists')
  },
  playlist: function (name) {
    server.send('getPlaylist', { name: name })
  },
  autoPlaylists: {
    mostPlayed: function() {
      server.send('getMostPlayed')
    },
    favorites: function() {
      server.send('getFavorites')
    }
  },
  artists: function () {
    server.send('getArtists')
  },
  artistAlbums: function (name) {
    server.send('getArtistAlbums', { artist: name })
  },
  album: function (artist, title) {
    server.send('getAlbum', { artist: artist, title: title })
  },
  albums: function () {
    server.send('getAlbums')
  },
  genre: function (name) {
    server.send('getGenre', { name: name })
  },
  genres: function () {
    server.send('getGenres')
  },
  libraryStats: function (callback) {
    server.bindOnce('pushStats', callback)
    server.send('getStats')
  },
  shares: function (callback) {
    server.bindOnce('pushMounts', callback)
    server.send('getMounts')
  }
  // deviceName: function (func) {
  //   on('pushDeviceName', func)
  //   sendOnly('getDeviceName')
  // },
  // version: function (func) {
  //   if (func !== undefined) {
  //     _socket.once('pushSystemVersion', func)
  //   }
  //   sendOnly('getSystemVersion')
  // },
}

const set = {
  favorite: function(uri, callback) {
    callback = callback || null
    if (callback !== null) {
      server.bindOnce('pushFavorite', callback)
    }
    // if there's no URI, get it from getStatus() <-----------------===============================================================================================================
    server.send('setFavorite', { uri: uri })
  }
}

const action = {
  clearQueue: function () {
    server.send('clearQueue')
  },
  addPlay: function (songs, pos) {
    pos = pos || 0
    server.send('addPlay', { songs: songs, pos: pos })
  },
  replaceAndPlay: function (songs, pos) {
    pos = pos || 0
    server.send('replaceAndPlay', { songs: songs, pos: pos })
  },
  enqueue: function (data) {
    let songs = {}
    // if we're given a straight URI as a string
    if (typeof data === 'string') {
      songs = [{ uri: data }]
    // if we're given an object with a URI
    } else if (data.uri) {
      songs = [data]
    // if we're passed an array
    } else if (Array.isArray(data)) {
      songs = data
    }
    server.send('enqueue', { songs: songs })
  },
  removeFromQueue: function (pos) {
    server.send('removeFromQueue', { pos: pos })
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
      server.send('play', parseInt(pos))
    }
  },
  playid: function (id) {
    if (id !== undefined) {
      server.send('playid', parseInt(id))
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
    const rand = getState().random
    server.send('random', { state: !rand })
  },
  toggleRepeat: function () {
    const state = getState()
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
  updateArt: function () {
    server.send('updateArt')
  },
  regenerateArt: function () {
    server.send('regenerateArt')
  },
  addShare: function ({ host, path, type } = {}) {
    if (path.indexOf('/') === 0) {
      path = path.substr(1)
    }
    if (host && path && type) {
      server.send('addMount', { host, path, type })
    }
  },
  removeShare: function (mount) {
    if (mount) {
      server.send('unmount', { mountpoint: mount })
    }
  },
  shutdown: function () {
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

const getURL = function (partial) {
  return 'http://' + _host + partial
}

const start = function () {
  server.bind('pushArtists', page.build)
    .bind('pushAlbums', page.build)
    .bind('pushGenre', page.build)
    .bind('pushGenres', page.build)
    .bind('pushArtistAlbums', page.build)
    .bind('pushAlbum', page.build)
    .bind('pushPlaylists', page.build)
    .bind('pushPlaylist', page.build)
    .bind('pushStatus', page.updateState)
    .bind('pushQueue', queueTable)
    .bind('pushMounts', mounts)
    .bind('database', database)
    .bind('pushMostPlayed', page.build)
    .bind('pushFavorites', page.build)
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

export {
  get,
  set,
  action,
  getURL
}

document.addEventListener('DOMContentLoaded', function () {
  init(window.location.host, () => {
    initUI()
    initRouter()

    server.send('getMostPlayed')
  })
})