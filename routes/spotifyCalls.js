const rp = require('request-promise')

/*
    Retrieves all the playlists of a user
    and send them to the front-end
*/
module.exports.getPlaylists = async (spotifyToken) => {

  let user = await getUser(spotifyToken)

  var options = {
    url: `https://api.spotify.com/v1/users/${user}/playlists?limit=50`,
    headers: {
      'Authorization': 'Bearer ' + spotifyToken
    },
    json: true
  }

  const body = await rp(options)

  let list = body.items;

  var playlists = []

  for (var i in list) {
    playlists.push({
      name: list[i].name,
      id: list[i].id
    })
  }

  return ({
    user: user,
    playlists: playlists

  })

}

/*
  Retrieves the id of the current user based on access token
*/
async function getUser(spotifyToken) {

  var options = {
    url: 'https://api.spotify.com/v1/me',
    headers: {
      'Authorization': 'Bearer ' + spotifyToken
    },
    json: true
  }

  const body = await rp(options)

  return body.id

}

/*
  Revieces mood, playlists and a token from the front-end.
  Combines the playlists and returns a filter playlist based on the mood
  and sends it back to the front-end

*/
module.exports.getMoodified = async (mood, playlists, spotifyToken, user) => {

  var trackPromises = []

  for (var i in playlists) {

    trackPromises[i] = Promise.resolve(getTracks(playlists[i], spotifyToken))

  }

  const playlistPromise = createPlaylist(mood, spotifyToken, user)

  let allTracks = await Promise.all(trackPromises)

  allTracks = Array.prototype.concat.apply([], allTracks)

  //we wait until all audio features for the tracks have been gathered
  await getAudioFeatures(allTracks, spotifyToken)

  //We then sort the tracks based on the user selected mood
  if (mood === 'sad') {

    allTracks = allTracks.sort((a, b) => a.happiness - b.happiness)

  } else if (mood === 'happy') {

    allTracks = allTracks.sort((a, b) => b.happiness - a.happiness)

  } else if (mood === 'energetic') {

    allTracks = allTracks.sort((a, b) => b.energetic - a.energetic)

  } else if (mood === 'calm') {

    allTracks = allTracks.sort((a, b) => a.energetic - b.energetic)

  }

  allTracks = allTracks.splice(0, 100)

  const playlistID = await Promise.resolve(playlistPromise)

  await addTracksToPlaylist(playlistID, allTracks, spotifyToken)

  return playlistID

}

async function getNbrOfTracks(playlistID, spotifyToken) {

  var options = {
    url: `https://api.spotify.com/v1/playlists/${encodeURIComponent(playlistID)}?fields=tracks.total`,
    headers: {
      'Authorization': 'Bearer ' + spotifyToken
    },
    json: true
  }

  const result = await rp(options)

  return result.tracks.total

}

/*
  Creates the spotify playlist
  The mood argument is used for the name of the playlist
*/
async function createPlaylist(mood, spotifyToken, user) {

  var options = {
    url: `https://api.spotify.com/v1/users/${user}/playlists`,
    headers: {
      'Authorization': 'Bearer ' + spotifyToken,
      'Content-Type': 'application/json',
    },
    dataType: 'json',
    body: JSON.stringify({
      'name': `${mood} by Moodify`,
      'public': false
    })
  }

  let data = await rp.post(options)
  data = JSON.parse(data)

  return data.id

}

/*
  This function adds the tracks to the spotify playlist ordered by the mood values
*/
async function addTracksToPlaylist(playlistID, tracks, spotifyToken) {

  var trackURIs = []

  for (var i in tracks) {

    trackURIs.push("spotify:track:" + tracks[i].uri)

  }

  jsonTracks = {
    uris: trackURIs

  }

  var options = {
    url: `https://api.spotify.com/v1/playlists/${playlistID}/tracks`,
    headers: {
      'Authorization': 'Bearer ' + spotifyToken,
      'Content-Type': 'application/json',
    },
    dataType: 'json',
    body: JSON.stringify(jsonTracks)
  }

  try {

    await rp.post(options)
    return

  } catch(error) {
    return

  }

}

/*
  Retrieves and returns all non local tracks from a spotify playlist
 */
async function getTracks(id, spotifyToken) {

  const nbrOfTracks = await getNbrOfTracks(id, spotifyToken)

  let trackPromises = []
  let trackDict = []

  for (var offset = 0; offset < nbrOfTracks; offset = offset + 100) {

    trackPromises.push(Promise.resolve(getOneHundredTracks(id, spotifyToken, trackDict, offset)))

  }

  await Promise.all(trackPromises)

  return trackDict

}

async function getOneHundredTracks(id, spotifyToken, trackDict, offset) {

  var options = {
    url: `https://api.spotify.com/v1/playlists/${encodeURIComponent(id)}/tracks?fields=items(track(id%2C%20name))&limit=100&offset=${encodeURIComponent(offset)}`,
    headers: {
      'Authorization': 'Bearer ' + spotifyToken
    },
    json: true
  }


  const body = await rp(options)

  try {

    let tracks = body.items

    for (var i in tracks) {

      if (!tracks[i].track.is_local) {
        trackDict.push({
          uri: tracks[i].track.id,
          trackName: tracks[i].track.name,
          //artistName: tracks[i].track.artists[0].name

        })

      }

    }

    return

  } catch (error) {
    throw new Error('Invalid input -> StatusCodeError: 400')
  }

}

/*
  Prepares the array to be sent for audio features retrieval from the Spotify API
  The incoming array is split into parts of at most 100 tracks each
 */
async function getAudioFeatures(trackURIs, spotifyToken) {

  var trackString = []

  for (var i in trackURIs) {

    trackString.push(trackURIs[i].uri)

  }

  var trackStringArray = []

  while (trackString.length > 0) {

    trackStringArray.push(trackString.splice(0, 100))

  }

  var audioFeaturePromises = []

  for (var i in trackStringArray) {

    offset = i * 100

    audioFeaturePromises.push(Promise.resolve(getAudioFeaturesForOneHundredTrack(trackStringArray[i], offset, trackURIs, spotifyToken)))

  }

  await Promise.all(audioFeaturePromises)

  return

}

/*
  Retrieves audio features for all tracks in the incoming array and adds the
  valence and energy values to the track objects in the array
 */
async function getAudioFeaturesForOneHundredTrack(trackStringArray, offset, trackURIs, spotifyToken) {

  let trackString = trackStringArray.join(',')

  let options = {
    url: 'https://api.spotify.com/v1/audio-features/?ids=' + trackString,
    headers: {
      'Authorization': 'Bearer ' + spotifyToken
    },
    json: true
  }

  const body = await rp(options)

  for (var i = 0; i < trackStringArray.length; i++) {

    placement = offset + i

    trackURIs[placement].happiness = body.audio_features[i].valence
    trackURIs[placement].energetic = body.audio_features[i].energy

  }

  return

}

/*
  Retrieves uri, track name and artist name for each track in an album
  Returns these values as an array with objects containing uri, trackName, artistName parameters
 */
module.exports.getAlbum = (albumURI, spotifyToken) => {

  return new Promise((resolve, reject) => {

    let options = {
      url: 'https://api.spotify.com/v1/albums/' + albumURI + '/tracks',
      headers: {
        'Authorization': 'Bearer ' + spotifyToken
      },
      json: true
    }

    rp(options, (error, response, body) => {

      if (!error && response.statusCode === 200) {

        var trackURIs = []

        for (var i in body.items) {

          trackURIs.push({
            uri: body.items[i].id,
            trackName: body.items[i].name,
            artistName: body.items[i].artists[0].name

          })

        }

        resolve(trackURIs)

      }

    }).catch((error) => {
      reject('Invalid input -> StatusCodeError: 400')

    })

  })

}
