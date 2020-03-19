/* global webSocket, domBuilder, dataTools, uiTools */

var router = (function () {
  var _router = new window.Navigo('/', true, '#')

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
        artists: function () {
          domBuilder.page.setLoad('artists')
          webSocket.get.artists()
        },
        'artist/:artist': function (params) {
          console.log(params)
          domBuilder.page.setLoad('artist')
          webSocket.get.artistAlbums(params.artist)
        },
        albums: function () {
          domBuilder.page.setLoad('albums')
          webSocket.get.albums()
        },
        'album/:artist/:album': function (params) {
          domBuilder.page.setLoad('album')
          webSocket.get.album(params.artist, params.album)
        },
        genres: function () {
          domBuilder.page.setLoad('genres')
          webSocket.get.genres()
        },
        'genre/:genre': function (params) {
          domBuilder.page.setLoad('genre')
          webSocket.get.genres(encodeURIComponent(params.genre))
        },
        settings: function () {
          domBuilder.page.setLoad('settings')
          domBuilder.page.settings()
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
