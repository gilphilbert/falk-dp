var express = require('express')
var router = express.Router()

var app = express()

const crypto = require('crypto')
const fs = require('fs')
const path = require('path')
const rootdir = path.resolve(__dirname)
const axios = require('axios')
const MusicBrainzApi = require('musicbrainz-api').MusicBrainzApi
const mbApi = new MusicBrainzApi({
  appName: 'Moosic',
  appVersion: '0.0.1',
  appContactInfo: 'gil.philbert@gmail.com'
});

// the albumart service
router.get('/artist/:artist', function (req, res) {
  var q = req.params

  // you need to specify an artist!
  if (!q.artist) {
    res.json({ error: 'you must specify an artist and/or album' })
    return
  }

  getArt({ artist: q.artist }, res)
})

router.get('/album/:artist/:album', function (req, res) {
  var q = req.params

  // you need to specify an artist!
  if (!q.artist || !q.artist) {
    res.json({ error: 'you must specify an artist and/or album' })
    return
  }

  getArt({ artist: q.artist, album: q.album }, res)
})

function getArt({ artist, album }={}, res) {
  const artcache = rootdir + "/artcache/"

  // generate a hash from the request
  var cs = artist
  var pre = "artist/"
  if (album) {
    cs = cs + album
    pre = "album/"
  }
  const hash = crypto.createHash("sha1").update(cs).digest("hex")

  // now convert the hash to a file name ./artcache/${filename}
  const imgpath = artcache + pre + hash + ".jpg"

  try {
    if (fs.existsSync(imgpath)) {
      // we have the file in the cache, so serve it
      res.sendFile(imgpath)
    } else {
      // what art are we looking for?
      if (!album) {
        // we're looking for an artist, let's go look for it and store it if we find it
        getArtistArt(artist, imgpath)
          .then((e) => {
            // we got a file, let's serve it
            res.sendFile(imgpath)
          })
	  .catch((e) => {
            // there's no art, serve the default artistart
            res.sendFile(artcache + "artist.png")
	  })
      } else {
        // we're looking for albumart let's look for some!
        getAlbumArt(artist, album, imgpath)
          .then((e) => {
            // we got a file, let's serve it
            res.sendFile(imgpath)
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
}

async function getArtistArt(artist, imgpath) {
  var _artist = encodeURIComponent(artist)
  // get the mbid from audioscrobbler...
/*
  info = await axios.get("https://ws.audioscrobbler.com/2.0/?method=artist.getinfo&artist=" + _artist + "&api_key=250b1448a91894d0f7542cbcdedc936e&format=json")
  const mbid = info.data.artist.mbid
*/
  info = await mbApi.searchArtist(artist, 0, 1)
  mbid = info.artists[0].id

  // now get the fanart from fanart.tv
  fanart = await axios.get("https://webservice.fanart.tv/v3/music/" + mbid + "&?api_key=fd55f4282969cb8b8d09f470e3d18c51&format=json")
  const data = fanart.data

  // check to see if we actually got any art URLs back
  if (data.artistthumb && data.artistthumb.length > 0) {
    // fetch the image file
    const response = await axios({ url: data.artistthumb[0].url, method: 'GET', responseType: 'stream' })

    // write the file
    const writer = fs.createWriteStream(imgpath)
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

async function getAlbumArt(artist, album, imgpath) {
  var _artist = encodeURIComponent(artist)
  var _album = encodeURIComponent(album)
  info = await axios.get(`http://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=250b1448a91894d0f7542cbcdedc936e&artist=${_artist}&album=${_album}&format=json`)

  const images = info.data.album.image
  /*
  var _img = images.filter(img => {
    return img.size == "mega"
  })
  if (!_img || _img.length===0) {
    _img = images.filter(img => {
      return img.size == "extralarge"
    })
  }
  */
  var _img = images.filter(img => {
    return img.size == "extralarge"
  })
  var imageurl = false
  if (_img && _img.length > 0) {
    imageurl = _img[0]["#text"]
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

  //we didn't find an image, panic!
  throw new Error(1);
}

module.exports = router
