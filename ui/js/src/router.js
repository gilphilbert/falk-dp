import { page } from './domBuilder.js'
import { control, hideMenu, setPageTitle } from './uitools.js'
import { get } from './websocket.js'
import { getState } from './datatools.js'

const _router = new window.Navigo('/')

const initRouter = function () {
  _router.updatePageLinks()
  _router
    .on({
      playlists: function () {
        page.setLoad('playlists')
        get.playlists()
        control.show()
        hideMenu()
      },
      'playlist/:playlist': function (params) {
        page.setLoad('playlist')
        get.playlist(params.data.playlist)
        control.show()
        hideMenu()
      },
      artists: function () {
        page.setLoad('artists')
        get.artists()
        control.show()
        hideMenu()
      },
      'artist/:artist': function (params) {
        page.setLoad('artist')
        get.artistAlbums(params.data.artist)
        control.show()
        hideMenu()
      },
      albums: function () {
        page.setLoad('albums')
        get.albums()
        control.show()
        hideMenu()
      },
      'album/:artist/:album': function (params) {
        page.setLoad('album')
        get.album(params.data.artist, params.data.album)
        control.show()
        hideMenu()
      },
      genres: function () {
        page.setLoad('genres')
        get.genres()
        control.show()
        hideMenu()
      },
      'genre/:genre': function (params) {
        page.setLoad('genre')
        get.genre(params.data.genre)
        control.show()
        hideMenu()
      },
      settings: function () {
        page.setLoad('settings')
        page.settings()
        control.show()
        hideMenu()
      },
      '*': function () {
        page.setLoad('home')
        // // we only need to do this when the user selects home, the main load paint happens in the pushState capture
        if (getState() !== undefined && Object.keys(getState()).length !== 0) {
          page.build('home')
          setPageTitle('Audiophile Music Player')
        }
        control.hide()
        hideMenu()
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

export {
  update,
  lastRoute,
  initRouter
}
