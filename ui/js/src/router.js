/* global vioSocket, domBuilder, dataTools, uiTools */

var router = (function () {
  var _router = new window.Navigo('/', false, '#')

  var init = function () {
    _router.updatePageLinks()
    _router
      .on({
        playlists: function () {
          domBuilder.page.setLoad('playlists')
          vioSocket.get.playlists()
        },
        'playlist/:playlist': function (params) {
          domBuilder.page.setLoad('playlist')
          vioSocket.get.playlist(params.playlist)
        },
        files: function () {
          domBuilder.page.setLoad('files')
          vioSocket.get.files()
        },
        'file/:location': function (params) {
          domBuilder.page.setLoad('files')
          vioSocket.get.files('/' + encodeURI(params.location))
        },
        'file/:location/*': function (params, query) {
          var rt = decodeURI(_router.lastRouteResolved().url) // get the most recent URL (add spaces back)
          rt = rt.substr(rt.indexOf('file/') + 4, rt.length) // get only the parameters, not the url
          domBuilder.page.setLoad('files') // load the files page
          vioSocket.get.files(rt) // request the data
        },
        artists: function () {
          domBuilder.page.setLoad('artists')
          vioSocket.get.artists()
        },
        'artist/:artist': function (params) {
          domBuilder.page.setLoad('artist')
          vioSocket.get.artists(encodeURIComponent(params.artist))
        },
        albums: function () {
          domBuilder.page.setLoad('albums')
          vioSocket.get.albums()
        },
        'album/:artist/:album': function (params) {
          domBuilder.page.setLoad('album')
          vioSocket.get.albums(encodeURIComponent(params.artist) + '/' + encodeURIComponent(params.album))
        },
        genres: function () {
          domBuilder.page.setLoad('genres')
          vioSocket.get.genres()
        },
        'genre/:genre': function (params) {
          domBuilder.page.setLoad('genre')
          vioSocket.get.genres(encodeURIComponent(params.genre))
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
