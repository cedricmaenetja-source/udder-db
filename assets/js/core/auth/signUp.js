import * as App from '../../app.js';
import * as Constant from '../../utils/constants.js';

$(function(){
    $('#signUp').on('click', async function(){
        var $btn = $(this);

        let hasError = false;
        $('.login-box').find('input, select').each(function(index, el) {
            const val = $(el).val();
            if (val == ''){
                hasError = true;
                return false;
            }
        });

        if (hasError) {
            App.errorNotification('All fields with * are required.');
            return;
        }

        const fname = $('#fname').val().trim();
        const lname = $('#lname').val().trim();
        const email = $('#email').val().trim();
        const password = $('#pwd').val().trim();
        const role = $('#role').val().trim();
        const otp = Math.floor(1000 + Math.random() * 9000);

        if ($btn.data('...')) return;
        $btn.data('...', true);
        $btn.append('<span class="spinner-btn-clicked"></span>');
        $btn.css('pointer-events', 'none');

        if (!App.isValidEmail(email)){
            resetBtn();
            App.errorNotification('Please provide a valid email.');
            return;
        }

        if (password.length < 8){
            resetBtn();
            App.errorNotification('The password needs to be at least 8 characters long.');
            return;
        }

        const data = {
            fname: fname,
            lname: lname,
            email: email,
            pwd: password,
            role: role,
            otp: otp
        };

        const response = await fetch('/api/supabase?action=userSignUp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: data}),
        });

        const result = await response.json();
        if (result.error){
            resetBtn();
            App.errorNotification(result.error);
            return;
        }

        App.successNotification('Registration Successful!');
        const res = await fetch(App.ZAPIER_SEND_EMAIL, {
            method: "POST",
            body: JSON.stringify({ to: result.data.email, subject: 'Your Verification Code', body: Constant.OTP_VERIFICATION_EMAIL.replace('{{OTP_CODE}}', result.data.otp) })
        });

        const filters = await res.json();
        location.href = `otp.html?t=${result.data.token}`;

        function resetBtn(){
            $btn.data('loading', false);
            $btn.find('.spinner-btn-clicked').remove();
            $btn.css('pointer-events', 'auto');
            $btn.data('...', false);
        }
    });
});