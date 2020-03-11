var express = require('express')
var router = express.Router()

var app = express()

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const rootdir = path.resolve(__dirname)
const axios = require('axios')

// the albumart service
router.get('/', function (req, res) {
  const artcache = rootdir + "/artcache/"
  var q = req.query

  // you need to specify an artist!
  if (!q.artist) {
    res.json({ error: 'you must specify an artist and/or album' })
    return
  }

  // generate a hash from the request
  var cs = q.artist
  if (q.album) {
    cs = cs + album
  }
  const hash = crypto.createHash("sha1").update(cs).digest("hex")

  // now convert the hash to a file name ./artcache/${filename}
  const path = artcache + hash + ".jpg"

  try {
    if (fs.existsSync(path)) {
      // we have the file in the cache, so serve it
      res.sendFile(path)
    } else {
      // what art are we looking for?
      if (!q.album) {
        // we're looking for an artist, let's go look for it and store it if we find it
        getArtistArt(q.artist, path)
          .then((e) => {
            // we got a file, let's serve it
            res.sendFile(path)
          })
	  .catch((e) => {
            // there's no art, serve the default artistart
            res.sendFile(artcache + "artist.png")
	  })
      } else {
        // we're looking for albumart let's look for some!
        getAlbumArt(q.artist, q.album, path)
          .then((e) => {
            // we got a file, let's serve it
            res.sendFile(path)
          })
	  .catch((e) => {
            // there's no art, serve the default artistart
            res.sendFile(artcache + "album.png")
	  })
      }
    }
  } catch(err) {
    res.json({ error: 'unable to generate image' })
  }


})

async function getArtistArt(artist, path) {
  // get the mbid from audioscrobbler...
  info = await axios.get("https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=" + artist + "&api_key=250b1448a91894d0f7542cbcdedc936e&format=json")
  const mbid = info.data.artist.mbid

  // now get the fanart from fanart.tv
  fanart = await axios.get("https://webservice.fanart.tv/v3/music/" + mbid + "&?api_key=fd55f4282969cb8b8d09f470e3d18c51&format=json")
  const data = fanart.data

  // check to see if we actually got any art URLs back
  if (data.artistthumb && data.artistthumb.length > 0) {
    // fetch the image file
    const response = await axios({ url: data.artistthumb[0].url, method: 'GET', responseType: 'stream' })

    // write the file
    const writer = fs.createWriteStream(path)
    await response.data.pipe(writer)

    // return a promise
    return new Promise((resolve, reject) => {
      writer.on('finish', resolve)
      writer.on('error', reject)
    })
  } else {
    // we didn't get any image urls back, send an error
    throw new Error(1);
  }
}

async function getAlbumArt(artist, album, path) {
  
}

module.exports = router
