/* global dataTools, webSocket */

const uiTools = (function () {
  let _title = ''

  const clearNodes = function (bind) {
    if (typeof bind === 'string') {
      bind = document.querySelector(bind)
    }
    while (bind.firstChild) {
      bind.firstChild.remove()
    }
    return bind
  }

  const formatTime = function (s) {
    s = Math.round(s)
    return (s - (s %= 60)) / 60 + (s > 9 ? ':' : ':0') + s
  }

  const getQuality = function (state) {
    let quality = 'unknown'
    if (state.sampleRate && state.bits) {
      quality = (state.sampleRate / 1000) + 'kHz' + ' ' + state.bits + 'bit'
    }
    return quality
  }

  const getSVG = function (iconName, cls) {
    const svgElem = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
    svgElem.classList.add('feather')
    const useElem = document.createElementNS('http://www.w3.org/2000/svg', 'use')
    useElem.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '/img/feather-sprite.svg#' + iconName)
    svgElem.appendChild(useElem)
    if (cls) {
      cls.split(' ').forEach(c => svgElem.classList.add(c))
    }
    return svgElem
  }

  const setPageTitle = function ({ title, state } = {}) {
    let t = ''
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

  const progress = {
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

      const topperPos = (this._seek / this._duration) * window.innerWidth
      if (!isNaN(topperPos) && topperPos !== Infinity) {
        document.querySelector('.progress-topper').style.width = Math.round(topperPos) + 'px'
      }

      const mobileCont = document.getElementById('mobile-progress-bar')
      if (mobileCont !== null) {
        const mobilePos = (this._seek / this._duration) * mobileCont.offsetWidth
        mobileCont.querySelector('div').style.width = Math.round(mobilePos) + 'px'
      }
    }
  }

  const _setListeners = function () {
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
      const state = dataTools.getState().state

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
      const t = ev.target || ev.srcElement
      const dd = t.closest('.dropdown')
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
      const cl = e.target.classList
      if (!cl.contains('burger')) {
        console.log('hiding menu')
        hideMenu()
      }
    })

    document.addEventListener('swiped-right', function (e) {
      e.preventDefault()
      showMenu()
    })
    document.addEventListener('swiped-left', function (e) {
      e.preventDefault()
      hideMenu()
    })
    /*
    document.addEventListener('swiped-up', function (e) {
      const cont = e.target.closest('.container')
      if ((cont !== null && cont.classList.contains('max')) || e.target.closest('#control-bar') !== null) {
        e.preventDefault()
        e.stopPropagation()
        const ql = document.querySelector('#queue-list')
        if (ql != null) {
          ql.classList.add('is-active')
        }
        return false
      }
    })
    */
    let ts

    document.getElementById('control-bar').addEventListener('touchstart', function (e) {
      ts = e.touches[0].clientY
      e.preventDefault()
    }, false)

    document.getElementById('control-bar').addEventListener('touchend', function (e) {
      e.preventDefault()
      const te = e.changedTouches[0].clientY
      if (ts > te + 5) {
        document.getElementById('queue-list').classList.add('is-active')
      }
      ts = 0
    })

    document.getElementById('control-bar').addEventListener('touchmove', function (e) {
      e.preventDefault()
    }, false)

    // don't scroll body when scrolling on queue
    document.getElementById('queue-list').addEventListener('touchmove', function (e) {
      e.stopPropagation()
    }, false)

    document.getElementById('queue-list').addEventListener('touchstart', function (e) {
      ts = e.touches[0].clientY
      e.preventDefault()
    }, false)

    document.getElementById('queue-list').addEventListener('touchend', function (e) {
      e.preventDefault()
      const te = e.changedTouches[0].clientY
      if (ts < te - 5) {
        document.getElementById('queue-list').classList.remove('is-active')
      }
    })

    /*
    document.addEventListener('swiped-down', function (e) {
      e.preventDefault()
      const ql = document.querySelector('#queue-list')
      if (ql != null) {
        ql.classList.remove('is-active')
      }
    })
    */

    document.getElementById('burger').addEventListener('click', e => {
      e.preventDefault()
      document.querySelector('aside.menu').classList.add('is-active')
    })

    document.getElementById('search-input').addEventListener('keyup', (e) => {
      pageSearch()
    })

    document.addEventListener('keypress', (e) => {
      if (e.target === document.body || e.target.nodeName === 'A') { // <!-------------------------------------------------------------------------- NEEDS TO CHANGE TO != INPUT (or include menu...)
        document.getElementById('search-input').focus()
        pageSearch()
      }
    })
    document.getElementById('search-input').addEventListener('focus', () => {
      document.getElementById('search-input').value = ''
    })
  }

  const pageSearch = function () {
    const tiles = document.querySelectorAll('.item-tile')
    const ss = document.getElementById('search-input').value.toLowerCase()
    tiles.forEach((t) => {
      if (t.dataset.title.toLowerCase().indexOf(ss) === -1 && t.dataset.subtitle.toLowerCase().indexOf(ss) === -1) {
        // console.log(t)
        t.classList.add('is-hidden')
      } else {
        t.classList.remove('is-hidden')
      }
    })
  }

  const hideMenu = function () {
    document.querySelector('aside.menu').classList.remove('is-active')
  }
  const showMenu = function () {
    document.querySelector('aside.menu').classList.add('is-active')
  }

  const control = {
    hide: () => {
      document.querySelector('#control-bar').classList.remove('is-active')
      document.body.classList.add('no-controls')
    },
    show: () => {
      document.querySelector('#control-bar').classList.add('is-active')
      document.body.classList.remove('no-controls')
    }
  }

  const handlers = {
    playAlbum: function (e) {
      const rows = document.querySelector('table.songs').querySelectorAll('tr')
      const uris = []
      rows.forEach((tr) => {
        uris.push({ uri: tr.dataset.uri })
      })
      webSocket.action.replaceAndPlay(uris)
    },
    tracks: function (e) {
      const rows = this.closest('tbody').querySelectorAll('tr')
      const uris = []
      let qp = 0
      const uri = this.closest('tr').dataset.uri
      for (let i = 0; i < rows.length; i++) {
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
      const pos = this.closest('tr').dataset.pos
      webSocket.action.removeFromQueue(pos)
    },
    addPlay: function () {
      webSocket.action.addPlay([{ uri: this.closest('tr').dataset.uri }])
      this.closest('.dropdown').classList.remove('is-active')
    },
    queueSong: function (e) {
      const uri = [{ uri: this.closest('tr').dataset.uri }]
      webSocket.action.enqueue(uri)
      this.closest('.dropdown').classList.remove('is-active')
    },
    replaceWithSong: function (e) {
      webSocket.action.replaceAndPlay([{ uri: this.closest('tr').dataset.uri }])
      this.closest('.dropdown').classList.remove('is-active')
    },
    addShare: function (el) {
      const box = el.closest('.box')

      const vals = {
        host: box.querySelector('.address').value,
        path: box.querySelector('.path').value,
        type: box.querySelector('.type').value
      }
      webSocket.action.addShare(vals)
    },
    mobileButtons: {
      play: () => {
        const state = dataTools.getState().state
        if (state === 'play') {
          webSocket.action.pause()
        } else {
          webSocket.action.play()
        }
      }
    }
  }

  const closeModal = function () {
    document.querySelectorAll('#modal-container .modal').forEach(m => {
      m.classList.remove('is-active')
    })
  }

  const init = function () {
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
