import * as App from '../app.js';
import { PAGES } from  '../utils/constants.js';
import { isLoggedIn } from '../core/auth/session.js';

let vendorData = {};
let vendorList = [];
let employeeCountSupported = [];
let user;

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

$(async function () {
    const loggedIn = await isLoggedIn();
    if (!loggedIn) {
        $('#sbSignIn').removeClass('hide');
        $('#sb-user-profile').addClass('hide');
        $('.link-secured').addClass('hide');
    }else{
        loadUserProfile();
        $('#sbSignIn').addClass('hide');
        $('.link-secured').removeClass('hide');
    }
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

        const filtered = searchFilters.filter(item => item.toLowerCase().includes(query));

        filtered.forEach(item => {
            const div = document.createElement('div');
            div.classList.add('autocomplete-item');

            // Highlight matched text
            const regex = new RegExp(`(${query})`, 'gi');
            div.innerHTML = item.replace(regex, '<span class="highlight">$1</span>');

            div.addEventListener('click', () => {
                modalSearch.value = item;
                results.innerHTML = '';
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
    query = null;
    if (query !== null && (query !== undefined || typeof value !== 'undefined') && query != ''){
        const value = decodeURIComponent(query);
        $("#search").val(value);
        
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

    // Toggle compare mode
    $('#compareBtn').click(function() {
        compareMode = !compareMode;
        $(this).text(compareMode ? 'Cancel Compare' : 'Select to Compare');

        if(compareMode) {
            $('.card').addClass('selectable');
            $('#compareActionBtn').removeClass('hide');
        } else {
            $('.card').removeClass('selectable selected');
            selectedCards.clear();
            $('#compareActionBtn').text('Compare');
            $('#compareActionBtn').prop('disabled', true);
            $('#compareActionBtn').addClass('hide');
        }
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

    $('#comparisonCloseModalBtn').click(function(){
        closeComparisonModal();
    });

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
async function loadUserProfile(){
    const userId = App.getCookie('user_id');
    const response = await fetch(`/api/supabase?action=getUserById&userId=${userId}`);
    const result = await response.json();

    if (result.error) {
        console.error(result.error);
        App.showToast(App.OPERATION_FAILED, 'error');
        return;
    }

    user = result.data;
    if (user.role != 'hr-professional'){
        App.setCookie('is_logged_in', false);
        location.href = PAGES.login;
        return;
    }

    console.info('user', user);
    const fullName = `${user.first_name} ${user.last_name}`;
    $('#sb-uname').text(fullName);
    $('#sb-initials').text(App.initials(fullName));
    $('#sb-user-profile').removeClass('hide');
}

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

    $(document).on("change", '#companySizeFilter', function () {
        var value = lowerCase($(this).val());
        
        if (value == '') {
            resetFilter();
            return;
        }
        
        $(".card").each(function () {
            var companySize = $(this).data("companysize");

            if (value.includes(companySize)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });

        updateVendorTotalFiltered();
        // setupPagination();
    });

    // filter by region
    $(document).on("change", '#regionFilter', function () {
        let count = 0;
        var value = $(this).val();
        
        if (value == '') {
            resetFilter();
            return;
        }
        
        $(".card").each(function () {
            var region = $(this).data("region");

            if (value.includes(region)) {
                $(this).show();
                count++;
            } else {
                $(this).hide();
            }
        });

        updateVendorTotalFiltered();
        // setupPagination();
    });

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

async function runSearch(){
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
    $('#gridBtn').hide();
    //$('#search').val(value);
    results.innerHTML = '';
  
    const filters = await runWithClaude(value);
    console.log('LLM Response:', filters);
    if (filters.error){
        console.error('Groq Error:', filters.error);
        App.swal.fire({
            title: "Error",
            text: App.REQUEST_NOT_PROCESSED,
        }).then((result) =>{
            location.reload();
        });
        return;
    }

    console.log('Claude Response:', filters);
    saveQuery(filters, value);
    await loadVendors(filters);
    
    $('.layout').show();
    $('#gridBtn').show();
    $('#xloader').empty();
    $('.spinner-container').addClass('hide');
    $('#modalSearch').prop('disabled', false);
    App.setCookie('query', '');

    const modal = document.getElementById('searchModal');
    const body = document.body;
    modal.classList.remove('active');
    body.classList.remove('modal-active');
    $('#modalSearch').val('');
    $('#search').val('');
    
    // const timeInSec = Math.floor(Date.now() / 1000);
    // const random4Digits = Math.floor(1000 + Math.random() * 9000);
    // const ref = `${timeInSec}${random4Digits}`;

    // $.ajax({
    //     url: App.ZAPIER_CREATE_SEARCH_FILTERS,   
    //     type: 'POST',
    //     data: JSON.stringify({
    //         ref: ref,
    //         query: value
    //     }),         
    //     success: async function (response) {
    //         console.info('response', response);
    //         if (response.status == 'success'){
    //             const timeoutId = setTimeout(onTimeout, 3 * 60 * 1000);

    //             const f = setInterval(async () => {
    //                 const data = await getSearchFilters(ref);
    //                 console.info('getSearchFilters', data);

    //                 if (data !== null && data !== undefined){
    //                     console.info('getSearchFilters2', data);
    //                     clearInterval(f);
    //                     clearTimeout(timeoutId);

    //                     await loadVendors(data.filters);
    //                     $('.layout').show();
    //                     $('#gridBtn').show();
    //                     $('#xloader').empty();
    //                     $('#search').prop('disabled', false);
    //                     App.setCookie('query', '');
    //                 }
    //             }, 2000);
    //         }else{
    //             App.customError(App.OPERATION_FAILED);
    //             console.log(response);
    //         }
    //     },
    //     error: function (xhr) {
    //         console.error('Error:', xhr.responseText);
            
    //         App.customOopsError();
    //         $('#search').prop('disabled', false);
    //         $('.layout').show();
    //         $('#gridBtn').show();
    //         $('#xloader').empty();
    //     }
    // });
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

function closeComparisonModal() {
  document.getElementById("compareModal").style.display = "none";
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

async function loadVendors(filters = null){
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
    } catch (err) {
        console.error('Fetch error:', err);
        App.customError(App.OPERATION_FAILED);
        return;
    }

    $('#vendors').empty();
    //filters = App.mockUpFilter;

    if (filters !== null){
        vendors = applyFilters(filters, vendors);
        if (vendors.length > 0){
            $('#search-title').text('YOUR CUSTOMIZED HR TECH STACKS');

            let text = [];
            let employeeCount = (filters.employee_count !== null) ? `(${filters.employee_count})` : '';
            (filters.target_market !== null) ? text.push(`Company size ${filters.target_market}`) : '';
            (filters.region !== null) ? text.push(`Region ${filters.region}`) : '';
            
            if (filters.required_features.length > 0){
                text.push(`Requirements: [${filters.required_features.join(',')}]`);
            }

            $('#search-info').text(`Based on your needs: ${text.join(', ')}`);
        }else{
            $('#vendors').append(`<div class="no-results">
                <h2>No results found.</h2>
                <p class="description">
                    Please update your search criteria with more detailed information.<br/>
                    Refer to examples <a href="#faqs-section">here</a>.
                </p>
            </div>`);
        }
    }

    vendorList = vendors;
    console.log('vendorList', vendorList);

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
            console.info(vendor.data.company.meta.target_market);
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

            $('#vendors').append(`
                <div class="card" 
                    data-modules="${modules.modules.join(',')}"
                    data-subcategories="${modules.subCategories.join(',')}"
                    data-name="${vendor.name}"
                    data-score="${vendor.score}"
                    data-companysize="${companySize}"
                    data-features="${allFeatures.join(',')}"
                    data-id="${vendor.id}"
                    data-headcount="${vendor.employee_count}"
                    data-region="${region.join(', ')}"
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
                            data-score="${vendor.score}" 
                            data-matchScore="${vendor.match_score}"
                            data-matcheditems="${vendor.matched_items}"
                            data-filterscount="${vendor.filters_count}">View Platform</button>
                </div>`);
        }
    });

    updateVendorTotal();
    renderDropdownFeature();

    $('.skeleton').remove();
    $('.layout').removeClass('hide');
    $('.sort-dropdown').removeClass('hide');
    $('.faqs-section').removeClass('hide');
    if (vendors.length > 0) $('#compareBtn').removeClass('hide');
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
}

function updateVendorTotal(){
    $('#totalVendors').text($('#vendors .card').length);
}

function applyFilters(filters, vendors) {
    if (!filters || !vendors) return [];

    const results = [];

    vendors.forEach(vendor => {
        if (!vendor.data?.company) return;

        const company = vendor.data.company;
        const meta    = company.meta || {};

        const { modules, subCategories } = App.getModules(company.modules);
        const modulesLower       = modules.map(m => m.toLowerCase());
        const subCategoriesLower = subCategories.map(s => s.toLowerCase());

        // Flatten vendor integrations into a searchable lowercase string array
        const vendorIntegrations = (company.integrations || [])
            .map(i => (i.name || '').toLowerCase());

        let matchScore   = 0;
        let filtersCount = 0;
        const matched    = [];

        // ── Target market ──────────────────────────────────────────
        if (filters.target_market) {
            filtersCount++;
            const companySize = (meta.target_market || '').toLowerCase().trim();

            if (companySize && companySize.includes(filters.target_market.toLowerCase())) {
                matchScore++;
                matched.push(`Fits ${filters.target_market}`);
            }
        }

        // ── Region ─────────────────────────────────────────────────
        if (filters.region) {
            filtersCount++;
            const regionList = Array.isArray(meta.region) ? meta.region : [];

            if (regionList.length > 0) {
                const regionStr = regionList.join(', ').toLowerCase();
                if (regionStr.includes(filters.region.toLowerCase())) {
                    matchScore++;
                    matched.push(`${regionStr} presence`);
                }
            }
        }

        // ── Required modules ───────────────────────────────────────
        if (filters.required_modules?.length > 0) {
            filters.required_modules.forEach(module => {
                filtersCount++;
                if (modulesLower.includes(module.toLowerCase())) {
                    matchScore++;
                    matched.push(`${module} module`);
                }
            });
        }

        // ── Required features (sub-modules) ────────────────────────
        if (filters.required_features?.length > 0) {
            filters.required_features.forEach(feature => {
                filtersCount++;
                if (subCategoriesLower.includes(feature.toLowerCase())) {
                    matchScore++;
                    matched.push(`${feature}`);
                }
            });
        }

        // ── Required integrations ──────────────────────────────────
        if (filters.required_integrations?.length > 0) {
            filters.required_integrations.forEach(integration => {
                filtersCount++;
                const integrationLower = integration.toLowerCase();

                // Exact match first, then partial (e.g. "workday" matches "workday hcm")
                const hasIntegration = vendorIntegrations.some(i =>
                    i === integrationLower || i.includes(integrationLower)
                );

                if (hasIntegration) {
                    matchScore++;
                    matched.push(`Integrates with ${integration}`);
                }
            });
        }

        // ── Keywords ───────────────────────────────────────────────
        if (filters.keywords?.length > 0) {
            const searchableText = [
                vendor.name,
                vendor.short_description,
                vendor.categories,
            ].filter(Boolean).join(' ').toLowerCase();

            filters.keywords.forEach(keyword => {
                filtersCount++;
                if (searchableText.includes(keyword.toLowerCase())) {
                    matchScore++;
                    matched.push(`Matches "${keyword}"`);
                }
            });
        }

        // ── Include vendors with at least one match ─────────────────
        if (matchScore > 0 && filtersCount > 0) {
            results.push({
                ...vendor,
                filters_count:  filtersCount,
                score:          matchScore,
                matched_items:  matched,
                match_score:    Math.round((matchScore / filtersCount) * 100),
            });
        }
    });

    results.sort((a, b) => b.match_score - a.match_score);

    return results;
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