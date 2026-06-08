/**
 * compare.js
 * assets/js/compare.js — load after jQuery
 * Requires: jQuery, SheetJS (xlsx) for Excel export
 * PDF export uses browser print, CSV is pure JS
 */
(function ($) {
  'use strict';

  var MAX = 3;
  var compareMode   = false;
  var selectedCards = [];

  var ICON_CMP  = '<svg viewBox="0 0 16 16" fill="none" width="13" height="13" style="flex-shrink:0"><rect x="1" y="4" width="6" height="10" rx="1" stroke="currentColor" stroke-width="1.3"/><rect x="9" y="1" width="6" height="13" rx="1" stroke="currentColor" stroke-width="1.3"/></svg>';
  var ICON_ADD  = '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="flex-shrink:0"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>';
  var ICON_TICK = '<svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" style="flex-shrink:0"><polyline points="1,7 5,11 13,3"/></svg>';

  /* ── Taxonomy ── */
  var TAXONOMY = [
    {
      label: 'Core HR / HRIS', key: 'core hr',
      items: ['Employee records & profiles','Onboarding & offboarding','Organization management','Leave & absence management','Compensation & benefits','Document management','Compliance & audit']
    },
    {
      label: 'ATS / Recruiting', key: 'recruiting',
      items: ['Job posting & distribution','Candidate pipeline management','Interview scheduling & feedback','Offer management','Employer branding']
    },
    {
      label: 'Payroll', key: 'payroll',
      items: ['Payroll processing','Tax filing & compliance','Compensation adjustments','Payslips & reporting']
    },
    {
      label: 'Time & Attendance', key: 'time',
      items: ['Time tracking','Shift & schedule management','Overtime & absence tracking']
    },
    {
      label: 'Performance Management', key: 'performance',
      items: ['Goal setting & OKRs','Performance reviews & cycles','Continuous feedback','360 feedback']
    },
    {
      label: 'Employee Engagement', key: 'engagement',
      items: ['Surveys & pulse checks','Recognition & rewards','Communication & announcements']
    },
    {
      label: 'People Analytics', key: 'analytics',
      items: ['Workforce dashboards & reports','Headcount & turnover analysis','DEI analytics','Predictive insights']
    }
  ];

  /* ── Mode toggle ── */
  $(document).on('click', '#compareBtn', function () {
    if (compareMode) {
      exitMode();
    } else {
      enterMode();
    }
  });

  function enterMode() {
    compareMode = true;
    $('#compareBtn').addClass('active').html(ICON_CMP + '&nbsp;Cancel');
    $('#vendors').addClass('compare-mode');
    syncActionBtn();
  }

  function exitMode() {
    console.log('exitMode called', new Error().stack);
    compareMode   = false;
    selectedCards = [];
    $('#compareBtn').removeClass('active').html(ICON_CMP + '&nbsp;Select to compare');
    $('#vendors').removeClass('compare-mode');
    $('#vendors .card').removeClass('compare-selected')
      .find('.card-add-btn').removeClass('added').html(ICON_ADD + '&nbsp;Add');
    syncActionBtn();
  }

  /* ── Add button ── */
  $(document).on('click', '.card-add-btn', async function (e) {
    e.stopPropagation();
    if (!compareMode) return;
    var $btn = $(this), card = $btn.closest('.card')[0], added = $btn.hasClass('added');
    if (added) {
      selectedCards.splice(selectedCards.indexOf(card), 1);
      $(card).removeClass('compare-selected');
      $btn.removeClass('added').html(ICON_ADD + '&nbsp;Add');
    } else {
      if (selectedCards.length >= MAX) { showToast('Maximum ' + MAX + ' vendors can be compared.'); return; }
      selectedCards.push(card);
      $(card).addClass('compare-selected');
      $btn.addClass('added').html(ICON_TICK + '&nbsp;Added');
      const response = await fetch('/api/supabase?action=addComparison', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
              vendorId: card.dataset.id,
              userId: window._user.id
          }),
      });

      fetch('/api/supabase?action=addActivity', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          vendorId: card.dataset.id,
          username: `${window._user.first_name} ${window._user.last_name}`,
          message: 'added you to comparison',
          source: 'Comparison views'
        })
      });
    }
    syncActionBtn();
  });

  function syncActionBtn() {
    var n = selectedCards.length;
    $('#compareCount').text(n);
    $('#moreBtn .nb').text(n);
    if (n >= 2) {
      $('#compareActionBtn').removeClass('hide').prop('disabled', false);
      $('#compareBtn').removeClass('hide'); /* keep Cancel visible alongside */
    } else {
      $('#compareActionBtn').addClass('hide').prop('disabled', true);
    }
  }

  $(document).on('click', '#compareActionBtn', function () {
    if (selectedCards.length < 2) return;
    buildPanel(selectedCards);
    $('#compareModal').addClass('open');
  });

  $(document).on('click', '#comparisonCloseModalBtn', function () {
    $('#compareModal').removeClass('open');
    $('#compareBtn').removeClass('hide').show();
    syncActionBtn();
  });

  $(document).on('click', '#cmExitCompareBtn', function () { $('#compareModal').removeClass('open'); exitMode(); });

  /* ── Build comparison panel ── */
  function buildPanel(cards) {
    var $hg   = $('#compareModal .vendor-header-grid').empty();
    var $body = $('#compareModal .xloader-comparison').empty();

    var vendors = cards.map(function (card) {
      var $c = $(card), logoEl = card.querySelector('.card-logo'), badgeEl = card.querySelector('.verification-badge');
      var badgeText = badgeEl ? badgeEl.textContent.trim() : '';
      var v = {
        name: String($c.data('name') || ''),
        logo: String($c.data('logo') || (logoEl ? logoEl.src : '') || ''),
        modules: String($c.data('modules') || ''),
        subcategories: String($c.data('subcategories') || ''),
        features: String($c.data('features') || ''),
        integrations: String($c.data('integrations') || ''),
        headcount: String($c.data('headcount') || ''),
        region: String($c.data('region') || ''),
        badgeText: badgeText,
        isVerified: badgeText.toLowerCase().indexOf('verified') > -1,
        isApproved: badgeText.toLowerCase().indexOf('approved') > -1,
        score: parseInt($c.data('score') || 0),
        description: String($c.data('description') || ''),
      };
      /* Build lookup set from all data */
      v.set = {};
      [v.features, v.modules, v.subcategories].join(',').split(',').forEach(function (f) {
        var k = f.trim().toLowerCase(); if (k) v.set[k] = true;
      });
      return v;
    });

    var cols = '220px ' + Array(vendors.length).fill('1fr').join(' ');

    /* ── Page header ── */
    var names = vendors.map(function (v) { return v.name; }).join(' vs ');
    var ph =
      '<div class="cp-hero">' +
        '<div class="cp-eyebrow">Side-by-side comparison</div>' +
        '<h1 class="cp-title">' + names + '</h1>' +
        '<div class="cp-export-btns">' +
          '<button class="cp-export-btn" id="cpExportXlsx">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 6l2 2-2 2M9 6l-2 2 2 2M5 11h6" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
            'Excel' +
          '</button>' +
          '<button class="cp-export-btn" id="cpExportCsv">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 5h6M5 8h6M5 11h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg>' +
            'CSV' +
          '</button>' +
          '<button class="cp-export-btn" id="cpExportPdf">' +
            '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="2" y="1" width="12" height="14" rx="1.5" stroke="currentColor" stroke-width="1.3"/><path d="M5 5h6M5 8h4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><circle cx="10" cy="11" r="2" stroke="currentColor" stroke-width="1.2"/></svg>' +
            'PDF' +
          '</button>' +
        '</div>' +
      '</div>';

    /* ── Vendor header ── */
    var vh = '<div class="cp-vendor-row cp-grid" style="grid-template-columns:' + cols + '">' +
      '<div class="cp-label-anchor"></div>';
    vendors.forEach(function (v) {
      console.log('score', v);
      var logo = (v.logo && v.logo.indexOf('undefined') === -1 && v.logo.indexOf('null') === -1)
        ? '<img src="' + v.logo + '" class="cp-logo-img" alt="">'
        : '<div class="cp-logo-ph">' + v.name.substring(0,2).toUpperCase() + '</div>';
      var badge = v.badgeText
        ? '<span class="cp-badge cp-badge-' + (v.isVerified ? 'verified' : 'approved') + '">' +
          '<span class="cp-bdot"></span>' + v.badgeText + '</span>'
        : '';
      var score = v.score;
      var scoreBg    = score >= 75 ? 'rgba(22,163,74,0.1)' : score >= 50 ? 'rgba(234,179,8,0.1)' : 'rgba(239,68,68,0.1)';
      var scoreColor = score >= 75 ? '#16a34a' : score >= 50 ? '#b45309' : '#dc2626';
      var scoreHtml  = score > 0
        ? '<div class="cp-vc-score" style="background:' + scoreBg + ';color:' + scoreColor + '">' + score + '% match</div>'
        : '';
      vh +=
        '<div class="cp-vendor-card">' +
          '<div class="cp-vc-top">' + logo + badge + '</div>' +
          '<div class="cp-vc-name">' + v.name + scoreHtml + '</div>' +
          (v.description ? '<div class="cp-vc-desc">' + v.description + '</div>' : '') +
          '<div class="cp-vc-actions">' +
            '<button class="cp-view-btn" data-name="' + v.name + '">View</button>' +
            '<button class="cp-rm-btn" data-name="' + v.name + '">Remove</button>' +
          '</div>' +
        '</div>';
    });
    vh += '</div>';

    /* ── Row builders ── */
    function secHead(label) {
      return '<div class="cp-sec-head cp-grid" style="grid-template-columns:' + cols + ';background:black">' +
        '<div class="cp-sec-label">' + label + '</div>' +
        Array(vendors.length).fill('<div style="background:black"></div>').join('') +
      '</div>';
    }
    function dataRow(label, cells) {
      var r = '<div class="cp-row cp-grid" style="grid-template-columns:' + cols + '">' +
        '<div class="cp-row-lbl">' + label + '</div>';
      cells.forEach(function (c) { r += '<div class="cp-row-cell">' + c + '</div>'; });
      return r + '</div>';
    }
    function boolRow(label, tests) {
      return dataRow(label, tests.map(function (t) {
        return t ? '<span class="cp-yes">&#10003;</span>' : '<span class="cp-no">&#215;</span>';
      }));
    }

    /* ── Body ── */
    var body =
      secHead('Company') +
      dataRow('Org size',     vendors.map(function (v) { return txt(v.headcount); })) +
      dataRow('Regions',      vendors.map(function (v) { return txt(v.region); })) +
      dataRow('Verification', vendors.map(function (v) {
        if (!v.badgeText) return '<span class="cp-muted">&mdash;</span>';
        return '<span class="cp-badge cp-badge-' + (v.isVerified ? 'verified' : 'approved') + '">' +
          '<span class="cp-bdot"></span>' + v.badgeText + '</span>';
      })) +
      boolRow('Certified', vendors.map(function (v) { return v.isApproved || v.isVerified; }));

    TAXONOMY.forEach(function (cat) {
      body += secHead(cat.label) +
        boolRow('Supported', vendors.map(function (v) {
          return (v.modules + ' ' + v.subcategories).toLowerCase().indexOf(cat.key) > -1;
        }));
      cat.items.forEach(function (item) {
        var key = item.toLowerCase();
        body += boolRow(item, vendors.map(function (v) { return !!v.set[key]; }));
      });
    });

    body += secHead('Integrations') +
      dataRow('Supported', vendors.map(function (v) { return chips(v.integrations); }));

    $hg.html(ph + vh);
    $body.html(body);
    injectCSS();

    /* Store current vendors for export */
    window._cmVendors = vendors;

    /* Remove button */
    $('#compareModal').off('click.cm').on('click.cm', '.cp-rm-btn', function () {
      var name = $(this).data('name');
      selectedCards = selectedCards.filter(function (c) {
        if ($(c).data('name') === name) {
          $(c).removeClass('compare-selected').find('.card-add-btn').removeClass('added').html(ICON_ADD + '&nbsp;Add');
          return false;
        }
        return true;
      });
      syncActionBtn();
      selectedCards.length < 2 ? $('#compareModal').removeClass('open') : buildPanel(selectedCards);
    });
  }

  /* ── Formatters ── */
  function txt(v) {
    return (v && v.trim()) ? '<span class="cp-txt">' + v.trim() + '</span>' : '<span class="cp-muted">&mdash;</span>';
  }
  function chips(v) {
    if (!v || !v.trim()) return '<span class="cp-muted">&mdash;</span>';
    return '<div class="cp-chips">' +
      v.split(',').filter(function (s) { return s.trim(); }).slice(0,6)
       .map(function (s) { return '<span class="cp-chip">' + s.trim() + '</span>'; }).join('') +
    '</div>';
  }

  /* ── Export: build flat data table ── */
  function buildTableData() {
    var v = window._cmVendors || [];
    if (!v.length) return [];

    var rows = [];
    /* Header */
    rows.push(['Feature'].concat(v.map(function (vd) { return vd.name; })));

    /* Company */
    rows.push(['--- Company ---'].concat(v.map(function () { return ''; })));
    rows.push(['Org size'].concat(v.map(function (vd) { return vd.headcount; })));
    rows.push(['Regions'].concat(v.map(function (vd) { return vd.region; })));
    rows.push(['Verification'].concat(v.map(function (vd) { return vd.badgeText; })));
    rows.push(['Certified'].concat(v.map(function (vd) { return (vd.isApproved || vd.isVerified) ? 'Yes' : 'No'; })));

    TAXONOMY.forEach(function (cat) {
      rows.push(['--- ' + cat.label + ' ---'].concat(v.map(function () { return ''; })));
      rows.push(['Supported'].concat(v.map(function (vd) {
        return (vd.modules + ' ' + vd.subcategories).toLowerCase().indexOf(cat.key) > -1 ? 'Yes' : 'No';
      })));
      cat.items.forEach(function (item) {
        var key = item.toLowerCase();
        rows.push([item].concat(v.map(function (vd) { return vd.set[key] ? 'Yes' : 'No'; })));
      });
    });

    /* Integrations */
    rows.push(['--- Integrations ---'].concat(v.map(function () { return ''; })));
    rows.push(['Supported'].concat(v.map(function (vd) { return vd.integrations; })));

    return rows;
  }

  /* ── Export: CSV ── */
  $(document).on('click', '#cpExportCsv', function () {
    var rows = buildTableData();
    var csv  = rows.map(function (row) {
      return row.map(function (cell) {
        cell = String(cell || '').replace(/"/g, '""');
        return '"' + cell + '"';
      }).join(',');
    }).join('\r\n');

    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url  = URL.createObjectURL(blob);
    var a    = document.createElement('a');
    a.href = url; a.download = 'vendor-comparison.csv'; a.click();
    URL.revokeObjectURL(url);
  });

  /* ── Export: Excel (SheetJS CDN) ── */
  $(document).on('click', '#cpExportXlsx', function () {
    /* Load SheetJS if not already loaded */
    if (typeof XLSX === 'undefined') {
      var s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
      s.onload = function () { doXlsx(); };
      document.head.appendChild(s);
    } else {
      doXlsx();
    }
  });

  function doXlsx() {
    if (typeof XLSX === 'undefined') { showToast('Excel export unavailable — please try CSV.'); return; }
    var rows = buildTableData();
    var ws   = XLSX.utils.aoa_to_sheet(rows);

    /* Column widths */
    ws['!cols'] = [{ wch: 32 }].concat(Array((rows[0] || []).length - 1).fill({ wch: 20 }));

    /* Style section header rows */
    rows.forEach(function (row, ri) {
      if (String(row[0]).startsWith('---')) {
        var cell = ws[XLSX.utils.encode_cell({ r: ri, c: 0 })];
        if (cell) {
          cell.s = { font: { bold: true }, fill: { fgColor: { rgb: 'F7F3EE' } } };
        }
      }
    });

    var wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Comparison');
    XLSX.writeFile(wb, 'vendor-comparison.xlsx');
  }

  /* ── Export: PDF (browser print) ── */
  $(document).on('click', '#cpExportPdf', function () {
    var vendors = window._cmVendors || [];
    var rows    = buildTableData();
    var names   = vendors.map(function (v) { return v.name; }).join(' vs ');

    var cols = 1 + vendors.length;
    var w    = Math.round(100 / cols);

    var tableHtml = '<table style="width:100%;border-collapse:collapse;font-size:11px;font-family:Georgia,serif">' +
      '<thead><tr>' +
      rows[0].map(function (h, i) {
        return '<th style="padding:8px 10px;background:#f7f3ee;border:1px solid #e8e0d4;text-align:left;font-weight:600;width:' + w + '%">' + h + '</th>';
      }).join('') + '</tr></thead><tbody>';

    rows.slice(1).forEach(function (row) {
      var isSec = String(row[0]).startsWith('---');
      var bg    = isSec ? '#f0ebe3' : '#fff';
      var fw    = isSec ? '700' : '400';
      tableHtml += '<tr>';
      row.forEach(function (cell, ci) {
        var cellVal = String(cell || '');
        if (!isSec && ci > 0) {
          cellVal = cellVal === 'Yes' ? '&#10003;' : cellVal === 'No' ? '&#215;' : cellVal;
          var color = cell === 'Yes' ? '#16a34a' : cell === 'No' ? '#ccc' : '#333';
          tableHtml += '<td style="padding:7px 10px;border:1px solid #e8e0d4;background:' + bg + ';color:' + color + ';font-weight:' + fw + ';font-size:' + (ci > 0 ? '15px' : '11px') + '">' + cellVal + '</td>';
        } else {
          tableHtml += '<td style="padding:7px 10px;border:1px solid #e8e0d4;background:' + bg + ';font-weight:' + fw + '">' +
            cellVal.replace(/^--- | ---$/g, '') + '</td>';
        }
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';

    var win = window.open('', '_blank');
    win.document.write(
      '<!DOCTYPE html><html><head><title>' + names + ' — Comparison</title>' +
      '<style>body{font-family:Georgia,serif;padding:32px;background:#fffdf9;color:#2a1f14}' +
      'h1{font-size:24px;font-weight:800;margin-bottom:6px;color:#2a1f14}' +
      '.ey{font-size:10px;font-weight:700;color:#f04e23;text-transform:uppercase;letter-spacing:.1em;margin-bottom:12px}' +
      '@media print{body{padding:16px}}</style>' +
      '</head><body>' +
      '<div class="ey">Side-by-side comparison</div>' +
      '<h1>' + names + '</h1>' +
      '<p style="font-size:12px;color:#8a7a6a;margin-bottom:20px">Generated by Udder Database</p>' +
      tableHtml +
      '<script>window.onload=function(){window.print()}<\/script>' +
      '</body></html>'
    );
    win.document.close();
  });

  /* ── Toast ── */
  function showToast(msg) {
    var $t = $('<div class="cm-toast">' + msg + '</div>').appendTo('body');
    setTimeout(function () { $t.addClass('show'); }, 10);
    setTimeout(function () { $t.removeClass('show'); setTimeout(function () { $t.remove(); }, 300); }, 2800);
  }

  /* ── CSS ── */
  function injectCSS() {
    if ($('#cm-styles').length) return;
    $('<style id="cm-styles">' +

      /* Hero */
      '.cp-hero{padding:32px 36px 24px;background:#fff;border-bottom:1px solid #eee}' +
      '.cp-eyebrow{font-size:10px;font-weight:700;color:#f04e23;text-transform:uppercase;letter-spacing:.12em;margin-bottom:8px}' +
      '.cp-title{font-size:26px;font-weight:800;color:#111;letter-spacing:-.02em;line-height:1.1;margin-bottom:18px}' +

      /* Export buttons */
      '.cp-export-btns{display:flex;gap:8px;flex-wrap:wrap}' +
      '.cp-export-btn{display:inline-flex;align-items:center;gap:6px;padding:7px 14px;border-radius:8px;' +
        'border:1px solid #e0e0e0;background:#fff;color:#555;font-size:12px;font-weight:500;' +
        'cursor:pointer;font-family:inherit;transition:all .15s}' +
      '.cp-export-btn:hover{border-color:#f04e23;color:#f04e23;background:#fff}' +

      /* Vendor header */
      '.cp-grid{display:grid}' +
      '.cp-label-anchor{background:#f5f5f5;border-right:1px solid #eee;border-bottom:1px solid #eee}' +
      '.cp-vendor-row{border-bottom:1px solid #eee}' +
      '.cp-vendor-card{padding:20px 22px 16px;background:#fff;border-right:1px solid #eee}' +
      '.cp-vendor-card:last-child{border-right:none}' +
      '.cp-vc-top{display:flex;align-items:center;gap:10px;margin-bottom:10px}' +
      '.cp-logo-img{width:44px;height:44px;border-radius:8px;object-fit:contain;border:1px solid #eee;padding:5px;background:#fff;flex-shrink:0}' +
      '.cp-logo-ph{width:44px;height:44px;border-radius:8px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:700;color:#999;flex-shrink:0}' +
      '.cp-badge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:12px;font-size:9px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}' +
      '.cp-badge-approved{background:#111;color:#fff}' +
      '.cp-badge-verified{background:#f04e23;color:#fff}' +
      '.cp-bdot{width:5px;height:5px;border-radius:50%;background:#22c55e;flex-shrink:0}' +
      '.cp-badge-verified .cp-bdot{background:rgba(255,255,255,.55)}' +
      '.cp-vc-name{font-size:17px;font-weight:700;color:#111;letter-spacing:-.01em;line-height:1.2;margin-bottom:10px}' +
      '.cp-vc-actions{display:flex;align-items:center;gap:10px}' +
      '.cp-vc-score{display:inline-flex;align-items:center;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:700;margin-top:10px;letter-spacing:.02em;margin-left:10px;}' +
      '.cp-view-btn{padding:5px 14px;border-radius:6px;border:1px solid #ddd;background:transparent;font-size:12px;font-weight:500;color:#111;cursor:pointer;font-family:inherit;transition:all .13s}' +
      '.cp-view-btn:hover{background:#f04e23;border-color:#f04e23;color:#fff}' +
      '.cp-vc-desc{font-size:12px;color:#888;line-height:1.5;margin-bottom:10px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}' +
      '.cp-rm-btn{background:none;border:none;font-size:12px;color:#aaa;cursor:pointer;font-family:inherit;padding:0;transition:color .13s}' +
      '.cp-rm-btn:hover{color:#f04e23}' +

      /* Section headers — grey */
      '.cp-sec-head{border-bottom:1px solid #eee}' +
      '.cp-sec-label{padding:10px 20px;font-size:10px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.1em;}' +
      '.cp-sec-head > div:not(.cp-sec-label){background:#f5f5f5;}' +
      '.cp-sec-head > div:last-child{border-right:none}' +

      /* Data rows */
      '.cp-row{border-bottom:1px solid #f0f0f0}' +
      '.cp-row:hover{background:#fafafa}' +
      '.cp-row-lbl{padding:10px 20px;font-size:11px;font-weight:500;color:#3d3d3d;background:#f5f5f5;border-right:1px solid #eee;display:flex;align-items:center;line-height:1.35}' +
      '.cp-row-cell{padding:10px 20px;border-right:1px solid #f0f0f0;display:flex;align-items:center;gap:6px;flex-wrap:wrap;background:#fff}' +
      '.cp-row-cell:last-child{border-right:none}' +

      /* Tick / cross */
      '.cp-yes{font-size:17px;font-weight:700;color:#16a34a;line-height:1}' +
      '.cp-no{font-size:17px;font-weight:400;color:#ddd;line-height:1}' +

      /* Cell content */
      '.cp-chips{display:flex;flex-wrap:wrap;gap:4px}' +
      '.cp-chip{font-size:11px;color:#555;background:#f5f5f5;border:1px solid #eee;border-radius:20px;padding:3px 9px;white-space:nowrap}' +
      '.cp-txt{font-size:13px;color:#333}' +
      '.cp-muted{font-size:12px;color:#bbb}' +

      /* Toast */
      '.cm-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(10px);background:#111;color:#fff;font-size:12px;font-weight:500;padding:10px 18px;border-radius:8px;opacity:0;transition:all .25s;z-index:9999;pointer-events:none;white-space:nowrap}' +
      '.cm-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}' +

    '</style>').appendTo('head');
  }

  /* Re-inject checkmarks */
  var vendorsEl = document.getElementById('vendors');
  if (vendorsEl && window.MutationObserver) {
    new MutationObserver(function () {
      if (!compareMode) return;
      $('#vendors .card').each(function () {
        if (!$(this).find('.compare-check').length) $(this).append('<div class="compare-check"></div>');
      });
    }).observe(vendorsEl, { childList: true });
  }

  // Expose internals for external use
window._compare = {
  open: function() {
    if (selectedCards.length >= 2) {
      buildPanel(selectedCards);
      $('#compareModal').addClass('open');
    }
  },
  enterMode: enterMode,
  exitMode: exitMode,
  getSelected: function() { return selectedCards; },
  isActive: function() { return compareMode; }
};

}(jQuery));