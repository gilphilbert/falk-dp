/* global webSocket, domBuilder, dataTools, uiTools */

const router = (function () {
  const _router = new window.Navigo('/')

  const init = function () {
    _router.updatePageLinks()
    _router
      .on({
        playlists: function () {
          domBuilder.page.setLoad('playlists')
          webSocket.get.playlists()
          uiTools.control.show()
          uiTools.hideMenu()
        },
        'playlist/:playlist': function (params) {
          domBuilder.page.setLoad('playlist')
          webSocket.get.playlist(params.data.playlist)
          uiTools.control.show()
          uiTools.hideMenu()
        },
        artists: function () {
          domBuilder.page.setLoad('artists')
          webSocket.get.artists()
          uiTools.control.show()
          uiTools.hideMenu()
        },
        'artist/:artist': function (params) {
          domBuilder.page.setLoad('artist')
          webSocket.get.artistAlbums(params.data.artist)
          uiTools.control.show()
          uiTools.hideMenu()
        },
        albums: function () {
          domBuilder.page.setLoad('albums')
          webSocket.get.albums()
          uiTools.control.show()
          uiTools.hideMenu()
        },
        'album/:artist/:album': function (params) {
          domBuilder.page.setLoad('album')
          webSocket.get.album(params.data.artist, params.data.album)
          uiTools.control.show()
          uiTools.hideMenu()
        },
        genres: function () {
          domBuilder.page.setLoad('genres')
          webSocket.get.genres()
          uiTools.control.show()
          uiTools.hideMenu()
        },
        'genre/:genre': function (params) {
          domBuilder.page.setLoad('genre')
          webSocket.get.genre(params.data.genre)
          uiTools.control.show()
          uiTools.hideMenu()
        },
        settings: function () {
          domBuilder.page.setLoad('settings')
          domBuilder.page.settings()
          uiTools.control.show()
          uiTools.hideMenu()
        },
        '*': function () {
          domBuilder.page.setLoad('home')
          // // we only need to do this when the user selects home, the main load paint happens in the pushState capture
          if (dataTools.getState() !== undefined && Object.keys(dataTools.getState()).length !== 0) {
            domBuilder.page.build('home')
            uiTools.setPageTitle('Audiophile Music Player')
          }
          uiTools.control.hide()
          uiTools.hideMenu()
        }
      })
      .resolve()
  }

  const update = function () {
    _router.updatePageLinks()
  }

  const lastRoute = function () {
    return _router.lastRouteResolved()
  }

  return {
    update: update,
    lastRoute: lastRoute,
    init: init
  }
})()
