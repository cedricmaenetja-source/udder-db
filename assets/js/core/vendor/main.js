import * as App from '../../app.js';
import { PAGES, COMPANY_SIZE, LOCATIONS, HRINTEGRATIONS, UDDER_SUPPORT, CERTIFICATION_REQUESTED_EMAIL, GET_IN_TOUCH_EMAIL } from '../../utils/constants.js';

let user;
let vendorModules;
let modules = [];
let modulesTreeStructure = [];
let leads;
let vendorData;

function renderTags() {
    const container = $('#modulesTags');
    container.empty();
    let index = 0;

    modules.forEach((module, index) => {
        let subCategories = '';
        const subModulesCount = (module in vendorModules) ? Object.keys(vendorModules[`${module}`]).length : 0;
        if (subModulesCount > 0) subCategories = Object.keys(vendorModules[`${module}`]).join(', ');
        
        let children = [];
        Object.keys(vendorModules[`${module}`]).forEach(subName => {
            let grandchildren = [];
            vendorModules[`${module}`][`${subName}`].forEach(grandchild => {
                grandchildren.push(grandchild.name);
            });

            children.push({
                name: subName,
                grandchildren: grandchildren
            });
        });

        modulesTreeStructure.push({
            name: module,
            children: children
        });

        console.log(vendorModules[`${module}`]);

        container.append(`
            <div class="tag" data-type="module" data-subCategories="${subCategories}">
            ${module} (${subModulesCount})
            </div>
        `);
    });
}

function initSlidePanel(openBtnSelector, panelClass, overlayClass) {
    const panel = document.querySelector(panelClass);
    const overlay = document.querySelector(overlayClass);
    const btns = document.querySelectorAll(openBtnSelector);

    btns.forEach(btn => {
        btn.addEventListener('click', () => {
            const type = btn.dataset.type;

            if (type == 'module'){
                $('.slide-panel').empty();
                //$('.slide-panel').addClass('r-550');
                $('.slide-panel').addClass('w-550');
                $('.slide-panel').append('<div id="treeChecklist"></div>');
                renderTree();
            }else{
                const id = btn.dataset.id;
                const status = btn.dataset.status;
                const data = JSON.parse(atob(btn.dataset.data));

                $('.slide-panel').empty();
                $('.slide-panel').removeClass('w-550');
                $('.slide-panel').append(`<h3>Lead Details</h3>
                    <p><strong>Company</strong></p>
                    <input type="text" placeholder="Company Name" value="${data.company_name}" disabled>
                    <input type="text" placeholder="HeadCount" value="${data.headcount}" disabled>

                    <p><strong>Contact Person</strong></p>
                    <input type="text" placeholder="Full Name" value="${data.name}" disabled>
                    <input type="email" placeholder="Email" value="${data.email}" disabled>

                    <p><strong>Modules</strong></p>
                    <input type="text" placeholder="Modules" value="${data.modules}" disabled>

                    <p><strong>Question</strong></p>
                    <span>${data.question}</span>

                    <p><strong>Status</strong></p>
                    <select id="leadStatus" data-id="${id}">
                        <option selected>In Progress</option>
                        <option>Completed</option>
                    </select>
                `);

                $('#leadStatus').val(status);
                if (status == 'Completed') $('#leadStatus').prop('disabled', true);

                //$('.slide-panel').removeClass('r-550');
            }

            panel.classList.add('active');
            overlay.style.display = 'block';
        });
    });

    overlay.addEventListener('click', () => {
        panel.classList.remove('active');
        overlay.style.display = 'none';
        $('.slide-panel').removeClass('w-550');
    });
}

function renderTree() {
    const container = $('#treeChecklist');
    container.empty();

    container.append('<span style="color:grey">Click arrow to expand.<br/><br/></span>');

    modulesTreeStructure.forEach((module, moduleIndex) => {
        let childrenHtml = '';

        module.children.forEach((child, childIndex) => {
            let grandchildrenHtml = '';

            child.grandchildren.forEach((grandchild, grandchildIndex) => {
                grandchildrenHtml += `
                    <div class="tree-grandchild">
                        <label>- ${grandchild}</label>
                    </div>
                `;
            });

            childrenHtml += `
                <div class="tree-child">
                    <div class="tree-child-header">
                        <span class="tree-arrow">&#9654;</span>
                        <label>${child.name}</label>
                    </div>
                    <div class="tree-grandchildren">
                        ${grandchildrenHtml}
                    </div>
                </div>
            `;
        });

        container.append(`
            <div class="tree-node">
                <div class="tree-parent">
                    <span class="tree-arrow">&#9654;</span>
                    <label>${module.name}</label>
                </div>
                <div class="tree-children">
                    ${childrenHtml}
                </div>
            </div>
        `);
    });

    container.append('<span style="color:grey"><br/>Something missing or incorrect? Contact <a href="">Udder Consultant</a>.</span>');
}

$(function(){
    const isLoggedIn = App.getCookie('is_logged_in');
    const userId = App.getCookie('user_id');
    if (isLoggedIn !== 'true' || userId === null) {
        location.href = PAGES.login;
        return;
    }
    
    loadUserProfile(userId);

    $(document).on('change', '#leadStatus', async function(){
        const val = $(this).val();
        const id = $(this).data('id');
       
        if (val == 'In Progress') return;

        const response = await fetch('/api/supabase?action=updateLeadStatus', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: id,
                status: val
            }),
        });

        const result = await response.json();
        if (result.error){
            App.errorNotification(App.OPERATION_FAILED);
            return;
        }

        $(`#view_${id}`).attr('data-status', val);
        $(`#${id}_status`).text(val);
        $(`#${id}_status`).removeClass('status-badge');
        $(`#${id}_status`).addClass('status-badge-completed');
    });

    $(document).on('change', '#statusFilter', function() {
        const selectedStatus = $(this).val();

        $('.lead-table tbody tr').each(function() {
            const rowStatus = $(this).data('status'); 
            if (!selectedStatus || rowStatus === selectedStatus) {
            $(this).show();
            } else {
            $(this).hide();
            }
        });
    });

    $('#contactUdderBtn').on('click', async function(){
        var $btn = $(this);

        const headcount = $('#headcount').val();
        const country = $('#country').val();
        const message = $('#message').val();
        const service = $('#service').val();
        const vendorName = $('#title').text();

        if (!message || !service){
            App.errorNotification('Fields with * are required.');
            return;
        }

        if ($btn.data('...')) return;
        $btn.data('...', true);
        $btn.append('<span class="spinner-btn-clicked"></span>');
        $btn.css('pointer-events', 'none');
       
        const res = await fetch(App.ZAPIER_SEND_EMAIL, {
            method: "POST",
            body: JSON.stringify({ 
                to: UDDER_SUPPORT, 
                subject: 'New Message Received', 
                body: GET_IN_TOUCH_EMAIL.replace('{{FNAME}}', user.first_name).replace('{{LNAME}}', user.last_name).replace('{{EMAIL}}', user.email).replace('{{VENDOR_NAME}}', vendorName).replace('{{SERVICE}}', service).replace('{{MSG}}', message) })
        });

        const filters = await res.json();
        App.successNotification('Message sent!');
        resetBtn();

        function resetBtn(){
            $btn.data('loading', false);
            $btn.find('.spinner-btn-clicked').remove();
            $btn.css('pointer-events', 'auto');
            $btn.data('...', false);
        }
    });

    $('#saveSettings').on('click', async function(){
        var $btn = $(this);
        
        const email = $('#uemail').val();
        const password = $('#password').val();
        const autoRefresh = $('#autoRefresh').val();

        if (password != '' && password.length < 8){
            App.errorNotification('Password must be 8 characters long minimum');
            return;
        }

        if (!email){
            App.errorNotification('An email address is required.');
            return;
        }
        
        if ($btn.data('...')) return;
        $btn.data('...', true);
        $btn.append('<span class="spinner-btn-clicked"></span>');
        $btn.css('pointer-events', 'none');

        const response = await fetch('/api/supabase?action=updateUserProfile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: userId,
                payload: {
                    email: email, 
                    password: password
                }
            }),
        });

        const result = await response.json();
        if (result.error) {
            console.error(result.error);
            App.errorNotification(App.OPERATION_FAILED);
            return;
        }
        
        const res = await fetch('/api/supabase?action=updateVendorAutoRefresh', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: user.vendor_id,
                autoRefresh: autoRefresh
            }),
        });

        const r = await res.json();
        if (r.error) {
            console.error(r.error);
            App.errorNotification(App.OPERATION_FAILED);
            return;
        }

        if (autoRefresh == 'N'){
            $('#profileDataUpdateNote').addClass('hide');
            $('#refeshData').addClass('hide');
            $('#tech-profile-form input[type="text"], #tech-profile-form #tech-profile-form input[type="email"], #tech-profile-form select, #tech-profile-form textarea').prop('disabled', false);
        }else{
            $('#profileDataUpdateNote').removeClass('hide');
            $('#refeshData').removeClass('hide');
            $('#tech-profile-form input[type="text"], #tech-profile-form input[type="url"], #tech-profile-form input[type="email"], #tech-profile-form select, #tech-profile-form textarea').prop('disabled', true);
        }

        App.successNotification('Saved!');
        resetBtn();
        //location.reload();

        function resetBtn(){
            $btn.data('loading', false);
            $btn.find('.spinner-btn-clicked').remove();
            $btn.css('pointer-events', 'auto');
            $btn.data('...', false);
        }
    });

    // Add module on Enter or comma
    $('#modulesInput').on('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ',') {
        e.preventDefault();
        const val = $(this).val().trim();
        if (val && !modules.find(m => m.name === val)) {
            modules.push(val); 
            renderTags();
            $(this).val('');
        }
        }
    });

    // Remove module when clicking ×
    $('#modulesTags').on('click', '.remove-tag', function(e) {
        e.stopPropagation(); 
        const index = $(this).data('index');
        modules.splice(index, 1);
        renderTags();
    });

    // Tag click to show sub-modules
    $('#modulesTags').on('click', '.tag', function() {
        const index = $(this).data('index');
        const module = modules[index];
    });

    // $('#getCertifiedBtn').on('click', async function(){
    //     var $btn = $(this);
    //     const vendorName = $('#title').text();
    //     const fname = $('#fname').val();
    //     const lname = $('#lname').val();
    //     const email = $('#uemail').val();

    //     if ($btn.data('...')) return;
    //     $btn.data('...', true);
    //     $btn.append('<span class="spinner-btn-clicked"></span>');
    //     $btn.css('pointer-events', 'none');

    //     const res = await fetch(App.ZAPIER_SEND_EMAIL, {
    //         method: "POST",
    //         body: JSON.stringify({ 
    //             to: UDDER_SUPPORT, 
    //             subject: 'Certification Requested', 
    //             body: CERTIFICATION_REQUESTED_EMAIL.replace('{{FNAME}}', fname).replace('{{LNAME}}', lname).replace('{{EMAIL}}', email).replace('{{VENDOR_NAME}}', vendorName) })
    //     });

    //     const filters = await res.json();
    //     App.successNotification('Email sent!');
    //     resetBtn();

    //     function resetBtn(){
    //         $btn.data('loading', false);
    //         $btn.find('.spinner-btn-clicked').remove();
    //         $btn.css('pointer-events', 'auto');
    //         $btn.data('...', false);
    //     }
    // });

    $('#logoutBtn').click(async function() {
        App.setCookie('is_logged_in', false);
        location.href = PAGES.login;
    });

    // Save profile example
    $('#saveProfile').click(async function() {
        var $btn = $(this);

        let locations = [];
        let integrations = [];

        $('#select2-locations-container .select2-selection__choice__display').each(function () {
            locations.push($(this).text().trim());
        });

        $('#select2-integrations-container .select2-selection__choice__display').each(function () {
            integrations.push({name: $(this).text().trim()});
        });

        const description = $('#companyDescription').val();
        const headcount = $('#companySize').val();

        const input = document.getElementById('screenshotInput');
        const files = input.files;
        
        if (files.length > 0){
            const formData = new FormData();
            formData.append('vendorId', user.vendor_id);
            console.log('in here');
            for (const file of files) {
                formData.append('files', file);
            }

            const response = await fetch('/api/supabase?action=uploadVendorScreenshots', {
                method: 'POST',
                body: formData,
            });
    
            const result = await response.json();
            if (result.error){
                //resetBtn();
                App.errorNotification(result.error);
                return;
            }
           
            result.data.forEach(image => {
                $('#screenshotPreview').append(`<img src="${image}" />`);
            });
        }
      
        if ($btn.data('...')) return;
        $btn.data('...', true);
        $btn.append('<span class="spinner-btn-clicked"></span>');
        $btn.css('pointer-events', 'none');
      
        vendorData.company.meta.region = locations;
        vendorData.company.meta.target_market = headcount;
        vendorData.company.integrations = integrations;
        
        const response = await fetch('/api/supabase?action=updateVendor', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: user.vendor_id,
                payload: vendorData,
                description: description
            }),
        });

        const result = await response.json();
        if (result.error) {
            console.error(result.error);
            App.errorNotification(App.OPERATION_FAILED);
            return;
        }

        App.successNotification('Saved!');
        resetBtn();

        function resetBtn(){
            $btn.data('loading', false);
            $btn.find('.spinner-btn-clicked').remove();
            $btn.css('pointer-events', 'auto');
            $btn.data('...', false);
        }

        // const profileData = {
        //     companyDescription: $('#companyDescription').text(),
        //     headcount: $('#headcount').val(),
        //     locations: $('#locations').val(),
        //     modules: modules
        // };
        // console.log('Saved Profile:', profileData);
        // alert('Profile saved successfully!');
    });

    $('body').on('click', '#treeChecklist .tree-parent', function(e) {
        if (!$(e.target).is('input')) {
            $(this).toggleClass('open');
            $(this).next('.tree-children').slideToggle();
        }
    });

    $('body').on('click', '#treeChecklist .tree-child-header', function(e) {
        if (!$(e.target).is('input')) {
            $(this).toggleClass('open');
            $(this).next('.tree-grandchildren').slideToggle();
        }
    });

    $('body').on('change', '#treeChecklist input[type="checkbox"]', function() {
        console.log('Selected:', $(this).data());
    });
});

async function loadUserProfile(id){
    const response = await fetch(`/api/supabase?action=getUserById&userId=${id}`);
    const result = await response.json();

    if (result.error) {
        console.error(result.error);
        App.errorNotification(App.OPERATION_FAILED);
        return;
    }

    user = result.data;
    if (user.role != 'vendor'){
        App.setCookie('is_logged_in', false);
        location.href = PAGES.login;
        return;
    }
    
    if (user.vendor_id === null || user.vendor_id == ''){
        location.href = PAGES.assign_vendor;
        return;
    }

    getVendorData(user.vendor_id);

    $('.dashboard').removeClass('hide');
    $('.loader-wrapper').addClass('hide');

    console.info('user', user);
    $('#fname').val(user.first_name);
    $('#lname').val(user.last_name);
    $('#uemail').val(user.email);

}

async function getVendorData(vendorId){
    $('.chart-container').append('<div style="text-align:center" id="loaderContainer"></div>');
    $('#loaderContainer').append(App.xloader());

    let supportedIntegrations = [];
    let profilecompleteness = 0;
    let profilecompletenesshints = [];
    let screenshots = [];

    const response = await fetch(`/api/supabase?action=getVendorById&vendorId=${vendorId}`);
    const result = await response.json();

    if (result.error) {
        console.error(result.error);
        App.customError(App.OPERATION_FAILED);
        return;
    }

    const vendor = result.data;
    console.log('vendor', vendor);
    vendorData = vendor.data;
    const supportedLocations = vendor.data.company.meta.region ?? '';
    const headcount = vendor.data.company.meta.target_market ?? '';
    const integrations = vendor.data.company.integrations ?? '';
    const websiteUrl = vendor.data.company.website ?? '';
    
    integrations.forEach(integration => {
        supportedIntegrations.push(integration.name);
    });

    vendorModules = vendor.data.company.modules ?? [];
    Object.entries(vendorModules).forEach(([moduleName, subModules]) => {
        modules.push(moduleName);
    });

    if (supportedLocations != '') {
        profilecompleteness++;
    }else{
        profilecompletenesshints.push('Add locations');
    }

    if (headcount != ''){
        profilecompleteness++;
    }else{
        profilecompletenesshints.push('Add headcount');
    }

    if (vendor.short_description.length > 200){
        profilecompleteness++;
    }else{
        profilecompletenesshints.push('Add a longer description');
    }

    renderTags();

    initSlidePanel('.open-panel-btn', '.slide-panel', '.overlay');
    loadViewsAndLeads(vendorId);

    // company size
    for (var size of COMPANY_SIZE){
        $('#companySize').append(`<option value="${size}">${size}</option>`);
    }

    const [min, max] = (!headcount.includes('+')) ? headcount.split('-') : ['1000', '9999999'];
    for (var size of COMPANY_SIZE){
        const [minSize, maxSize] = (!size.includes('+')) ? size.split('-') :  ['1000', '9999999'];
        if (max >= minSize && max <= maxSize){
            $('#companySize').val(size);
            break;
        }
    }

    // get locations
    let locations = [];
    for (var location of LOCATIONS){
        locations.push({
            'id': location,
            'text':location
        });
    }

    initMultiSelect('#locations', locations);
    $('#locations').val(supportedLocations).trigger('change');

    // get integrations
    let hrIntegrations = [];
    for (var integration of HRINTEGRATIONS){
        hrIntegrations.push({
            'id': integration,
            'text':integration
        });
    }

    initMultiSelect('#integrations', hrIntegrations);
    $('#integrations').val(supportedIntegrations).trigger('change');

    $('#title').text(vendor.name);
    $("#logo_img").attr("src", App.getLogo(vendor.logo));
    $("#companyDescription").text(vendor.short_description);
    //$("#locations").val(supportedLocations.join(', '));
    //$("#integrations").val(supportedIntegrations.join(', '));
    $("#website").val(websiteUrl);
    $('#autoRefresh').val(vendor.auto_refresh);
    $("#logo_img").removeClass('hide');

    // get in touch fields
    $("#headcount").val(headcount);
    $("#country").val(supportedLocations.join(', '));

    if (vendor.auto_refresh == 'Y'){
        //$('#saveProfile').prop('disabled', true);
        $('#profileDataUpdateNote').removeClass('hide');
        $('#refeshData').removeClass('hide');
        $('#tech-profile-form input[type="text"], #tech-profile-form input[type="url"], #tech-profile-form input[type="email"], #tech-profile-form select, #tech-profile-form textarea').prop('disabled', true);
    }

    const screenshotsres = await fetch(`/api/supabase?action=getVendorScreenshots&vendorId=${vendorId}`);
    const screenshotsrt = await screenshotsres.json();

    if (screenshotsrt.error) {
        console.error(screenshotsrt.error);
        App.customError(App.OPERATION_FAILED);
        return;
    }

    screenshotsrt.images.forEach(image => {
        $('#screenshotPreview').append(`<img src="${image}" />`);
    });

    if (screenshotsrt.images.length){
        profilecompleteness += screenshotsrt.images.length;
        if (screenshotsrt.images.length < 5) profilecompletenesshints.push('Add screenshots (min 5)');
    }else{
        profilecompletenesshints.push('Add screenshots (min 5)');
    }

    const profileCompletenessPercentage = parseInt(((profilecompleteness / 8) * 100));
    $('#profileCompletenessPercentage').text(`${profileCompletenessPercentage}%`);
    profilecompletenesshints.forEach(hint => {
        $('#hints').append(`<br/>- ${hint}`);
    });

    if (profileCompletenessPercentage == 100) $('.hints').addClass('hide');
}

function initMultiSelect(selector, options = []) {
    $(selector).select2({
        placeholder: $(selector).attr('placeholder') || "Select options",
        multiple: true,
        tags: true,          
        tokenSeparators: [',', ' '],
        data: options
    });
}

async function loadViewsAndLeads(vendorId){
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const months = [];
    const values = [];
    const viewsValues = [];
    const monthKeys = [];
    const now = new Date();

    const response = await fetch(`/api/supabase?action=getVendorViews&vendorId=${vendorId}`);
    const result = await response.json();

    if (result.error) {
        console.error(result.error);
        App.errorNotification(App.OPERATION_FAILED);
        return;
    }

    const last7DaysViewCount = result.data.filter(item =>
        new Date(item.created_at) >= sevenDaysAgo
    ).length;

    // const res = await fetch(`/api/supabase?action=getVendorViewCountLast7Days&vendorId=${vendorId}`);
    // const r = await res.json();

    // if (r.error) {
    //     console.error(r.error);
    //     App.errorNotification(App.OPERATION_FAILED);
    //     return;
    // }

    const responseLeads = await fetch(`/api/supabase?action=getVendorLeads&vendorId=${vendorId}`);
    const resultLeads = await responseLeads.json();

    if (resultLeads.error) {
        console.error(result.error);
        App.errorNotification(App.OPERATION_FAILED);
        return;
    }

    leads = resultLeads.data;

    const last7DaysLeadCount = resultLeads.data.filter(item =>
        new Date(item.created_at) >= sevenDaysAgo
    ).length;

    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);

        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

        monthKeys.push(key);
        months.push(d.toLocaleString('default', { month: 'short' }));
        values.push(0);
        viewsValues.push(0);
    }

    // add leads per month
    resultLeads.data.forEach(item => {
        const created = new Date(item.created_at);
        const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;

        const index = monthKeys.indexOf(key);

        if (index !== -1) {
            values[index]++;
        }
    });

    // add views per month
    result.data.forEach(item => {
        const created = new Date(item.created_at);
        const key = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;

        const index = monthKeys.indexOf(key);

        if (index !== -1) {
            viewsValues[index]++;
        }
    });

    loadLineGraph(months, values, viewsValues);
    addLeadsToTable();

    $('#allTimeLeads').text(resultLeads.data.length);
    $('#weeklyLeads').text(last7DaysLeadCount);
    $('#allTimeViews').text(result.data.length);
    $('#weeklyViews').text(last7DaysViewCount);
}

function loadLineGraph(months, values, viewsValues){
    $('#loaderContainer').remove();

    $('.chart-container').append('<canvas id="tutShadedChart"></canvas>');
    const ctx = document.getElementById('tutShadedChart').getContext('2d');
    const tutChart = new Chart(ctx, {
        type: 'line', // Base type is line, we enable 'fill' for shading
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Leads',
                    data: values,
                    // TUT Blue color configuration
                    borderColor: '#1976D2',
                    backgroundColor: '#1976D233', // 0.2 opacity hex
                    fill: true, // This enables the shaded area
                    tension: 0.4, // Smoothing
                    borderWidth: 3,
                    pointBackgroundColor: '#1976D2',
                    pointRadius: 5,
                    pointHoverRadius: 7
                },
                {
                    label: 'Views',
                    data: viewsValues,
                    // TUT Blue color configuration
                    borderColor: '#D32F2F',
                    backgroundColor: '#D32F2F33', // 0.2 opacity hex
                    fill: true, // This enables the shaded area
                    tension: 0.4, // Smoothing
                    borderWidth: 3,
                    pointBackgroundColor: '#D32F2F',
                    pointRadius: 5,
                    pointHoverRadius: 7
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false, 
            plugins: {
                legend: {
                    display: true,       
                    position: 'bottom',  
                    labels: {
                        font: {
                            size: 14
                        },
                        color: '#333'
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    padding: 15,
                    cornerRadius: 8
                }
            },
            scales: {
                x: {
                    grid: { display: false } 
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        callback: function(value) { return value; }
                    }
                }
            },
            interaction: {
                mode: 'nearest',
                axis: 'x',
                intersect: false
            }
        }
    });

    $('.chart-container').css('display', 'contents');
}

function addLeadsToTable(){
    let count = 1;
    leads.forEach(lead => {
        const date = new Date(lead.created_at);
        const badgeClass = (lead.status == 'Completed') ? 'status-badge-completed': 'status-badge';

        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const formatted = `${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
        
        $('.lead-table tbody').append(`
            <tr data-id="${lead.id}" data-status="${lead.status}">
                <td>${count}</td>
                <td><a href="javascript:void(0)" data-type="lead" id="view_${lead.id}" data-status="${lead.status}" data-id="${lead.id}" data-data="${btoa(JSON.stringify(lead.client_details))}" class="open-panel-btn">${lead.client_details.company_name}</a></td>
                <td>${lead.client_details.name}</td>
                <td>${lead.client_details.email}</td>
                <td><span class="${badgeClass}" id="${lead.id}_status">${lead.status}</span></td>
                <td>${formatted}</td>
                <td>${lead.client_details.headcount}</td>
                <td>${lead.client_details.modules}</td>
            </tr>
        `);
        count++;
    });
    
    if (leads.length < 5){
        for (var i = count; i <= 5; i++){
            $('.lead-table tbody').append(`
                <tr><td>${i}</td><td colspan="7"></td></tr>
            `);
        }
    }

    initSlidePanel('.open-panel-btn', '.slide-panel', '.overlay');
}