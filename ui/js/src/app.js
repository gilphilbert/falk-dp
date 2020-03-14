/* global vioSocket, uiTools, router */

// once the DOM is loaded (all our other modules will be loaded)
document.addEventListener('DOMContentLoaded', function () {
  // connect to the server and run the attached function
  vioSocket.init('localhost', function () {
    // initialize the two modules that depend on the socket being open
    uiTools.init()
    router.init()
  })
})

/*
 BIG FAT TODO LIST
 -----------------
Search:
  - Pretty much do this completely

Playlist:
  - Create a new playlist (without saving the current queue)
  - Delete a playlist
  - Play a playlist
  - Play a playlist from a given song

Album:
  - Play an album
  - Add an album to a playlist
  - Enqueue an album

Song (under an album, artist, genre view)
  - Add a song to a playlist

Artist
  - Play an artist

Genre
  - Refactor genre code

Installation

Settings screen
*/
