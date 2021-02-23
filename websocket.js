async function setup (server) {
  const WebSocket = require('ws')
  const mpdapi = require('mpd-api')
  const wss = new WebSocket.Server({ server: server })

  const artCache = require('./artcache')

  let curSongUri = ''

  function incrementTrack() {
    mpdc.api.status.currentsong()
      .then(currentSong => {
        if (currentSong && curSongUri !== currentSong.file) {
          curSongUri = currentSong.file
          mpdc.api.sticker.get(curSongUri, 'playCount')
            .then(count => {
              if (count !== undefined && !isNaN(count)) {
                _c = parseInt(count)
                _c++
              } else {
                _c = 1
              }
              mpdc.api.sticker.set(curSongUri, 'playCount', _c)
            })
        }
      }).catch(e => {
        // console.log('Not playing')
        // nothing to do here
      })
  }

  function getSongArt(song) {
    const aa = song.albumartist|| song.artist || ''
    song.albumart = `/art/album/${encodeURIComponent(aa)}/${encodeURIComponent(song.album)}.jpg`
    song.thumb = `/art/album/thumb/${encodeURIComponent(aa)}/${encodeURIComponent(song.album)}.jpg`
    song.artistBg = `/art/artist/background/${encodeURIComponent(aa)}.jpg`
    song.artistBgBlur = `/art/artist/background/blur/${encodeURIComponent(aa)}.jpg`
    return song
  }

  let mpdc = null
  let init = true
  async function connectMPD () {
    console.log('Connecting to MPD...')
    try {
      mpdc = await mpdapi.connect({ path: '/run/mpd/socket' })
      console.log('Connected to MPD')

      mpdc.on('system', (e) => {
        switch (e) {
          case 'playlist':
            mpdc.api.queue.info()
              .then((d) => {
                d.forEach((i) => {
                  i.albumart = '/art/album/' + encodeURIComponent(i.artist) + '/' + encodeURIComponent(i.album) + '.jpg'
                  i.thumb = '/art/album/thumb/' + encodeURIComponent(i.artist) + '/' + encodeURIComponent(i.album) + '.jpg'
                })
                
                broadcast('pushQueue', d)
              })
            break
          case 'player':
            incrementTrack()
          case 'options':
            getStatus().then(status => broadcast('pushStatus', status))
            break
          case 'stored_playlist':
            mpdc.api.playlists.get()
              .then(d => broadcast('pushPlaylist', d))
            break
          case 'database':
            // what do we do here? need to broadcast that new files have been added so screens can update
            break
          case 'mount':
          case 'mounts':
            // if mounts have changed, update the database
            updateDB()
            break
          case 'update':
            getStatus().then(status => broadcast('pushStatus', status))
            break
          case 'sticker':
            // no action for stickers
            break
          default:
            console.log('[MPD] Unknown State Change:' + e)
        }
      })

      mpdc.on('close', () => {
        console.log('MPD connection lost')
        connectMPD()
      })
    } catch (e) {
      if (init === true) {
        console.log('Could not connect to MPD... is MPD running?')
        process.exit(0)
      } else {
        console.log('Couldn\'t connect to MPD, retrying')
      }
    }
  }
  await connectMPD()

  function broadcast (eventName, eventData) {
    const payload = JSON.stringify({ event: eventName, data: eventData })
    wss.clients.forEach(function each (client) {
      if (client.readyState === WebSocket.OPEN) {
        client.send(payload)
      }
    })
  }

  async function getStatus () {
    const status = await mpdc.api.status.get()
    const currentSong = await mpdc.api.status.currentsong()
    if (status.song !== undefined) {

      status.title = currentSong.title
      status.artist = currentSong.artist
      status.album = currentSong.album
      status.genre = currentSong.genre
      status.date = currentSong.date

      const aa = currentSong.albumartist|| currentSong.artist || ''
      status.albumart = `/art/album/${encodeURIComponent(aa)}/${encodeURIComponent(status.album)}.jpg`
      status.thumb = `/art/album/thumb/${encodeURIComponent(aa)}/${encodeURIComponent(status.album)}.jpg`
      status.artistBg = `/art/artist/background/${encodeURIComponent(aa)}.jpg`
      status.artistBgBlur = `/art/artist/background/blur/${encodeURIComponent(aa)}.jpg`

      if (status.time) {
        status.duration = status.time.total
        status.elapsed = status.time.elapsed
        delete (status.time)
      } else {
        status.duration = currentSong.duration
        status.elapsed = 0
      }
      if (status.audio) {
        status.sampleRate = status.audio.sample_rate
        status.bits = status.audio.bits
        status.channels = status.audio.channels
        delete (status.audio)
      } else {
        status.sampleRate = 0
        status.bits = 0
        status.channels = 0
      }
      status.updating = 'updating_db' in status
      delete (status.updating_db)
      delete (status.playlist)
      delete (status.songid)
    }
    return status
  }

  function updateDB() {
    mpdc.api.db.update()
    mpdc.api.mounts.list()
      .then((mounts) => {
        const netmount = mounts.filter((m) => {
          if ('storage' in m) {
            return m.storage.startsWith('smb') || m.storage.startsWith('nfs')
          }
          return false
        }).map((m) => {
          return m.mount
        })
        netmount.forEach(i => mpdc.api.db.update(i))
      })
  }

  wss.on('connection', function (ws) {
    const disp = new Dispatcher(ws)
    ws.on('error', (e) => console.log(e))

    // system
    disp.bind('getStatus', function () {
      getStatus().then(status => disp.send('pushStatus', status))
    })

    // library
    disp.bind('getArtists', function () {
      mpdc.api.db.list('albumartist')
        .then(async (d) => {
          const mod = d.map(i => { return { title: i.albumartist, albumart: '/art/artist/' + encodeURIComponent(i.albumartist) + '.jpg' } })
          disp.send('pushArtists', mod)
        })
    })

    disp.bind('getAlbums', function () {
      mpdc.api.db.list('album', null, 'albumartist')
        .then((d) => {
          const mod = d.reduce((arr, item) => {
            item.album.forEach((e) => {
              const flat = {
                title: e.album,
                artist: item.albumartist,
                albumart: '/art/album/' + encodeURIComponent(item.albumartist) + '/' + encodeURIComponent(e.album) + '.jpg'
              }
              arr.push(flat)
            })
            return arr
          }, [])
          mod.sort((a, b) => (a.title > b.title) ? 1 : -1)
          disp.send('pushAlbums', mod)
        })
    })

    disp.bind('getGenre', function (data) {
      mpdc.api.db.list('album', `(genre == "${data.name}")`, 'albumartist')
        .then((d) => {
          const mod = d.reduce((arr, item) => {
            item.album.forEach((e) => {
              const flat = {
                title: e.album,
                artist: item.albumartist,
                albumart: '/art/album/' + encodeURIComponent(item.albumartist) + '/' + encodeURIComponent(e.album) + '.jpg',
                genre: data.name
              }
              arr.push(flat)
            })
            return arr
          }, [])
          mod.sort((a, b) => (a.title > b.title) ? 1 : -1)
          disp.send('pushGenre', mod)
        })
    })

    disp.bind('getGenres', function () {
      mpdc.api.db.list('genre')
        .then((d) => {
          const mod = d.filter(i => { return i.genre !== '' }).map(i => i.genre)
          disp.send('pushGenres', mod)
        })
    })

    disp.bind('getAlbum', function (data) {
      mpdc.api.db.find(`((album == "${data.title}") AND (albumartist == "${data.artist}"))`)
        .then((d) => {
          const out = {
            artist: data.artist,
            title: data.title,
            albumart: '/art/album/' + encodeURIComponent(data.artist) + '/' + encodeURIComponent(data.title) + '.jpg',
            songs: d
          }
          disp.send('pushAlbum', out)
        })
    })

    disp.bind('getArtistAlbums', function (data) {
      function compare(a, b) {
        let comparison = 0;
        if (a.date > b.year) {
          comparison = 1;
        } else if (a.date < b.date) {
          comparison = -1;
        }
        return comparison;
      }

      mpdc.api.db.list('album', `(albumartist == "${data.artist}")`, 'date')
        .then((res) => {
          const mod = res.reduce((arr, year) => {
            const date = year.date

            const albums = year.album.reduce((acc, item) => {
              acc.push({
                title: item.album,
                date: date,
                albumart: '/art/album/' + encodeURIComponent(data.artist) + '/' + encodeURIComponent(item.album) + '.jpg'
              })
              return acc
            }, [])

            arr = arr.concat(albums)
            return arr
          }, [])
          mod.sort(compare)
          const out = {
            artist: {
              title: data.artist,
              albumart: '/art/artist/' + encodeURIComponent(data.artist) + '.jpg',
              background: '/art/artist/background/' + encodeURIComponent(data.artist) + '.jpg',
              banner: '/art/artist/banner/' + encodeURIComponent(data.artist) + '.jpg'
            },
            albums: mod
          }
          disp.send('pushArtistAlbums', out)
        })
    })

    // data = { uri: <URI> }
    // or
    // data = { songs: [{ uri: '<URI>' }, { uri: '<URI>' }] }
    disp.bind('enqueue', function (data) {
      if (data.uri) {
        mpdc.api.queue.addid(data.uri)
      } else if (data.songs) {
        data.songs.forEach((s) => {
          if (s.uri) {
            mpdc.api.queue.addid(s.uri)
          }
        })
      }
    })

    disp.bind('addPlay', function (data) {
      const pos = data.pos || 0
      if (data.uri) {
        const id = mpdc.api.queue.addid(data.uri)
        mpdc.api.playback.playid(id)
      } else if (data.songs) {
        const songs = data.songs
        const promises = []
        for (let i = 0; i < songs.length; i++) {
          promises[i] = mpdc.api.queue.addid(songs[i].uri)
        }
        Promise.all(promises).then((values) => {
          mpdc.api.playback.playid(values[pos])
        })
      }
    })

    disp.bind('replaceAndPlay', function (data) {
      if (data.uri) {
        mpdc.api.queue.clear()
          .then(() => {
            mpdc.api.queue.addid(data.uri)
              .then(id => mpdc.api.playback.playid(id))
          })
      } else if (Array.isArray(data.songs)) {
        mpdc.api.queue.clear()
          .then(() => {
            const promises = []
            data.songs.forEach(song => {
              promises.push(mpdc.api.queue.addid(song.uri))
            })
            Promise.all(promises).then((values) => {
              if ('pos' in data) {
                mpdc.api.playback.play(data.pos)
              } else {
                mpdc.api.playback.play(0)
              }
            })
          })
      }
    })

    // queue
    disp.bind('saveQueue', function (data) {
      if (data.name) {
        mpdc.api.playlists.save(data.name)
      }
    })

    disp.bind('clearQueue', function () {
      mpdc.api.queue.clear()
    })

    disp.bind('getQueue', function () {
      mpdc.api.queue.info()
        .then((d) => {
          d.forEach((i) => {
            const aa = i.albumartist || i.artist || ''
            i.albumart = '/art/album/' + encodeURIComponent(aa) + '/' + encodeURIComponent(i.album) + '.jpg'
            i.thumb = '/art/album/thumb/' + encodeURIComponent(aa) + '/' + encodeURIComponent(i.album) + '.jpg'
            i.artistBg = `/art/artist/background/${encodeURIComponent(i.artist)}.jpg`
            i.artistBgBlur = `/art/artist/background/blur/${encodeURIComponent(i.artist)}.jpg`
          })
          disp.send('pushQueue', d)
        })
    })

    disp.bind('removeFromQueue', function (data) {
      if (data.pos) {
        mpdc.api.queue.delete(data.pos)
      }
    })

    // actions
    disp.bind('play', function (pos) {
      if (pos !== undefined) {
        mpdc.api.playback.play(pos)
      } else {
        mpdc.api.playback.play()
      }
    })
    disp.bind('pause', function () {
      mpdc.api.playback.pause()
    })
    disp.bind('resume', function () {
      mpdc.api.playback.resume()
    })
    disp.bind('stop', function () {
      mpdc.api.playback.stop()
    })
    disp.bind('toggle', function () {
      mpdc.api.playback.toggle()
    })
    disp.bind('prev', function () {
      mpdc.api.playback.prev()
    })
    disp.bind('next', function () {
      mpdc.api.playback.next()
    })
    disp.bind('repeat', function (data) {
      if (data.state !== undefined) {
        mpdc.api.playback.repeat(data.state)
      }
    })
    disp.bind('single', function (data) {
      if (data.state !== undefined) {
        mpdc.api.playback.single(data.state)
      }
    })
    disp.bind('random', function (data) {
      if (data.state !== undefined) {
        mpdc.api.playback.random(data.state)
      }
    })

    // playlists
    disp.bind('getPlaylists', function () {
      mpdc.api.playlists.get()
        .then(d => {
          const mod = d.map(i => { return { name: i.playlist, last_modified: i.last_modified } })
          disp.send('pushPlaylists', mod)
        })
    })
    disp.bind('getPlaylist', function (data) {
      if (data.name) {
        mpdc.api.playlists.listinfo(data.name)
          .then(d => disp.send('pushPlaylist', { name: data.name, songs: d }))
      }
    })
    // usage: ws.send({ event_type: 'addPlaylist', data: { uri: '<SONGURI>' } })
    disp.bind('addPlaylist', function (data) {
      if (data.name) {
        if (data.uri) {
          mpdc.api.playlists.add(data.name, data.uri)
        }
      }
    })
    disp.bind('addToPlaylist', function (data) {
      if (data.uri) {
        mpdc.api.playlists.add(data.name, data.uri)
      }
    })
    //  disp.bind('addToPlaylist', function (data) {
    //    if (data.uri) {
    //      mpdc.api.playlists.add(data.name, data.uri)
    //    }
    //  })
    disp.bind('removeFromPlaylist', function (data) {
      if (data.name && data.pos) {
        mpdc.api.playlists.deleteAt(data.name, data.pos)
      }
    })
    disp.bind('removePlaylist', function (data) {
      if (data.name) {
        mpdc.api.playlists.deleteAt(data.name)
      }
    })
    disp.bind('enqeuePlaylist', function (data) {
      if (data.name) {
        mpdc.api.playlists.load(data.name)
      }
    })
    disp.bind('playPlaylist', function (data) {
      if (data.name) {
        mpdc.api.queue.clear(data.name)
          .then(() => {
            mpdc.api.playlists.load(data.name)
              .then(() => {
                mpdc.api.playback.play()
              })
          })
      }
    })

    // dynamic playlists
    disp.bind('getMostPlayed', function () {
      mpdc.api.sticker.find('playCount', '')
        .then(async (data) => {
          const fileList = data.sort((a, b) => (a.playCount > b.playCount) ? -1 : 1).slice(0, 99)
          let songList = []
          for (i in fileList) {
            const _filename = fileList[i].file.substr(fileList[i].file.lastIndexOf('/') + 1)
            const songArr = await mpdc.api.db.search('filename', _filename)
            // need to check if there are more than one responses!
            if (songArr.length === 1) {
              let song = songArr[0]
              song.track = parseInt(i) + 1
              songList.push(getSongArt(song))
              // console.log(song)
            } else if (songArr.length > 1) {
              // now check each file's URI to see if it matches our full URI or not...
            }
          }
          const ret = {
            name: 'Most Played',
            description: 'The top 100 most played songs',
            songs: songList,
            albumart: ((songList.length > 0) ? songList[0].albumart : '')
          }
          disp.send('pushMostPlayed', ret)
        })
    })


    // mounts
    disp.bind('getMounts', function () {
      mpdc.api.mounts.list()
        .then((data) => {
          const mounts = data.filter(mount => mount.mount)
          disp.send('pushMounts', mounts)
        })
    })

    disp.bind('addMount', function (data) {
      const point = data.path.substr(data.path.lastIndexOf('/') + 1, data.path.length)
      const share = data.type + '://' + data.host + '/' + data.path
      mpdc.api.mounts.mount(point, share)
        .then(() => {
          mpdc.api.mounts.list()
            .then((d) => {
              disp.send('pushMounts', d)
            })
        })
    })

    disp.bind('unmount', function (data) {
      mpdc.api.mounts.unmount(data.mountpoint)
        .then((resp) => {
          mpdc.api.mounts.list((d) => {
            disp.send('pushMounts', d)
          })
        })
    })


    // db management
    disp.bind('getStats', function () {
      mpdc.api.status.stats()
        .then(d => disp.send('pushStats', d))
    })

    disp.bind('rescanDB', function () {
      mpdc.api.db.rescan()
      mpdc.api.mounts.list()
        .then((mounts) => {
          const netmount = mounts.filter((m) => {
            if ('storage' in m) {
              return m.storage.startsWith('smb') || m.storage.startsWith('nfs')
            }
            return false
          }).map((m) => {
            return m.mount
          })
          netmount.forEach(i => mpdc.api.db.rescan(i))
        })
    })

    disp.bind('updateDB', function () {
      updateDB()
    })

    //art
    disp.bind('updateArt', function () {
      artCache.updateArt()
    })
  })
}

const Dispatcher = function (ws) {
  const callbacks = {}

  this.bind = function (eventName, callback) {
    callbacks[eventName] = callbacks[eventName] || []
    callbacks[eventName].push(callback)
    return this
  }

  this.send = (eventName, eventData) => {
    const payload = JSON.stringify({ event: eventName, data: eventData })
    ws.send(payload)
    return this
  }

  // dispatch to the right handlers
  ws.on('message', (evt) => {
    const json = JSON.parse(evt)
    dispatch(json.event, json.data)
  })

  const dispatch = function (eventName, message) {
    const chain = callbacks[eventName]
    if (typeof chain === 'undefined') return
    for (let i = 0; i < chain.length; i++) {
      chain[i](message)
    }
  }
}

module.exports = {
  setup: setup
}
