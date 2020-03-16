/* global webSocket, domBuilder, dataTools, uiTools */

var router = (function () {
  var _router = new window.Navigo('/', false, '#')

  var init = function () {
    _router.updatePageLinks()
    _router
      .on({
        playlists: function () {
          domBuilder.page.setLoad('playlists')
          webSocket.get.playlists()
        },
        'playlist/:playlist': function (params) {
          domBuilder.page.setLoad('playlist')
          webSocket.get.playlist(params.playlist)
        },
        files: function () {
          domBuilder.page.setLoad('files')
          webSocket.get.files()
        },
        'file/:location': function (params) {
          domBuilder.page.setLoad('files')
          webSocket.get.files('/' + encodeURI(params.location))
        },
        'file/:location/*': function (params, query) {
          var rt = decodeURI(_router.lastRouteResolved().url) // get the most recent URL (add spaces back)
          rt = rt.substr(rt.indexOf('file/') + 4, rt.length) // get only the parameters, not the url
          domBuilder.page.setLoad('files') // load the files page
          webSocket.get.files(rt) // request the data
        },
        artists: function () {
          domBuilder.page.setLoad('artists')
          webSocket.get.artists()
        },
        'artist/:artist': function (params) {
          domBuilder.page.setLoad('artist')
          webSocket.get.artists(encodeURIComponent(params.artist))
        },
        albums: function () {
          domBuilder.page.setLoad('albums')
          webSocket.get.albums()
        },
        'album/:artist/:album': function (params) {
          domBuilder.page.setLoad('album')
          webSocket.get.albums(encodeURIComponent(params.artist) + '/' + encodeURIComponent(params.album))
        },
        genres: function () {
          domBuilder.page.setLoad('genres')
          webSocket.get.genres()
        },
        'genre/:genre': function (params) {
          domBuilder.page.setLoad('genre')
          webSocket.get.genres(encodeURIComponent(params.genre))
        },
        'settings/:page': function (params) {
          domBuilder.page.setLoad('settings')
          domBuilder.page.settings(params.page)
        },
        settings: function () {
          _router.navigate('settings/library')
        },
        '*': function () {
          domBuilder.page.setLoad('home')
          // // we only need to do this when the user selects home, the main load paint happens in the pushState capture
          if (dataTools.getState() !== undefined && Object.keys(dataTools.getState()).length !== 0) {
            domBuilder.page.build('home')
            uiTools.setPageTitle('Audiophile Music Player')
          }
        }
      })
      .resolve()
  }

  var update = function () {
    _router.updatePageLinks()
  }

  var lastRoute = function () {
    return _router.lastRouteResolved()
  }

  return {
    update: update,
    lastRoute: lastRoute,
    init: init
  }
})()
