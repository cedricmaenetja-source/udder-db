import * as App from '../app.js';

$(function(){
    $('#datetime').text(App.getDateTime());
    
    $('#searchBtn').on('click', function(){
        const query = $('#searchInput').val();
        if (query == ''){
            App.swal.fire({
                title: "Error",
                text: "You have to describe what system you're looking for.",
            });
            return;
        }

        App.setCookie('query', query);
        location.href = `db/?query=${encodeURIComponent(query)}`;
    });
});