import * as App from '../../app.js';
import * as Constant from '../../utils/constants.js';

let userId;
let userEmail;
let userOtp;

$(function(){
    const token = App.getUrlParam('t') ?? null;
    if (token !== null){
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
                $('.loader-wrapper').addClass('hide');
                App.showToast(data.error, 'error');
                location.href = '../../login.html';
                //location.href = '../../login.html';
                return;
            }

            const user = data.user;
            const email = user.email;

            userEmail = email;
            userId = user.id;
            userOtp = user.otp;

            if (user.verified == 'Y'){
                location.href = '../../login.html';
            }

            $('#email').text(App.maskEmail(email));

            $('.loader-wrapper').addClass('hide');
            $('.login-box').removeClass('hide');
        });
    }else{
        location.href = '../../login.html';
    }

    $('#verifyBtn').on('click', async function(e){
        e.preventDefault();
        
        const otp = $('.otp-group input').map(function () {
            return $(this).val();
        }).get().join('');

        if (otp.length !== 4) {
            return;
        }

        var $btn = $(this);
        if ($btn.data('...')) return;
        $btn.data('...', true);
        $btn.append('<span class="spinner-btn-clicked"></span>');
        $btn.css('pointer-events', 'none');
        
        if (userOtp != otp){
            $btn.data('loading', false);
            $btn.find('.spinner-btn-clicked').remove();
            $btn.css('pointer-events', 'auto');
            $btn.data('...', false);

            App.showToast('Verification failed!', 'error');
            return;
        }

        const response = await fetch('/api/supabase?action=updateVerification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ verified: 'Y', id: userId}),
        });

        const result = await response.json();
        if (result.error){
            $btn.data('loading', false);
            $btn.find('.spinner-btn-clicked').remove();
            $btn.css('pointer-events', 'auto');
            $btn.data('...', false);

            App.showToast(result.error, 'error');
            return;
        }

        // App.swal.fire({
        //     position: "top-end",
        //     title: `<div style="display: inline-flex; align-items: center; gap: 8px;">
        //         <div class="circle-tick"></div>
        //         <span></span>
        //     </div>`,
        //     showConfirmButton: false,
        //     timer: 1500
        // });
        App.showToast('Verification Successful!', 'success');

        location.href = '../../login.html';
    });

    $('.otp-group input').on('input', function () {
        this.value = this.value.replace(/[^0-9]/g, '');

        if ($(this).val().length === 1) {
            $(this).next('input').focus();
        }

        const otp = $('.otp-group input').map(function () {
            return $(this).val();
        }).get().join('');
       
        if (otp.length === 4) {
            $('#verifyBtn').click();
        }

        $('#verifyBtn').prop('disabled', otp.length !== 4);
    });

    $('#resendBtn').on('click', async function(){
        const otp = Math.floor(1000 + Math.random() * 9000);

        const response = await fetch('/api/supabase?action=updateOtp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp: otp, id: userId}),
        });

        const result = await response.json();
        if (result.error){
            App.showToast(result.error, 'error');
            return;
        }

        const res = await fetch(App.ZAPIER_SEND_EMAIL, {
            method: "POST",
            body: JSON.stringify({ to: userEmail, subject: 'Your Verification Code', body: Constant.OTP_VERIFICATION_EMAIL.replace('{{OTP_CODE}}', otp) })
        });

        const filters = await res.json();
        App.showToast('Email Re-sent!', 'error');

        userOtp = otp;
    });
});