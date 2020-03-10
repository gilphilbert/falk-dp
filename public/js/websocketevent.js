var ServerEventsDispatcher = function(url){
  var url = url
  var conn = new WebSocket(url)

  var callbacks = {}

  this.bind = function(event_name, callback){
    callbacks[event_name] = callbacks[event_name] || []
    callbacks[event_name].push(callback)
    return this;// chainable
  }

  this.send = function(event_name, event_data){
    var payload = JSON.stringify({event:event_name, data: event_data})
    conn.send( payload )
    return this;
  }

  var startup = function() {
    conn.onmessage = function(evt){
      var json = JSON.parse(evt.data)
      dispatch(json.event, json.data)
    }

    conn.onclose = function(e){dispatch('close',e)}
    conn.onopen = function(){dispatch('open',null)}
  }
  startup()

  this.bind("close", (e) => {
    if (e.code!=1000) {
      setTimeout(function(){
        console.log("WebSocketClient: reconnecting...")
	conn = new WebSocket(url)
        startup()
      }, 3000)
    }
  })

  var dispatch = function(event_name, message){
    var chain = callbacks[event_name]
    if(typeof chain == 'undefined') return
    for(var i = 0; i < chain.length; i++){
      chain[i]( message )
    }
  }
}
