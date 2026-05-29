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

    await loadUser(user.id);

    if (user.vendor_id === null){
        if (noProductEl) noProductEl.classList.add('show');
        await loadClaim(user.id);
    } else {
        await loadVendor(user.vendor_id);
        if (heroEl)  heroEl.style.display  = '';
        if (statsEl) statsEl.style.display = '';
        if (bodyEl)  bodyEl.style.display  = '';
    }

    dismissLoader();
    window._hideSpinner('overviewSpinner');

    document.getElementById('sbLogoutBtn').addEventListener('click', async function(){
        const reset = App.lockBtn($(this));
        if (!reset) return;

        App.showToast('Logging out...', 'neutral');
        const response = await fetch('/api/logout', {
            method: 'GET',
        });

        const result = await response.json();
        reset();
        if (result.error){App.showToast(result.error, 'error');return;}
        window.location.href = PAGES.login;
        return;
    });
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

async function loadVendor(vendorId){
    const response = await fetch(`/api/supabase?action=getVendorById&vendorId=${vendorId}`);
    const result = await response.json();

    if (result.error) {
        App.showToast(result.error, 'error');
        return;
    }
   
    await renderVendor(result.data);
}

function renderFeaturesGrid(modules, containerId) {
    var checkSvg = '<svg class="pl-check" viewBox="0 0 16 16" fill="none">' +
        '<path d="M3 8l3 3 7-7" stroke="#16a34a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>';

    // Flatten all features from every module > subCategory > feature[]
    var features = [];
    $.each(modules, function(moduleName, subCategories) {
        $.each(subCategories, function(subCatName, featureList) {
            if ($.isArray(featureList)) {
                $.each(featureList, function(i, feature) {
                    if (feature.name) features.push(feature.name);
                });
            }
        });
    });

    if (!features.length) {
        $('#' + containerId).html('<p style="color:var(--t3);font-size:13px">No features listed.</p>');
        return;
    }

    // Pair features into rows of 2
    var rows = '';
    for (var i = 0; i < features.length; i += 2) {
        var left  = '<div class="pl-feat">' + checkSvg + features[i] + '</div>';
        var right = features[i + 1]
            ? '<div class="pl-feat">' + checkSvg + features[i + 1] + '</div>'
            : '<div class="pl-feat"></div>'; 
        rows += '<div class="pl-feature-row">' + left + right + '</div>';
    }

    $('#' + containerId).html(rows);
}

async function getViews(vendorId){
    const response = await fetch(`/api/supabase?action=getVendorViews&vendorId=${vendorId}`);
    const result = await response.json();

    if (result.error) {
        App.showToast(result.error, 'error');
        return;
    }

    $('#totViews').text(result.data.length);
}

async function getComparisons(vendorId){
    const response = await fetch(`/api/supabase?action=getComparisons&vendorId=${vendorId}`);
    const result = await response.json();

    if (result.error) {
        App.showToast(result.error, 'error');
        return;
    }

    $('#totComparisons').text(result.data.length);
}

async function getLeads(vendorId){
    const response = await fetch(`/api/supabase?action=getVendorLeads&vendorId=${vendorId}`);
    const result = await response.json();

    if (result.error) {
        App.showToast(result.error, 'error');
        return;
    }

    $('#totLeads').text(result.data.length);
}

async function renderVendor(vendor){
    $('#pl-name').text(vendor.name);
    $("#plDescView").text(vendor.short_description);
    $("#plFoundedView").text(vendor.founding_year);

    await getViews(vendor.id);
    await getLeads(vendor.id);
    await getComparisons(vendor.id);
    
    const modules = vendor.data.company.modules ?? [];
    renderFeaturesGrid(modules, 'featuresGrid');
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

async function loadUser(userId){
    const response = await fetch(`/api/supabase?action=getUserById&userId=${userId}`);
    const result = await response.json();

    if (result.error) {
        App.showToast(result.error, 'error');
        return;
    }

    window._user = result.data;
    const fullName = `${window._user.first_name} ${window._user.last_name}`;
    $('#sbUname').text(fullName);
    $('#sbInitials').text(App.initials(fullName));
}
