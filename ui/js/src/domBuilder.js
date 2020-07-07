/* global uiTools, dataTools, webSocket, router */

var domBuilder = (function () {
  var cr = window.crel.proxy
  var _loadPage = ''

  window.crel.attrMap.on = (element, value) => {
    for (const eventName in value) {
      element.addEventListener(eventName, value[eventName])
    }
  }

  var pageLoader = function (st, { msg } = {}) {
    var pl = document.querySelector('.pageloader')
    if (st === true && pl == null) {
      pl = cr.div({ class: 'pageloader' },
        cr.p({ class: 'title' }, msg)
      )
      document.body.appendChild(pl)
      window.setTimeout(() => { pl.classList.add('is-active') }, 200)
    } else if (st === false) {
      if (pl !== null) {
        pl.classList.remove('is-active')
        window.setTimeout(() => { pl.remove() }, 310)
      }
    }
  }

  var buildTile = function ({ title, image, href, subtitle, subtitleHref } = {}) {
    return cr.div({ class: 'column is-tile is-2-desktop is-4-tablet is-6-mobile item-tile', 'data-title': title, 'data-subtitle': subtitle },
      cr.a({ href: href, 'data-navigo': '' },
        cr.figure({ class: 'image is-1by1' },
          cr.img({ src: image, loading: 'lazy' })
        ),
        cr.p({ class: 'title is-5 is-capitalized' }, title)
      ),
      ((subtitle !== undefined) ? cr.a({ href: subtitleHref, 'data-navigo': '' }, cr.p({ class: 'subtitle is-5' }, subtitle)) : null)
    )
  }

  var buildTrack = function (data) {
    var format = ((data.format) ? (parseInt(data.format.split(':')[0]) / 1000) + 'kHz ' + data.format.split(':')[1] + 'bit' : '')
    var filetype = data.file.split('.')[data.file.split('.').length - 1]
    var tr = cr.tr({ 'data-uri': data.file },
      (('track' in data) ? cr.td({ class: 'is-narrow pointer', on: { click: uiTools.handlers.tracks } }, data.track) : null),
      cr.td({ class: 'pointer', on: { click: uiTools.handlers.tracks } }, data.title),
      ((data.duration) ? cr.td(uiTools.formatTime(data.duration)) : null),
      ((filetype) ? cr.td({ class: 'is-hidden-mobile' }, filetype.toUpperCase()) : null),
      ((format) ? cr.td({ class: 'is-hidden-mobile' }, cr.span({ class: 'tag is-rounded' }, format)) : null),
      cr.td({ class: 'is-narrow' },
        cr.div({ class: 'dropdown is-right' },
          cr.div({ class: 'dropdown-trigger' },
            cr.button({ 'aria-haspopup': true, on: { click: uiTools.handlers.dropdown } },
              uiTools.getSVG('more-vertical')
            )
          ),
          cr.div({ class: 'dropdown-menu', role: 'menu' },
            cr.div({ class: 'dropdown-content' },
              cr.span({ class: 'dropdown-item', on: { click: uiTools.handlers.addPlay } }, 'Play'),
              cr.span({ class: 'dropdown-item', on: { click: uiTools.handlers.queueSong } }, 'Add to queue'),
              cr.span({ class: 'dropdown-item', on: { click: uiTools.handlers.replaceWithSong } }, 'Clear and play'),
              cr.span({ class: 'dropdown-item', on: { click: (e) => { modals.addToPlaylist(e) } } }, 'Add to playlist')
            )
          )
        )
      )
    )
    return tr
  }

  var queueTable = function (queue) {
    var el = document.querySelector('#queue-items')
    if (el === null) {
      return
    }

    var queuePos = dataTools.getState().song
    var els = document.createDocumentFragment()
    queue.forEach((song) => {
      els.appendChild(cr.div({ class: 'columns is-mobile is-vcentered' + ((song.pos === queuePos) ? ' is-playing' : ''), 'data-pos': song.pos, 'data-id': song.id },
        cr.div({ class: 'column is-narrow is-hidden-touch' }, cr.figure({ class: 'image is-32x32' }, cr.img({ src: song.albumart, loading: 'lazy' }))),
        cr.div({ class: 'column is-narrow is-hidden-desktop' }, uiTools.getSVG(((song.pos === queuePos) ? 'pause' : 'play-circle'))),
        cr.div({ class: 'column has-no-overflow pointer', on: { click: function () { webSocket.action.play(this.closest('.columns').dataset.pos) } } }, song.title, cr.p({ class: 'is-hidden-desktop' }, song.artist + ' - ' + uiTools.formatTime(song.duration))),
        cr.div({ class: 'column has-no-overflow is-fixed-size is-hidden-touch' }, cr.a({ href: '/artist/' + song.artist, 'data-navigo': '' }, song.artist)),
        cr.div({ class: 'column has-no-overflow is-fixed-size is-hidden-touch' }, cr.a({ href: '/album/' + song.artist + '/' + song.album, 'data-navigo': '' }, song.album)),
        cr.div({ class: 'column is-fixed-size is-hidden-touch' }, uiTools.formatTime(song.duration)),
        cr.div({ class: 'column remove is-narrow', on: { click: uiTools.handlers.removeSong } }, cr.span({ class: 'delete' }))
      ))
    })
    uiTools.clearNodes(el).appendChild(els)
    router.update()
  }

  var page = {
    // sets the current page title, shows or hides the background and stores the page in _loadPage
    setLoad: function (newpage) {
      _loadPage = newpage
    },

    // builds the base pages and inserts state data
    build: function (data) {
      if (_loadPage === '') {
        return
      }

      // default to using the page name, then override later if it's different
      var title = _loadPage

      // clear the main page content
      var main = uiTools.clearNodes('#content-container')

      // run the right code based on the page
      switch (_loadPage) {
        case 'home':
          var state = dataTools.getState()
          var frag = cr.div({ class: 'container is-fluid' })
          frag.appendChild(
            cr.div({ class: 'columns is-reversed-touch' },
              cr.div({ class: 'column is-10-touch is-offset-1-touch is-3 is-2-fullhd' },
                cr.figure({ id: 'home-albumart', class: 'image albumart' },
                  cr.img({ loading: 'lazy' })
                )
              ),
              cr.div({ class: 'column is-10-desktop' },
                cr.p({ id: 'home-album', class: 'has-text-centered-touch subtitle is-4 has-no-overflow' }, cr.a({ href: '/album/' + state.artist + '/' + state.album, 'data-navigo': '' }, state.album || '')),
                cr.p({ id: 'home-artist', class: 'has-text-centered-touch subtitle is-4 has-text-weight-bold has-no-overflow' }, cr.a({ href: '/artist/' + state.artist, 'data-navigo': '' }, state.artist || '')),
                cr.p({ id: 'home-title', class: 'subtitle is-3 has-text-weight-bold has-text-centered-touch has-no-overflow' }, state.title || 'Not playing'),
                cr.p({ class: 'has-text-centered-touch' }, cr.span({ id: 'home-quality', class: 'is-small' }, uiTools.getQuality(state)))
              )
            )
          )
          frag.appendChild(
            cr.div({ class: 'columns is-hidden-desktop' },
              cr.div({ id: 'mobile-toolbar', class: 'column is-10-touch is-offset-1-touch has-no-vpadding' },
                cr.span({}, uiTools.getSVG('heart'))
              ),
              cr.div({ class: 'column mobile-controls is-12' },
                // cr.span({ on: { click: webSocket.action.toggleRandom } }, uiTools.getSVG('shuffle', 'random is-small' + ((state.random) ? ' is-active' : ''))),
                cr.span({ on: { click: webSocket.action.prev } }, uiTools.getSVG('skip-back')),
                cr.button({ class: 'button is-primary is-rounded', on: { click: uiTools.handlers.mobileButtons.play } }, uiTools.getSVG(((state.state !== 'play') ? 'play' : 'pause'))),
                cr.span({ on: { click: webSocket.action.next } }, uiTools.getSVG('skip-forward'))//,
                // cr.span({ on: { click: webSocket.action.toggleRepeat } }, uiTools.getSVG('repeat' + ((state.single) ? '-one' : ''), 'repeat is-small' + ((state.repeat) ? ' is-active' : '')))
              ),
              cr.div({ class: 'column is-10-touch is-offset-1-touch' },
                cr.progress({ id: 'mobile-progress', class: 'progress', value: 0, max: 1000 })
              )
            )
          )
          frag.appendChild(
            cr.div({ id: 'swipe-up-queue', on: { click: () => { document.querySelector('#queue-list').classList.add('is-active') } } }, uiTools.getSVG('chevron-up'))
          )

          if ('albumart' in state) {
            frag.querySelector('.albumart img').src = state.albumart
          } else {
            frag.querySelector('.albumart img').src = '/img/notplaying.png'
          }

          webSocket.get.queue()

          frag.appendChild(
            cr.div({ id: 'queue-list' },
              cr.div({ class: 'container-fluid' },
                cr.p({ class: 'title is-3 is-hidden-desktop' }, 'Play queue'),
                cr.div({ id: 'queue-items' })
              )
            )
          )

          main.appendChild(frag)
          break

        case 'album':
          // set the page title
          title = data.title + ' - ' + data.artist
          // list of songs in this album
          var duration = uiTools.formatTime(Math.round(data.songs.reduce((total, song) => total + parseFloat(song.duration), 0)))

          var format = ''
          var channels = ''
          // if every song has the same format
          if (data.songs.every(song => song.format === data.songs[0].format)) {
            format = data.songs[0].format
          }
          if (format !== '') {
            format = format.split(':')
            channels = format[2]
            switch (channels) {
              case '2':
                channels = 'stereo'
                break
              case '6':
                channels = '5.1'
                break
            }
            format = parseInt(format[0] / 1000) + 'kHz ' + format[1] + 'bit'
          }

          // create the main fragment
          frag = cr.div({ class: 'container is-fluid' })

          // append the details and list of tracks to the fragment
          frag.appendChild(
            cr.div({ class: 'columns is-multiline is-mobile album-detail' },
              cr.div({ class: 'column is-3-desktop is-10-touch is-offset-1-touch' },
                cr.figure({ class: 'image is-1by1 albumart' },
                  cr.img({ src: data.albumart, loading: 'lazy' })
                )
              ),
              cr.div({ class: 'column is-8-desktop is-10-touch is-offset-1-touch' },
                cr.div({ class: 'columns is-multiline is-mobile' },
                  cr.div({ class: 'column is-8-mobile is-12-desktop' },
                    cr.p({ class: 'is-uppercase has-text-weight-semibold is-hidden-mobile' }, 'Album'),
                    cr.p({ class: 'title is-3 album-title has-text-weight-semibold' }, data.title),
                    cr.p('By ', cr.a({ class: 'artist has-text-weight-semibold', 'data-navigo': '', href: '/artist/' + encodeURIComponent(data.artist) }, data.artist)),
                    cr.p({ class: 'detail' }, data.songs.length + ' Song' + ((data.songs.length > 1) ? 's' : '') + ' - ' + duration + ((data.songs[0].date) ? ' - ' + data.songs[0].date : '')),
                    cr.div({ class: 'tags' },
                      ((format !== '') ? cr.span({ class: 'tag is-rounded' }, format) : null),
                      ((format !== '') ? cr.span({ class: 'tag is-rounded is-capitalized' }, channels) : null)
                    )
                  ),
                  cr.div({ class: 'column is-narrow' },
                    cr.button({ class: 'button is-rounded is-primary play-album', on: { click: uiTools.handlers.playAlbum } }, cr.span({ class: 'is-hidden-touch' }, 'Play album'), cr.span({ class: 'is-hidden-desktop' }, uiTools.getSVG('play')))
                  )
                )
              )
            )
          )

          frag.appendChild(
            cr.table({ class: 'table is-fullwidth songs songs-hover' },
              cr.tbody(
                data.songs.map(function (song) {
                  return buildTrack(song)
                })
              )
            )
          )

          // append the main fragment to the page
          main.appendChild(frag)

          break

        case 'albums':
          // list of albums
          var albums = data

          // create main fragment
          frag = cr.div({ class: 'container is-fluid' })

          // append the library buttons
          // frag.appendChild(breadcrumb([{ title: 'Albums', url: null, isActive: true }]))
          frag.appendChild(cr.p({ class: 'title is-3 is-capitalized' }, title))

          // add the list of albums
          frag.appendChild(
            cr.div({ class: 'columns is-mobile is-multiline albumart' },
              albums.map(function (album) {
                return buildTile({
                  title: album.title,
                  subtitle: album.artist,
                  subtitleHref: '/artist/' + encodeURIComponent(album.artist),
                  image: album.albumart,
                  href: '/album/' + encodeURIComponent(album.artist) + '/' + encodeURIComponent(album.title)
                })
              })
            )
          )

          // append the main fragment to the page
          main.appendChild(frag)

          break

        case 'artist':
          // set the page title
          title = data.artist.title

          // list of the artist's albums
          albums = data.albums

          // list of the artist's songs
          // songs = data.navigation.lists[1].items

          // find all the songs that aren't in an album
          /*
          var orphanSongs = songs.filter(function (song) {
            if (song.album === '') {
              return song
            }
          })
          */

          // create main fragment
          frag = cr.div({ class: 'container is-fluid' })

          // append the library buttons
          // frag.appendChild(breadcrumb([{ title: 'Artists', url: 'artists' }, { title: data.navigation.info.title, url: null, isActive: true }]))

          // create the information section
          frag.appendChild(
            cr.div({ class: 'columns artist-info is-mobile' },
              cr.div({ class: 'column is-2-tablet is-2-desktop is-4-mobile' },
                cr.figure({ class: 'image artistart' },
                  cr.img({ src: data.artist.albumart, loading: 'lazy' })
                )
              ),
              cr.div({ class: 'column is-8' },
                cr.p({ class: 'title' }, data.artist.title),
                cr.p({ class: 'subtitle' }, albums.length + ' album' + ((albums.length > 1 || albums.length === 0) ? 's' : '')) // + ' - ' + songs.length + ' track' + ((songs.length > 1) ? 's' : ''))
              )
            )
          )

          // create the list of albums (in tile format)
          frag.appendChild(
            cr.div({ class: 'columns is-mobile is-multiline albumart' },
              albums.map(function (album) {
                return buildTile({
                  title: album.title,
                  image: album.albumart,
                  href: '/album/' + encodeURIComponent(data.artist.title) + '/' + encodeURIComponent(album.title)
                })
              })
            )
          )

          // append any 'orphan' songs (songs not in an album)
          /*
          frag.appendChild(
            cr.table({ class: 'table is-fullwidth songs songs-hover' },
              cr.tbody(
                orphanSongs.filter(function (song) {
                  if (song.album === '') {
                    return song
                  }
                }).map(function (song) {
                  return buildTrack(song)
                })
              )
            )
          )
          */

          // append the main fragment to the page
          main.appendChild(frag)

          break

        case 'artists':
          // this is the data we'll need (list of artists)
          var artists = data // data.navigation.lists[0].items

          // the main document fragment
          frag = cr.div({ class: 'container is-fluid' })

          // append the library buttons
          // frag.appendChild(breadcrumb([{ title: 'Artists', url: null }]))
          frag.appendChild(cr.p({ class: 'title is-3 is-capitalized' }, title))

          // add the list of artists (tiles)
          frag.appendChild(
            cr.div({ class: 'columns is-mobile is-multiline artistart' },
              artists.map(function (artist) {
                return buildTile({
                  title: artist.title,
                  image: artist.albumart,
                  href: '/artist/' + encodeURIComponent(artist.title)
                })
              })
            )
          )

          // append the fragment to the document
          main.appendChild(frag)
          break

        case 'genres':
          // the main document fragment
          frag = cr.div({ class: 'container is-fluid' })

          // append the library buttons
          frag.appendChild(cr.p({ class: 'title is-3 is-capitalized' }, title))

          // build the list of genres
          frag.appendChild(
            cr.div({ class: 'columns is-mobile is-multiline albumart' },
              data.map(function (genre) {
                return buildTile({
                  title: genre,
                  image: '/img/genre.png',
                  href: '/genre/' + encodeURIComponent(genre)
                })
              })
            )
          )

          // append the content to the page
          main.appendChild(frag)

          break

        case 'genre':
          // <------------------------------------------------------------------------------------------------------------
          // this needs revisiting. Think the uri attribute needs to be used as this is all kinds of weird...
          // <------------------------------------------------------------------------------------------------------------
          title = router.lastRoute().params.genre
          data = data.navigation.lists
          data.forEach(function (i) {
            var container = cr.div({ class: 'columns is-mobile is-multiline' })

            // let's check for tracks
            if (i.title.indexOf('Tracks') > 0) {
              var lnk = 'artist'
              if (i.title.indexOf('Albums') === 0) {
                lnk = 'album'
                container.classList.add('albumart')
              } else {
                container.classList.add('artistart')
              }
              i.items.forEach((item) => {
                var tlnk = lnk
                if (tlnk === 'album') {
                  tlnk = tlnk + '/' + encodeURIComponent(item.artist.trim())
                }
                container.appendChild(buildTile({
                  title: item.title,
                  image: webSocket.getURL(item.albumart),
                  href: '/' + tlnk + '/' + encodeURIComponent(item.title)
                }))
              })
            } else {
              var tbody = cr.tbody()
              i.items.forEach((item, pos) => {
                tbody.appendChild(buildTrack(item))
              })
              container.appendChild(cr.table({ class: 'table is-fullwidth songs songs-hover' }, tbody))
            }
            frag = cr.div({ class: 'container is-fluid' })
            frag.appendChild(cr.p({ class: 'title' }, i.title))
            frag.appendChild(container)
            main.appendChild(frag)
          })
          break

        case 'playlists':
          // the main document fragment
          frag = cr.div({ class: 'container is-fluid' })

          // append the library buttons
          // frag.appendChild(breadcrumb([{ title: 'Playlists', url: null }]))
          frag.appendChild(cr.p({ class: 'title is-3 is-capitalized page-title' }, title))

          // create a tile for each
          frag.appendChild(
            cr.div({ class: 'columns is-mobile is-multiline playlist-list' },
              data.map(function (playlist) {
                return buildTile({
                  title: playlist,
                  image: '/img/icons/playlist-padded.svg',
                  href: '/playlist/' + encodeURIComponent(playlist)
                })
              })
            )
          )

          // append the content to the page
          main.appendChild(frag)

          break

        case 'playlist':
          // set the page title
          title = data.name

          // create the main page fragment
          frag = document.createDocumentFragment()

          var songs = []
          if (data.lists && data.lists.length > 0) {
            songs = data.lists[0]
          } else if ('navigation' in data && 'lists' in data.navigation && data.navigation.lists[0].items.length > 0) {
            songs = data.navigation.lists[0].items
          }

          var name = ''
          if ('navigation' in data) {
            name = data.navigation.info.name
          } else {
            name = data.name
          }
          main.appendChild(
            cr.div({ class: 'columns is-multiline is-mobile playlist-detail' },
              cr.div({ class: 'column is-4-desktop is-12-mobile' },
                cr.figure({ class: 'image is-1by1 albumart' },
                  cr.img({ src: '/img/icons/playlist-padded.svg' })
                )
              ),
              cr.div({ class: 'column is-8-desktop is-12-mobile' },
                cr.h5({ class: 'is-uppercase has-text-weight-semibold' }, 'Playlist'),
                cr.h2({ class: 'title album-title has-text-weight-semibold is-capitalized' }, name),
                cr.table({ class: 'table is-fullwidth songs songs-hover' },
                  cr.tbody(
                    songs.map((song) => {
                      return cr.tr(
                        cr.td(
                          cr.figure({ class: 'image is-24x24' },
                            cr.img({ src: webSocket.getURL(song.albumart) })
                          )
                        ),
                        cr.td(song.title),
                        cr.td(
                          cr.a({ href: '/artist/' + encodeURIComponent(song.artist) }, song.artist)
                        ),
                        cr.td(
                          cr.a({ href: '/album/' + encodeURIComponent(song.artist) + '/' + encodeURIComponent(song.album) }, song.album)
                        ),
                        cr.td(
                          cr.span({ class: 'delete', on: { click: function () { webSocket.action.removeFromPlaylist({ name: `${name}` }) } } })
                        )
                      )
                    })
                  )
                )
              )
            )
          )
          break
      }
      uiTools.setPageTitle({ title })
      router.update()
      _loadPage = ''
    },
    updateState: function (newState) {
      var changed = dataTools.changeState(newState)
      var state = dataTools.getState()

      const isHome = ((document.getElementById('home-albumart') !== null) ? true : false)

      var mc = document.querySelector('.home .mobile-controls')

      // this whole section updates the footer (now playing) banner
      if (changed.includes('albumart')) {
        document.querySelector('#control-bar .now-playing img').src = state.albumart
        if (isHome) {
          document.getElementById('home-albumart').src = state.albumart
        }
      }
      if (!state.albumart) {
        document.querySelector('#control-bar .now-playing img').src = '/img/notplaying.png'
      }

      if (changed.includes('title')) {
        document.querySelector('#control-bar .now-playing .title').innerText = state.title
        if (isHome) {
          document.getElementById('home-title').innerText = state.title
        }
        uiTools.progress.stop()
      }
      if (changed.includes('artist')) {
        document.querySelector('#control-bar .now-playing .subtitle').innerText = state.artist
        if (isHome) {
          document.getElementById('home-artist').innerText = state.artist
        }
      }
      if (changed.includes('album') && isHome) {
        document.getElementById('home-album').innerText = state.album
      }
      if (changed.includes('repeat')) {
        if (state.repeat === true) {
          document.querySelector('#control-bar .misc-controls .repeat').classList.add('is-active')
          if (mc) {
            document.querySelector('.mobile-controls .repeat').classList.add('is-active')
          }
        } else {
          document.querySelector('#control-bar .misc-controls .repeat').classList.remove('is-active')
          if (mc) {
            document.querySelector('.mobile-controls .repeat').classList.remove('is-active')
          }
        }
      }
      if (changed.includes('single')) {
        var rpt = 'repeat'
        if (state.single === true) {
          rpt += '-one'
        }
        document.querySelector('#control-bar .repeat use').setAttribute('xlink:href', '/img/feather-sprite.svg#' + rpt)
        if (mc) {
          document.querySelector('.mobile-controls .repeat use').setAttribute('xlink:href', '/img/feather-sprite.svg#' + rpt)
        }
      }
      if (changed.includes('random')) {
        if (state.random === true) {
          document.querySelector('#control-bar .misc-controls .random').classList.add('is-active')
          if (mc) {
            document.querySelector('.mobile-controls .random').classList.add('is-active')
          }
        } else {
          document.querySelector('#control-bar .misc-controls .random').classList.remove('is-active')
          if (mc) {
            document.querySelector('.mobile-controls .random').classList.remove('is-active')
          }
        }
      }

      if (changed.includes('elapsed')) {
        uiTools.progress.set(state.elapsed, state.duration)
        document.querySelector('#control-bar .duration').innerText = uiTools.formatTime(state.duration)
      }

      if (changed.includes('state')) {
        var use = document.querySelector('.playing-controls .play-button use')
        if (state.state === 'play') {
          use.setAttribute('xlink:href', '/img/feather-sprite.svg#pause')
          if (mc) {
            mc.querySelector('.button use').setAttribute('xlink:href', '/img/feather-sprite.svg#pause')
          }
          uiTools.progress.start()
        } else {
          use.setAttribute('xlink:href', '/img/feather-sprite.svg#play')
          if (mc) {
            mc.querySelector('.button use').setAttribute('xlink:href', '/img/feather-sprite.svg#play')
          }
          uiTools.progress.stop()
          uiTools.progress.update()
        }
        uiTools.setPageTitle({ state })
      }

      // if we're currently loading the home page create it
      if (_loadPage === 'home') {
        page.build('home')
        uiTools.setPageTitle()
      } else if (changed.includes('status') || changed.includes('title')) {
        // update the queue when state or track changes
        webSocket.get.queue()
        // shortcut to find if we're on the homepage
        if (router.lastRoute().url.match(/\//g || []).length === 2) {
          var home = document.querySelector('#content-container .home')
          home.querySelector('.title').textContent = state.title
          home.querySelector('.artist').textContent = state.artist
          home.querySelector('.detail .tag .quality').textContent = uiTools.getQuality(state)
          var album = home.querySelector('.album a')
          album.textContent = state.album
          album.href = '/' + state.artist + '/' + state.album
          home.querySelector('.albumart img').src = state.albumart
        }
      }
    },
    settings: function () {
      // this is our main container
      var main = uiTools.clearNodes('#content-container')

      var cont = cr.div({ class: 'container is-fluid', id: 'setting-page' },
        cr.p({ class: 'title is-4' }, 'Database'),
        cr.div({ class: 'field is-horizontal' },
          cr.div({ class: 'field-label' },
            cr.label({ class: 'label' }, 'Songs')
          ),
          cr.div({ class: 'field-body' },
            cr.div({ class: 'field song-count' }, 'Loading')
          )
        ),
        cr.div({ class: 'field is-horizontal' },
          cr.div({ class: 'field-label' },
            cr.label({ class: 'label' }, 'Artists')
          ),
          cr.div({ class: 'field-body' },
            cr.div({ class: 'field artist-count' }, 'Loading')
          )
        ),
        cr.div({ class: 'field is-horizontal' },
          cr.div({ class: 'field-label' },
            cr.label({ class: 'label' }, 'Albums')
          ),
          cr.div({ class: 'field-body' },
            cr.div({ class: 'field album-count' }, 'Loading')
          )
        ),
        cr.div({ class: 'field is-horizontal' },
          cr.div({ class: 'field-label' }),
          cr.div({ class: 'field-body' },
            cr.div({ class: 'field' },
              cr.div({ class: 'control' },
                cr.div({ class: 'buttons' },
                  cr.button({ class: 'button is-rounded is-primary', on: { click: () => { webSocket.action.updateLibrary() } } }, 'Update Library'),
                  cr.button({ class: 'button is-rounded is-primary', on: { click: () => { webSocket.action.rescanLibrary() } } }, 'Rescan Library')
                )
              )
            )
          )
        ),
        cr.p({ class: 'title is-4' }, 'Network shares'),
        cr.div({ class: 'field is-horizontal' },
          cr.div({ class: 'field-label' },
            cr.label({ class: 'label' }, 'Shares')
          ),
          cr.div({ class: 'field-body' },
            cr.table({ id: 'mount-table', class: 'table is-fullwidth' },
              cr.thead(
                cr.tr(
                  cr.th('Name'), cr.th('Server'), cr.th('Share'), cr.th('Type')
                )
              ),
              cr.tbody()
            )
          )
        ),
        cr.div({ class: 'field is-horizontal' },
          cr.div({ class: 'field-label' }),
          cr.div({ class: 'field-body' },
            cr.div({ class: 'field' },
              cr.div({ class: 'control' },
                cr.div({ class: 'buttons' },
                  cr.button({ class: 'button is-rounded is-primary', on: { click: function () { modals.addShare() } } }, 'Add share')
                )
              )
            )
          )
        ),
        /*
        cr.div({ class: 'field is-horizontal' },
          cr.div({ class: 'field-label' },
            cr.label({ class: 'label' }, 'Version')
          ),
          cr.div({ class: 'field-body' },
            cr.div({ class: 'field', id: 'system-version' },
              cr.p(
                cr.span(),
                cr.button({ class: 'button is-small is-primary', on: { click: function () { webSocket.action.updateCheck(); this.classList.add('is-info'); this.classList.add('is-loading') } } }, uiTools.getSVG('rotate-cw'))
              )
            )
          )
        ),
        */
        cr.p({ class: 'title is-4' }, 'System'),
        cr.div({ class: 'field is-horizontal' },
          cr.div({ class: 'field-label is-normal' },
            cr.label({ class: 'label' }, 'Power')
          ),
          cr.div({ class: 'field-body' },
            cr.div({ class: 'field' },
              cr.div({ class: 'control' },
                cr.div({ class: 'buttons' },
                  cr.button({ class: 'button is-rounded is-danger', on: { click: () => { webSocket.action.reboot(); pageLoader(true, { msg: 'Rebooting' }) } } }, 'Reboot'),
                  cr.button({ class: 'button is-rounded is-danger', on: { click: () => { webSocket.action.shutdown(); pageLoader(true, { msg: 'Powering down' }) } } }, 'Shutdown')
                )
              )
            )
          )
        )
      )
      // load the database stats
      webSocket.get.libraryStats((data) => {
        cont.querySelector('.field.song-count').innerText = data.songs
        cont.querySelector('.field.artist-count').innerText = data.artists
        cont.querySelector('.field.album-count').innerText = data.albums
      })
      webSocket.get.shares((data) => {
        var tbl = document.querySelector('#mount-table tbody')
        data.forEach((m) => {
          var type = m.storage.substr(0, 3)
          var host = m.storage.substr(6, m.storage.substr(6).indexOf('/'))
          var share = m.storage.substr(6 + host.length)
          tbl.appendChild(
            cr.tr({ 'data-id': m.mount },
              cr.td(m.mount), cr.td(host), cr.td(share), cr.td(type.toUpperCase()), cr.td(cr.span({ class: 'delete' }))
            )
          )
        })
        tbl.addEventListener('click', (e) => {
          if (e.target.className === 'delete') {
            var tr = e.target.closest('tr')
            var id = tr.dataset.id
            webSocket.action.removeShare(id)
            tr.remove()
          }
        })
      })
      // load the system version
      // webSocket.get.version((data) => {
      //   var el = document.querySelector('#system-version p span')
      //   if (el !== undefined && data) {
      //     var v = data.systemversion + ' (' + data.builddate + ') '
      //     el.innerText = v
      //   }
      // })
      // webSocket.get.deviceName((data) => {
      //   var el = document.querySelector('#device-name input')
      //   if (el !== undefined && data) {
      //     el.value = data.name
      //   }
      // })
      main.appendChild(cont)
      uiTools.setPageTitle({ title: 'Settings' })
      router.update()
    }
  }

  var modals = {
    addShare: function () {
      var modal = cr.div({ id: 'update-detail-modal', class: 'modal is-small modal-fx-3dSignDown' },
        cr.div({ class: 'modal-background' }),
        cr.div({ class: 'modal-content' },
          cr.div({ class: 'box' },
            uiTools.getSVG('server', 'title-icon'),
            cr.p({ class: 'title' }, 'Add share'),
            cr.div({ class: 'field' },
              cr.div({ class: 'control' },
                cr.input({ class: 'input address', type: 'text', placeholder: 'Server address' })
              ),
              cr.p({ class: 'help is-danger' })
            ),
            cr.div({ class: 'field' },
              cr.div({ class: 'control' },
                cr.input({ class: 'input path', type: 'text', placeholder: 'Path (e.g. /export/music)' })
              ),
              cr.p({ class: 'help is-danger' })
            ),
            cr.div({ class: 'field' },
              cr.div({ class: 'control' },
                cr.div({ class: 'select is-fullwidth' },
                  cr.select({ class: 'type' },
                    cr.option({ value: 'nfs' }, 'NFS'),
                    cr.option({ value: 'smb' }, 'SMB')
                  )
                )
              ),
              cr.p({ class: 'help is-danger' })
            ),
            cr.div({ class: 'columns buttons' },
              cr.div({ class: 'column ' },
                cr.div({ class: 'field' },
                  cr.div({ class: 'control' },
                    cr.button({ class: 'button is-text is-rounded is-fullwidth', on: { click: function () { this.closest('.modal').classList.remove('is-active') } } }, 'Close')
                  )
                )
              ),
              cr.div({ class: 'column' },
                cr.div({ class: 'field first-button' },
                  cr.div({ class: 'control' },
                    cr.button({ class: 'button is-white is-rounded is-fullwidth', on: { click: function () { uiTools.handlers.addShare(this) } } }, 'Add')
                  )
                )
              )
            )
          )
        )
      )
      uiTools.clearNodes('#modal-container').appendChild(modal)

      // wait for the element to be added to the DOM so we get our nice effects!
      window.setTimeout(() => {
        modal.classList.add('is-active')
      }, 250)
    },
    addToPlaylist: function (e) {
      var song = e.target.closest('tr').dataset
      var modal = cr.div({ class: 'modal is-small modal-fx-3dSignDown' },
        cr.div({ class: 'modal-background' }),
        cr.div({ class: 'modal-content' },
          cr.div({ class: 'box' },
            cr.p({ class: 'title' }, 'Select a playlist'),
            cr.table({ class: 'table is-fullwidth table-hover' }),
            cr.button({ class: 'button is-light is-fullwidth', on: { click: uiTools.closeModal } }, 'Cancel')
          )
        )
      )
      webSocket.get.playlists((data) => {
        var tbody = cr.tbody(
          data.map(function (playlist) {
            return cr.tr(cr.td(playlist), cr.td(cr.button({ class: 'button', on: { click: () => { webSocket.action.addToPlaylist({ name: `${playlist}`, service: `${song.service}`, uri: `${song.uri}` }); uiTools.closeModal() } } }, 'Select')))
          })
        )
        modal.querySelector('table').appendChild(tbody)
      })
      uiTools.clearNodes('#modal-container').appendChild(modal)
      // wait for the element to be added to the DOM so we get our nice effects!
      window.setTimeout(() => {
        modal.classList.add('is-active')
      }, 250)
    }
  }

  var mounts = function (data) {
    console.log(data)
    uiTools.closeModal()
  }

  var database = function (data) {
    console.log(database)
  }

  return {
    queueTable: queueTable,
    mounts: mounts,
    database: database,
    page: page
  }
})()
