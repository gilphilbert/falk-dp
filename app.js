var express = require('express')
var ws = require('./ws')

var app = express()

app.use(express.static('public'))

app.listen(3000, function () {
  console.log('Listening on port 3000')
})
