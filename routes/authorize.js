var request = require('request')
var querystring = require('querystring')
const env = require('dotenv').config()
const rp = require('request-promise')

/*
  This module is responsible for handling the authorization and access to the Spotify API
 */
var spotify_client_id = process.env.spotify_client_id
var spotify_client_secret = process.env.spotify_client_secret
var redirect_uri = 'http://localhost:8888/callback'



/*
  Redirects to the Spotify-login
 */
module.exports.login = (req, res) => {

  var scope = 'user-read-private user-read-email playlist-read-private playlist-modify-private'
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: spotify_client_id,
      scope: scope,
      redirect_uri: redirect_uri,
    }))
}

/*
  This function handles the retrieval of spotify access tokens
*/
module.exports.callback = (req, res) => {

  return new Promise((resolve, reject) => {

    var code = req.query.code
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'))
      },
      json: true
    }

    request.post(authOptions, (error, response, body) => {
      if (!error && response.statusCode === 200) {

        spotify_access_token = body.access_token,
          refresh_token = body.refresh_token

        resolve(spotify_access_token)

      } else {
        reject(error)
      }
    })

  })


}

/*
  This function handles the retrieval of spotify access tokens
  for use of the API
*/
module.exports.clientCredentialsAuth = () => {

  return new Promise((resolve, reject) => {

    var options = {
      url: 'https://accounts.spotify.com/api/token',
      headers: {
        'Authorization': 'Basic ' + (Buffer.from(spotify_client_id + ':' + spotify_client_secret).toString('base64'))
      },
      form: {
        grant_type: 'client_credentials'
      },
      json: true
    }

    request.post(options, (error, response, body) => {

      if (!error && response.statusCode === 200) {

        resolve(body.access_token)
      }

    })

  })

}
