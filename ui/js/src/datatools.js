let _state = {}

const changeState = function (newState) {
  // should check to see if ins is an object
  const changedKeys = Object.keys(newState).filter(key => {
    return _state === undefined || !(key in _state) || newState[key] !== _state[key]
  })
  if (changedKeys.length === 0) {
    return []
  }
  _state = newState
  return changedKeys
}

const getQuality = function (samplerate, bitdepth) {
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

const formatTime = function (seconds) {
  let s = seconds
  return (s - (s %= 60)) / 60 + (s > 9 ? ':' : ':0') + s
}

const getStatus = function () {
  if ('status' in _state) {
    return _state.status
  } else {
    return ''
  }
}

const getState = function () {
  return _state
}

const getQueuePosition = function () {
  return parseInt(_state.position)
}

export {
  changeState,
  formatTime,
  getStatus,
  getState,
  getQuality,
  getQueuePosition
}
