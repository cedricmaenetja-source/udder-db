import * as App from '../app.js';
import { PAGES } from '../utils/constants.js';
import { isLoggedIn, getCurrentUser } from './auth/session.js';

window._showSpinner = function showSpinner(id, message) {
    var el = document.getElementById(id);
    if (!el) return;
    var txt = el.querySelector('.cs-text');
    if (txt) txt.textContent = message || 'Loading…';
    el.classList.add('show');
}

window._hideSpinner = function hideSpinner(id) {
    var el = document.getElementById(id);
    if (el) el.classList.remove('show');
}

$(async function(){
    window._showSpinner('overviewSpinner', 'Loading...');

    var noProductEl = document.getElementById('noProductState');
    var heroEl      = document.querySelector('.pl-hero');
    var statsEl     = document.querySelector('.pl-stats-row');
    var bodyEl      = document.querySelector('.pl-body');

    if (heroEl)  heroEl.style.display  = 'none';
    if (statsEl) statsEl.style.display = 'none';
    if (bodyEl)  bodyEl.style.display  = 'none';

    var loggedIn = await isLoggedIn();
    if (!loggedIn) {location.href = PAGES.login; return;}

    const { user } = await getCurrentUser();
    if (user.role != 'vendor'){
        await fetch('/api/logout', {method: 'GET'});
        location.href = PAGES.login; 
        return;
    }

    if (user.vendor_id === null){
        if (noProductEl) noProductEl.classList.add('show');
        loadClaim(user.id);
    } else {
        if (heroEl)  heroEl.style.display  = '';
        if (statsEl) statsEl.style.display = '';
        if (bodyEl)  bodyEl.style.display  = '';
    }

    dismissLoader();
    window._hideSpinner('overviewSpinner');
});

/* ── Page loader dismiss ── */
function dismissLoader(){
  var loader = document.getElementById('pageLoader');
  if(loader) loader.classList.add('hidden');
}
if(document.readyState === 'complete'){
  setTimeout(dismissLoader, 300);
} else {
  window.addEventListener('load', function(){ setTimeout(dismissLoader, 300); });
}

async function loadClaim(userId){
    const response = await fetch(`/api/supabase?action=getUserClaim&userId=${userId}`);
    const result = await response.json();
    if (result.error){
        App.showToast(result.error, 'error');
        return;
    }

    if (result.claim.name){
        const days = daysAgo(result.claim.created_at);
        const verified = result.claim.verified;
        
        $('#claim-product-name').text(result.claim.name);
        $('#claim-submitted-days').text(`Submitted ${days}`);
        $('#claim-step-days').text(days);

        if (verified == 'Y'){
            $('#udder-review').removeClass('active').empty().append(`<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
            $('#udder-verified').removeClass('pending').addClass('done').empty().append(`<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
            $('.claim-step').addClass('done').removeClass('pending').removeClass('active');
        }
    }
    console.log(result);
}

function daysAgo(isoDate) {
    var diff = Date.now() - new Date(isoDate).getTime();
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return '1 day ago';
    return days + ' days ago';
}
