$(document).ready(function() {

  $(".mood-select a").click(function() {
    $("a").removeAttr("id");
    $(this).attr("id", "active");
  })

  $("#submit-btn").click(function() {
    let btnVal = $("#active").text().toLowerCase();
    let selectedPlaylists = []

    $.each($("input[name='playlist']:checked"), function() {

      selectedPlaylists.push(sessionStorage.getItem($(this).val()))

    })

    selectedPlaylists = JSON.stringify(selectedPlaylists)

    if(selectedPlaylists.length > 0) {

      data = {
        mood : btnVal,
        playlists : selectedPlaylists,
        token : sessionStorage.getItem('spotifyToken'),
        user : sessionStorage.getItem('user')
      }

       data = JSON.stringify(data)

      $.ajax({
        type: "POST",
        url: "http://localhost:8888/createPlaylist",
        contentType: "application/json",
        data: data,
        success: function(response) {
          window.location.href = response.redirect
        }

      })

      setTimeout(function() {
        $("#pageloader").fadeIn();
      }, 500);
    }
  });

});
