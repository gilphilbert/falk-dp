/* global webSocket, uiTools, router */

// once the DOM is loaded (all our other modules will be loaded)
document.addEventListener('DOMContentLoaded', function () {
  // connect to the server and run the attached function
  webSocket.init('192.168.68.103', function () {
  //webSocket.init(window.location.host, function () {
    // initialize the two modules that depend on the socket being open
    uiTools.init()
    router.init()
  })
})
