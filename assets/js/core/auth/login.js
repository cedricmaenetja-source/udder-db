import * as App from '../../app.js';
import { PAGES, RESET_PASSWORD_EMAIL, HOSTNAME } from '../../utils/constants.js';

$(function(){
    const isLoggedIn = App.getCookie('is_logged_in');
    if (isLoggedIn === 'true') location.href = PAGES.vendor;

    $('#forgotPassBtn').on('click', async function(){
        const email = $('#forgotPasswordEmail').val().trim();
        if (!email) return;

        const reset = App.lockBtn($(this));
        if (!reset) return;

        const r = await fetch('/api/supabase?action=getUserByEmail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({'email': email}),
        });

        const rs = await r.json();
        if (rs.error){
            reset();
            App.showToast(rs.error, 'error');
            return;
        }

        if (rs.data === null){
            App.showToast('Email address could not be found.', 'error');
            reset();
            return;
        }

        const response = await fetch('/api/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: {'email': email}, expiresIn: '1h'}),
        });

        const result = await response.json();
        if (result.error){
            reset();
            App.showToast(result.error, 'error');
            return;
        }

        const res = await fetch(App.ZAPIER_SEND_EMAIL, {
            method: "POST",
            body: JSON.stringify({ 
                to: email, 
                subject: 'Reset Your Password', 
                body: RESET_PASSWORD_EMAIL.replace('{{LINK}}', `${HOSTNAME}/password.html?t=${result.token}`) })
        });

        const filters = await res.json();
        App.showToast('Email sent!', 'success');
        reset();
    });

    $('#loginBtn').on('click', async function(){
        const email = $('#email').val();
        const pwd = $('#password').val();
        //const remember = $('#remember').is(':checked');;

        if (!email || !pwd) return;

        const reset = App.lockBtn($(this));
        if (!reset) return;

        const response = await fetch('/api/supabase?action=userExists', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email, password: pwd}),
        });

        const result = await response.json();
        if (result.error){
            reset();
            App.showToast(result.error, 'error');
            return;
        }
        
        var days = 365; //remember ? 365 : 1;
        App.setCookie('is_logged_in', true, days);
        App.setCookie('user_id', result.data.id, days);

        location.href = (result.data.role == 'hr-professional') ? PAGES.home : `user/${result.data.role}`;
    });
});