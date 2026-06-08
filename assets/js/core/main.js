import * as App from '../app.js';
import { PAGES } from  '../utils/constants.js';
import { isLoggedIn, getCurrentUser } from '../core/auth/session.js';
import { requireLogin } from '../core/auth/loginRequired.js';

let vendorData = {};
let vendorList = [];
let employeeCountSupported = [];
let user;

var ORG_SIZES = [
  { value: '1-50',         label: '1–50' },
  { value: '50-500',       label: '50–500' },
  { value: '500-5,000',    label: '500–5,000' },
  { value: '5,000-25,000', label: '5,000–25,000' },
  { value: '25,000+',      label: '25,000+' }
];

var REGIONS = ['UK', 'EU', 'US', 'APAC', 'LATAM', 'MEA'];

// muti-select and searchable features
let availableFeaturesGrouped = {};
let availableFeaturesList = [];
let availableFeaturesGroupedByValue = [];
let regionServed = [];
var selectedFeature = [];
var $featureDropdown = $(".dropdown");
var $featureSearchInput = $(".search-input");
var $featureSelectedItems = $(".selected-items");

// muti-select and searchable integrations
// let availableIntegrationList = [];
// var selectedIntegrations = [];
// var $integrationsDropdown = $(".dropdown-integrations");
// var $integrationsSearchInput = $(".search-input-integrations");
// var $integrationsSelectedItems = $(".selected-items-integrations");

let searchFilters = App.searchQueries;
let sessionId;
let loggedIn;

$(async function () {
    loggedIn = await isLoggedIn();
    if (!loggedIn) {
        $('#sbSignIn').removeClass('hide');
        $('#sb-user-profile').addClass('hide');
        $('.link-secured').addClass('hide');
        $('#vdShortlistBtn').addClass('hide');
        $('#sbSignInNote').removeClass('hide');
        $('#sbUser').addClass('hide');

        sessionId = getSessionId();
        if (!sessionId) {
            sessionId = crypto.randomUUID();

            document.cookie = `guest_session=${sessionId}; path=/; max-age=2592000; SameSite=Lax`;
        }
    }else{
        await loadUserProfile();
        $('#sbSignIn').addClass('hide');
        
        $('#vdShortlistBtn').removeClass('hide');
        $('#sbSignInNote').addClass('hide');
        $('#sbUser').removeClass('hide');
    }

    $.getJSON("https://api.ipify.org?format=json", function(data) {
        window._ipAddress = data.ip;
    });

    var inp = document.getElementById('vendorSearch');
  if(!inp) return;

  function applySearch(){
    var q = (inp.value || '').toLowerCase().trim();
    var cards = document.querySelectorAll('#vendors .card');
    var visible = 0;

    cards.forEach(function(card){
      var name        = (card.dataset.name         || '').toLowerCase();
      var modules     = (card.dataset.modules      || '').toLowerCase();
      var subcats     = (card.dataset.subcategories|| '').toLowerCase();
      var features    = (card.dataset.features     || '').toLowerCase();
      var description = (card.dataset.description  || '').toLowerCase();

      var match = !q
        || name.includes(q)
        || modules.includes(q)
        || subcats.includes(q)
        || features.includes(q)
        || description.includes(q);

      card.style.display = match ? '' : 'none';
      if(match) visible++;
    });

    if(q){
      var totalEl = document.getElementById('totalVendors');
      if(totalEl) totalEl.textContent = visible;
    }
  }

  // Re-apply search whenever cards are added/removed from the grid
  var vendorsEl = document.getElementById('vendors');
  if(vendorsEl){
    new MutationObserver(function(){
      if(inp.value.trim()) applySearch();
    }).observe(vendorsEl, { childList: true, subtree: true });
  }

  inp.addEventListener('input', applySearch);

    populateTopVendors();
});

$(document).ready(function() {
    let compareMode = false;
    let selectedCards = new Set();

    const searchInput = document.getElementById('search');
    const modal = document.getElementById('searchModal');
    const modalSearch = document.getElementById('modalSearch');
    const results = document.getElementById('results');
    const body = document.body;

    // Open modal on search click
    searchInput.addEventListener('focus', () => {
        modal.classList.add('active');
        body.classList.add('modal-active');
        modalSearch.focus();
        $('#modalSearch').val('');
    });

    // Close modal on click outside modal box
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
        modal.classList.remove('active');
        body.classList.remove('modal-active');
        }
    });

    // Autocomplete filtering
    modalSearch.addEventListener('input', () => {
        const query = modalSearch.value.toLowerCase();
        results.innerHTML = '';
        
        if (query.length === 0) return;
        
        const filtered = searchFilters.filter(item => item && item.toLowerCase().includes(query));

        filtered.forEach(item => {
            const div = document.createElement('div');
            div.classList.add('autocomplete-item');

            // Highlight matched text
            const regex = new RegExp(`(${query})`, 'gi');
            div.innerHTML = item.replace(regex, '<span class="highlight">$1</span>');

            div.addEventListener('click', () => {
                modalSearch.value = item;
                results.innerHTML = '';
                runSearch();
            });

            results.appendChild(div);
        });
    });

    // Close modal with ESC key
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            modal.classList.remove('active');
            body.classList.remove('modal-active');
        }
    });

    $("#askAiBtn").on("click", function(event) {
        runSearch();
    });

    let query = App.getCookie('query');
    if (query !== null && (query !== undefined || typeof value !== 'undefined') && query != ''){
        const value = decodeURIComponent(query);
        $("#search").val(value);
        App.setCookie('query', null);
        document.getElementById("search").focus();
        $('#modalSearch').val(value);
        $("#askAiBtn").trigger('click');
        //runSearch();
    }else{
        loadVendors().then(() => {
            // setupPagination();
            regionServed.forEach(region => {
                $('#regionFilter').append(`<option>${region}</option>`);
            });
        });
    }

    setData();

    //loadVendors();
    addCategories();
    getHistoricalSearchFilters();
    // renderRegionFilter();

    const $textarea = $('#search');
    const maxHeight = 200;

    function autoResize() {
        this.style.height = 'auto';
        this.style.height = Math.min(this.scrollHeight, maxHeight) + 'px';
    }

    $textarea.on('input', autoResize);
    $textarea.trigger('input');

    $('.auto-grow').on('input', function() {
        this.style.height = 'auto';            
        this.style.height = this.scrollHeight + 'px'; 
    });

    var clearRegionBtn = document.getElementById('clearRegion');
    if (clearRegionBtn) {
    clearRegionBtn.addEventListener('click', function() {
        document.querySelectorAll('.region-cb').forEach(function(cb){ cb.checked = false; });
        applyCheckboxFilters();
    });
    }

    var clearOrgSizeBtn = document.getElementById('clearOrgSize');
    if (clearOrgSizeBtn) {
    clearOrgSizeBtn.addEventListener('click', function() {
        document.querySelectorAll('.orgsize-cb').forEach(function(cb){ cb.checked = false; });
        applyCheckboxFilters();
    });
    }

    // sort by filter
    $('.sort-option').on('click', function(){
        const sortValue = $(this).data('value');
        const $container = $('#vendors');
        const $vendors = $container.children('#vendors .card').toArray();
        
        if (sortValue == '') {
            resetFilter();
            return;
        }

        $vendors.sort(function(a, b) {
            switch (sortValue) {
                case 'nameAsc':
                    return $(a).data('name').localeCompare($(b).data('name'));
                case 'nameDesc':
                    return $(b).data('name').localeCompare($(a).data('name'));
                case 'scoreAsc':
                    return parseFloat($(a).data('score')) - parseFloat($(b).data('score'));
                case 'scoreDesc':
                    return parseFloat($(b).data('score')) - parseFloat($(a).data('score'));
                default:
                    return 0;
            }
        });

        $container.append($vendors);
    });

    // Select / deselect cards
    $('.cards-container').on('click', '.card', function() {
        if(!compareMode) return;

        const cardId = $(this).data('id');
        if(selectedCards.has(cardId)) {
            selectedCards.delete(cardId);
            $(this).removeClass('selected');
        } else {
            if (selectedCards.size == 3) return;
            
            selectedCards.add(cardId);
            $(this).addClass('selected');
        }

        $('#compareActionBtn').prop('disabled', selectedCards.size === 0);
        if (selectedCards.size > 0) $('#compareActionBtn').text(`Compare (${selectedCards.size})`);
    });

    // Compare action
    // $('#compareActionBtn').click(function() {
    //     //alert('Comparing cards: ' + Array.from(selectedCards).join(', '));
    //     if (selectedCards.size == 1){
    //         App.swal.fire({
    //             title: "Error",
    //             text: "Choose another vendor to add to the comparison.",
    //         });
    //         return;
    //     }
    //     openComparisonModal(selectedCards);
    // });

    $(document).on('click', 'a[href]', function (e) {
        const url = $(this).attr('href');

        if (!url || url.startsWith('#')) return;

        e.preventDefault();

        $('.page').addClass('fade-out');
        console.log('loaded');
        setTimeout(function () {
            window.location.href = url;
        }, 300);
    });

    // ── Multi-select category + sub-category filtering ──

// Helper: get all checked parent module values
function getCheckedModules(){
    return $('.ct-lbl > input[type="checkbox"]:checked').map(function(){
        return $(this).val();
    }).get();
}

// Helper: get all checked sub-category values
function getCheckedSubs(){
    return $('.ct-sub input[type="checkbox"]:checked').map(function(){
        return $(this).val();
    }).get();
}

// Core filter — runs whenever any category checkbox changes
function applyModuleFilter(){
    const checkedModules = getCheckedModules();
    const checkedSubs    = getCheckedSubs();

    const noModules = checkedModules.length === 0;
    const noSubs    = checkedSubs.length === 0;

    $(".card").each(function(){
        const cardModules = String($(this).data("modules") || '');
        const cardSubs    = String($(this).data("subcategories") || '');

        // Nothing checked — show all
        if(noModules && noSubs){
            $(this).show();
            return;
        }

        // Sub-categories take precedence if any are checked
        if(!noSubs){
            const subMatch = checkedSubs.some(function(s){ return cardSubs.includes(s); });
            $(this).toggle(subMatch);
            return;
        }

        // Otherwise filter by parent modules
        const modMatch = checkedModules.some(function(m){ return cardModules.includes(m); });
        $(this).toggle(modMatch);
    });

    // Update features panel
    if(!noSubs){
        const subModules = $('.ct-sub input[type="checkbox"]:checked')
            .map(function(){ return $(this).data('module'); }).get();
        loadFeaturesByValue('subModule', subModules[0], checkedSubs);
    } else if(!noModules){
        loadFeaturesByValue('module', checkedModules[0]);
    }

    updateVendorTotalFiltered();
    applyCheckboxFilters();
}

// Parent module checkbox changed
$(document).on('change', '.ct-lbl > input[type="checkbox"]', function(){
    const module = $(this).val();
    const isChecked = $(this).is(':checked');

    // If unchecking a parent, also uncheck its children
    if(!isChecked){
        $('.ct-sub input[type="checkbox"][data-module="' + module + '"]')
            .prop('checked', false);
    }

    applyModuleFilter();
});

// ── Results panel search — filter cards by name, category, features ──
$(document).on('input', '.rp-search input', function(){
    var q = $(this).val().toLowerCase().trim();

    if(!q){
        $('.card').show();
        updateVendorTotalFiltered();
        return;
    }

    $('.card').each(function(){
        var name         = String($(this).data('name')         || '').toLowerCase();
        var modules      = String($(this).data('modules')      || '').toLowerCase();
        var features     = String($(this).data('features')     || '').toLowerCase();
        var subcategories = String($(this).data('subcategories')|| '').toLowerCase();
        var integrations = String($(this).data('integrations') || '').toLowerCase();

        var match = name.includes(q)
                 || modules.includes(q)
                 || features.includes(q)
                 || subcategories.includes(q)
                 || integrations.includes(q);

        $(this).toggle(match);
    });

    updateVendorTotalFiltered();
    applyCheckboxFilters();
});

// Sub-category checkbox changed
$(document).on('change', '.ct-sub input[type="checkbox"]', function(){
    const module = $(this).data('module');

    // Auto-check the parent if a child is checked
    if($(this).is(':checked')){
        $('.ct-lbl > input[type="checkbox"][value="' + module + '"]')
            .prop('checked', true);
    }

    // If all children of a parent are unchecked, uncheck the parent too
    const allSiblings = $('.ct-sub input[type="checkbox"][data-module="' + module + '"]');
    const anyChecked  = allSiblings.filter(':checked').length > 0;
    if(!anyChecked){
        $('.ct-lbl > input[type="checkbox"][value="' + module + '"]')
            .prop('checked', false);
    }

    applyModuleFilter();
});

    // $(document).on('change', '#moduleList input[type="checkbox"]', function(){
    //     let count = 0;
        
    //     const selected = $('#moduleList input[type="checkbox"]:checked')
    //         .map(function(){
    //             return $(this).val();
    //         }).get();

    //     $(".card").each(function () {
    //         var modules = $(this).data("modules");

    //         if (selected.length === 0) {
    //             $(this).show();
    //             count++;
    //             return;
    //         }

    //         const matches = selected.some(val => modules.includes(val));

    //         if (matches) {
    //             $(this).show();
    //             count++;
    //         } else {
    //             $(this).hide();
    //         }
    //     });

    //     updateVendorTotalFiltered();
    // });

    // $(document).on("change", '#companySizeFilter', function () {
    //     var value = lowerCase($(this).val());
        
    //     if (value == '') {
    //         resetFilter();
    //         return;
    //     }
        
    //     $(".card").each(function () {
    //         var companySize = $(this).data("companysize");

    //         if (value.includes(companySize)) {
    //             $(this).show();
    //         } else {
    //             $(this).hide();
    //         }
    //     });

    //     updateVendorTotalFiltered();
    //     // setupPagination();
    // });

    // filter by region
    // $(document).on("change", '#regionFilter', function () {
    //     let count = 0;
    //     var value = $(this).val();
        
    //     if (value == '') {
    //         resetFilter();
    //         return;
    //     }
        
    //     $(".card").each(function () {
    //         var region = $(this).data("region");

    //         if (value.includes(region)) {
    //             $(this).show();
    //             count++;
    //         } else {
    //             $(this).hide();
    //         }
    //     });

    //     updateVendorTotalFiltered();
    //     // setupPagination();
    // });

    $("#modalSearch").on("keypress", function(event) {
        if (event.which === 13) { 
            event.preventDefault();
            
            runSearch();
        }
    });

    $(document).on('click', '.search-icon', function () {
        const $search = $(this).closest('.nav-search');
        $search.toggleClass('active');

        if ($search.hasClass('active')) {
            $search.find('input').focus();
        }
        });

        /* Collapse when clicking outside */
        $(document).on('click', function (e) {
        if (!$(e.target).closest('.nav-search').length) {
            $('.nav-search').removeClass('active');
        }
    });

    // $(document).on('click', '.view-platform', function (e) {
    //     e.preventDefault();

    //     if (compareMode){
    //         App.swal.fire({
    //             title: "Error",
    //             text: "You are currently in Compare Mode. To continue click 'Cancel Compare'",
    //         });
    //         return;
    //     }

    //     const vendorId = $(this).data('id');
    //     const matchScore = $(this).data('matchscore');
    //     const score = $(this).data('score');
    //     const matchedItems = $(this).data('matcheditems');
    //     const totalFilters = $(this).data('filterscount');

    //     App.setCookie('vendor_id', vendorId);
    //     console.info('matchScore',score);
    //     if (matchScore !== undefined) App.setCookie('match_score', parseInt(matchScore));
    //     if (matchedItems !== undefined) App.setCookie('matched_items', matchedItems);
    //     if (score !== undefined) App.setCookie('score', score);
    //     if (totalFilters !== undefined) App.setCookie('filters_count', totalFilters);

    //     const origin = window.location.origin;
    //     window.open(`${origin}/db/platform.html`, '_blank');
    // });
});

function getSessionId() {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; guest_session=`);
   
    if (parts.length === 2) {
        return parts.pop().split(';').shift();
    }

    return null;
}

async function loadUserProfile(){
    const { user } = await getCurrentUser();
    const userId = user.id;
    if (userId === null){
        // logout
        return;
    }

    const response = await fetch(`/api/supabase?action=getUserById&userId=${userId}`);
    const result = await response.json();

    if (result.error) {
        console.error(result.error);
        App.showToast(App.OPERATION_FAILED, 'error');
        return;
    }

    window._user = result.data;
    if (window._user.role != 'hr-professional'){
        location.href = `../${window._user.role}/`;
        return;
    }
    
    const fullName = `${window._user.first_name} ${window._user.last_name}`;
    $('#sb-uname').text(fullName);
    $('#sb-initials').text(App.initials(fullName));
    $('.link-secured').removeClass('hide');
    //$('#sbUser').removeClass('hide');

    await fetch("/api/supabase?action=logEvent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: window._user.id, route: 'home' })
    });
}

async function populateTopVendors() {
    try {
        const response = await fetch('/api/supabase?action=getTopVendors');
        const result = await response.json();

        if (!result.data) return;

        const container = document.getElementById('vdAlsoEvaluating');
        container.innerHTML = '';
        
        result.data.forEach((vendor) => {
            const status = vendor.status || 'AI Generated';
            const statusClass = (status == 'AI Generated') ? 'ai-generated' : status.toLowerCase();

            const item = `
                <a href="#" onclick="window.open('${vendor.data.company.website || '#'}', '_blank'); return false;" style="text-decoration:none">
                <div class="vd-also-item">
                    <div class="vd-also-logo">
                        ${App.initials(vendor.name)}
                    </div>

                    <div>
                        <div class="vd-also-name">
                            ${vendor.name}
                        </div>

                        <div class="vd-also-sub">
                            ${vendor.data.company.website || ''}
                        </div>
                    </div>

                    <div class="vd-also-badge ${statusClass}">
                        <span class="vd-also-badge-dot"></span>
                        ${status}
                    </div>
                </div></a>
            `;

            container.innerHTML += item;
        });

    } catch (err) {
        console.error('Failed to load vendors:', err);
    }
}

async function getHistoricalSearchFilters(){
    const response = await fetch('/api/supabase?action=getFilter');
    const result = await response.json();

    if (result.error) {
        // silent error
        console.error(result.error);
        return;
    }
    if (result.data === null) return;
    result.data.forEach(filter => {
        searchFilters.push(filter.query);
    });
}

function addCategories(){
  App.modules.forEach(function(module, index) {

    $('#moduleList').append(
      '<input id="module-' + index + '" value="' + module + '" class="substituted" type="checkbox" aria-hidden="true" />' +
      '<label for="module-' + index + '">' + module + '</label>'
    );

    var subHtml = '';
    $.each(App.subCategories[module], function(i, subName) {
      subHtml +=
        '<li><div class="ct-row">' +
          '<button class="ct-exp noc" type="button">›</button>' +
          '<label class="ct-lbl">' +
            '<input type="checkbox" name="module" data-module="' + module + '" value="' + subName + '">' +
            '<span class="ct-name">' + subName + '</span>' +
            '<span class="ct-n">0</span>' +
          '</label>' +
        '</div></li>';
    });

    var hasChildren = subHtml.length > 0;

    $('#catTree').append(
      '<li>' +
        '<div class="ct-row">' +
          '<button class="' + (hasChildren ? 'ct-exp' : 'ct-exp noc') + '" type="button"' +
            (hasChildren ? ' onclick="toggleCat(this)"' : '') + '>›</button>' +
          '<label class="ct-lbl">' +
            '<input type="checkbox" name="module" value="' + module + '">' +
            '<span class="ct-name">' + module + '</span>' +
            '<span class="ct-n">0</span>' +
          '</label>' +
        '</div>' +
        (hasChildren ? '<ul class="ct-sub">' + subHtml + '</ul>' : '') +
      '</li>'
    );
  });
}

function resetFilter(){
    $(".card").show();
    updateVendorTotal();
}

async function checkGuestAILimit(){
    const reslimit = await fetch("/api/supabase?action=checkGuestLimit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId })
    });

    const res = await reslimit.json();
    return res;
}

async function runSearch(){
    const modal = document.getElementById('searchModal');
    const body = document.body;

    let allow = true;

    const value = $('#modalSearch').val();
    if (value == '') return;
    if (value == 'undefined'){
        $('#modalSearch').val('');
        $('#search').val('');
        return;
    } 

    $('#modalSearch').prop('disabled', true);
    
    $('.layout').hide();
    $('.spinner-container').removeClass('hide');
    $('#askAiBtn').addClass('hide');
  
    //$('#search').val(value);
    results.innerHTML = '';

    if (!loggedIn){
        const r = await checkGuestAILimit();
        if (r.error){
            App.showToast(App.OPERATION_FAILED, 'error');
            $('.layout').show();
            $('#xloader').empty();
            $('.spinner-container').addClass('hide');
            $('#modalSearch').prop('disabled', false);
            $('#askAiBtn').removeClass('hide');
            return;
        }

        allow = r.allow;
    }

    if (!allow){
        requireLogin({
            title: 'Guest AI limit reached',
            desc:  'Create an account or login for unlimited access.'
        });

        modal.classList.remove('active', 'open');
        body.classList.remove('modal-active');
        return;
    }
  
    const filters = await runWithClaude(value);
    if (filters.error){
        console.error('Claude Error:', filters.error);
        App.showToast(App.REQUEST_NOT_PROCESSED, 'error');
        $('.layout').show();
        $('#xloader').empty();
        $('.spinner-container').addClass('hide');
        $('#modalSearch').prop('disabled', false);
        $('#askAiBtn').removeClass('hide');
        return;
    }

    console.log('Claude Response:', filters);
    // apply filters
    filters.required_modules.forEach(module => {
        $(`input[name="module"][value="${module}"]`).prop('checked', true);

        filters.required_features.forEach(feature => {
            $(`input[name="module"][data-module="${module}"][value="${feature}"]`).prop('checked', true);
        });
    });

    saveQuery(filters, value);
    filters['query'] = value;
    
    await loadVendors(filters, value);
    
    $('.layout').show();
    $('#xloader').empty();
    $('.spinner-container').addClass('hide');
    $('#modalSearch').prop('disabled', false);
    $('#askAiBtn').removeClass('hide');
    App.setCookie('query', '');

    modal.classList.remove('active', 'open');
    body.classList.remove('modal-active');
    $('#modalSearch').val('');
    $('#search').val('');
}

async function runWithClaude(value){
    const res = await fetch("/api/claude-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: value })
    });

    const filters = await res.json();
    return filters;
}

async function runWithOpenAi(value){
    const res = await fetch("/api/open-ai-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: value })
    });

    const filters = await res.json();
    return filters;
}

async function runWithGroqAi(value){
    const res = await fetch("/api/groq-filters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: value, target_market: employeeCountSupported })
    });

    const filters = await res.json();
    return filters;
}

async function openComparisonModal(selectedCards) {
  document.getElementById("compareModal").style.display = "flex";

  $('.xloader-comparison').append(App.xloader());
    $('.vendor-header-grid').empty();
  
  for (const id of selectedCards) {
    const vendor = vendorData[id];

    if (vendor.logo === null) vendor.logo = '../assets/images/no-logo.png';

    $('.vendor-header-grid').append(`<div class="vendor-header">
        <div class="vendor-info-wrapper">
          <img src="${vendor.logo}" alt="${vendor.name} Logo" class="vendor-logo">

          <div class="vendor-info">
            <div class="vendor-name">${vendor.name}</div>
            <div class="stars">★★★★★</div>
          </div>
        </div>

        <button class="price-btn">PRICE & DEMO</button>
      </div>`);

        // vendorData[id]['grouped_features'] = data.grouped_features;
  }

  $('.comparison-modal-content .compare-grid').remove(); 
  $('.comparison-modal-content .section-title').remove();
  Object.entries(App.subCategories).forEach(([moduleName, subModules]) => {
    const $title = $(`<div class="section-title" data-title="${moduleName}">
        ${moduleName}
    </div>`);
    $('.comparison-modal-content').append($title);

    const $compareGrid = $(`<div>`, {
        class: 'compare-grid',
        'data-title': `${moduleName}-grid`
    });

    $title.after($compareGrid);

    for (const id of selectedCards) {
        const vendor = vendorData[id];

        const modules = App.getModules(vendor.data.company.modules);

        const $card = $(`<div class="card"></div>`);
        $compareGrid.append($card);

        subModules.forEach(subModuleName => {
            const active = modules.subCategories.includes(subModuleName) ? 'active' : '';
            const $feat = $(`
                <div class="feature">
                    <span>${subModuleName}</span>
                    <span class="check ${active}"></span>
                </div>
            `);

            $card.append($feat);
        });
    }
});
//   for (const module of App.modules) {
//     $('.comparison-modal-content').append(`<div class="section-title">${module}</div>`);
    
//     for (const id of selectedCards) {
//         const vendor = vendorData[id];
        
//         const $compareGrid = $('<div>', { class: 'compare-grid', id: `compare-grid-${count}`});
//         $('.comparison-modal-content').append($compareGrid);
//         const $card = $('<div>', {class: `card feature-${count}`});
//         $(`#compare-grid-${count}`).append($card);
        
//         if (vendor.grouped_features[`${module}`].length == 0){
//             const feat = $(`
//                 <div class="feature">
//                     <span>N/A</span>
//                     <span></span>
//                 </div>
//             `);
//             $(`.feature-${count}`).append(feat);
//         }else{
//             vendor.grouped_features[`${module}`].forEach(feature => {
//                 const feat = $(`
//                     <div class="feature">
//                         <span>${feature}</span>
//                         <span class="check active"></span>
//                     </div>
//                 `);
//                 $(`.feature-${count}`).append(feat);
//             });
//         }
//     }

//     count++;
//   }

  $('.xloader-comparison').hide();
  $('.vendor-body-grid').removeClass('hide');
}

function renderOrgSizeFilter() {
  var list = document.getElementById('orgSizeList');
  if (!list) return;
  list.innerHTML = '';

  var counts = {};
  document.querySelectorAll('#vendors .card').forEach(function(card) {
    var size = (card.dataset.companysize || '').trim();
    if (size) counts[size] = (counts[size] || 0) + 1;
  });

  ORG_SIZES.forEach(function(size) {
    var li = document.createElement('li');
    li.innerHTML =
      '<div class="ct-row">'+
        '<button class="ct-exp noc" type="button">›</button>'+
        '<label class="ct-lbl">'+
          '<input type="checkbox" class="orgsize-cb" value="'+size.value+'">'+
          '<span class="ct-name">'+size.label+'</span>'+
          '<span class="ct-n">'+(counts[size.value] || 0)+'</span>'+
        '</label>'+
      '</div>';
    list.appendChild(li);
  });

  list.querySelectorAll('.orgsize-cb').forEach(function(cb) {
    cb.addEventListener('change', applyCheckboxFilters);
  });
}

function applyCheckboxFilters() {
  var checkedRegions = Array.from(document.querySelectorAll('.region-cb:checked'))
    .map(function(cb){ return cb.value.toLowerCase(); });

  var checkedSizes = Array.from(document.querySelectorAll('.orgsize-cb:checked'))
    .map(function(cb){ return cb.value; });

  var checkedModules = Array.from(document.querySelectorAll('#catTree .ct-lbl > input[type="checkbox"]:checked'))
    .map(function(cb){ return cb.value.toLowerCase(); });

  var checkedSubs = Array.from(document.querySelectorAll('#catTree .ct-sub input[type="checkbox"]:checked'))
    .map(function(cb){ return cb.value.toLowerCase(); });

  var nothingChecked = !checkedRegions.length && !checkedSizes.length && !checkedModules.length && !checkedSubs.length;

  // If nothing is checked at all, restore all vendors from the full list
  if(nothingChecked){
    if(window._allVendors && window._allVendors.length){
      // Re-render from scratch only if current card count differs from full list
      if(document.querySelectorAll('#vendors .card').length < window._allVendors.length){
        loadVendors();
        return;
      }
    }
    document.querySelectorAll('#vendors .card').forEach(function(card){
      card.style.display = '';
    });
    updateVendorTotalFiltered();
    return;
  }

  document.querySelectorAll('#vendors .card').forEach(function(card) {
    var cardRegion  = (card.dataset.region || '').toLowerCase();
    var cardSize    = (card.dataset.companysize || '').trim();
    var cardModules = (card.dataset.modules || '').toLowerCase();
    var cardSubs    = (card.dataset.subcategories || '').toLowerCase();

    var regionMatch = !checkedRegions.length || checkedRegions.some(function(r){
      return cardRegion.includes(r);
    });

    var sizeMatch = !checkedSizes.length || checkedSizes.some(function(s){
      return cardSize === s;
    });

    var catMatch = true;
    if(checkedSubs.length){
      catMatch = checkedSubs.some(function(s){ return cardSubs.includes(s); });
    } else if(checkedModules.length){
      catMatch = checkedModules.some(function(m){ return cardModules.includes(m); });
    }

    card.style.display = (regionMatch && sizeMatch && catMatch) ? '' : 'none';
  });

  updateVendorTotalFiltered();
}

function renderRegionFilter() {
  var list = document.getElementById('regionList');
  if (!list) return;
  list.innerHTML = '';

  // Count per region from loaded cards
  var counts = {};
  document.querySelectorAll('#vendors .card').forEach(function(card) {
    var cardRegions = (card.dataset.region || '').split(',').map(function(r){ return r.trim(); }).filter(Boolean);
    cardRegions.forEach(function(r) {
      // Match against our fixed list (case-insensitive)
      REGIONS.forEach(function(fixed) {
        if (r.toLowerCase().includes(fixed.toLowerCase())) {
          counts[fixed] = (counts[fixed] || 0) + 1;
        }
      });
    });
  });

  REGIONS.forEach(function(region) {
    var li = document.createElement('li');
    li.innerHTML =
      '<div class="ct-row">'+
        '<button class="ct-exp noc" type="button">›</button>'+
        '<label class="ct-lbl">'+
          '<input type="checkbox" class="region-cb" value="'+region+'">'+
          '<span class="ct-name">'+region+'</span>'+
          '<span class="ct-n">'+(counts[region] || 0)+'</span>'+
        '</label>'+
      '</div>';
    list.appendChild(li);
  });

  list.querySelectorAll('.region-cb').forEach(function(cb) {
    cb.addEventListener('change', applyCheckboxFilters);
  });
}

function onTimeout() {
    App.swal.fire({
        title: "Taking Too Long?",
        text: "This process is taking longer than expected. Please try again.",
        icon: "question"
    }).then((result) => {
        App.setCookie('query', '');
        location.reload();
    });
}

function setupPagination() {
    var cardsPerPage = 30;
    var $cards = $("#vendors .card:visible"); 
    var totalPages = Math.ceil($cards.length / cardsPerPage);
    var currentPage = 1;

    function showPage(page) {
        currentPage = page;

        var start = (page - 1) * cardsPerPage;
        var end = start + cardsPerPage;

        $cards.hide().slice(start, end).show();
        //$('.sort-option').trigger('click');
        renderPagination();
    }

    function renderPagination() {
        $("#pagination").empty();

        var maxButtons = 5;
        var start = Math.max(currentPage - 2, 1);
        var end = Math.min(start + maxButtons - 1, totalPages);

        start = Math.max(end - maxButtons + 1, 1);

        function createButton(page) {
            return $("<button>")
                .text(page)
                .addClass(page === currentPage ? "active-page" : "")
                .on("click", function() {
                    showPage(page);
                });
        }

        if (start > 1) {
            $("#pagination").append(createButton(1));
            if (start > 2) {
                $("#pagination").append($("<span>").text("…")); 
            }
        }

        for (var i = start; i <= end; i++) {
            $("#pagination").append(createButton(i));
        }

        if (end < totalPages) {
            if (end < totalPages - 1) {
                $("#pagination").append($("<span>").text("…")); 
            }
            $("#pagination").append(createButton(totalPages));
        }
    }

    showPage(1);
}

function setData(){
    $('#datetime').text(App.getDateTime())

    setInterval(() => {
        $('#datetime').text(App.getDateTime())
    }, 60000);
}

async function loadVendors(filters = null, query = null){
    let vendors;
    regionServed = [];

    try {
        const response = await fetch('/api/supabase?action=getVendors');
        const result = await response.json();

        if (result.error) {
            console.error(result.error);
            App.customError(App.OPERATION_FAILED);
            return;
        }

        vendors = result.data;
        window._allVendors = result.data;
    } catch (err) {
        console.error('Fetch error:', err);
        App.customError(App.OPERATION_FAILED);
        return;
    }

    $('#vendors').empty();
    removeScoreFilter();
    //filters = App.mockUpFilter;

    if (filters !== null){
        window._filters = filters;
        window._activeFilters = filters;
        vendors = applyFilters(filters, window._allVendors);

        if (vendors.length > 0){
            //$('#search-title').text('YOUR CUSTOMIZED HR TECH STACKS');

            let text = [];
            let employeeCount = (filters.employee_count !== null) ? `(${filters.employee_count})` : '';
            (filters.target_market !== null) ? text.push(`Company size ${filters.target_market}`) : '';
            (filters.region !== null) ? text.push(`Region ${filters.region}`) : '';
            
            if (filters.required_features.length > 0){
                text.push(`Requirements: [${filters.required_features.join(',')}]`);
            }

            //$('#search-info').text(`Based on your needs: ${text.join(', ')}`);
            let vIds = [];
            vendors.forEach(v => {
                vIds.push({vendor_id: v.id, query: query});
            });

            fetch('/api/supabase?action=addSearchMatches', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({payload:vIds}),
            });
        }else{
            $('#vendors').append(`<div class="no-results">
                <div class="nr-icon-wrap">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke="var(--o)" stroke-width="1.6"/>
                    <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="var(--o)" stroke-width="1.6" stroke-linecap="round"/>
                    <path d="M8 11h6M11 8v6" stroke="var(--o)" stroke-width="1.4" stroke-linecap="round"/>
                    </svg>
                </div>
                <div class="nr-body">
                    <h2 class="nr-heading">No matches found</h2>
                    <p class="nr-sub">We couldn't find any HR tech products that match your current filters.</p>
                </div>
            </div>`);
        }
    }

    vendorList = vendors;
    vendors.forEach(async vendor => {
        vendorData[vendor.id] = vendor;
        const verifiedBadge = (vendor.verified) ? `<span class="verification-badge" title="Verified vendor">
                <img width="10" src="../assets/images/udder-verified-icon-32x32.png"/> Verified
            </span>`
            : '';
        
        if (vendor.data !== null && vendor.data.company !== null){
            const allFeatures = getAllVendorFeatures(vendor);
            let features = '';
            const integrations = vendor.data.company.integrations;
            let supportedIntegrations = [];
            let region = vendor.data.company.meta.region ?? [];
            let companySize = vendor.data.company.meta.target_market ?? '';

            for (let i = 0; i < 3; i++){
                if (allFeatures[i] !== undefined){
                    features += `<li>${allFeatures[i]}</li>`;
                }
            }

            if (features == ''){

            }
            
            if (companySize != '' && $.inArray(companySize, employeeCountSupported) === -1){
                employeeCountSupported.push(companySize);
                $('#companySizeFilter').append(`<option>${companySize}</option>`);
            }

            //vendor.logo = App.getLogo(vendor.logo);
            if (vendor.logo === null) vendor.logo = '../assets/images/no-logo.png';
            if (vendor.score === undefined) vendor.score = 0;

            vendor.categories = vendor.categories.replaceAll(' • ', ', ');
            const modules = App.getModules(vendor.data.company.modules);
           
            region.forEach(r => {
                if ($.inArray(r, regionServed) === -1){
                    regionServed.push(r);
                }
            });

            integrations.forEach(integration => {
                supportedIntegrations.push(integration.name);
            });
            
            if (vendor.match_score === undefined) vendor.match_score = 0;

            // add 
            // data-trending="true"
            // data-implementations="3"
            // data-references (comma separated with an optional | for meta line) e.g. Visa|Enterprise · Multi-region, Bosch|Enterprise · UK, LinkedIn, McDonald's, Ubisoft|SMB · EU
            // data-ver-history (semicolon separated with | between dates and description) e.g. 14 MAR 2026|Upgraded to Udder Approved by Alice Oduya, Udder;02 JAN 2026|Vendor claimed listing — 42 hours of capability evidence attached;12 NOV 2025|AI-generated from public sources (vendor website, G2, Capterra)
            $('#vendors').append(`
                <div class="card" 
                    data-modules="${modules.modules.join(',')}"
                    data-subcategories="${modules.subCategories.join(',')}"
                    data-name="${vendor.name}"
                    data-score="${vendor.match_score}"
                    data-companysize="${companySize}"
                    data-features="${allFeatures.join(',')}"
                    data-id="${vendor.id}"
                    data-headcount="${vendor.employee_count}"
                    data-region="${region.join(', ')}"
                    data-verification="${vendor.verification}"
                    data-integrations="${supportedIntegrations.join(', ')}"
                    data-description="${(vendor.description || vendor.categories || '').replace(/"/g, '&quot;')}"
                    data-logo="${vendor.logo || ''}"
                    data-verified="${vendor.verified ? '1' : '0'}">
                        ${verifiedBadge}
                        <div class="card-header">
                            <img src="${vendor.logo}" alt="${vendor.name} logo" class="card-logo" />
                            <h4>${vendor.name}</h4>
                        </div>
                        <p>${vendor.categories}</p>
                        <ul>
                            ${features}
                        </ul>
                        <button type="button" class="cta view-platform" 
                            data-id="${vendor.id}"
                            data-score="${vendor.match_score}" 
                            data-matcheditems="${vendor.matched_items}"
                            data-filterscount="${vendor.filters_count}">View →</button>
                </div>`);
        }
    });

    updateVendorTotal();
    renderRegionFilter();
    renderDropdownFeature();
    renderOrgSizeFilter();
    updateCategoryCounts();

    $('.skeleton').remove();
    $('.layout').removeClass('hide');
    $('.sort-dropdown').removeClass('hide');
    $('.faqs-section').removeClass('hide');

    if (filters !== null) {
        applyScoreFilter();
        $('#rpSub').text('Showing platforms with 50% and higher match score');
    }
}

function applyScoreFilter() {
    var threshold = 50;
    var cards = Array.from(document.querySelectorAll('#vendors .card'));
    if (!cards.length) return;

    var scoredCards = cards.filter(function(c) {
        return parseFloat(c.dataset.score) > 0;
    });
    if (!scoredCards.length) return;

    var hidden = 0;
    cards.forEach(function(card) {
        var score = parseFloat(card.dataset.score) || 0;
        if (score > 0 && score < threshold) {
            card.dataset.belowThreshold = '1';
            card.style.display = 'none';
            hidden++;
        }
    });

    if (!hidden) return;

    var banner = ensureScoreFilterBanner();
    var total  = cards.length;

    document.getElementById('scoreFilterLabel').textContent =
        hidden + ' vendor' + (hidden === 1 ? '' : 's') + ' below ' + threshold + '% match hidden';

    document.getElementById('scoreFilterBtn').textContent =
        'Show all ' + total + ' vendor' + (total === 1 ? '' : 's');

    banner.style.display = 'flex';
    updateVendorTotalFiltered();
}

function removeScoreFilter() {
    document.querySelectorAll('#vendors .card[data-below-threshold]').forEach(function(card) {
        card.style.display = '';
        delete card.dataset.belowThreshold;
    });
    var banner = document.getElementById('scoreFilterBanner');
    if (banner) banner.style.display = 'none';
}

function ensureScoreFilterBanner() {
    var existing = document.getElementById('scoreFilterBanner');
    if (existing) return existing;

    var banner = document.createElement('div');
    banner.id = 'scoreFilterBanner';
    banner.style.cssText = [
        'display:none',
        'align-items:center',
        'justify-content:space-between',
        'gap:12px',
        'padding:12px 20px',
        'background:var(--w)',
        'border-top:1px solid var(--b1)',
        'font-size:12px',
        'color:var(--t3)',
        'flex-shrink:0'
    ].join(';');

    var label = document.createElement('span');
    label.id = 'scoreFilterLabel';
    banner.appendChild(label);

    var btn = document.createElement('button');
    btn.id = 'scoreFilterBtn';
    btn.style.cssText = [
        'display:inline-flex',
        'align-items:center',
        'height:30px',
        'padding:0 14px',
        'border:1px solid var(--b2)',
        'border-radius:20px',
        'background:transparent',
        'font-size:12px',
        'font-weight:500',
        'color:var(--t2)',
        'cursor:pointer',
        'font-family:var(--sans)',
        'transition:all 0.13s',
        'white-space:nowrap'
    ].join(';');
    btn.onmouseover = function() { btn.style.borderColor = 'var(--b3)'; btn.style.color = 'var(--t1)'; };
    btn.onmouseout  = function() { btn.style.borderColor = 'var(--b2)'; btn.style.color = 'var(--t2)'; };
    btn.addEventListener('click', function() {
        document.querySelectorAll('#vendors .card[data-below-threshold]').forEach(function(card) {
            card.style.display = '';
            delete card.dataset.belowThreshold;
        });
        banner.style.display = 'none';
        updateVendorTotalFiltered();
    });
    banner.appendChild(btn);

    var pagination = document.getElementById('pagination');
    if (pagination && pagination.parentNode) {
        pagination.parentNode.insertBefore(banner, pagination);
    }

    return banner;
}

function updateCategoryCounts() {
  var moduleCounts = {};
  var subCounts    = {};

  // Use a Set per category to count unique vendors
  var moduleVendors = {};
  var subVendors    = {};

  var source = window._allVendors || [];
  source.forEach(function(vendor) {
    var company = vendor && vendor.data && vendor.data.company;
    if(!company) return;
    var parsed = App.getModules(company.modules || {});

    // Deduplicate modules per vendor
    var uniqueModules = [...new Set(parsed.modules || [])];
    var uniqueSubs    = [...new Set(parsed.subCategories || [])];

    uniqueModules.forEach(function(m) {
      if(!moduleVendors[m]) moduleVendors[m] = new Set();
      moduleVendors[m].add(vendor.id);
    });

    uniqueSubs.forEach(function(s) {
      if(!subVendors[s]) subVendors[s] = new Set();
      subVendors[s].add(vendor.id);
    });
  });

  // Convert Sets to counts
  Object.keys(moduleVendors).forEach(function(m){
    moduleCounts[m] = moduleVendors[m].size;
  });
  Object.keys(subVendors).forEach(function(s){
    subCounts[s] = subVendors[s].size;
  });

  document.querySelectorAll('#catTree > li').forEach(function(li) {
    var cb   = li.querySelector('.ct-lbl > input[type="checkbox"]');
    var name = cb ? cb.value : '';
    var ct_n = li.querySelector(':scope > .ct-row .ct-n');
    if(ct_n && name) ct_n.textContent = moduleCounts[name] || 0;

    li.querySelectorAll('.ct-sub li').forEach(function(subLi) {
      var subCb   = subLi.querySelector('input[type="checkbox"]');
      var subName = subCb ? subCb.value : '';
      var subCt_n = subLi.querySelector('.ct-n');
      if(subCt_n && subName) subCt_n.textContent = subCounts[subName] || 0;
    });
  });
}

function renderDropdownFeature(filter = "") {
    $featureDropdown.empty();
    availableFeaturesList.sort();
    
    $.each(availableFeaturesList, function (index, option) {
        if (
            option.toLowerCase().includes(filter.toLowerCase()) &&
            $.inArray(option, selectedFeature) === -1
        ) {
            $featureDropdown.append("<div class='option'>" + option + "</div>");
        }
    });
}

function renderSelectedFeature() {
    $featureSelectedItems.empty();

    $.each(selectedFeature, function (index, option) {
        $featureSelectedItems.append(
            "<div class='selected-tag'>" +
            option +
            " <span class='remove' data-value='" + option + "'>&times;</span></div>"
        );

        $(".card").each(function () {
            var features = $(this).data("features");

            if (features.includes(selectedFeature)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    });

    // if (selectedFeature.length == 0){
    //     $(".card").show();
    // }

    // setupPagination();
}

$(".select-box").on("click", function () {
    $featureDropdown.show();
    $featureSearchInput.focus();
});

$(document).on("click", ".option", function () {
    var value = $(this).text();
    selectedFeature.push(value);
    renderSelectedFeature();
    renderDropdownFeature($featureSearchInput.val());
});

$(document).on("click", ".remove", function (e) {
    e.stopPropagation();
    var value = $(this).data("value");
    selectedFeature = $.grep(selectedFeature, function (item) {
        return item !== value;
    });
    renderSelectedFeature();
    renderDropdownFeature($featureSearchInput.val());
});

$featureSearchInput.on("keyup", function () {
    renderDropdownFeature($(this).val());
});

$(document).on("click", function (e) {
    if (!$(e.target).closest(".multi-select").length) {
        $featureDropdown.hide();
    }
});

// function renderDropdownIntegrations(filter = "") {
//     $integrationsDropdown.empty();
//     availableIntegrationList.sort();
    
//     $.each(availableIntegrationList, function (index, option) {
//         if (
//             option.toLowerCase().includes(filter.toLowerCase()) &&
//             $.inArray(option, selectedIntegrations) === -1
//         ) {
//             $integrationsDropdown.append("<div class='option'>" + option + "</div>");
//         }
//     });
// }

// function renderSelectedIntegration() {
//     $integrationsSelectedItems.empty();

//     $.each(selectedIntegrations, function (index, option) {
//         $integrationsSelectedItems.append(
//             "<div class='selected-tag-integration'>" +
//             option +
//             " <span class='remove-integration' data-value='" + option + "'>&times;</span></div>"
//         );

//         $(".card").each(function () {
//             var integrations = $(this).data("integrations");

//             if (integrations.includes(selectedIntegrations)) {
//                 $(this).show();
//             } else {
//                 $(this).hide();
//             }
//         });
//     });

//     // if (selectedFeature.length == 0){
//     //     $(".card").show();
//     // }

//     setupPagination();
// }

// $(".select-box-integrations").on("click", function () {
//     $integrationsDropdown.show();
//     $integrationsSearchInput.focus();
// });

// $(document).on("click", ".option", function () {
//     var value = $(this).text();
//     selectedIntegrations.push(value);
//     renderSelectedIntegrations();
//     renderDropdownIntegrations($integrationsSearchInput.val());
// });

// $(document).on("click", ".remove-integration", function (e) {
//     e.stopPropagation();
//     var value = $(this).data("value");
//     selectedIntegrations = $.grep(selectedIntegrations, function (item) {
//         return item !== value;
//     });
//     renderSelectedIntegrations();
//     renderDropdownIntegrations($integrationsSearchInput.val());
// });

// $integrationsSearchInput.on("keyup", function () {
//     renderDropdownIntegrations($(this).val());
// });

// $(document).on("click", function (e) {
//     if (!$(e.target).closest(".multi-select-integrations").length) {
//         $integrationsDropdown.hide();
//     }
// });

function loadFeaturesByValue(type, moduleName, subModule = []){
    availableFeaturesGroupedByValue = [];

    if (type == 'module' && availableFeaturesGrouped[moduleName] !== null){
        Object.entries(availableFeaturesGrouped[moduleName]).forEach(([subModules, features]) => {
            features.forEach(feature => {
                availableFeaturesGroupedByValue.push(feature);
            });
        });
    }else{
        if (availableFeaturesGrouped[moduleName] !== null){
            Object.entries(availableFeaturesGrouped[moduleName]).forEach(([subModules, features]) => {
                if ($.inArray(subModules, subModule)){
                    features.forEach(feature => {
                        availableFeaturesGroupedByValue.push(feature);
                    });
                }
            });
        }   
    }

    if (availableFeaturesGroupedByValue.length > 0) availableFeaturesList = availableFeaturesGroupedByValue;
    availableFeaturesList = [...new Set(availableFeaturesList)];
    renderDropdownFeature();
}

function getAllVendorFeatures(vendor){
    let features = [];
    
    Object.entries(vendor.data.company.modules).forEach(([moduleName, subModules]) => {
        Object.keys(subModules).forEach(subModuleName => {
            const featureList = vendor.data.company.modules[moduleName][subModuleName];
            featureList.forEach(feature => {
                features.push(feature.name);

                if (availableFeaturesGrouped[moduleName] === null || availableFeaturesGrouped[moduleName] === undefined) availableFeaturesGrouped[moduleName] = {};
                if (availableFeaturesGrouped[moduleName][subModuleName] === null || availableFeaturesGrouped[moduleName][subModuleName] === undefined) availableFeaturesGrouped[moduleName][subModuleName] = [];
                
                availableFeaturesGrouped[moduleName][subModuleName].push(feature.name);
                if ($.inArray(feature.name, availableFeaturesList) === -1) {
                    availableFeaturesList.push(feature.name);
                }
            });
        });
    });
   
    return features;
}

function lowerCase(str){
    if (str === null) return;
    return str.toLowerCase();
}

function updateVendorTotalFiltered(){
    $('#totalVendors').text($('#vendors .card').not(':hidden').length);
    updateCategoryCounts();
}

function updateVendorTotal(){
    $('#totalVendors').text($('#vendors .card').length);
}

function applyFilters(filters, vendors) {
    if (!filters || !Array.isArray(vendors)) return [];

    return vendors
        .map(vendor => {
            const company = vendor?.data?.company;

            if (!company) return null;

            const meta = company.meta || {};

            const { modules, subCategories } =
                App.getModules(company.modules || {});

            const modulesLower =
                modules.map(v => v.toLowerCase());

            const subCategoriesLower =
                subCategories.map(v => v.toLowerCase());

            let score = 0;
            let filtersCount = 0;
            const matched = [];

            // ── Target Market ───────────────────────────────
            if (filters.target_market) {
                filtersCount++;

                const hasMatch = (meta.target_market || '')
                    .toLowerCase()
                    .includes(filters.target_market.toLowerCase());

                if (hasMatch) {
                    score++;
                    matched.push(`Fits ${filters.target_market}`);
                }
            }

            // ── Region ──────────────────────────────────────
            if (filters.region) {
                filtersCount++;

                const regions = Array.isArray(meta.region)
                    ? meta.region.join(' ').toLowerCase()
                    : '';

                if (regions.includes(filters.region.toLowerCase())) {
                    score++;
                    matched.push(`${filters.region} presence`);
                }
            }

            // ── Required Modules ───────────────────────────
            (filters.required_modules || []).forEach(module => {
                filtersCount++;

                if (modulesLower.includes(module.toLowerCase())) {
                    score++;
                    matched.push(`${module} module`);
                }
            });

            // ── Required Features ──────────────────────────
            (filters.required_features || []).forEach(feature => {
                filtersCount++;

                if (subCategoriesLower.includes(feature.toLowerCase())) {
                    score++;
                    matched.push(feature);
                }
            });

            // ── Required Integrations ───────────────────────────
            (filters.required_integrations || []).forEach(integration => {
                filtersCount++;
                
                const integrations = company.integrations.map(i => i.name.toLowerCase());
                if (integrations.includes(integration.toLowerCase())) {
                    score++;
                    matched.push(`${integration} integration`);
                }
            });

            // ── Skip vendors with no matches ───────────────
            if (score === 0 || filtersCount === 0) {
                return null;
            }

            return {
                ...vendor,
                filters_count: filtersCount,
                score,
                matched_items: [...new Set(matched)],
                match_score: Math.round((score / filtersCount) * 100)
            };
        })
        .filter(Boolean)
        .sort((a, b) => b.match_score - a.match_score);
}

// only use once-off
async function generateEmbedding(vendorId) {
  try {
    const response = await fetch('/api/generate-embedding', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId }),
    });

    const result = await response.json();
    console.log(result);
  } catch (err) {
    console.error(err);
  }
}

async function saveQuery(filters, query) {
    const payload = { 
        ref: Date.now(), 
        filters:  filters, 
        query: query, 
    };

    const response = await fetch('/api/supabase?action=upsertFilter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ payload: payload }),
    });

    const result = await response.json();
}

function getRegion(vendor){
    let result = [];

    const location = (vendor.people_data_labs !== null) ? vendor.people_data_labs.location : {};

    if ($.isEmptyObject(location)) return;
    
    const country   = lowerCase(location.country || '');
    const locality  = lowerCase(location.locality || '');
    const continent = lowerCase(location.continent || '');
    const region    = lowerCase(location.region || '');
    const metro     = lowerCase(location.metro || '');
    const name      = lowerCase(location.name || '');

    if (country != '') result.push(country);
    if (locality != '') result.push(locality);
    if (continent != '') result.push(continent);
    if (region != '') result.push(region);
    if (metro != '') result.push(metro);
    if (name != '') result.push(name);

    const uniqueList = [...new Set(result)];
    return uniqueList.join(', ');
}