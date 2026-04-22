import * as App from '../app.js';

let ip = '';
$('#xloader').append(App.xloader);

$(function(){
    const ipCookie = App.getCookie('ip') ?? null;
    const userId = App.getCookie('visitor_id') ?? null;
    ip = ipCookie;

    if (ipCookie === null){
        $.getJSON("https://api.ipify.org?format=json", function(data) {
            ip = data.ip;
            App.setCookie('ip', ip, 30);
        });
    }
    
    if (userId !== null){
        location.href = 'db/';
    }else{
        $('#xloader').addClass('hide');
        $('.page').removeClass('hide');
    }
 
    $('#aboutSelfNextBtn').on('click', async function(){
        var $btn = $(this);

        const clientName = $('#clientName').val();
        const clientEmail = $('#clientEmail').val();
        const companyName = $('#companyName').val();
        let headcount = $('#headcount').val();
        const termsOfUse = $('#termsOfUse').val();
        const country = $('#country').val();

        if (!clientName || !clientEmail || !companyName){
            App.swal.fire({
                title: "Error",
                text: "All fields with * are required fields.",
            });
            return;
        }

        if (!$('#termsOfUse').is(':checked')){
            App.swal.fire({
                title: "Error",
                text: "You have to accept the terms and conditions and the privacy policy.",
            });
            return;
        }

        if ($btn.data('...')) return;
        $btn.data('...', true);
        $btn.append('<span class="spinner-btn-clicked"></span>');
        $btn.css('pointer-events', 'none');

        if (headcount == '') headcount = 0;

        const res = await fetch("/api/supabase?action=addVisitor", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ payload: {
                name: clientName, 
                email:  clientEmail, 
                company_name: companyName, 
                country: country,
                headcount: headcount,
                ip_address: ip
            }})
        });

        const result = await res.json();
        if (result.error){
            console.error('Error:', result.error);
        }
        console.info('id', result.data.id);
        App.setCookie('visitor_id', result.data.id, 365);
        location.href = 'request.html';
    });
});