import * as App from '../../app.js';
import * as Constant from '../../utils/constants.js'

const userId = App.getCookie('user_id');
$(function(){
    const isLoggedIn = App.getCookie('is_logged_in');
    if (isLoggedIn !== 'true') location.href = Constant.PAGES.login;

    $('#year').text(App.currentYear());

    const $input = $('#dropdownInput');
    const $list = $('#dropdownList');
    const $items = $('#dropdownList li');

    loadVendors();

    $input.on('click', function () {
        $list.toggle();
        $input.val('');
        filterList('');
    });

    $input.on('input', function () {
        filterList($(this).val());
    });

    function filterList(value) {
        value = value.toLowerCase();

        $('#dropdownList li').each(function () {
            const text = $(this).text().toLowerCase();

            if (text.includes(value)) {
                $(this).show();
            } else {
                $(this).hide();
            }
        });
    }

    $('#dropdownList').on('click', 'li', function () {
        $input.val($(this).text());
        $input.attr('data-id', $(this).data('id'));
        $list.hide();
    });

    $(document).on('click', function (e) {
        if (!$(e.target).closest('#dropdownInput, #dropdownList').length) {
            $list.hide();
        }
    });

    $('#claimVendorBtn').on('click', function(){
        $('.modal-demo').removeClass('hide');
        $('body').addClass('modal-active');
    });

    $('#closeDemoModal').on('click', function(){
        $('.modal-demo').addClass('hide');
        $('body').removeClass('modal-active');
    });

    $('#closeNewVendorModal').on('click', function(){
        $('.modal-new-vendor').addClass('hide');
        $('body').removeClass('modal-active');
    });

    $('#addNewVendor').on('click', function(){
        $('.modal-new-vendor').removeClass('hide');
        $('body').addClass('modal-active');
    });

    $('#submitNewVendor').on('click', async function(){
        const val = $('#websiteUrl').val().trim();
        if (!val || val == 'https://') return;

        var $btn = $(this);

         if ($btn.data('...')) return;
        $btn.data('...', true);
        $btn.append('<span class="spinner-btn-clicked"></span>');
        $btn.css('pointer-events', 'none');

        const user = await getUser();

        const response = await fetch('/api/supabase?action=addVendorRequest', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, websiteUrl: val}),
        });

        const result = await response.json();
        if (result.error){
            App.errorNotification(result.error);
            resetBtn();
            return;
        }

         App.swal.fire({
            title: "Success!",
            text: "You will be notified once your vendor profile is created!",
            icon: "success"
        });

        const body = Constant.NEW_VENDOR_REQUEST_EMAIL
                    .replace('{{WEBSITE_URL}}', val)
                    .replace('{{USER_NAME}}', `${user.first_name} ${user.last_name}`)
                    .replace('{{USER_EMAIL}}', user.email);

        const res = await fetch(App.ZAPIER_SEND_EMAIL, {
            method: "POST",
            body: JSON.stringify({ 
                to: Constant.UDDER_SUPPORT, 
                subject: 'New Vendor Request Received', 
                body: body 
            })
        });

        $('#closeNewVendorModal').trigger('click');
        resetBtn();
    });

    $('#submitBtn').on('click', async function(){
        var $btn = $(this);
       
        const val = $('#dropdownInput').val();
        const vendorId = $('#dropdownInput').data('id');
        if (!val) return;

        if ($btn.data('...')) return;
        $btn.data('...', true);
        $btn.append('<span class="spinner-btn-clicked"></span>');
        $btn.css('pointer-events', 'none');

        const user = await getUser();

        const response = await fetch('/api/supabase?action=addVendorClaim', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId: userId, vendorId: vendorId}),
        });

        const result = await response.json();
        if (result.error){
            App.errorNotification(result.error);
            resetBtn();
            return;
        }

        App.swal.fire({
            title: "Success!",
            text: "You will be notified once your claim is approved!",
            icon: "success"
        });

        const body = Constant.VENDOR_CLAIM_EMAIL
                    .replace('{{VENDOR_NAME}}', val)
                    .replace('{{USER_NAME}}', `${user.first_name} ${user.last_name}`)
                    .replace('{{USER_EMAIL}}', user.email);

        const res = await fetch(App.ZAPIER_SEND_EMAIL, {
            method: "POST",
            body: JSON.stringify({ 
                to: Constant.UDDER_SUPPORT, 
                subject: 'Vendor Claim Received', 
                body: body 
            })
        });

        const filters = await res.json();
        $('#closeDemoModal').trigger('click');
    });

    function resetBtn(){
        $btn.data('loading', false);
        $btn.find('.spinner-btn-clicked').remove();
        $btn.css('pointer-events', 'auto');
        $btn.data('...', false);
    }
});

async function loadVendors(){
    $('#loaderWith3Dots').append(App.loaderWith3Dots());
    const response = await fetch('/api/supabase?action=getVendors');
    const result = await response.json();

    if (result.error) {
        console.error(result.error);
        App.swal.fire({
            icon: "error",
            title: "Oops...",
            text: App.OPERATION_FAILED,
        }).then(function(){
            location.reload();
        });

        return;
    }
    $('#dropdownList').empty();
    
    result.data.forEach(async vendor => {
        $('#dropdownList').append(`<li data-id="${vendor.id}">${vendor.name}</li>`);
    });

    $('#loaderWith3Dots').remove();
    $('.dropdown').removeClass('hide');
    $('#submitBtn').prop('disabled', false);
}

async function getUser(){
    const response = await fetch(`/api/supabase?action=getUserById&userId=${userId}`);
    const result = await response.json();

    if (result.error) {
        console.error(result.error);
        App.errorNotification(App.OPERATION_FAILED);
        return;
    }

    return result.data;
}