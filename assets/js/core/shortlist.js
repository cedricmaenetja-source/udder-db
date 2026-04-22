import * as App from '../app.js';

$(function() {
    let myShortlist = App.getCookie('shortlist');
    myShortlist = (myShortlist == null) ? [] : JSON.parse(decodeURIComponent(myShortlist));
    
    console.log('short', myShortlist);
    
    // Update Badge
    $('#shortlistCountBadge').text(myShortlist.length);

    // ── Render Table Body ──
    myShortlist.forEach(item => {
        const matchScore = (item.matchScore === 'NaN' || !item.matchScore) ? 0 : item.matchScore;
        const systemPart = (item.systemPart === undefined) ? 'N/A' : item.systemPart;
        
        $('#shortlistBody').append(`
            <tr data-id="${item.id}">
                <td>
                    <div class="platform-cell">
                        <div class="platform-logo-placeholder" style="background:#e8f4fd;color:#2563eb;">${App.initials(item.name)}</div>
                        <a href="evaluation.html?id=${item.id}" class="platform-name">${item.name}</a>
                    </div>
                </td>
                <td><div class="match-score high">${matchScore}%</div></td>
                <td><span class="system-type">${systemPart}</span></td>
                <td>
                    <div class="star-rating" data-platform="${item.name}">
                        <span class="star filled" data-val="1">★</span>
                        <span class="star filled" data-val="2">★</span>
                        <span class="star filled" data-val="3">★</span>
                        <span class="star filled" data-val="4">★</span>
                        <span class="star" data-val="5">★</span>
                    </div>
                </td>
                <td>
                    <div class="actions-cell">
                        <button class="action-link">Request demo</button>
                        <span class="action-sep">·</span>
                        <button class="action-link remove-btn">Remove</button>
                        <span class="action-sep">·</span>
                        <button class="action-link" style="color:var(--orange);">Ask Udder</button>
                    </div>
                </td>
            </tr>
        `);
    });

    // ── Sort dropdown ──
    const sortDrop = document.getElementById('sortDropdown');
    if (sortDrop) {
        const sortTrigger = sortDrop.querySelector('.sort-trigger');
        const sortOptions = sortDrop.querySelectorAll('.sort-option');
        const sortValue = sortDrop.querySelector('.sort-value');

        sortTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            sortDrop.classList.toggle('open');
        });

        sortOptions.forEach(opt => {
            opt.addEventListener('click', () => {
                sortOptions.forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                sortValue.textContent = opt.textContent;
                sortDrop.classList.remove('open');
            });
        });

        document.addEventListener('click', (e) => {
            if (!sortDrop.contains(e.target)) sortDrop.classList.remove('open');
        });
    }

    // ── Star rating interaction (Delegated) ──
    $(document).on('mouseenter', '.star', function() {
        const val = parseInt($(this).data('val'));
        const stars = $(this).closest('.star-rating').find('.star');
        stars.each(function() {
            $(this).css('color', parseInt($(this).data('val')) <= val ? 'var(--orange)' : '#d1d5db');
        });
    }).on('mouseleave', '.star', function() {
        const stars = $(this).closest('.star-rating').find('.star');
        stars.each(function() {
            $(this).css('color', $(this).hasClass('filled') ? 'var(--orange)' : '#d1d5db');
        });
    }).on('click', '.star', function() {
        const val = parseInt($(this).data('val'));
        const stars = $(this).closest('.star-rating').find('.star');
        stars.each(function() {
            if (parseInt($(this).data('val')) <= val) {
                $(this).addClass('filled');
            } else {
                $(this).removeClass('filled');
            }
        });
    });

    // ── Remove row (Delegated & Cookie Updated) ──
    $(document).on('click', '.action-link', function(e) {
        if ($(this).text().trim() === 'Remove') {
            const $row = $(this).closest('tr');
            const vendorId = $row.data('id');

            myShortlist = myShortlist.filter(item => item.id !== vendorId);
            App.setCookie('shortlist', JSON.stringify(myShortlist), 7);

            $row.css({ 'opacity': '0', 'transition': 'opacity 0.25s' });
            setTimeout(() => {
                $row.remove();
                $('#shortlistCountBadge').text(myShortlist.length);
            }, 250);
        }
    });

    // ── Search/filter ──
    $('#shortlistSearch').on('input', function() {
        const q = $(this).val().toLowerCase();
        $('#shortlistBody tr').each(function() {
            const name = $(this).find('.platform-name').text().toLowerCase();
            $(this).toggle(name.includes(q));
        });
    });

    // ── Hide loader ──
    const loader = document.getElementById('xloader');
    if (loader) loader.style.display = 'none';
});