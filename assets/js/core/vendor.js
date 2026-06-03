import * as App from '../app.js';
import { PAGES } from '../utils/constants.js';
import { isLoggedIn, getCurrentUser } from './auth/session.js';

window._categories = [];

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

    /* ── ADD REFERENCE MODAL ── */
    var addRefOverlay  = document.getElementById('addRefOverlay');
    var addRefBtn      = document.getElementById('addRefBtn');
    var addRefCloseBtn = document.getElementById('addRefCloseBtn');
    var addRefCancelBtn= document.getElementById('addRefCancelBtn');
    var addRefSaveBtn  = document.getElementById('addRefSaveBtn');
    var addRefError    = document.getElementById('addRefError');

    function openAddRefModal() {
        document.getElementById('refCustomer').value  = '';
        document.getElementById('refIndustry').value  = '';
        document.getElementById('refStatus').value    = 'pending';
        document.getElementById('refValidated').checked = false;
        addRefError.style.display = 'none';
        addRefOverlay.style.display = 'flex';
    }

    function closeAddRefModal() {
        addRefOverlay.style.display = 'none';
    }

    addRefBtn.addEventListener('click', openAddRefModal);
    addRefCloseBtn.addEventListener('click', closeAddRefModal);
    addRefCancelBtn.addEventListener('click', closeAddRefModal);

    // Close on backdrop click
    addRefOverlay.addEventListener('click', function(e) {
        if (e.target === addRefOverlay) closeAddRefModal();
    });

    // Clicking the validated row toggles the checkbox
    document.getElementById('refValidatedRow').addEventListener('click', function(e) {
        if (e.target.id !== 'refValidated') {
            var cb = document.getElementById('refValidated');
            cb.checked = !cb.checked;
        }
    });

    addRefSaveBtn.addEventListener('click', async function() {
        var customer  = document.getElementById('refCustomer').value.trim();
        var industry  = document.getElementById('refIndustry').value.trim();
        var status    = document.getElementById('refStatus').value;
        var validated = document.getElementById('refValidated').checked;

        // Validate
        if (!customer) {
            addRefError.textContent = 'Customer name is required.';
            addRefError.style.display = 'block';
            return;
        }
        if (!industry) {
            addRefError.textContent = 'Industry is required.';
            addRefError.style.display = 'block';
            return;
        }

        addRefError.style.display = 'none';
        addRefSaveBtn.textContent = 'Saving…';
        addRefSaveBtn.disabled = true;

        const response = await fetch('/api/supabase?action=addReference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vendorId:  user.vendor_id,
                customer:  customer,
                industry:  industry,
                status:    status,
                validated: validated
            })
        });

        const result = await response.json();
        if (result.error) {
            App.showToast(result.error, 'error');
            return;
        }

        closeAddRefModal();

        var tbody = document.getElementById('referencesTableBody');
        var isPublished = status === 'published' || status === 'Published';
        var statusBadge = isPublished
        ? '<span class="pl-ref-status published">Published</span>'
        : '<span class="pl-ref-status pending">Pending Udder review</span>';

        var validatedIcon = validated
        ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="var(--t4)" stroke-width="1.3"/><path d="M8 5v3.5l2 1.5" stroke="var(--t4)" stroke-width="1.3" stroke-linecap="round"/></svg>';

        tbody.innerHTML = '<div class="pl-ref-row">' +
            '<span class="pl-ref-name">' + customer + '</span>' +
            '<span class="pl-ref-cell">' + industry + '</span>' +
            '<span class="pl-ref-cell">' + statusBadge + '</span>' +
            '<span class="pl-ref-cell">' + validatedIcon + '</span>' +
        '</div>';
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

    $('#totalFeatures').text(features.length);
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
    console.log(vendor);
    $('#pl-name').text(vendor.name);
    $("#plDescView").text(vendor.short_description);
    $("#plFoundedView").text(vendor.founding_year);
    $("#plTaglineView").val(vendor.description);

    await getViews(vendor.id);
    await getLeads(vendor.id);
    await getComparisons(vendor.id);
    await loadReferences(vendor.id);

    const modules = vendor.data.company.modules ?? [];
    renderFeaturesGrid(modules, 'featuresGrid');

    window._vendorId = vendor.id;
    if (vendor.categories) {
        vendor.categories = vendor.categories.replace('•', ',');

        const cats = vendor.categories.split(',').map(c => c.trim()).filter(Boolean);
        const $row = $('.pl-cats-row');
        $row.find('.pl-cat-tag').remove();
        cats.forEach(function(cat) {
            $row.prepend(makeCatTag(cat));
        });
    }

    bindCategoryControls();
}

function makeCatTag(label) {
    window._categories.push(label.trim());
    const $tag = $('<span class="pl-cat-tag"></span>').text(label);
    const $x   = $('<button class="pl-cat-x" aria-label="Remove category">×</button>');
    $x.on('click', function() { window._categories = window._categories.filter(val => val !== label.trim()); $tag.remove(); updateCategories()});
    $tag.append(' ').append($x);
    return $tag;
}

async function updateCategories(){
    await fetch('/api/supabase?action=updateVendorCategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId: window._vendorId, categories: window._categories.join(',') }),
    });
}

function bindCategoryControls() {
    const $row    = $('.pl-cats-row');
    const $addBtn = $row.find('.pl-add-cat');

    // Prevent duplicate bindings
    $addBtn.off('click.addcat').on('click.addcat', function() {
        // Don't open a second input if one is already open
        if ($row.find('.pl-cat-input-wrap').length) return;

        const $wrap = $('<span class="pl-cat-input-wrap" style="display:inline-flex;align-items:center;gap:4px;"></span>');
        const $input = $('<input type="text" class="pl-input" placeholder="Category name" style="height:28px;padding:0 10px;font-size:12px;width:160px;border-radius:20px;">');
        const $confirm = $('<button class="pl-save-btn" style="height:28px;padding:0 12px;font-size:12px;border-radius:20px;">Add</button>');
        const $cancel  = $('<button class="pl-cancel-btn" style="height:28px;padding:0 10px;font-size:12px;border-radius:20px;">✕</button>');

        $wrap.append($input).append($confirm).append($cancel);
        $addBtn.before($wrap);
        $input.trigger('focus');

        function commit() {
            const val = $input.val().trim();
            if (val) {
                $addBtn.before(makeCatTag(val));
                updateCategories();
            }
            $wrap.remove();
        }

        function cancel() { $wrap.remove(); }

        $confirm.on('click', commit);
        $cancel.on('click', cancel);
        $input.on('keydown', function(e) {
            if (e.key === 'Enter')  { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { cancel(); }
        });
    });
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

async function loadReferences(vendorId) {
    var tbody = document.getElementById('referencesTableBody');
    if (!tbody) return;

    const response = await fetch(`/api/supabase?action=getReferencesByVendorId&vendorId=${vendorId}`);
    const result = await response.json();
    const refs = result.data ?? result ?? [];

    if (!refs.length) {
        tbody.innerHTML = '<div style="padding:16px 20px;font-size:13px;color:var(--t3)">No references yet.</div>';
        return;
    }

    tbody.innerHTML = refs.map(function(r) {
        var isPublished = r.status === 'published' || r.status === 'Published';
        var statusBadge = isPublished
        ? '<span class="pl-ref-status published">Published</span>'
        : '<span class="pl-ref-status pending">Pending Udder review</span>';

        var validatedIcon = r.validated
        ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="var(--t4)" stroke-width="1.3"/><path d="M8 5v3.5l2 1.5" stroke="var(--t4)" stroke-width="1.3" stroke-linecap="round"/></svg>';

        return '<div class="pl-ref-row">' +
        '<span class="pl-ref-name">' + (r.customer ?? '—') + '</span>' +
        '<span class="pl-ref-cell">' + (r.industry ?? '—') + '</span>' +
        '<span class="pl-ref-cell">' + statusBadge + '</span>' +
        '<span class="pl-ref-cell">' + validatedIcon + '</span>' +
        '</div>';
    }).join('');
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
