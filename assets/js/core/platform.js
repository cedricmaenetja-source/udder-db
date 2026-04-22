import * as App from '../app.js';
import { COMPANY_SIZE } from '../utils/constants.js';

let selectedVendors = [];
let shortlist = [];
let ipAddress = '';
let vendorId;

$(function(){
    ipAddress = App.getCookie('ip') ?? null;
   
    let myShortlist = App.getCookie('shortlist');
    
    myShortlist = (myShortlist == null) ? JSON.parse('[]') : JSON.parse(decodeURIComponent(myShortlist));
    console.log('short', myShortlist);
   
    myShortlist.forEach(item => {
        shortlist.push(item);
    });

    vendorId = App.getUrlParam('vid');
    if (vendorId === null){
        vendorId = App.getCookie('vendor_id');
    }

    if (vendorId === null){
        location.href = './';
        return;
    }

    let index = shortlist.findIndex(item => item.id === vendorId);
    if (index !== -1){
        $('#addToListBtn').text('Remove from List');
    }

    for (var size of COMPANY_SIZE){
        $('#headcount').append(`<option value="${size}">${size}</option>`);
    }

    loadVendor(vendorId);

    const multiSelect = document.getElementById('modules');
    const selected = multiSelect.querySelector('.selected');
    const optionsContainer = multiSelect.querySelector('.options');
    let selectedValues = [];

    // Toggle dropdown
    selected.addEventListener('click', () => {
        multiSelect.classList.toggle('open');
    });

    // Select/deselect options
    optionsContainer.addEventListener('click', (e) => {
        const option = e.target.closest('div');
        if (!option) return;

        const value = option.dataset.value;
        const label = option.textContent;

        if (selectedValues.includes(value)) {
            selectedValues = selectedValues.filter(v => v !== value);
        } else {
            selectedValues.push(value);
        }

        renderSelected();
    });

    // Render selected items
    function renderSelected() {
        if (selectedValues.length === 0) {
            selected.textContent = 'Select options';
        } else {
            selected.innerHTML = '';
            selectedValues.forEach(val => {
                const span = document.createElement('span');
                span.textContent = val;
                selected.appendChild(span);
            });
        }
    }

    $('#requestDemo').on('click', function(){
        const visitorId = App.getCookie('visitor_id') ?? null;
        if (visitorId !== null){
            $('.personal-info').addClass('hide');

        }

        $('.modal-demo').removeClass('hide');
        $('body').addClass('modal-active');
    });

    $('#addToListBtn').on('click', function(){
        const text = $(this).text();
        if (text == 'Remove from List'){
            shortlist = shortlist.filter(item => item.id !== vendorId);
            $(this).text('Add to List');
        }else{
            $(this).text('Remove from List');
        }

        App.setCookie('shortlist', JSON.stringify(shortlist));
    });

    $('#closerequestDemoModal').on('click', function(){
        $('.modal-demo').addClass('hide');
        $('body').removeClass('modal-active');
    });

    $('#submitBtn').on('click', async function(){
        var $btn = $(this);

        const name = $('#name').val();
        const email = $('#email').val();
        const headcount = $('#headcount').val();
        const country = $('#country').val();
        const companyName = $('#companyName').val();
        const modules = $('#modules .selected span')
            .map((_, el) => $(el).text().trim())
            .get();
        const question = $('#question').val();
        
        if (!name || !email || !modules || !question || !companyName){
            App.errorNotification('Fields with * are required fields');
            return;
        }

        if ($btn.data('...')) return;
        $btn.data('...', true);
        $btn.append('<span class="spinner-btn-clicked"></span>');
        $btn.css('pointer-events', 'none');

        const res = await fetch('/api/supabase?action=addVendorLead', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendorId: vendorId, clientDetails:  {
                name: name,
                email: email,
                headcount: headcount,
                country: country,
                modules: modules,
                question: question,
                company_name: companyName
            }}),
        });

        const r = await res.json();
        if (r.error) {
            App.errorNotification(App.OPERATION_FAILED);
            console.error(r.error);
            resetBtn();
            return;
        }

        App.successNotification('Request Sent!');
        resetBtn();
        $('#closerequestDemoModal').trigger('click');

        function resetBtn(){
            $btn.data('loading', false);
            $btn.find('.spinner-btn-clicked').remove();
            $btn.css('pointer-events', 'auto');
            $btn.data('...', false);
        }
    });

    // $('#addToListBtn').on('click', function(){
    //     selectedVendors.push(vendorId);
    //     App.setCookie('compare_vendors', selectedValues);
    //     $(this).addClass('hide');
    // });
});

async function loadVendor(vendorId){
    const response = await fetch(`/api/supabase?action=getVendorById&vendorId=${vendorId}`);
    const result = await response.json();

    if (result.error) {
        console.error(result.error);
        App.customError(App.OPERATION_FAILED);
        return;
    }

    updateData(result.data);
    $('.container-skeleton').remove();
    $('.container').removeClass('hide');
    
    const res = await fetch('/api/supabase?action=addToVendorAnalytics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId: vendorId, ipAddress:  ipAddress}),
    });

    const r = await res.json();
    if (r.error) {
        // silent error
        console.error(r.error);
    }
}

function createParagraphs(text){
    var maxLength = 300;
    var paragraphs = [];

    while (text.length > 0) {
        var chunk = text.slice(0, maxLength);
        
        var lastPeriod = chunk.lastIndexOf(".");
        if (lastPeriod !== -1) {
            chunk = chunk.slice(0, lastPeriod + 1);
        }
        paragraphs.push(chunk.trim());
        text = text.slice(chunk.length).trim();
    }

    return paragraphs;
}

function capitalizeFirstLetter(text) {
    if (!text) return "";
    return text.charAt(0).toUpperCase() + text.slice(1);
}

async function updateData(vendor){
    const modules = App.getModules(vendor.data.company.modules);
    const description = vendor.short_description;
    vendor.categories = vendor.categories.replaceAll(' • ', ', ');

    const paragraphs = createParagraphs(description);
    paragraphs.forEach(function(p){
        var upperCasedFirstLetter = capitalizeFirstLetter(p.trim());
        $("#description").append(`<p class='subtitle'>${upperCasedFirstLetter}</p>`);
    });

    $('.companyName').text(vendor.name);
    $('#categories').text(vendor.categories);
    $("#logo_img").attr("src", App.getLogo(vendor.logo));
    $('#employee_count').text(vendor.employee_count);
    $('#title').text(vendor.firecrawl_search['title']);

    if (selectedVendors.length === 3 || selectedVendors.includes(vendor.id)) $('#addToListBtn').addClass('hide');

    $('#modules.options').empty();
    const vendorModules = [...new Set(modules.modules)];
    vendorModules.forEach(module => {
        $('#modules .options').append(`<div data-value="${module}">${module}</div>`);
    });

    const features = modules.subCategories;
    features.forEach(feature => {
        $('#featuresList').append(`<li>${feature}</li>`);
    });

    const integrations = vendor.data.company.integrations;
    $("#integrationsGrid").empty();
    integrations.forEach(integration => {
        var card = $('<div class="integration-card"></div>').text(integration.name);
        $("#integrationsGrid").append(card);
    });

    if (integrations.length == 0) $("#integrationsGrid").append('N/A');

    const matchScore = App.getCookie('match_score');
    console.log(matchScore);
    if (isValidNumber(matchScore)){
        $('#matchScore').text(`${matchScore}%`);
        $('.score-circle').css({
            'color': matchScoreColor(matchScore),
            'border': `6px solid ${matchScoreColor(matchScore)}`
        });

        $('.score-title').removeClass('hide');
    }else{
        $('.score-title').addClass('hide');
    }

    shortlist.push({
        id: vendor.id,
        name: vendor.name,
        matchScore: matchScore,
        systemPart: vendor.systemPart,
        logo: App.getLogo(vendor.logo)
    });
    
    const score = App.getCookie('score');
    const totalFilters = App.getCookie('filters_count');
    console.log(score);
    if (score !== undefined && score != 'undefined' && score != '0') $('#scoreList').append(`<li>${'★'.repeat(score)} ${score}/${totalFilters}</li>`);

    let scoreList = App.getCookie('matched_items');
    if (scoreList !== undefined && scoreList != 'undefined'){
        scoreList = decodeURIComponent(scoreList);
        const list = scoreList.split(',');
        const uniqueList = [...new Set(list)];
       
        uniqueList.forEach(item => {
            $('#scoreList').append(`<li>${item}</li>`);
        });
    }

    const screenshotsres = await fetch(`/api/supabase?action=getVendorScreenshots&vendorId=${vendor.id}`);
    const screenshotsrt = await screenshotsres.json();

    if (screenshotsrt.error) {
        console.error(screenshotsrt.error);
        App.customError(App.OPERATION_FAILED);
        return;
    }

    screenshotsrt.images.forEach(image => {
        $('.screenshots').append(`<div class="screenshot" style="background-image:url(${image})"></div>`);
    });
}

function matchScoreColor(score){
    let color = 'var(--black)';
    if (score < 50) color = 'red';
    if (score > 50) color = 'orange';
    if (score > 90) color = 'green';

    return color;
}

function isValidNumber(value) {
  return value !== '' && Number.isFinite(Number(value));
}