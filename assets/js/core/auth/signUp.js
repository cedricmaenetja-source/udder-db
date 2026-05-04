import * as App from '../../app.js';
import * as Constant from '../../utils/constants.js';

$(function(){
    loadVendorsForClaiming();
    /* Password toggle */
    document.getElementById('togglePwd').addEventListener('click', function(){
    var p = document.getElementById('pwd');
    var show = p.type === 'password';
    p.type = show ? 'text' : 'password';
    // document.getElementById('eyeIcon').innerHTML = show
    //     ? '<path d="M13.4 13.4A5.97 5.97 0 0 1 8 16c-4.5 0-7-5-7-5a12.6 12.6 0 0 1 2.6-3.4M6.3 6.3A5.97 5.97 0 0 1 8 6c4.5 0 7 5 7 5a12.6 12.6 0 0 1-1.67 2.3M1 1l14 14" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>'
    //     : '<path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke="currentColor" stroke-width="1.3"/><circle cx="8" cy="8" r="2" stroke="currentColor" stroke-width="1.3"/>';
    });

    /* Password strength */
    document.getElementById('pwd').addEventListener('input', function(){
    var v = this.value;
    var wrap = document.getElementById('pwdStrength');
    var lbl = document.getElementById('pwdLabel');
    if(!v){ wrap.style.display='none'; return; }
    wrap.style.display='block';
    var score=0;
    if(v.length>=8)score++;if(v.length>=12)score++;
    if(/[A-Z]/.test(v)&&/[a-z]/.test(v))score++;
    if(/[0-9]/.test(v)&&/[^A-Za-z0-9]/.test(v))score++;
    var cols=['','#ef4444','#f59e0b','#22c55e','#16a34a'];
    var labs=['','Too short','Fair','Good','Strong'];
    ['b1','b2','b3','b4'].forEach(function(id,i){
        var el=document.getElementById(id);
        el.style.background=i<score?cols[score]:'';
    });
    lbl.textContent=labs[score]||'';
    lbl.style.color=cols[score]||'var(--t4)';
    });

    /* Step 1 → Step 2 */
    document.getElementById('step1Next').addEventListener('click', function(){
    var email = document.getElementById('email').value.trim();
    var pwd   = document.getElementById('pwd').value;
    if(!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
        App.showToast('Please enter a valid email address.','error'); return;
    }
    if(pwd.length < 8){
        App.showToast('Password must be at least 8 characters.','error'); return;
    }
    /* Copy into the hidden fields inside .login-box so signUp.js picks them up */
    document.getElementById('email').value = email;
    document.getElementById('pwd').value   = pwd;
    goStep(2);
    });

    /* Back */
    document.getElementById('backBtn').addEventListener('click', function(){ goStep(1); });

    function goStep(n){
        document.getElementById('panel1').classList.toggle('active', n===1);
        document.getElementById('panel2').classList.toggle('active', n===2);
        document.getElementById('panel3').classList.toggle('active', n===3);  // ADD
        document.getElementById('dot1').className='progress-dot'+(n===1?' active':' done');
        document.getElementById('dot2').className='progress-dot'+(n===2?' active': n>2 ? ' done' : '');
        setSideStep(1, n>1?'done':'active');
        setSideStep(2, n===2?'active': n>2 ? 'done' : 'pending');
        setSideStep(3, n===3?'active':'pending');  // ADD
        window.scrollTo(0,0);
    }

    function setSideStep(n,state){
    var el=document.getElementById('sideStep'+n);
    if(!el)return;
    el.className='step '+state;
    var num=el.querySelector('.step-num');
    if(state==='done'){num.textContent='✓'}else{num.textContent=n}
    }

    $('#signUp').on('click', async function(){
        const reset = App.lockBtn($(this));
        if (!reset) return;

        let hasError = false;
        $('.login-box').find('input, select').each(function(index, el) {
            const val = $(el).val();
            if (val == ''){
                hasError = true;
                return false;
            }
        });

        if (hasError) {
            App.showToast('All fields with * are required.', 'error');
            return;
        }

        const fname = $('#fname').val().trim();
        const lname = $('#lname').val().trim();
        const email = $('#email').val().trim();
        const password = $('#pwd').val().trim();
        const role = $('#role').val().trim();
        const otp = Math.floor(1000 + Math.random() * 9000);

        const prefCats = $('#prefCats').val().trim();  
        const prefGeo  = $('#prefGeo').val().trim();  
        const prefSize = $('#prefSize').val().trim();

        if (!App.isValidEmail(email)){
            reset();
            App.showToast('Please provide a valid email.', 'error');
            return;
        }

        if (password.length < 8){
            reset();
            App.showToast('The password needs to be at least 8 characters long.', 'error');
            return;
        }

        const data = {
            fname: fname,
            lname: lname,
            email: email,
            pwd: password,
            role: role,
            otp: otp,
            pref_categories: prefCats,
            pref_geo: prefGeo,
            pref_org_size: prefSize,
        };

        const response = await fetch('/api/supabase?action=userSignUp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user: data}),
        });

        const result = await response.json();
        if (result.error){
            reset();
            App.showToast(result.error, 'error');
            return;
        }

        if (result.data.token) {
            window._signupToken = result.data.token;
            window._userId = result.data.id;
            document.getElementById('otpEmailDisplay').textContent = result.data.email;
            document.getElementById('otpEmailChip').textContent    = result.data.email;

            // Re-send OTP email with existing OTP from DB
            await fetch(App.ZAPIER_SEND_EMAIL, {
                method: "POST",
                body: JSON.stringify({ 
                    to: result.data.email, 
                    subject: 'Your Verification Code', 
                    body: Constant.OTP_VERIFICATION_EMAIL.replace('{{OTP_CODE}}', result.data.otp) 
                })
            });

            App.showToast('A new verification code has been sent.', 'success');
            goStep(3);
            window._startOtpTimer && window._startOtpTimer();
            reset();
            if (window._resetStep2Btn){
                window._resetStep2Btn();
                window._resetStep2Btn = null;
            }

            return;
        }

        App.showToast('Registration Successful!', 'success');
        window._signupToken = result.data.token;
        window._userId = result.data.id;

        const res = await fetch(App.ZAPIER_SEND_EMAIL, {
            method: "POST",
            body: JSON.stringify({ to: result.data.email, subject: 'Your Verification Code', body: Constant.OTP_VERIFICATION_EMAIL.replace('{{OTP_CODE}}', result.data.otp) })
        });

        const filters = await res.json();
        //location.href = `otp.html?t=${result.data.token}`;
        //window._signupToken = result.data.token;

        // Show OTP panel
        document.getElementById('otpEmailDisplay').textContent = result.data.email;
        document.getElementById('otpEmailChip').textContent    = result.data.email;
        goStep(3);
        window._startOtpTimer && window._startOtpTimer();

        reset();
        if (window._resetStep2Btn){
            window._resetStep2Btn();
            window._resetStep2Btn = null;
        }
    });

    $('#resendBtn').on('click', async function(){
        const otp = Math.floor(1000 + Math.random() * 9000);

        const response = await fetch('/api/supabase?action=updateOtp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ otp: otp, id: window._userId}),
        });

        const result = await response.json();
        if (result.error){
            App.showToast(result.error, 'error');
            return;
        }

        const email = $('#otpEmailChip').text();
        const res = await fetch(App.ZAPIER_SEND_EMAIL, {
            method: "POST",
            body: JSON.stringify({ to: email, subject: 'Your Verification Code', body: Constant.OTP_VERIFICATION_EMAIL.replace('{{OTP_CODE}}', otp) })
        });

        const filters = await res.json();
        App.showToast('A new verification code has been sent.', 'success');
    });
});

async function loadVendorsForClaiming(){
    const response = await fetch(`/api/supabase?action=GetVendorsForClaiming`);
    const result = await response.json();
    if (result.error){
        App.showToast(result.error, 'error');
        return;
    }
    
    window._claimableVendors = result.vendors;
}