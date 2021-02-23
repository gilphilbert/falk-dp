const express = require('express')
const router = express.Router()

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const rootdir = path.resolve(__dirname)

const sharp = require('sharp')

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
  }
  filename += '.jpg'

  // return the complete location of the new file
  const location = dirname + '/' + filename
  if (fs.existsSync(location)) {
    return location
  } else {
    return null
  }
}

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
router.get('/artist/banner/:artist', function (req, res) {
  const q = req.params

  // you need to specify an artist!
  if (!q.artist) {
    res.json({ error: 'you must specify an artist' })
    return
  }

  if (q.artist.indexOf('.jpg') > -1) {
    q.artist = q.artist.substr(0, q.artist.indexOf('.jpg'))
  }

  getArt({ artist: q.artist, type: 'musicbanner' }, res)
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

  getArt({ artist: q.artist, type: 'artistbackground' }, res)
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

  getArt({ artist: q.artist, type: 'artistbackground', blur: true }, res)
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
  const sendDefault = () => {
    if (!album) {
      // there's no art, serve the default artistart
      res.sendFile(rootdir + '/artcache/' + 'artist.png', { maxAge: 0 }) // refresh this every day, in case a new image is uploaded
    } else {
      // there's no art, serve the default artistart
      res.sendFile(rootdir + '/artcache/' + 'album.png', { maxAge: 0 }) // refresh this every day, in case a new image is uploaded
    }
  }


  body = {
    artist: artist.toLowerCase()
  }
  if (album !== undefined) {
    body.album = album.toLowerCase()
  }
  if (type !== undefined) {
    body.type = type.toLowerCase()
  }
  const imgpath = generateFilename(body)

  // for now, we'll resize everything to 480x480, it should cover most screens. Later, we'll ask the artcache server for the size wanted
  try {
    const pipeline = sharp(imgpath).on('error', err => {
      console.log('Sharp Error')
      sendDefault()
    })
    if (imgpath !== null) {
      // we have the file in the cache, so serve it
      res.set('Cache-control', 'public, max-age=31536000000')
      res.type('image/jpg')
      const opts = { width: 480 }
      //if (type !== 'artistbackground' && type !== 'musicbanner') {
      if (type === 'artistthumb') {
        if (thumb === true) {
          pipeline.resize(70, 70)
        } else {
          pipeline.resize(480, 480)
        }
      } else if (type === 'artistbackground') {
        pipeline.resize(1000)
        if (blur === true) {
          pipeline.greyscale()
        }
      } else if (type === 'musicbanner') {
        // do nothing 
      }
      pipeline.pipe(res)
    } else {
      sendDefault()
    }
  } catch (err) {
    sendDefault()
  }
}

module.exports = router
