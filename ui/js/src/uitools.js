/* global dataTools, webSocket */

var uiTools = (function () {
  var _title = ''

  var clearNodes = function (bind) {
    if (typeof bind === 'string') {
      bind = document.querySelector(bind)
    }
    while (bind.firstChild) {
      bind.firstChild.remove()
    }
    return bind
  }

  var formatTime = function (s) {
    s = Math.round(s)
    return (s - (s %= 60)) / 60 + (s > 9 ? ':' : ':0') + s
  }

  var getQuality = function (state) {
    var quality = 'unknown'
    if (state.sampleRate && state.bits) {
      quality = (state.sampleRate / 1000) + 'kHz' + ' ' + state.bits + 'bit'
    }
    return quality
  }

  var getSVG = function (iconName, cls) {
    var svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgElem.classList.add('feather')
    var useElem = document.createElementNS('http://www.w3.org/2000/svg', 'use')
    useElem.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '/img/feather-sprite.svg#' + iconName)
    svgElem.appendChild(useElem)
    if (cls) {
      cls.split(' ').forEach(c => svgElem.classList.add(c))
    }
    return svgElem
  }

  var setPageTitle = function ({ title, state } = {}) {
    var t = ''
    if (title !== undefined) { // if there's a title
      _title = title // save it
      t = title // set it
    } else {
      t = _title // otherwise, use the existing title
    }

    // at this point, t should be the title of the current page

    if (state !== undefined && state.status === 'play') { // if playing
      t = state.title + ' - ' + state.artist // set the title to the current song instead of the page title
    }

    // capitalize first letter...
    if (t !== undefined) {
      t = t.charAt(0).toUpperCase() + t.slice(1)
    } else {
      t = 'Audiophile Music Player'
    }
    // set the title
    document.title = t + ' | FALK'
  }

  var progress = {
    _seek: 0,
    _duration: 0,
    _counter: false,
    // this is used for the progress bar (since we have to manually count the 'ticks' of the clock
    stop: function () {
      clearInterval(this._counter)
    },
    start: function () {
      this._counter = setInterval(() => {
        this.update(true)
      }, 100)
    },
    set: function (seek, duration) {
      this._seek = seek * 1000
      this._duration = duration * 1000
    },
    update: function (count) {
      if (count) {
        this._seek = this._seek + 100
      }
      document.querySelector('#control-bar .seek').innerText = formatTime(Math.floor(this._seek / 1000))
      var p = this._seek / this._duration * 1000
      if (!isNaN(p) && p !== Infinity) {
        document.querySelector('#control-bar .play-progress progress').value = p
        var el = document.getElementById('mobile-progress')
        if (el !== null) {
          el.value = p
        }
      }
    }
  }

  var _setListeners = function () {
    // user clicks "clear-queue"
    /*
    document.querySelector('#queue .clear-queue').addEventListener('click', function (e) {
      webSocket.action.clearQueue()
      document.getElementById('queue').classList.remove('is-active')
    })
    */
    // user clicks "save-queue" on the queue dropdown
    /*
    document.querySelector('#queue .save-queue').addEventListener('click', function (e) {
      var items = document.querySelector('#queue table tr')
      if (!items) {
        return
      }
      var mo = document.getElementById('save-queue-modal')

      // reset the form
      var inp = mo.querySelector('input')
      inp.value = ''
      inp.classList.remove('is-danger')
      inp.closest('.field').querySelector('.help').innerText = ''
      mo.querySelector('.save').classList.remove('is-loading')

      // show the dialog
      mo.classList.add('is-active')
    })
    // user clicks "save" on the save-queue modal
    document.querySelector('#save-queue-modal .save').addEventListener('click', function (e) {
      var inp = document.querySelector('#save-queue-modal .input')
      var name = inp.value
      var regex = /^[a-z0-9-_!?@ ]+$/i
      if (regex.test(name)) {
        webSocket.action.saveQueue(name)
        inp.classList.remove('is-danger')
        inp.closest('.field').querySelector('.help').innerText = ''
        this.classList.add('is-loading')
      } else {
        // show the user a warning
        inp.classList.add('is-danger')
        var t = 'This field is required'
        if (name.length > 0) {
          t = 'Only letters, numbers, and the following are allowed: !?-_@'
        }
        inp.closest('.field').querySelector('.help').innerText = t
      }
    })
    */

    document.querySelector('.playing-controls .play-button').addEventListener('click', function (e) {
      var state = dataTools.getState().state

      // if (this.classList.contains('playing')) {
      if (state === 'play') {
        webSocket.action.pause()
      } else {
        webSocket.action.play()
      }
    })

    // user clicks "repeat"
    document.querySelector('.misc-controls .repeat').addEventListener('click', function (e) {
      webSocket.action.toggleRepeat()
    })

    // user clicks "next"
    document.querySelector('.playing-controls .next').addEventListener('click', function (e) {
      webSocket.action.next()
    })

    // user clicks "prev"
    document.querySelector('.playing-controls .prev').addEventListener('click', function (e) {
      webSocket.action.prev()
    })

    // user clicks "random"
    document.querySelector('.misc-controls .random').addEventListener('click', function (e) {
      webSocket.action.toggleRandom()
    })

    // hide dropdowns when they're clicked out of
    document.querySelector('html').addEventListener('click', function (ev) {
      var t = ev.target || ev.srcElement
      var dd = t.closest('.dropdown')
      document.querySelectorAll('.dropdown').forEach(function (el) {
        if (dd === null || dd.id !== el.id) {
          el.classList.remove('is-active')
        }
      })
      if (t.classList && t.classList.contains('modal-backgqnd')) {
        t.closest('.modal').classList.remove('is-active')
      }
    })

    document.querySelectorAll('.modal .modal-closer').forEach(function (el) {
      el.addEventListener('click', function (em) {
        this.closest('.modal').classList.remove('is-active')
      })
    })

    document.addEventListener('click', function (e) {
      var state = document.querySelector('aside.menu').classList.contains('is-active')
      if (state) {
        hideMenu()
      }
    })

    document.addEventListener('swiped-right', function (e) {
      showMenu()
    })
    document.addEventListener('swiped-left', function (e) {
      hideMenu()
    })
    document.addEventListener('swiped-up', function (e) {
      var ql = document.querySelector('#queue-list')
      if (ql != null) {
        ql.classList.add('is-active')
      }
    })
    document.addEventListener('swiped-down', function (e) {
      var ql = document.querySelector('#queue-list')
      if (ql != null) {
        ql.classList.remove('is-active')
      }
    })
  }

  var hideMenu = function () {
    document.querySelector('aside.menu').classList.remove('is-active')
  }
  var showMenu = function () {
    document.querySelector('aside.menu').classList.add('is-active')
  }

  var control = {
    hide: () => {
      document.querySelector('#control-bar').classList.remove('is-active')
      document.body.classList.add('no-controls')
    },
    show: () => {
      document.querySelector('#control-bar').classList.add('is-active')
      document.body.classList.remove('no-controls')
    }
  }

  var handlers = {
    playAlbum: function (e) {
      var rows = document.querySelector('table.songs').querySelectorAll('tr')
      var uris = []
      rows.forEach((tr) => {
        uris.push({ uri: tr.dataset.uri })
      })
      webSocket.action.replaceAndPlay(uris)
    },
    tracks: function (e) {
      var rows = this.closest('tbody').querySelectorAll('tr')
      var uris = []
      var qp = 0
      var uri = this.closest('tr').dataset.uri
      for (var i = 0; i < rows.length; i++) {
        uris.push({ uri: rows[i].dataset.uri })
        if (rows[i].dataset.uri === uri) {
          qp = i
        }
      }
      webSocket.action.replaceAndPlay(uris, qp)
    },
    dropdown: function (e) {
      this.closest('.dropdown').classList.toggle('is-active')
    },
    removeSong: function (e) {
      var pos = this.closest('.columns').dataset.pos
      webSocket.action.removeFromQueue(pos)
    },
    addPlay: function () {
      webSocket.action.addPlay([{ uri: this.closest('tr').dataset.uri }])
      this.closest('.dropdown').classList.remove('is-active')
    },
    queueSong: function (e) {
      var uri = [{ uri: this.closest('tr').dataset.uri }]
      webSocket.action.enqueue(uri)
      this.closest('.dropdown').classList.remove('is-active')
    },
    replaceWithSong: function (e) {
      webSocket.action.replaceAndPlay([{ uri: this.closest('tr').dataset.uri }])
      this.closest('.dropdown').classList.remove('is-active')
    },
    addShare: function (el) {
      var box = el.closest('.box')

      var vals = {
        host: box.querySelector('.address').value,
        path: box.querySelector('.path').value,
        type: box.querySelector('.type').value
      }
      webSocket.action.addShare(vals)
    },
    mobileButtons: {
      play: () => {
        var state = dataTools.getState().state
        if (state === 'play') {
          webSocket.action.pause()
        } else {
          webSocket.action.play()
        }
      }
    }
  }

  var closeModal = function () {
    var el = document.querySelector('#modal-container .modal')
    if (el !== undefined) {
      el.classList.remove('is-active')
    }
  }

  var init = function () {
    _setListeners()
  }

  return {
    clearNodes: clearNodes,
    getSVG: getSVG,
    getQuality: getQuality,
    setPageTitle: setPageTitle,
    progress: progress,
    formatTime: formatTime,
    handlers: handlers,
    closeModal: closeModal,
    hideMenu: hideMenu,
    showMenu: showMenu,
    control: control,
    init: init
  }
})()
