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
          uiTools.control.show()
        },
        'playlist/:playlist': function (params) {
          domBuilder.page.setLoad('playlist')
          webSocket.get.playlist(params.playlist)
          uiTools.control.show()
        },
        artists: function () {
          domBuilder.page.setLoad('artists')
          webSocket.get.artists()
          uiTools.control.show()
        },
        'artist/:artist': function (params) {
          domBuilder.page.setLoad('artist')
          webSocket.get.artistAlbums(params.artist)
          uiTools.control.show()
        },
        albums: function () {
          domBuilder.page.setLoad('albums')
          webSocket.get.albums()
          uiTools.control.show()
        },
        'album/:artist/:album': function (params) {
          domBuilder.page.setLoad('album')
          webSocket.get.album(params.artist, params.album)
          uiTools.control.show()
        },
        genres: function () {
          domBuilder.page.setLoad('genres')
          webSocket.get.genres()
          uiTools.control.show()
        },
        'genre/:genre': function (params) {
          domBuilder.page.setLoad('genre')
          webSocket.get.genres(encodeURIComponent(params.genre))
          uiTools.showControl()
        },
        settings: function () {
          domBuilder.page.setLoad('settings')
          domBuilder.page.settings()
          uiTools.control.show()
        },
        '*': function () {
          domBuilder.page.setLoad('home')
          // // we only need to do this when the user selects home, the main load paint happens in the pushState capture
          if (dataTools.getState() !== undefined && Object.keys(dataTools.getState()).length !== 0) {
            domBuilder.page.build('home')
            uiTools.setPageTitle('Audiophile Music Player')
          }
          uiTools.control.hide()
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
