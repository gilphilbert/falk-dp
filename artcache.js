const express = require('express')
const router = express.Router()

// var app = express()

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const rootdir = path.resolve(__dirname)
const axios = require('axios')

const sharp = require('sharp')

const MusicBrainzApi = require('musicbrainz-api').MusicBrainzApi
const mbApi = new MusicBrainzApi({
  appName: 'FALK',
  appVersion: '0.0.1',
  appContactInfo: 'gil.philbert@gmail.com'
})

// the albumart service
router.get('/artist/:artist', function (req, res) {
  const q = req.params

  // you need to specify an artist!
  if (!q.artist) {
    res.json({ error: 'you must specify an artist and/or album' })
    return
  }

  if (q.artist.indexOf('.jpg') > -1) {
    q.artist = q.artist.substr(0, q.artist.indexOf('.jpg'))
  }

  getArt({ artist: q.artist, type: '' }, res)
})

// the albumart service
router.get('/artist/background/:artist', function (req, res) {
  const q = req.params

  // you need to specify an artist!
  if (!q.artist) {
    res.json({ error: 'you must specify an artist' })
    return
  }

  if (q.artist.indexOf('.jpg') > -1) {
    q.artist = q.artist.substr(0, q.artist.indexOf('.jpg'))
  }

  getArt({ artist: q.artist, type: 'bg' }, res)
})

// the albumart service
router.get('/artist/background/blur/:artist', function (req, res) {
  const q = req.params

  // you need to specify an artist!
  if (!q.artist) {
    res.json({ error: 'you must specify an artist' })
    return
  }

  if (q.artist.indexOf('.jpg') > -1) {
    q.artist = q.artist.substr(0, q.artist.indexOf('.jpg'))
  }

  getArt({ artist: q.artist, type: 'bg', blur: true }, res)
})

router.get('/album/:artist/:album', function (req, res) {
  const q = req.params

  // you need to specify an artist!
  if (!q.artist || !q.artist) {
    res.json({ error: 'you must specify an artist and/or album' })
    return
  }

  if (q.album.indexOf('.jpg') > -1) {
    q.album = q.album.substr(0, q.album.indexOf('.jpg'))
  }

  getArt({ artist: q.artist, album: q.album }, res)
})

router.get('/album/thumb/:artist/:album', function (req, res) {
  const q = req.params

  // you need to specify an artist!
  if (!q.artist || !q.artist) {
    res.json({ error: 'you must specify an artist and/or album' })
    return
  }

  if (q.album.indexOf('.jpg') > -1) {
    q.album = q.album.substr(0, q.album.indexOf('.jpg'))
  }

  getArt({ artist: q.artist, album: q.album, thumb: true }, res)
})

function getArt ({ artist, album, type, blur, thumb } = {}, res) {
  const artcache = rootdir + '/artcache/'

  // generate a hash from the request
  let cs = artist
  let pre = 'artist/'
  if (album) {
    cs = cs + album
    pre = 'album/'
  } else if (type === 'bg') {
    pre = 'artistbg/'
  }
  const hash = crypto.createHash('sha1').update(cs).digest('hex')

  // now convert the hash to a file name ./artcache/${filename}
  const imgpath = artcache + pre + hash + '.jpg'

  // for now, we'll resize everything to 480x480, it should cover most screens. Later, we'll ask the artcache server for the size wanted
  try {
    if (fs.existsSync(imgpath)) {
      // we have the file in the cache, so serve it
      res.set('Cache-control', 'public, max-age=31536000000')
      res.type('image/jpg')
      const opts = { width: 480 }
      if (type !== 'bg') {
        if (thumb === true) {
          opts.width = 70
          opts.height = 70
          // sharp(imgpath).resize(70, 70).pipe(res)
        } else {
          opts.width = 480
          opts.height = 480
          // sharp(imgpath).resize(480, 480).pipe(res)
        }
      } else if (blur === true) {
        opts.width = 1000
        sharp(imgpath).resize(1000).greyscale().pipe(res)
        return
      }
      sharp(imgpath).resize(opts).pipe(res)
    } else {
      // what art are we looking for?
      if (!album) {
        // we're looking for an artist, let's go look for it and store it if we find it
        getArtistArt(artist, imgpath, res, type, blur)
      } else {
        // we're looking for albumart let's look for some!
        getAlbumArt(artist, album, imgpath, thumb)
          .then((e) => {
            // we got a file, let's serve it
            res.set('Cache-control', 'public, max-age=31536000000')
            res.type('image/jpg')
            if (thumb === true) {
              sharp(imgpath).resize(70, 70).pipe(res)
            } else {
              sharp(imgpath).resize(480, 480).pipe(res)
            }
          })
          .catch((e) => {
            // there's no art, serve the default artistart
            res.sendFile(artcache + 'album.png', { maxAge: 86400000 }) // refresh this every day, in case a new image is uploaded
          })
      }
    }
  } catch (err) {
    res.json({ error: 'unable to generate image' })
  }
}

async function getArtistArt (artist, imgpath, res, type, blur) {
  try {
    const info = await mbApi.searchArtist(artist, 0, 1)
    const mbid = info.artists[0].id
  } catch(err) {
    console.log(err)
    const artcache = rootdir + '/artcache/'
    res.sendFile(artcache + 'artist.png', { maxAge: 86400000 }) // refresh this every day, in case a new image is uploaded
  }

  // now get the fanart from fanart.tv
  axios.get('https://webservice.fanart.tv/v3/music/' + mbid + '&?api_key=fd55f4282969cb8b8d09f470e3d18c51&format=json')
    .then(function (response) {
      const fanart = response.data
      const url = ((type === 'bg') ? fanart.artistbackground[0].url : fanart.artistthumb[0].url)
      axios({ url: url, method: 'GET', responseType: 'stream' })
        .then(function (response) {
          // write the file
          const writer = fs.createWriteStream(imgpath)
          response.data.pipe(writer)
          writer.on('finish', () => {
            res.set('Cache-control', 'public, max-age=31536000000')
            res.type('image/jpg')
            const opts = { width: 480 }
            if (type !== 'bg') {
              if (blur) {
                opts.width = 1000
              } else {
                opts.height = 480
              }
            }
            if (blur === true) {
              sharp(imgpath).resize(opts).greyscale().blur().pipe(res)
            } else {
              sharp(imgpath).resize(opts).pipe(res)
            }
          })
        })
        .catch(err => {
          if (err) {
            const artcache = rootdir + '/artcache/'
            res.sendFile(artcache + 'artist.png', { maxAge: 86400000 }) // refresh this every day, in case a new image is uploaded
          }
        })
    })
    .catch(err => {
      if (err) {
        const artcache = rootdir + '/artcache/'
        res.sendFile(artcache + 'artist.png', { maxAge: 86400000 }) // refresh this every day, in case a new image is uploaded
      }
    })
}

// update this for fanart.tv?
async function getAlbumArt (artist, album, imgpath, thumb) {
  const _artist = encodeURIComponent(artist)
  const _album = encodeURIComponent(album)
  const info = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=250b1448a91894d0f7542cbcdedc936e&artist=${_artist}&album=${_album}&format=json`)

  const images = info.data.album.image

  const _img = images.filter(img => {
    return img.size === 'extralarge'
  })
  let imageurl = false
  if (_img && _img.length > 0) {
    imageurl = _img[0]['#text']
  }

  if (imageurl) {
    // fetch the image file
    const response = await axios({ url: imageurl, method: 'GET', responseType: 'stream' })

    // write the file
    const writer = fs.createWriteStream(imgpath)
    await response.data.pipe(writer)

    // return a promise
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  }

  // we didn't find an image, panic!
  throw new Error(1)
}

module.exports = router
