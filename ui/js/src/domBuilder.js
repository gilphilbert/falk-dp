/* global uiTools, dataTools, webSocket, router */

const domBuilder = (function () {
  const cr = window.crel.proxy
  let _loadPage = ''

  window.crel.attrMap.on = (element, value) => {
    for (const eventName in value) {
      element.addEventListener(eventName, value[eventName])
    }
  }

  const buildTile = function ({ title, image, href, subtitle, subtitleHref, classes } = {}) {
    return cr.div({ class: 'col-lg-2 col-xs-4 art has-text-centered item-tile ' + classes || ' ', 'data-title': title, 'data-subtitle': subtitle || '' },
      cr.a({ href: href, 'data-navigo': '' },
        cr.figure({ class: 'image is-1by1' },
          cr.img({ src: image, loading: 'lazy' })
        ),
        cr.p({ class: 'is-5 is-capitalized' }, title)
      ),
      ((subtitle !== undefined) ? cr.a({ href: subtitleHref, 'data-navigo': '' }, cr.p({ class: 'subtitle is-5 is-capitalized' }, subtitle)) : null)
    )
  }

  const buildTrack = function (data) {
    const format = ((data.format) ? data.format.sample_rate_short.value + data.format.sample_rate_short.unit + ' ' + data.format.bits + 'bit' : '')
    const filetype = data.file.split('.')[data.file.split('.').length - 1]
    const track = (('track' in data) ? data.track + '. ' : '')
    const tr = cr.tr({ 'data-uri': data.file },
      cr.td({ class: 'pointer', on: { click: uiTools.handlers.tracks } },
        cr.p({ class: 'is-5' }, track + data.title),
        cr.p({ class: 'subtitle is-5' }, data.artist)
      ),
      ((data.duration) ? cr.td(uiTools.formatTime(data.duration)) : null),
      ((filetype) ? cr.td({ class: 'hidden--to-tablet' }, filetype.toUpperCase()) : null),
      ((format) ? cr.td({ class: 'hidden--to-tablet' }, cr.span({ class: 'tag' }, format)) : null),
      cr.td({ class: 'is-narrow' },
        cr.div({ class: 'dropdown is-right' },
          cr.span({ on: { click: uiTools.handlers.dropdown } },
            uiTools.getSVG('more-vertical')
          ),
          cr.div({ class: 'dropdown-content' },
            cr.span({ class: 'dropdown-item', on: { click: uiTools.handlers.addPlay } }, 'Play'),
            cr.span({ class: 'dropdown-item', on: { click: uiTools.handlers.queueSong } }, 'Add to queue'),
            cr.span({ class: 'dropdown-item', on: { click: uiTools.handlers.replaceWithSong } }, 'Clear and play'),
            cr.span({ class: 'dropdown-item', on: { click: (e) => { modals.addToPlaylist(e) } } }, 'Add to playlist')
          )
        )
      )
    )
    return tr
  }

  const queueTable = function (queue) {
    const tbl = uiTools.clearNodes('#queue-items table')
    const queuePos = dataTools.getState().song
    queue.forEach((song) => {
      tbl.appendChild(cr.tr({ class: ((song.pos === queuePos) ? 'is-playing' : ''), 'data-pos': song.pos },
        cr.td(cr.figure({ class: 'image is-40x40' }, cr.img({ src: song.albumart.replace('album/', 'album/thumb/'), loading: 'lazy' }))),
        cr.td({ on: { click: function () { webSocket.action.play(this.closest('tr').dataset.pos) } } },
          cr.p({ class: 'is-5' }, song.title),
          cr.p({ class: 'subtitle is-5' }, song.artist + ' - ' + uiTools.formatTime(song.duration))
        ),
        cr.td({ on: { click: uiTools.handlers.removeSong } }, cr.span({ class: 'delete' }, uiTools.getSVG('x-circle', 'delete')))
      ))
    })
    // uiTools.clearNodes(el).appendChild(tbl)
    router.update()
  }

  const page = {
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
      let title = _loadPage

      // clear the main page content
      const main = uiTools.clearNodes('#content-container')

      main.style.backgroundImage = ''
      main.classList.remove('has-background')

      // run the right code based on the page
      if (_loadPage === 'home') {
        const state = dataTools.getState()
        const isLossless = !(parseInt(state.bitrate) <= 320)
        const frag = cr.div({ class: 'container-fluid max' })

        frag.appendChild(cr.div({ class: 'background-container hidden--to-desktop' },
          cr.figure({ class: 'image' },
            cr.img({ src: `/art/artist/background/blur/${encodeURIComponent(state.artist)}.jpg)` })
          )
        ))

        let imgSrc = '/img/notplaying.png'
        if ('albumart' in state) {
          imgSrc = state.albumart
        }

        frag.appendChild(
          cr.div({ class: 'row' },
            cr.div({ class: 'col-xs-10 col-md-3 has-margin-auto art' },
              cr.figure({ id: 'home-albumart', class: 'image is-1by1' },
                cr.img({ loading: 'lazy', src: imgSrc })
              ),
              cr.div({ id: 'mobile-toolbar', class: 'hidden--for-desktop' },
                cr.span({}, uiTools.getSVG('heart'))
              )
            ),
            cr.div({ class: 'col-xs-10 col-xs-offset-1' },
              cr.h1({ id: 'home-title', class: 'has-text-centered has-no-overflow' }, state.title || 'Not playing'),
              cr.p({ class: 'has-text-centered subtitle is-3 has-no-overflow hidden--to-desktop' }, cr.a({ id: 'home-album', href: '/album/' + state.artist + '/' + state.album, 'data-navigo': '' }, state.album || '')),
              cr.p({ class: 'has-text-centered subtitle is-3 has-no-overflow' }, cr.a({ id: 'home-artist', href: '/artist/' + state.artist, 'data-navigo': '' }, state.artist || '')),
              cr.p({ class: 'has-text-centered' }, cr.span({ id: 'home-quality', class: 'tag is-small' + ((isLossless) ? '' : ' is-grey') }, uiTools.getQuality(state)))
            ),
            cr.div({ id: 'mobile-controls', class: 'col-xs-12 mobile-controls hidden--for-desktop' },
              cr.span({ on: { click: webSocket.action.toggleRandom } }, uiTools.getSVG('shuffle', 'random is-small' + ((state.random) ? ' is-active' : ''))),
              cr.span({ on: { click: webSocket.action.prev } }, uiTools.getSVG('skip-back')),
              cr.button({ class: 'button is-primary is-rounded has-no-margin', on: { click: uiTools.handlers.mobileButtons.play } }, uiTools.getSVG(((state.state !== 'play') ? 'play' : 'pause'))),
              cr.span({ on: { click: webSocket.action.next } }, uiTools.getSVG('skip-forward')),
              cr.span({ on: { click: webSocket.action.toggleRepeat } }, uiTools.getSVG('repeat' + ((state.single) ? '-one' : ''), 'repeat is-small' + ((state.repeat) ? ' is-active' : '')))
            ),
            cr.div({ class: 'col-xs-10 col-xs-offset-1 hidden--for-desktop' },
              // cr.progress({ id: 'mobile-progress', class: 'progress', value: 0, max: 1000 }),
              cr.div({ id: 'mobile-progress-bar' }, cr.div())
            )
          )
        )
        frag.appendChild(
          cr.div({ class: 'hidden--for-desktop', id: 'swipe-up-queue', on: { click: () => { document.querySelector('#queue-list').classList.add('is-active') } } }, uiTools.getSVG('chevron-up'))
        )

        /*
        frag.appendChild(
          cr.div({ id: 'queue-list' },
            cr.div({ class: 'queue-header' },
              cr.p({ class: 'is-3 is-hidden-desktop' }, 'Play queue')
            ),
            cr.div({ id: 'queue-items' })
            // )
          )
        )
        */

        // attach the elements to the main container
        main.appendChild(frag)

        // last of all, call update to correctly set the progress bar position and get the queue
        webSocket.get.queue()
        uiTools.progress.update()
      } else if (_loadPage === 'album') {
        // set the page title
        title = data.title + ' - ' + data.artist
        // list of songs in this album

        let format = ''
        // if every song has the same format
        if (data.songs.every(song => song.format.original_value === data.songs[0].format.original_value)) {
          format = data.songs[0].format.sample_rate_short.value + data.songs[0].format.sample_rate_short.unit + ' ' + data.songs[0].format.bits + 'bit'
        }

        // create the main fragment
        const frag = cr.div({ class: 'container-fluid' })

        // append the details and list of tracks to the fragment
        frag.appendChild(
          cr.div({ class: 'row album-detail' },
            cr.div({ class: 'col-md-3 col-xs-4 art' },
              cr.figure({ class: 'image' },
                cr.img({ src: data.albumart, loading: 'lazy' })
              )
            ),
            cr.div({ class: 'col-md-9 col-xs-8' },
              cr.p({ class: 'is-5 hidden--to-desktop has-text-weight-normal' }, 'Album'),
              cr.h1({ class: 'album-title' }, data.title),
              cr.p(cr.a({ class: 'is-3', 'data-navigo': '', href: '/artist/' + encodeURIComponent(data.artist) }, data.artist)),
              ((data.songs[0].date) ? cr.p({ class: 'is-4 detail' }, data.songs[0].date) : null),
              cr.p(cr.a({ class: 'is-4', 'data-navigo': '', href: '/genres/' + encodeURIComponent(data.songs[0].genre) }, data.songs[0].genre)),
              ((format !== '') ? cr.p({ class: 'is-6 tag is-rounded detail' }, format) : null)
            )
          )
        )

        frag.appendChild(
          cr.div({ class: 'row album-detail' },
            cr.div({ class: 'col-md-9 col-md-offset-3 col-xs-12' },
              cr.table({ class: 'table songs' },
                cr.tbody(
                  data.songs.map(function (song) {
                    return buildTrack(song)
                  })
                )
              )
            )
          )
        )

        // append the main fragment to the page
        main.appendChild(frag)
      } else if (_loadPage === 'albums') {
        // create main fragment
        const frag = cr.div({ class: 'container-fluid' })

        // append the library buttons
        // frag.appendChild(breadcrumb([{ title: 'Albums', url: null, isActive: true }]))
        frag.appendChild(cr.h1({ class: 'is-capitalized' }, title))

        // add the list of albums
        frag.appendChild(
          cr.div({ class: 'row is-mobile art-container' },
            data.map(function (album) {
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
      } else if (_loadPage === 'artist') {
        const frag = document.createDocumentFragment()

        // append directly to the page, we don't want this in the container. <!---------------------------------------------------------------------------------- NEED TO MOVE STYLES TO CSS
        frag.appendChild(cr.figure({ class: 'image' },
          cr.img({ src: `${data.artist.background}`, style: 'object-fit: cover;height: 30vh;object-position: center;width: 100%' })
        ))
        // main.style.backgroundImage = `url(${data.artist.background})`
        // main.classList.add('has-background')
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
        const cont = frag.appendChild(cr.div({ class: 'container-fluid' }))
        // append the library buttons
        // frag.appendChild(breadcrumb([{ data.artist.title: 'Artists', url: 'artists' }, { data.artist.title: data.navigation.info.title, url: null, isActive: true }]))

        // create the information section
        /*
        frag.appendChild(
          cr.div({ class: 'row artist-info is-mobile' },
            cr.div({ class: 'column is-2-tablet is-2-desktop is-10-touch is-offset-1-touch' },
              cr.figure({ class: 'image artistart' },
                // cr.img({ src: data.artist.albumart, loading: 'lazy' })
                cr.img({ src: data.artist.background, loading: 'lazy' }),
                cr.span({ class: 'is-1' }, data.artist.title)
              )
            )
          )
        )
        */

        cont.appendChild(
          cr.p({ class: 'is-2' }, data.artist.title)
        )
        cont.appendChild(
          cr.p({ class: 'subtitle is-2' }, 'Albums')
        )
        // create the list of albums (in tile format)
        cont.appendChild(
          cr.div({ class: 'row is-mobile art-container' },
            data.albums.map(function (album) {
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
      } else if (_loadPage === 'artists') {
        // the main document fragment
        const frag = cr.div({ class: 'container-fluid' })

        // append the library buttons
        // frag.appendChild(breadcrumb([{ title: 'Artists', url: null }]))
        frag.appendChild(cr.h1({ class: 'is-capitalized' }, title))

        // add the list of artists (tiles)
        frag.appendChild(
          cr.div({ class: 'row art-container' },
            data.map(function (artist) {
              return buildTile({
                title: artist.title,
                image: artist.albumart,
                href: '/artist/' + encodeURIComponent(artist.title),
                classes: ''
              })
            })
          )
        )

        // append the fragment to the document
        main.appendChild(frag)
      } else if (_loadPage === 'genres') {
        // the main document fragment
        const frag = cr.div({ class: 'container-fluid' })

        frag.appendChild(cr.h1({ class: 'is-capitalized' }, title))

        // build the list of genres
        frag.appendChild(
          cr.div({ class: 'row art-container' },
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
      } else if (_loadPage === 'genre') {
        title = data[0].genre

        // the main document fragment
        const frag = cr.div({ class: 'container-fluid' })

        frag.appendChild(cr.h1({ class: 'is-capitalized' }, title))

        // build the list of genres
        frag.appendChild(
          cr.div({ class: 'row art-container' },
            data.map(function (album) {
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

        // append the content to the page
        main.appendChild(frag)
      } else if (_loadPage === 'playlists') {
        // the main document fragment
        const frag = cr.div({ class: 'container-fluid' })

        frag.appendChild(cr.h1({ class: 'is-capitalized' }, title))

        // create a tile for each
        frag.appendChild(
          cr.div({ class: 'row playlist-list' },
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
      } else if (_loadPage === 'playlist') {
        // set the page title
        title = data.name

        // create the main page fragment
        // const frag = document.createDocumentFragment()

        let songs = []
        if (data.lists && data.lists.length > 0) {
          songs = data.lists[0]
        } else if ('navigation' in data && 'lists' in data.navigation && data.navigation.lists[0].items.length > 0) {
          songs = data.navigation.lists[0].items
        }

        let name = ''
        if ('navigation' in data) {
          name = data.navigation.info.name
        } else {
          name = data.name
        }
        main.appendChild(
          cr.div({ class: 'row is-mobile playlist-detail' },
            cr.div({ class: 'column is-4-desktop is-12-mobile' },
              cr.figure({ class: 'image is-1by1 albumart' },
                cr.img({ src: '/img/icons/playlist-padded.svg' })
              )
            ),
            cr.div({ class: 'column is-8-desktop is-12-mobile' },
              cr.h5({ class: 'is-uppercase has-text-weight-semibold' }, 'Playlist'),
              cr.h2({ class: 'album-title has-text-weight-semibold is-capitalized' }, name),
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
      }
      uiTools.setPageTitle({ title })
      router.update()
      _loadPage = ''
    },
    updateState: function (newState) {
      const changed = dataTools.changeState(newState)
      const state = dataTools.getState()

      const isHome = (document.getElementById('home-albumart') !== null)

      // const mc = document.querySelector('.home .mobile-controls')
      const mc = document.getElementById('mobile-controls')

      // this whole section updates the footer (now playing) banner
      if (changed.includes('albumart')) {
        document.querySelector('#control-bar .now-playing img').src = state.albumart.replace('album/', 'album/thumb/')
        if (isHome) {
          document.querySelector('#home-albumart img').src = state.albumart
        }
      }
      if (!state.albumart) {
        document.querySelector('#control-bar .now-playing img').src = '/img/notplaying.png'
      }

      if (changed.includes('title')) {
        document.querySelector('#control-bar-title').innerText = state.title
        if (isHome) {
          document.getElementById('home-title').innerText = state.title
        }
        uiTools.progress.stop()
      }
      if (changed.includes('artist')) {
        document.querySelector('#control-bar-artist').innerText = state.artist
        if (isHome) {
          document.getElementById('home-artist').innerText = state.artist
          document.querySelector('.background-container img').src = `/art/artist/background/blur/${encodeURIComponent(state.artist)}.jpg`
        }
      }

      if (changed.includes('album') && isHome) {
        document.getElementById('home-album').innerText = state.album
      }

      if (changed.includes('repeat')) {
        if (state.repeat === true) {
          document.querySelector('#control-bar .misc-controls .repeat').classList.add('is-active')
          if (mc) {
            mc.querySelector('.repeat').classList.add('is-active')
          }
        } else {
          document.querySelector('#control-bar .misc-controls .repeat').classList.remove('is-active')
          if (mc) {
            mc.querySelector('.repeat').classList.remove('is-active')
          }
        }
      }
      if (changed.includes('single')) {
        let rpt = 'repeat'
        if (state.single === true) {
          rpt += '-one'
        }
        document.querySelector('#control-bar .repeat use').setAttribute('href', '/img/feather-sprite.svg#' + rpt)
        if (mc) {
          mc.querySelector('.repeat use').setAttribute('href', '/img/feather-sprite.svg#' + rpt)
        }
      }
      if (changed.includes('random')) {
        if (state.random === true) {
          document.querySelector('#control-bar .misc-controls .random').classList.add('is-active')
          if (mc) {
            mc.querySelector('.random').classList.add('is-active')
          }
        } else {
          document.querySelector('#control-bar .misc-controls .random').classList.remove('is-active')
          if (mc) {
            mc.querySelector('.random').classList.remove('is-active')
          }
        }
      }

      if (changed.includes('elapsed')) {
        uiTools.progress.set(state.elapsed, state.duration)
        document.querySelector('#control-bar .duration').innerText = uiTools.formatTime(state.duration)
      }

      if (changed.includes('state')) {
        const use = document.querySelector('.playing-controls .play-button use')
        if (state.state === 'play') {
          use.setAttribute('href', '/img/feather-sprite.svg#pause')
          if (mc) {
            mc.querySelector('button use').setAttribute('href', '/img/feather-sprite.svg#pause')
          }
          uiTools.progress.start()
        } else {
          use.setAttribute('href', '/img/feather-sprite.svg#play')
          if (mc) {
            mc.querySelector('button use').setAttribute('href', '/img/feather-sprite.svg#play')
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
        /*
        if (router.lastRoute().url.match(/\//g || []).length === 2) {
          // set the song title
          document.getElementById('home-title').textContent = state.title
          // set the album name
          let el = document.getElementById('home-album')
          el.textContent = state.album
          el.href = '/album/' + state.artist + '/' + state.album
          // set the artist name
          el = document.getElementById('home-artist')
          el.textContent = state.artist
          el.href = '/artist/' + state.artist
          // set the current song quality
          document.getElementById('home-quality').textContent = uiTools.getQuality(state)
        }
        */
      } else if (changed.includes('status') || changed.includes('title')) {
        // update the queue when state or track changes
        webSocket.get.queue()
        // shortcut to find if we're on the homepage
      }
    },
    settings: function () {
      // this is our main container
      const main = uiTools.clearNodes('#content-container')

      const cont = cr.div({ class: 'container-fluid', id: 'setting-page' },
        cr.h1('Settings'),
        cr.p({ class: 'is-1' }, 'Database'),
        cr.div({ class: 'box row has-text-centered' },
          cr.div({ class: 'col-lg-4 col-xs-12' },
            cr.h1({ class: 'song-count' }, 'Loading'),
            cr.p({ class: 'subtitle is-3' }, 'Songs')
          ),
          cr.div({ class: 'col-lg-4 col-xs-12' },
            cr.h1({ class: 'artist-count' }, 'Loading'),
            cr.p({ class: 'subtitle is-3' }, 'Artists')
          ),
          cr.div({ class: 'col-lg-4 col-xs-12' },
            cr.h1({ class: 'album-count' }, 'Loading'),
            cr.p({ class: 'subtitle is-3' }, 'Albums')
          )
        ),
        cr.button({ class: 'button is-rounded is-primary', on: { click: () => { webSocket.action.updateLibrary() } } }, 'Update Library'),
        cr.button({ class: 'button is-rounded is-primary', on: { click: () => { webSocket.action.rescanLibrary() } } }, 'Rescan Library'),

        cr.p({ class: 'is-1' }, 'Network shares'),
        cr.table({ id: 'mount-table', class: 'table' },
          cr.thead(
            cr.tr(
              cr.th('Name'), cr.th('Server'), cr.th('Share'), cr.th('Type'), cr.th()
            )
          ),
          cr.tbody()
        ),
        cr.button({ class: 'button is-rounded is-primary', on: { click: function () { modals.addShare() } } }, 'Add share'),
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
        cr.p({ class: 'is-1' }, 'System'),
        cr.button({ class: 'button is-rounded is-danger', on: { click: () => { webSocket.action.reboot(); domBuilder.disconnected() } } }, 'Reboot'),
        cr.button({ class: 'button is-rounded is-danger', on: { click: () => { webSocket.action.shutdown(); domBuilder.disconnected() } } }, 'Shutdown')
      )
      // load the database stats
      webSocket.get.libraryStats((data) => {
        cont.querySelector('.song-count').innerText = data.songs
        cont.querySelector('.artist-count').innerText = data.artists
        cont.querySelector('.album-count').innerText = data.albums
      })
      webSocket.get.shares((data) => {
        const tbl = document.querySelector('#mount-table tbody')
        data.forEach((m) => {
          const type = m.storage.substr(0, 3)
          const host = m.storage.substr(6, m.storage.substr(6).indexOf('/'))
          const share = m.storage.substr(6 + host.length)
          tbl.appendChild(
            cr.tr({ 'data-id': m.mount },
              cr.td(cr.p({ class: 'is-6' }, m.mount)),
              cr.td(cr.p({ class: 'is-6' }, host)),
              cr.td(cr.p({ class: 'is-6' }, share)),
              cr.td(cr.p({ class: 'is-6' }, type.toUpperCase())),
              cr.td(cr.span({ class: 'delete' }, uiTools.getSVG('x-circle', 'delete')))
            )
          )
        })
        tbl.addEventListener('click', (e) => {
          if (e.target.className === 'delete') {
            const tr = e.target.closest('tr')
            const id = tr.dataset.id
            webSocket.action.removeShare(id)
            tr.remove()
          }
        })
      })
      main.appendChild(cont)
      uiTools.setPageTitle({ title: 'Settings' })
      router.update()
    }
  }

  const modals = {
    addShare: function () {
      const modal = cr.div({ id: 'update-detail-modal', class: 'modal is-small modal-fx-3dSignDown' },
        cr.div({ class: 'modal-content' },
          cr.div({ class: 'box' },
            cr.h1('Add share'),
            cr.div({ class: '' },
              cr.input({ class: 'input address', type: 'text', placeholder: 'Server address' }),
              cr.p({ class: 'help is-danger is-6' })
            ),
            cr.div({ class: '' },
              cr.input({ class: 'input path', type: 'text', placeholder: 'Path (e.g. /export/music)' }),
              cr.p({ class: 'help is-danger is-6' })
            ),
            cr.div({ class: '' },
              cr.div({ class: 'select' },
                cr.select({ class: 'type' },
                  cr.option({ value: 'nfs' }, 'NFS'),
                  cr.option({ value: 'smb' }, 'SMB')
                )
              ),
              cr.p({ class: 'help is-danger is-6' })
            ),
            cr.button({ class: 'button is-rounded', on: { click: function () { this.closest('.modal').classList.remove('is-active') } } }, 'Close'),
            cr.button({ class: 'button is-primary is-rounded', on: { click: function () { uiTools.handlers.addShare(this) } } }, 'Add Share')
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
      console.log(e)
      webSocket.get.playlists((data) => {
        console.log(data)
        const song = e.target.closest('tr').dataset
        const modal = cr.div({ class: 'modal is-small modal-fx-3dSignDown' },
          cr.div({ class: 'modal-content' },
            cr.div({ class: 'box' },
              cr.h1('Select Playlist'),
              cr.table({ class: 'table is-fullwidth table-hover' },
                cr.tbody(
                  data.map(function (playlist) {
                    return cr.tr(cr.td(playlist), cr.td(cr.button({ class: 'button', on: { click: () => { webSocket.action.addToPlaylist({ name: `${playlist}`, service: `${song.service}`, uri: `${song.uri}` }); uiTools.closeModal() } } }, 'Select')))
                  })
                )
              ),
              cr.div(
                cr.button({ class: 'button is-rounded is-primary', on: { click: (e) => { const el = e.target.closest('div').querySelector('.is-hidden'); el.classList.remove('is-hidden'); el.focus() } } }, '+ New Playlist'),
                cr.input({ class: 'input is-hidden', type: 'text', placeholder: 'Playlist name' }),
                cr.p({ class: 'help is-danger is-6' })
              ),
              cr.button({ class: 'button is-rounded', on: { click: uiTools.closeModal } }, 'Cancel'),
              cr.button({ class: 'button is-rounded is-primary', on: { click: uiTools.closeModal } }, 'Save')
            )
          )
        )
        uiTools.clearNodes('#modal-container').appendChild(modal)
        // wait for the element to be added to the DOM so we get our nice effects!
        window.setTimeout(() => {
          modal.classList.add('is-active')
        }, 100)
      })
    }
  }

  const reconnected = function () {
    document.getElementById('disconnect-message').classList.remove('show')
    document.querySelector('.animation-container').classList.remove('audio-wave')
  }
  const disconnected = function () {
    document.getElementById('disconnect-message').classList.add('show')
    document.querySelector('.animation-container').classList.add('audio-wave')
  }

  const mounts = function (data) {
    console.log(data)
    uiTools.closeModal()
  }

  const database = function (data) {
    console.log(database)
  }

  return {
    queueTable: queueTable,
    mounts: mounts,
    database: database,
    page: page,
    disconnected: disconnected,
    reconnected: reconnected
  }
})()
