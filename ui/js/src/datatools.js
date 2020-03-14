var dataTools = (function () {
  var _state = {}

  var changeState = function (newState) {
    // should check to see if ins is an object
    var changedKeys = Object.keys(newState).filter(key => {
      return this._state === undefined || !(key in _state) || newState[key] !== _state[key]
    })
    if (changedKeys.length === 0) {
      return []
    }
    _state = newState
    return changedKeys
  }

  var getQuality = function (samplerate, bitdepth) {
    if (_state.samplerate !== undefined && _state.samplerate !== '') {
      if (_state.bitdepth !== undefined && _state.bitdepth !== '') {
        return _state.samplerate.replace(' ', '') + ' ' + _state.bitdepth.replace(' ', '')
      } else {
        return _state.samplerate.replace(' ', '')
      }
    } else if (_state.bitdepth !== undefined && _state.bitdepth !== '') {
      return _state.bitdepth.replace(' ', '')
    } else {
      return ''
    }
  }

  var formatTime = function (seconds) {
    var s = seconds
    return (s - (s %= 60)) / 60 + (s > 9 ? ':' : ':0') + s
  }

  var getStatus = function () {
    if ('status' in _state) {
      return _state.status
    } else {
      return ''
    }
  }

  var getState = function () {
    return _state
  }

  var getQueuePosition = function () {
    return parseInt(_state.position)
  }

  return {
    changeState: changeState,
    formatTime: formatTime,
    getStatus: getStatus,
    getState: getState,
    getQuality: getQuality,
    getQueuePosition: getQueuePosition
  }
})()
