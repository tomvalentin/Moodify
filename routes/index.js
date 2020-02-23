const express = require('express')
const router = express.Router()
const authorize = require('./authorize')
const spotifyCalls = require('./spotifyCalls')

/*
  This module handles the websites URLs and delegates the required work to other modules
*/

/*
    When a user navigates to "/" the index page is rendered
*/
router.get('/', (req, res) => {
  res.render('layouts/index')

})

/*
    When a user navigates to "/index" the index page is rendered
*/
router.get('/index', (req, res) => {
  res.render('layouts/index')


})

/*
    When a user navigates to "/about" the about page is rendered
*/
router.get('/about', (req, res) => {
  res.render('layouts/about')

})

/*
    When a user is redirected to "/result/{Playlist URI}" the result page is rendered
    and a Spotify playlist embed URL is sent to the client
*/
router.get('/result/:uri', (req, res) => {
  var newPlaylistURI = req.params.uri
  res.render('layouts/result', {
    uri: "https://open.spotify.com/embed/playlist/" + newPlaylistURI
  })

})

/*
    When a user navigates to "/login" the login page is rendered
*/
router.get('/login', (req, res) => {
  authorize.login(req, res)

})

/*
    When Spotify redirects to this URL the authentication process can continue
    After the Spotify authentication process is complete the server retrieves the users playlists.
    The Spotify username and the names of the users playlists as well as the unique
    Spotify token is sent to the client.
*/
router.get('/callback', (req, res) => {

  const callbackPromise = Promise.resolve(authorize.callback(req, res))
  callbackPromise.then((spotifyToken) => {

    const playlistPromise = Promise.resolve(spotifyCalls.getPlaylists(spotifyToken))
    playlistPromise.then((data) => {

      data.token = spotifyToken
      res.render('layouts/redirect', {
        data
      })
    })

  }).catch((err) => {
    res.render('layouts/index')
  })

})

/*
    When a user presses the Moodify button a post request with the users selection will be sent to
    the "/createPlaylist" URL. After the server is done processing the request
    the client will be redirected to the "/result" URL
*/
router.post('/createPlaylist', (req, res) => {

  const uriPromise = Promise.resolve(spotifyCalls.getMoodified(req.body.mood, JSON.parse(req.body.playlists) , req.body.token, req.body.user))
  uriPromise.then((value) => {
    const redirectURI = '/result/' + value
    res.send({
      redirect: redirectURI
    })

  })

})

module.exports = router
