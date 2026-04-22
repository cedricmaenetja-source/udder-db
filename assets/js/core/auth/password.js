import * as App from '../../app.js';
import { PAGES } from '../../utils/constants.js';

let email = '';
$(function(){
    const token = App.getUrlParam('t') ?? null;
    if (token === null){
        location.href = PAGES.login;
        return;
    }

    fetch('/api/verify-token', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            token: token
        })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error){
            // handle error
            console.error('error', data.error);
            App.errorNotification(data.error);
            location.href = PAGES.login;
            return;
        }

        email = data.user.email;
    });

    $('#savePassBtn').on('click', async function(){
        var $btn = $(this);
        const pwd = $('#newPassword').val();
       
        if (!email || !pwd) return;
        if (pwd.length < 8){
            resetBtn();
            App.errorNotification('The password needs to be at least 8 characters long.');
            return;
        }

        if ($btn.data('...')) return;
        $btn.data('...', true);
        $btn.append('<span class="spinner-btn-clicked"></span>');
        $btn.css('pointer-events', 'none');

        const response = await fetch('/api/supabase?action=updateUserPassword', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pwd}),
        });

        const result = await response.json();
        if (result.error){
            resetBtn();
            App.errorNotification(result.error);
            return;
        }

        App.successNotification('Password Updated!');
        resetBtn();
        location.href = PAGES.login;

        function resetBtn(){
            $btn.data('loading', false);
            $btn.find('.spinner-btn-clicked').remove();
            $btn.css('pointer-events', 'auto');
            $btn.data('...', false);
        }
    });
})