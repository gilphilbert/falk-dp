const mpdapi = require('mpd-api')

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const axios = require('axios')

const rootdir = path.resolve(__dirname)

function generateFilename({ artist, album, type } = {}) {
  const artcache = rootdir + '/artcache/'

  // generate a hash from the request
  let cs = (( album !== undefined ) ? artist + album : artist)
  const hash = crypto.createHash('sha1').update(cs).digest('hex')
  
  let filename = ''
  let dirname = artcache
  if (album) {
    filename = hash
    dirname += 'album'
  } else {
    dirname += 'artist/' + hash + ''
    switch (type) {
      case 'artistbackground':
        filename = 'background'
        break
      case 'musicbanner':
        filename = 'banner'
        break
      default:
        filename = 'artistthumb'
    }
    if (!fs.existsSync(dirname)){
      fs.mkdirSync(dirname);
    }
  }
  filename += '.jpg'

  // return the complete location of the new file
  const location = dirname + '/' + filename
  if (fs.existsSync(location) === false) {
    return location
  } else {
    return null
  }
}

async function downloadArt (request) {
  const searchArtist = request.albumartist
  const searchAlbums = request.album.map(e => {
    return e.album
  })

  const mbOptions = { headers: { 'User-Agent': 'FALK/DP-01 (gil.philbert@gmail.com)' } }

  let artistId = ''
  let fanartData = null
  let fanartKeys = null

  for (i in searchAlbums) {

    if (searchAlbums[i] !== undefined && searchAlbums[i] !== '') {
      const filename = generateFilename({ artist: searchArtist.toLowerCase(), album: searchAlbums[i].toLowerCase() })
      //generate filename returns null if the image already exists
      if (filename !== null) {
          //get the release information from musicbrainz based on artist name
          try {
            let _found = false
            const response = await axios.get(`https://musicbrainz.org/ws/2/release-group?query=%22${encodeURIComponent(searchAlbums[i].toLowerCase())}%22%20AND%20artist:%22${encodeURIComponent(searchArtist.toLowerCase())}%22`, mbOptions)
            if (response.data['release-groups'].length > 0) {
              for (i in response.data['release-groups']) {
                let rg = response.data['release-groups'][i]
                _artist = rg['artist-credit'][0].artist.id
                try {
                  fanartData = await axios.get(`https://webservice.fanart.tv/v3/music/${_artist}&?api_key=fd55f4282969cb8b8d09f470e3d18c51&format=json`)
                  fanartKeys = Object.keys(fanartData.data.albums)

                  if (fanartKeys !== null && fanartKeys.includes(rg.id)) {
                    _found = true
                    const art = fanartData.data.albums[rg.id]
                    if ('albumcover' in art) {
                      console.log('[GET] [ALBUM] ' + rg.title + ' (' + searchArtist + ')')
                      const _response = await axios({ url: art.albumcover[0].url, method: 'GET', responseType: 'stream' })
                      if (_response.status === 200) {
                        const writer = fs.createWriteStream(filename)
                        _response.data.pipe(writer)
                      }
                    }
                  }
                  // now go get the artist images...
                  if (_found === true && artistId === '') {
                    //set the artist id, and get the fanartdata if we haven't already
                    artistId = _artist
                    const artTypes = [ 'musicbanner', 'artistbackground', 'artistthumb' ]
                    for (j in artTypes) {
                      if (artTypes[j] in fanartData.data) {
                        const artistFilename = generateFilename({ artist: searchArtist.toLowerCase(), type: artTypes[j] })
                        if (artistFilename != null) {
                          console.log('[GET] [' + artTypes[j].toUpperCase() + '] ' + searchArtist)
                          const _response = await axios({ url: fanartData.data[artTypes[j]][0].url, method: 'GET', responseType: 'stream' })
                          const writer = fs.createWriteStream(artistFilename)
                          _response.data.pipe(writer)
                        }
                      }
                    }
                    break
                  }
                } catch(e) {
                  console.log(`[SKIP] [ARTIST] ${searchArtist} [NO FANART RESULT]`)
                  return
                }
              }
            } else {
              console.log(`[SKIP] [ALBUM] ${searchAlbums[i]} (${searchArtist}) [NO RELEASE GROUPS FOR THIS ARTIST]`)
            }
          // failed to get relese info from musicbrainz
          } catch (e) {
            console.log(e)
            console.log(`[SKIP] [ARTIST] ${searchArtist} [MUSICBRAINZ LOOKUP FAILURE]`)
            return
          }
      } else {
        console.log(`[SKIP] [ALBUM] ${searchAlbums[i]} (${searchArtist}) [ALREADY HAVE FILE]`)
      }
    } else {
      console.log('[SKIP] ARTIST IS UNDEFINED')
      return
    }
  }
}

async function updateArt() {
  mpdapi.connect({ path: '/run/mpd/socket' })
    .then(mpdc => {
      mpdc.api.db.list('album', '', 'albumartist')
      .then(async (res) => {
        for (i in res) {
          await downloadArt(res[i])
        }
        mpdc.api.connection.close()
      })
      .catch(e => {
        console.log('Couldn\'t get list of albums')
        mpdc.api.connection.close()
      })
    })
    .catch(e => {
      console.log('Couldn\'t connect to MPD')
    })
}

function regenerateArt() {
  //delete all files
  updateArt()
}

module.exports = {
  updateArt: updateArt,
  regenerateArt: regenerateArt
}