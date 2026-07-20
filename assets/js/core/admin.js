import { isLoggedIn, getCurrentUser, initSession } from './auth/session.js';
  import { showToast, initials } from '../app.js';

  export const HOSTNAME = window.location.origin;
  window.vendors = null;
  let ANALYTICS_CACHE = null;
  
  const loggedIn = await isLoggedIn();
  $(async function(){
    if (!loggedIn){location.href = `${HOSTNAME}/admin/login.html`;return;}

    await initSession();
    const { user } = await getCurrentUser();
    const userId = user.id;
    if (userId === null){location.href = `${HOSTNAME}/admin/login.html`;return;}

    $('#pd-q-title').text(getCurrentQuarter());

    const response = await fetch(`/api/supabase?action=getUserById&userId=${userId}`);
    const result = await response.json();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    const fullName = `${result.data.first_name} ${result.data.last_name || ''}`;
    $('#sb-uname').text(fullName);
    $('#sb-avatar').text(initials(fullName));

    getUsers();
    getIntroRequests();
    getSearchFilters();
    await getVendors();
    getVerifications();
    getAdminActivities(userId);

    var loader = document.getElementById('pageLoader');
    if (loader) {
      loader.classList.add('hide');
      setTimeout(function () { loader.remove(); }, 300);
    }
  });

  // Panel + breadcrumb switching
  document.querySelectorAll('.nav-link[data-panel]').forEach(function(link) {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      document.querySelectorAll('.nav-link').forEach(function(l) { l.classList.remove('on'); });
      this.classList.add('on');
      document.querySelectorAll('.panel').forEach(function(p) { p.classList.remove('active'); });
      var panel = document.getElementById('panel-' + this.dataset.panel);
      
      if (panel) panel.classList.add('active');
      var crumb = document.getElementById('tbCrumbCur');
      if (crumb && this.dataset.crumb) crumb.textContent = this.dataset.crumb;

      if (this.dataset.panel == 'analytics') renderAnalytics('30d');
    });
  });

  document.querySelectorAll('.pd-toggle-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      this.parentNode.querySelectorAll('.pd-toggle-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
    });
  });

  // Search volume mini bar chart — 16 days, generally increasing
//   (function() {
    
//   })();

  // Leads pipeline chart — Platform Analytics
  (function() {
    var data = [30,34,33,38,42,45,48,52,50,55,58,54,60,63,59,65,68,64,70,66,72,74,70,76,73,78,80,77,82,85];
    var max = Math.max.apply(null, data);
    var wrap = document.getElementById('paLeadsChart');
    if (!wrap) return;
    data.forEach(function(v) {
      var bar = document.createElement('div');
      bar.className = 'pd-chart-bar';
      bar.style.height = Math.round((v / max) * 100) + '%';
      wrap.appendChild(bar);
    });
  })();

  // User registrations over time chart — Platform Analytics
  (function() {
    var data = [];
    for (var i = 0; i < 30; i++) {
      data.push(20 + Math.round(i * 2.3) + (i % 5 === 0 ? 6 : 0));
    }
    var max = Math.max.apply(null, data);
    var wrap = document.getElementById('paRegChart');
    if (!wrap) return;
    data.forEach(function(v) {
      var bar = document.createElement('div');
      bar.className = 'pa-reg-bar';
      bar.style.height = Math.round((v / max) * 100) + '%';
      wrap.appendChild(bar);
    });
  })();
  // Verification queue tab switching
  function switchVqTab(tab) {
    document.getElementById('tab-claims').classList.toggle('active', tab === 'claims');
    document.getElementById('tab-verif').classList.toggle('active', tab === 'verif');
    var claimsView = document.querySelector('#panel-verifqueue .vq-desc');
    var tableView = document.querySelector('#panel-verifqueue .vq-table');
    var verifView = document.getElementById('vq-verif-view');
    [claimsView, tableView].forEach(function(el) {
      if (el) el.style.display = tab === 'claims' ? '' : 'none';
    });
    verifView.style.display = tab === 'verif' ? 'flex' : 'none';
  }

  var VR_DATA = {
    SR: {
      name: 'SmartRecruiters', sub: 'SmartRecruiters, Inc.', badge: 'In review',
      contact: 'Niamh Healy', title: 'Sr Director Product Marketing',
      email: 'niamh@smartrecruiters.com', submitted: '2 days ago', assigned: 'Rachel Patel',
      demo: 'Fri 3 May 2026, 2pm BST',
      evidence: ['60-min capability walkthrough video', '12 feature claims with screenshots', '3 validated customer references'],
      checklist: [
        { label: 'Listing completeness verified', checked: true },
        { label: 'Demo video reviewed', checked: true },
        { label: 'Core ATS features validated', checked: true },
        { label: 'CRM capabilities validated', checked: false },
        { label: 'Onboarding module validated', checked: false },
        { label: 'Integration claims checked', checked: false },
        { label: 'Customer references validated', checked: false }
      ]
    },
    DL: {
      name: 'Deel', sub: 'Deel Inc.', badge: 'Pending',
      contact: 'Sofia Martins', title: 'Partner Enablement Lead',
      email: 'sofia.martins@deel.com', submitted: '3 days ago', assigned: 'Alice Oduya',
      demo: 'Not scheduled',
      evidence: ['Confirmed global payroll capabilities', 'Updated regions and language count'],
      checklist: [
        { label: 'Listing completeness verified', checked: true },
        { label: 'Demo video reviewed', checked: false },
        { label: 'Core ATS features validated', checked: false },
        { label: 'CRM capabilities validated', checked: false },
        { label: 'Onboarding module validated', checked: false },
        { label: 'Integration claims checked', checked: false },
        { label: 'Customer references validated', checked: false }
      ]
    },
    LT: {
      name: 'Lattice', sub: 'Lattice Inc.', badge: 'Action needed',
      contact: 'Devon Park', title: 'Sr. Partner Marketing Manager',
      email: 'devon@lattice.com', submitted: '1 day ago', assigned: 'Tom Fielding',
      demo: 'Mon 6 May 2026, 10am BST',
      evidence: ['Confirmed all categories', 'Updated pricing model', 'Added 5 named customers'],
      checklist: [
        { label: 'Listing completeness verified', checked: true },
        { label: 'Demo video reviewed', checked: true },
        { label: 'Core ATS features validated', checked: false },
        { label: 'CRM capabilities validated', checked: false },
        { label: 'Onboarding module validated', checked: false },
        { label: 'Integration claims checked', checked: false },
        { label: 'Customer references validated', checked: false }
      ]
    },
    HB: {
      name: 'HiBob', sub: 'Hi Bob Ltd.', badge: 'Awaiting refs',
      contact: 'Yael Cohen', title: 'Head of Partnerships',
      email: 'yael.cohen@hibob.com', submitted: '2 hours ago', assigned: 'Rachel Patel',
      demo: 'Not scheduled',
      evidence: ['Updated product description', 'Confirmed HQ and founding date', 'Added 3 integration partners'],
      checklist: [
        { label: 'Listing completeness verified', checked: false },
        { label: 'Demo video reviewed', checked: false },
        { label: 'Core ATS features validated', checked: false },
        { label: 'CRM capabilities validated', checked: false },
        { label: 'Onboarding module validated', checked: false },
        { label: 'Integration claims checked', checked: false },
        { label: 'Customer references validated', checked: false }
      ]
    }
  };

  function getDailyCounts(rows, numDays) {
        const now = new Date();
        const counts = [];

        for (let i = numDays - 1; i >= 0; i--) {
            const dayStart = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - i));
            const dayEnd = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - i + 1));

            const count = rows.filter(function(row) {
                const createdAt = new Date(row.created_at);
                return createdAt >= dayStart && createdAt < dayEnd;
            }).length;

            counts.push(count);
        }

        return counts; 
    }

  function selectVrItem(el) {
    document.querySelectorAll('.vr-item').forEach(function(i) { i.classList.remove('active'); });
    el.classList.add('active');

    var initials = el.querySelector('.vr-item-avatar').textContent.trim();
    var d = VR_DATA[initials];
    if (!d) return;

    document.querySelector('.vr-detail-name').textContent = d.name;
    document.querySelector('.vr-detail-name-badge').textContent = d.badge;
    document.querySelector('.vr-detail-sub').textContent = d.sub;

    var rows = document.querySelectorAll('.vr-info-row .vr-info-value');
    rows[0].textContent = d.contact;
    rows[1].textContent = d.title;
    rows[2].textContent = d.email;
    rows[2].className = 'vr-info-value email';
    rows[3].textContent = d.submitted;
    rows[4].textContent = d.assigned;
    rows[5].textContent = d.demo;

    var evList = document.querySelector('.vr-evidence-list');
    evList.innerHTML = d.evidence.map(function(e) { return '<li>' + e + '</li>'; }).join('');

    var checkItems = document.querySelectorAll('.vr-check-item');
    d.checklist.forEach(function(item, i) {
      if (!checkItems[i]) return;
      var box = checkItems[i].querySelector('.vr-check-box');
      var label = checkItems[i].querySelector('.vr-check-label');
      var tick = checkItems[i].querySelector('.vr-check-tick') || checkItems[i].querySelector('span:last-child');
      box.className = 'vr-check-box' + (item.checked ? ' checked' : '');
      box.innerHTML = item.checked ? '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '';
      label.className = 'vr-check-label' + (item.checked ? ' checked' : '');
      label.textContent = item.label;
      if (tick) tick.textContent = item.checked ? '✓' : '';
    });

    var done = d.checklist.filter(function(c) { return c.checked; }).length;
    var total = d.checklist.length;
    document.querySelector('.vr-progress-count').textContent = done + '/' + total + ' complete';
    document.querySelector('.vr-progress-fill').style.width = Math.round((done / total) * 100) + '%';
    document.querySelector('.vr-schedule-date').textContent = d.demo;
  }

  function toggleCheck(box) {
    var isChecked = box.classList.toggle('checked');
    var label = box.nextElementSibling;
    var tick = label.nextElementSibling;
    label.classList.toggle('checked', isChecked);
    box.innerHTML = isChecked ? '<svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>' : '';
    if (tick) tick.textContent = isChecked ? '✓' : '';
    var card = box.closest('.vr-checklist-card');
    var total = card.querySelectorAll('.vr-check-box').length;
    var done = card.querySelectorAll('.vr-check-box.checked').length;
    card.querySelector('.vr-progress-count').textContent = done + '/' + total + ' complete';
    card.querySelector('.vr-progress-fill').style.width = Math.round((done/total)*100) + '%';
  }

  // Client inquiries
  var CI_DATA = {
    'rolls-royce': { name: 'Rolls-Royce plc', meta: 'Aerospace &amp; Defence · 25,000+ · UK / Global', status: 'new', contact: { initials: 'CB', name: 'Charlotte Baines', role: 'VP People Technology', email: 'c.baines@rolls-royce.com' }, services: ['Vendor selection', 'RFI / RFP management'], budget: '£500k – £1m consulting', timeline: 'Q3 2026', submitted: '35 min ago', message: '"We\'re embarking on a global HR tech transformation and need support selecting a new HRIS and ATS to replace our legacy SAP suite. We have roughly 42,000 employees across 50 countries. Timeline is tight — board approval needed by September. We\'ve heard great things about Udder\'s vendor selection methodology."', assigned: 'Unassigned', activity: [{ text: 'Submitted', time: '35 min ago' }], related: [{ initials: 'SR', name: 'SmartRecruiters' }, { initials: 'AV', name: 'Avature' }, { initials: 'WD', name: 'Workday HCM' }] },
    'asos': { name: 'Asos plc', meta: 'Retail / E-commerce · 5,000–25,000 · UK', status: 'inprogress', contact: { initials: 'MK', name: 'Maya Khan', role: 'Head of People Technology', email: 'm.khan@asos.com' }, services: ['HR tech strategy', 'Digital maturity assessment'], budget: '£100k – £250k consulting', timeline: 'Q4 2026', submitted: '2 hours ago', message: '"We want an independent view on our HR tech stack before committing to a major transformation. Looking for a digital maturity assessment and roadmap to help align our P&T leadership."', assigned: 'Alice Oduya', activity: [{ text: 'Assigned to Alice', time: '1 hour ago' }, { text: 'Submitted', time: '2 hours ago' }], related: [{ initials: 'HB', name: 'HiBob' }, { initials: 'LT', name: 'Lattice' }] },
    'national-grid': { name: 'National Grid', meta: 'Energy & Utilities · 25,000+ · UK / US', status: 'proposal', contact: { initials: 'JR', name: 'James Reid', role: 'Group HR Technology Director', email: 'j.reid@nationalgrid.com' }, services: ['Market landscape review', 'Vendor selection'], budget: '£250k – £500k consulting', timeline: 'Q2 2026', submitted: '1 day ago', message: '"We\'re running a competitive RFP for a new global HRIS. We need an independent advisor to help shortlist vendors and run the evaluation process."', assigned: 'Rachel Patel', activity: [{ text: 'Proposal sent', time: '4 hours ago' }, { text: 'Submitted', time: '1 day ago' }], related: [{ initials: 'WD', name: 'Workday HCM' }, { initials: 'SR', name: 'SmartRecruiters' }] },
    'deliveroo': { name: 'Deliveroo', meta: 'Technology / Gig Economy · 5,000–25,000 · UK', status: 'inprogress', contact: { initials: 'SP', name: 'Sophie Park', role: 'Talent Operations Manager', email: 's.park@deliveroo.com' }, services: ['Implementation support', 'Change management'], budget: '£50k – £100k consulting', timeline: 'Q3 2026', submitted: '3 days ago', message: '"We\'ve selected a new ATS but need help with change management and rollout across our ops and corporate teams."', assigned: 'Tom Fielding', activity: [{ text: 'Assigned to Tom', time: '2 days ago' }, { text: 'Submitted', time: '3 days ago' }], related: [{ initials: 'GH', name: 'Greenhouse' }] },
    'linklaters': { name: 'Linklaters LLP', meta: 'Legal Services · 5,000–25,000 · UK / Global', status: 'inprogress', contact: { initials: 'EW', name: 'Emma Walsh', role: 'Chief People Officer', email: 'e.walsh@linklaters.com' }, services: ['Platform optimisation', 'HR tech strategy'], budget: '£100k – £250k consulting', timeline: 'Q4 2026', submitted: '4 days ago', message: '"We\'re midway through a Workday implementation and struggling with adoption. We need experienced support to optimise configuration."', assigned: 'Alice Oduya', activity: [{ text: 'Assigned to Alice', time: '3 days ago' }, { text: 'Submitted', time: '4 days ago' }], related: [{ initials: 'WD', name: 'Workday HCM' }] },
    'bp': { name: 'BP plc', meta: 'Energy · 25,000+ · UK / Global', status: 'won', contact: { initials: 'DM', name: 'David Moore', role: 'VP HR Transformation', email: 'd.moore@bp.com' }, services: ['Vendor selection', 'Implementation support'], budget: '£500k – £1m consulting', timeline: 'Q1 2026', submitted: '1 week ago', message: '"Project successfully closed. BP selected Workday HCM following our recommendation."', assigned: 'Rachel Patel', activity: [{ text: 'Closed — won', time: '2 days ago' }], related: [{ initials: 'WD', name: 'Workday HCM' }] },
    'bt': { name: 'BT Group', meta: 'Telecommunications · 25,000+ · UK', status: 'lost', contact: { initials: 'PH', name: 'Paul Harris', role: 'Head of HR Technology', email: 'p.harris@bt.com' }, services: ['RFI / RFP management'], budget: '£250k – £500k consulting', timeline: 'Q2 2026', submitted: '2 weeks ago', message: '"BT selected a competitor consultancy for this engagement."', assigned: 'Unassigned', activity: [{ text: 'Closed — lost', time: '1 week ago' }], related: [] }
  };

  function selectCI(el, key) {
    document.querySelectorAll('.ci-item').forEach(function(i) { i.classList.remove('active'); });
    el.classList.add('active');
    var d = CI_DATA[key];
    if (!d) return;
    document.getElementById('ciDetailName').textContent = d.name;
    document.getElementById('ciDetailMeta').innerHTML = d.meta;
    document.getElementById('ciContactAvatar').textContent = d.contact.initials;
    document.getElementById('ciContactName').textContent = d.contact.name;
    document.getElementById('ciContactRole').textContent = d.contact.role;
    document.getElementById('ciContactEmail').textContent = d.contact.email;
    document.getElementById('ciBudget').textContent = d.budget;
    document.getElementById('ciTimeline').textContent = d.timeline;
    document.getElementById('ciSubmitted').textContent = d.submitted;
    document.getElementById('ciMessage').textContent = d.message;
    document.getElementById('ciServiceTags').innerHTML = d.services.map(function(s) { return '<span class="ci-service-tag">' + s + '</span>'; }).join('');
    document.getElementById('ciStatusSelect').value = d.status;
    document.getElementById('ciAssignedSelect').value = d.assigned;
    var actParent = document.querySelector('#panel-inquiries .ci-activity-item').parentNode;
    actParent.innerHTML = d.activity.map(function(a) { return '<div class="ci-activity-item"><div>' + a.text + '</div><div class="ci-activity-time">' + a.time + '</div></div>'; }).join('');
    var relItems = document.querySelectorAll('#panel-inquiries .ci-related-item');
    var relParent = relItems.length ? relItems[0].parentNode : null;
    if (relParent) relParent.innerHTML = d.related.length === 0 ? '<div style="font-size:12px;color:var(--t4)">None linked</div>' : d.related.map(function(r) { return '<div class="ci-related-item"><div class="ci-related-avatar">' + r.initials + '</div><div class="ci-related-name">' + r.name + '</div></div>'; }).join('');
  }

  function filterCI(btn, status) {
    document.querySelectorAll('.ci-filter-btn').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    document.querySelectorAll('#panel-inquiries .ci-item').forEach(function(item) {
      item.style.display = (status === 'all' || item.dataset.status === status) ? '' : 'none';
    });
  }

  async function getUsers(){
    const response = await fetch('/api/supabase?action=getUsers');
    const result = await response.json();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    const { start, end } = getCurrentQuarterRange();
    const usersThisQuarter = result.data.filter(function(user) {
        const createdAt = new Date(user.created_at);
        return createdAt >= start && createdAt < end;
    });

    $('#pd-users-tot').text(usersThisQuarter.length);

    const delta = getQuarterDelta(result.data);
    $('#pd-users-delta').text(delta >= 0 ? `+${delta}` : `${delta}`);

    const className = delta >= 0 ? 'green' : 'red';
    $('#pd-users-delta').addClass(className);
  }

  async function getIntroRequests(){
    const response = await fetch('/api/supabase?action=getIntroRequests');
    const result = await response.json();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    const { start, end } = getCurrentQuarterRange();
    const introsThisQuarter = result.data.filter(function(i) {
        const createdAt = new Date(i.created_at);
        return createdAt >= start && createdAt < end;
    });

    $('#pd-intros-tot').text(introsThisQuarter.length);

    const delta = getQuarterDelta(result.data);
    $('#pd-intros-delta').text(delta >= 0 ? `+${delta}` : `${delta}`);

    const className = delta >= 0 ? 'green' : 'red';
    $('#pd-intros-delta').addClass(className);
  }

  async function getVendors(){
    const response = await fetch('/api/supabase?action=getVendors');
    const result = await response.json();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    window.vendors = result.data;

    getVerificationPipeline(result.data);

    const { start, end } = getCurrentQuarterRange();
    const vendorsThisQuarter = result.data.filter(function(v) {
        const createdAt = new Date(v.created_at);
        return createdAt >= start && createdAt < end;
    });

    $('#pd-products-tot').text(vendorsThisQuarter.length);
    $('#pd-vendors-tot').text(vendorsThisQuarter.length);

    const delta = getQuarterDelta(result.data);
    $('#pd-vendors-delta').text(delta >= 0 ? `+${delta}` : `${delta}`);

    const className = delta >= 0 ? 'green' : 'red';
    $('#pd-vendors-delta').addClass(className);

    const { vStart, vEnd } = getCurrentQuarterRange();
    const vetifiedThisQuarter = result.data.filter(function(v) {
        const createdAt = new Date(v.created_at);
        return createdAt >= vStart && createdAt < vEnd;
    });

    const { pStart, pEnd } = getCurrentMonthRange();
    const rows = result.data?.filter(function(row) {
        const createdAt = new Date(row.created_at);
        return createdAt >= pStart && createdAt < pEnd;
    });
    
    $('#pd-products-delta').text(rows.length > 0 ? `+${rows.length} this month` : `0 this month`);
  }

  async function getVerifications(){
    const response = await fetch('/api/supabase?action=getVerifications');
    const result = await response.json();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    const { pStart, pEnd } = getCurrentMonthRange();
    const rows = result.data?.filter(function(row) {
        const createdAt = new Date(row.created_at);
        return createdAt >= pStart && createdAt < pEnd;
    });

    if (window.vendors == null){
        const response = await fetch('/api/supabase?action=getVendors');
        const result = await response.json();
        if (result.error) {
            showToast(result.error, 'error');
            return;
        }

        window.vendors = result.data;
    }
    
    let verifications = '';
    result.data?.forEach(v => {
        const name = getVendorName(window.vendors, v.vendor_id);
        const className = (v.verification == 'UDDER APPROVED') ? 'black' : 'orange';
        const isAssigned = (v.assignee == 'Unassigned') ? true : false;

        verifications += `<div class="pd-row">
          <div class="pd-product-name">${name}</div>
          <div class="pd-vendor-name">${name}</div>
          <div><span class="pd-tier-pill ${className}"><span class="dot"></span> ${v.verification}</span></div>
          <div class="pd-submitted">${daysAgo(v.updated_at)}</div>
          <div class="pd-assigned">${v.assignee}</div>
          <div><span class="pd-status-pill">${v.status}</span></div>
          <div><button class="pd-row-btn">${(isAssigned) ? 'Open' : 'Assign'}</button></div>
        </div>`;
    });

    $('.pd-table').empty();
    $('.pd-table').append(`
        <div class="pd-table-head">
          <span class="pd-th">Product</span>
          <span class="pd-th">Vendor</span>
          <span class="pd-th">Requested tier</span>
          <span class="pd-th">Submitted</span>
          <span class="pd-th">Assigned</span>
          <span class="pd-th">Status</span>
          <span class="pd-th"></span>
        </div>
    `);
    if (!verifications){
        $('.pd-table').append('<div class="pd-row" style="color:var(--t4)">No data available!</div>');
    }else{
        $('.pd-table').append(verifications);
    }

    $('#pd-veri-q-tot').text(rows?.length);
    $('#pd-pending-pill').text(result.data?.length);
  }

  function daysAgo(isoDate) {
        var diff = Date.now() - new Date(isoDate).getTime();
        var days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days === 0) return 'today';
        if (days === 1) return '1 day ago';
        return days + ' days ago';
    }

  function getVendorName(vendors, id) {
        const vendor = vendors.find(function(v) {
            return v.id === id;
        });
        return vendor ? vendor.name : null;
    }

  function countNewThisQuarter(rows) {
      const { start, end } = getCurrentQuarterRange();
      return rows.filter(function(row) {
          const createdAt = new Date(row.created_at);
          return createdAt >= start && createdAt < end;
      }).length;
  }

  function getCurrentMonthRange() {
      const now = new Date();
      const start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
      const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
      return { start, end };
  }

  function countCreatedInRange(rows, start, end) {
      return rows.filter(function(row) {
          const createdAt = new Date(row.created_at);
          return createdAt >= start && createdAt < end;
      }).length;
  }

  function getQuarterDateRange(year, quarter) {
      const startMonth = (quarter - 1) * 3;
      const start = new Date(Date.UTC(year, startMonth, 1));
      const end = new Date(Date.UTC(year, startMonth + 3, 1));
      return { start, end };
  }

  function getCurrentQuarterRange() {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      return getQuarterDateRange(now.getFullYear(), quarter);
  }

  function getCurrentQuarter() {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      return `Q${quarter} ${now.getFullYear()}`;
  }

  function getQuarterRange(year, quarter) {
      const startMonth = (quarter - 1) * 3;
      const start = new Date(Date.UTC(year, startMonth, 1));
      const end = new Date(Date.UTC(year, startMonth + 3, 1));
      return { start, end };
  }

  function getCurrentQuarterInfo() {
      const now = new Date();
      const quarter = Math.floor(now.getMonth() / 3) + 1;
      return { year: now.getFullYear(), quarter };
  }

  function getPreviousQuarterInfo() {
      const { year, quarter } = getCurrentQuarterInfo();
      if (quarter === 1) {
          return { year: year - 1, quarter: 4 }; // Q1 rolls back to Q4 last year
      }
      return { year, quarter: quarter - 1 };
  }

  function getPeriodRange(period) {
        const now = new Date();
        let start, priorStart, priorEnd;

        if (period === '7d') {
            start = new Date(now); start.setDate(start.getDate() - 7);
            priorEnd = new Date(start);
            priorStart = new Date(priorEnd); priorStart.setDate(priorStart.getDate() - 7);
        } else if (period === '30d') {
            start = new Date(now); start.setDate(start.getDate() - 30);
            priorEnd = new Date(start);
            priorStart = new Date(priorEnd); priorStart.setDate(priorStart.getDate() - 30);
        } else { // ytd
            start = new Date(Date.UTC(now.getFullYear(), 0, 1));
            priorStart = new Date(Date.UTC(now.getFullYear() - 1, 0, 1));
            priorEnd = new Date(Date.UTC(now.getFullYear() - 1, now.getMonth(), now.getDate()));
        }
        return { start, end: now, priorStart, priorEnd };
    }

    function countInRangeAnalytics(rows, start, end, dateField) {
        dateField = dateField || 'created_at';
        return rows.filter(function(r) {
            const d = new Date(r[dateField]);
            return d >= start && d <= end;
        }).length;
    }

    function filterInRange(rows, start, end, dateField) {
        dateField = dateField || 'created_at';
        return rows.filter(function(r) {
            const d = new Date(r[dateField]);
            return d >= start && d <= end;
        });
    }

    function formatDelta(current, prior, isPercent) {
        if (isPercent) {
            if (prior === 0) return current > 0 ? '↑ New' : '– 0% vs prior';
            const pct = Math.round(((current - prior) / prior) * 100);
            return (pct >= 0 ? `↑ +${pct}%` : `↓ ${pct}%`) + ' vs prior';
        }
        const diff = current - prior;
        return (diff >= 0 ? `↑ +${diff}` : `↓ ${diff}`) + ' vs prior';
    }

    function getDailyCountsAnalytics(rows, start, end, dateField) {
        dateField = dateField || 'created_at';
        const days = Math.max(1, Math.round((end - start) / 86400000));
        const counts = [];
        for (let i = 0; i < days; i++) {
            const dayStart = new Date(start); dayStart.setDate(dayStart.getDate() + i);
            const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
            counts.push(rows.filter(function(r) {
                const d = new Date(r[dateField]);
                return d >= dayStart && d < dayEnd;
            }).length);
        }
        return counts;
    }

    function renderBarChart(containerId, counts) {
        const wrap = document.getElementById(containerId);
        if (!wrap) return;
        wrap.innerHTML = '';
        const max = Math.max.apply(null, counts) || 1;
        counts.forEach(function(v) {
            const bar = document.createElement('div');
            bar.className = 'pd-chart-bar';
            bar.style.height = Math.round((v / max) * 100) + '%';
            wrap.appendChild(bar);
        });
    }

    async function loadAnalyticsData() {
        const endpoints = [
            '/api/supabase?action=getAllUsers',
            '/api/supabase?action=getVendors',
            '/api/supabase?action=getLeads',
            '/api/supabase?action=getClientEnquiries',
            '/api/supabase?action=getSearchFilters',
            '/api/supabase?action=getIntroRequests'
        ];

        const responses = await Promise.all(endpoints.map(function(url) {
            return fetch(url).then(function(r) { return r.json(); });
        }));

        for (const res of responses) {
            if (res.error) {
                showToast(res.error, 'error');
                return null;
            }
        }

        return {
            users: responses[0].data,
            vendors: responses[1].data,
            leads: responses[2].data,
            enquiries: responses[3].data,
            searches: responses[4].data,
            intros: responses[5].data
        };
    }

    async function renderAnalytics(period) {
        if (!ANALYTICS_CACHE) {
            ANALYTICS_CACHE = await loadAnalyticsData();
            if (!ANALYTICS_CACHE) return;
        }

        const range = getPeriodRange(period);

        renderKpiStrip(ANALYTICS_CACHE, range);
        renderVerificationBreakdown(ANALYTICS_CACHE.vendors);
        renderUsersByRole(ANALYTICS_CACHE.users, range);
        renderLeadsPipeline(ANALYTICS_CACHE.leads, range, period);
        renderClientInquiries(ANALYTICS_CACHE.enquiries, range);
        renderTopCategories(ANALYTICS_CACHE.searches, range);
        renderRegistrationsChart(ANALYTICS_CACHE.users, range);
    }

    function renderKpiStrip(data, range) {
        const { start, end, priorStart, priorEnd } = range;

        const usersNow = countInRangeAnalytics(data.users, start, end);
        const usersPrior = countInRangeAnalytics(data.users, priorStart, priorEnd);
        $('#pa-kpi-users-val').text(data.users.length.toLocaleString());
        $('#pa-kpi-users-delta').text(formatDelta(usersNow, usersPrior));

        const platformsNow = countInRangeAnalytics(data.vendors, start, end);
        const platformsPrior = countInRangeAnalytics(data.vendors, priorStart, priorEnd);
        $('#pa-kpi-platforms-val').text(data.vendors.length.toLocaleString());
        $('#pa-kpi-platforms-delta').text(formatDelta(platformsNow, platformsPrior));

        const leadsNow = countInRangeAnalytics(data.leads, start, end);
        const leadsPrior = countInRangeAnalytics(data.leads, priorStart, priorEnd);
        $('#pa-kpi-leads-val').text(leadsNow.toLocaleString());
        $('#pa-kpi-leads-delta').text(formatDelta(leadsNow, leadsPrior));

        const enquiriesNow = countInRangeAnalytics(data.enquiries, start, end);
        const enquiriesPrior = countInRangeAnalytics(data.enquiries, priorStart, priorEnd);
        $('#pa-kpi-enquiries-val').text(enquiriesNow.toLocaleString());
        $('#pa-kpi-enquiries-delta').text(formatDelta(enquiriesNow, enquiriesPrior));

        const searchesNow = countInRangeAnalytics(data.searches, start, end);
        const searchesPrior = countInRangeAnalytics(data.searches, priorStart, priorEnd);
        $('#pa-kpi-searches-val').text(searchesNow.toLocaleString());
        $('#pa-kpi-searches-delta').text(formatDelta(searchesNow, searchesPrior, true));

        const introsNow = countInRangeAnalytics(data.intros, start, end);
        const introsPrior = countInRangeAnalytics(data.intros, priorStart, priorEnd);
        $('#pa-kpi-intros-val').text(introsNow.toLocaleString());
        $('#pa-kpi-intros-delta').text(formatDelta(introsNow, introsPrior));
    }

    function renderVerificationBreakdown(vendors) {
        const total = vendors.length;
        const STAGES = [
            { key: 'ai-generated',   label: 'AI-Generated',   dotClass: 'grey',   color: 'var(--t3)' },
            { key: 'vendor-owned',   label: 'Vendor Owned',   dotClass: 'black',  color: 'var(--k)' },
            { key: 'udder-verified', label: 'Udder Verified', dotClass: 'orange', color: 'var(--o)' },
            { key: 'udder-approved', label: 'Udder Approved', dotClass: 'black',  color: 'var(--k)' }
        ];

        const counts = STAGES.map(function(s) {
            return vendors.filter(function(v) { return v.verification === s.key; }).length;
        });

        $('#pa-verif-total').text(`${total} total`);

        const segbar = document.getElementById('pa-verif-segbar');
        segbar.innerHTML = STAGES.map(function(s, i) {
            const pct = total > 0 ? (counts[i] / total) * 100 : 0;
            return `<div style="width:${pct}%;background:${s.color}"></div>`;
        }).join('');

        const legend = document.getElementById('pa-verif-legend');
        legend.innerHTML = STAGES.map(function(s, i) {
            const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
            return `
                <div class="pa-legend-row">
                    <div class="pa-legend-left"><span class="pa-legend-dot ${s.dotClass}"></span><span class="pa-legend-label">${s.label}</span></div>
                    <div class="pa-legend-right"><span class="pa-legend-count">${counts[i]}</span><span class="pa-legend-pct">${pct}%</span></div>
                </div>`;
        }).join('');

        const verifiedApproved = counts[2] + counts[3];
        const aiVendorOnly = counts[0] + counts[1];
        $('#pa-verif-stat-verified').text(verifiedApproved);
        $('#pa-verif-stat-other').text(aiVendorOnly);
    }

    function renderUsersByRole(users, range) {
        const total = users.length;
        const ROLES = [
            { key: 'hr-professional',    label: 'HR Buyers',         dotClass: 'orange', color: 'var(--o)' },
            { key: 'vendor',      label: 'Vendors',           dotClass: 'black',  color: 'var(--k)' },
            { key: 'consultant',  label: 'Udder Consultants', dotClass: 'black',  color: 'var(--k)' },
            { key: 'admin',       label: 'Admins',            dotClass: 'grey',   color: 'var(--t3)' }
        ];

        const counts = ROLES.map(function(r) {
            return users.filter(function(u) { return u.role === r.key; }).length;
        });

        $('#pa-roles-total').text(`${total} total`);

        const segbar = document.getElementById('pa-roles-segbar');
        segbar.innerHTML = ROLES.map(function(r, i) {
            const pct = total > 0 ? (counts[i] / total) * 100 : 0;
            return `<div style="width:${pct}%;background:${r.color}"></div>`;
        }).join('');

        const legend = document.getElementById('pa-roles-legend');
        legend.innerHTML = ROLES.map(function(r, i) {
            const pct = total > 0 ? Math.round((counts[i] / total) * 100) : 0;
            return `
                <div class="pa-legend-row">
                    <div class="pa-legend-left"><span class="pa-legend-dot ${r.dotClass}"></span><span class="pa-legend-label">${r.label}</span></div>
                    <div class="pa-legend-right"><span class="pa-legend-count">${counts[i]}</span><span class="pa-legend-pct">${pct}%</span></div>
                </div>`;
        }).join('');

        const newThisPeriod = countInRangeAnalytics(users, range.start, range.end);
        $('#pa-roles-new').text(`+${newThisPeriod}`);

        const completed = users.filter(function(u) { return u.profile_complete; }).length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        $('#pa-roles-completion').text(`${completionRate}%`);
    }

    function renderLeadsPipeline(leads, range, period) {
        const inPeriod = filterInRange(leads, range.start, range.end);

        const counts = period === 'ytd'
            ? getMonthlyCounts(leads, range.start, range.end)
            : getDailyCountsAnalytics(leads, range.start, range.end);

        renderBarChart('paLeadsChart', counts);

        $('#pa-leads-total').text(inPeriod.length);

        const responded = inPeriod.filter(function(l) { return l.responded_at; });
        const responseRate = inPeriod.length > 0 ? Math.round((responded.length / inPeriod.length) * 100) : 0;
        $('#pa-leads-response-rate').text(`${responseRate}%`);

        if (responded.length > 0) {
            const totalHours = responded.reduce(function(sum, l) {
                const created = new Date(l.created_at);
                const respondedAt = new Date(l.responded_at);
                return sum + (respondedAt - created) / 3600000;
            }, 0);
            $('#pa-leads-avg-response').text(`${Math.round(totalHours / responded.length)}h`);
        } else {
            $('#pa-leads-avg-response').text('–');
        }
    }

    function renderRegistrationsChart(users, range, period) {
        const counts = period === 'ytd'
            ? getMonthlyCounts(users, range.start, range.end)
            : getDailyCountsAnalytics(users, range.start, range.end);

        const wrap = document.getElementById('paRegChart');
        wrap.innerHTML = '';
        const max = Math.max.apply(null, counts) || 1;
        counts.forEach(function(v) {
            const bar = document.createElement('div');
            bar.className = 'pa-reg-bar';
            bar.style.height = Math.round((v / max) * 100) + '%';
            wrap.appendChild(bar);
        });
    }

    function renderClientInquiries(enquiries, range) {
        const STATUSES = [
            { key: 'new',        label: 'New',            dotClass: 'red' },
            { key: 'inprogress', label: 'In progress',    dotClass: 'black' },
            { key: 'proposal',   label: 'Proposal sent',  dotClass: 'blue' },
            { key: 'won',        label: 'Closed — won',   dotClass: 'green' },
            { key: 'lost',       label: 'Closed — lost',  dotClass: 'grey' }
        ];

        const counts = STATUSES.map(function(s) {
            return enquiries.filter(function(e) { return e.status === s.key; }).length;
        });

        const legend = document.getElementById('pa-inquiries-legend');
        legend.innerHTML = STATUSES.map(function(s, i) {
            return `
                <div class="pa-legend-row">
                    <div class="pa-legend-left"><span class="pa-legend-dot ${s.dotClass}"></span><span class="pa-legend-label">${s.label}</span></div>
                    <div class="pa-legend-right"><span class="pa-legend-count">${counts[i]}</span></div>
                </div>`;
        }).join('');

        const won = counts[3];
        const lost = counts[4];
        const winRate = (won + lost) > 0 ? Math.round((won / (won + lost)) * 100) : 0;

        $('#pa-inquiries-won').text(won);
        $('#pa-inquiries-winrate').text(`${winRate}%`);
        $('#pa-inquiries-period').text(countInRange(enquiries, range.start, range.end));
    }

    function renderTopCategories(searches, range) {
        const inPeriod = filterInRange(searches, range.start, range.end);

        const counts = {};
        inPeriod.forEach(function(s) {
            const key = s.category || 'Uncategorised';
            counts[key] = (counts[key] || 0) + 1;
        });

        const sorted = Object.entries(counts)
            .map(function([category, count]) { return { category, count }; })
            .sort(function(a, b) { return b.count - a.count; })
            .slice(0, 5);

        const max = sorted.length > 0 ? sorted[0].count : 1;

        const list = document.getElementById('pa-categories-list');
        list.innerHTML = sorted.map(function(item, i) {
            const pct = Math.round((item.count / max) * 100);
            return `
                <div class="pa-cat-row">
                    <div class="pa-cat-head"><span class="pa-cat-name">${item.category}</span><span class="pa-cat-count">${item.count}</span></div>
                    <div class="pa-cat-track"><div class="pa-cat-fill${i === 0 ? ' orange' : ''}" style="width:${pct}%"></div></div>
                </div>`;
        }).join('');
    }

    $('.pa-header-row .pd-toggle-group .pd-toggle-btn').on('click', function(){
        $('.pa-header-row .pd-toggle-group .pd-toggle-btn').removeClass('active');
        $(this).addClass('active');
        const label = $(this).text().trim();
        const period = label === 'Last 7 days' ? '7d' : label === 'Last 30 days' ? '30d' : 'ytd';
        renderAnalytics(period);
    });

    function getMonthlyCounts(rows, start, end, dateField) {
        dateField = dateField || 'created_at';
        const counts = [];

        let cursor = new Date(Date.UTC(start.getFullYear(), start.getMonth(), 1));
        const endMonth = new Date(Date.UTC(end.getFullYear(), end.getMonth(), 1));

        while (cursor <= endMonth) {
            const monthStart = new Date(cursor);
            const monthEnd = new Date(Date.UTC(cursor.getFullYear(), cursor.getMonth() + 1, 1));

            const count = rows.filter(function(r) {
                const d = new Date(r[dateField]);
                return d >= monthStart && d < monthEnd;
            }).length;

            counts.push(count);
            cursor = monthEnd;
        }

        return counts;
    }

  function countInRange(rows, start, end) {
      return rows.filter(function(row) {
          const createdAt = new Date(row.created_at);
          return createdAt >= start && createdAt < end;
      }).length;
  }

  function getQuarterDelta(rows) {
      const current = getCurrentQuarterInfo();
      const previous = getPreviousQuarterInfo();

      const currentRange = getQuarterRange(current.year, current.quarter);
      const previousRange = getQuarterRange(previous.year, previous.quarter);

      const currentCount = countInRange(rows, currentRange.start, currentRange.end);
      const previousCount = countInRange(rows, previousRange.start, previousRange.end);

      return currentCount - previousCount;
  }

  function getQuarterPercentChange(rows) {
        const current = getCurrentQuarterInfo();
        const previous = getPreviousQuarterInfo();

        const currentRange = getQuarterRange(current.year, current.quarter);
        const previousRange = getQuarterRange(previous.year, previous.quarter);

        const currentCount = countInRange(rows, currentRange.start, currentRange.end);
        const previousCount = countInRange(rows, previousRange.start, previousRange.end);

        if (previousCount === 0) {
            return currentCount > 0 ? 100 : 0;
        }

        return ((currentCount - previousCount) / previousCount) * 100;
    }

    function getLastNDaysRows(rows, numDays) {
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - numDays);

        return rows.filter(function(row) {
            return new Date(row.created_at) >= cutoff;
        });
    }

    function getTopByCount(rows, groupByField) {
        const counts = {};

        rows.forEach(function(row) {
            const key = row[groupByField];
            counts[key] = (counts[key] || 0) + 1;
        });

        return Object.entries(counts)
            .map(function([key, count]) {
                return { term: key, count: count };
            })
            .sort(function(a, b) {
                return b.count - a.count; // descending
            });
    }

function getTopSearches(data){
    const last7Days = getLastNDaysRows(data, 7);
    const topSearches = getTopByCount(last7Days, 'query');

    const wrap = $('#pd-top-searches-list'); 
    wrap.empty();
    wrap.append(`<div class="pd-panel-header">
        <div class="pd-panel-title">Top searches (7d)</div>
    </div>`);

    topSearches.slice(0, 5).forEach(function(item, i) {
        wrap.append(`
            <div class="pd-list-item">
                <div class="pd-list-left"><span class="pd-rank">${i + 1}</span><span class="pd-search-term">${item.term}</span></div>
                <span class="pd-search-count">${item.count}</span>
            </div>
        `);
    });

    if (last7Days){
        wrap.append(`
            <div class="pd-list-item">
                <div class="pd-list-left"><span class="pd-rank"></span><span class="pd-search-term" style="color:var(--t4)">No data available!</span></div>
                <span class="pd-search-count"></span>
            </div>
        `);
    }
}

async function renderRecentActivity(activityRows, userId) {
    // Get unique user IDs first
    const userIds = [...new Set(activityRows.map(function(item) { return item.user_id; }))];

    const response = await fetch(`/api/supabase?action=getAdminUsers&userId=${userId}`);
    const result = await response.json();
    if (result.error) {
        showToast(result.error, 'error');
        return;
    }

    const userMap = {};
    result.data.forEach(function(u) {
        userMap[u.id] = u;
    });

    const wrap = $('#pd-activity-activities'); 
    wrap.empty();
    wrap.append(`<div class="pd-panel-header">
        <div class="pd-panel-title">Recent admin activity</div>
    </div>`);

    activityRows.forEach(function(item, i) {
        const user = userMap[item.user_id];
        const name = user ? `${user.first_name} ${user.last_name || ''}` : 'Unknown';
        const initials = user ? `${user.first_name[0]}${user.last_name[0] || ''}` : '??';

        wrap.append(`
            <div class="pd-activity-item">
                <div class="pd-activity-avatar">${initials}</div>
                <div>
                <div class="pd-activity-name">${name}</div>
                <div class="pd-activity-action">${item.activity}</div>
                </div>
                <div class="pd-activity-time">${daysAgo(item.created_at)}</div>
            </div>
        `);
    });
    
    if (activityRows.length == 0){
        wrap.append(`
            <div class="pd-activity-item">
                <div class="pd-activity-name"></div>
                <div class="pd-activity-action" style="color:var(--t4)">No data available!</div>
                </div>
                <div class="pd-activity-time"></div>
            </div>
        `);
    }
}

async function getAdminActivities(userId){
    const response = await fetch(`/api/supabase?action=getAdminActivities&userId=${userId}`);
    const result = await response.json();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    renderRecentActivity(result.data, userId);
}

  async function getSearchFilters(){
    const response = await fetch('/api/supabase?action=getSearchFilters');
    const result = await response.json();
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }

    if (result.data !== null) getTopSearches(result.data);

    const { start, end } = getCurrentQuarterRange();
    const searchesThisQuarter = result.data.filter(function(s) {
        const createdAt = new Date(s.created_at);
        return createdAt >= start && createdAt < end;
    });

    $('#pd-searches-tot').text(searchesThisQuarter.length);

    const percentChange = getQuarterPercentChange(result.data);
    const rounded = Math.round(percentChange);
    $('#pd-searches-delta').text(rounded >= 0 ? `+${rounded}%` : `0%`);

    var data = getDailyCounts(result.data, 16);
    var max = Math.max.apply(null, data);
    var wrap = document.getElementById('pdChart');
    wrap.innerHTML = '';
    data.forEach(function(v) {
      var bar = document.createElement('div');
      bar.className = 'pd-chart-bar';
      bar.style.height = Math.round((v / max) * 100) + '%';
      wrap.appendChild(bar);
    });
  }

  const STAGES = [
        { key: 'ai-generated',    numId: '#pd-stage-ai-num',       pctId: '#pd-stage-ai-pct' },
        { key: 'vendor-owned',    numId: '#pd-stage-vendor-num',   pctId: '#pd-stage-vendor-pct' },
        { key: 'udder-verified',  numId: '#pd-stage-verified-num', pctId: '#pd-stage-verified-pct' },
        { key: 'udder-approved',  numId: '#pd-stage-approved-num', pctId: '#pd-stage-approved-pct' }
    ];

  let allProductsCache = []; 

    function renderVerificationPipeline(days){
        const now = new Date();
        const cutoff = new Date(now);
        cutoff.setDate(cutoff.getDate() - days);

        const filtered = allProductsCache.filter(function(row){
            return new Date(row.created_at) >= cutoff;
        });

        const total = filtered.length;

        STAGES.forEach(function(stage){
            const count = filtered.filter(function(row){
                return row.verification === stage.key;
            }).length;

            const pct = total > 0 ? Math.round((count / total) * 100) : 0;

            $(stage.numId).text(count);
            $(stage.pctId).text(`${pct}% of catalogue`);
        });
    }

    async function getVerificationPipeline(data){
        allProductsCache = data;

        // Render using whichever toggle is currently active
        const activeDays = parseInt($('.pd-toggle-group .pd-toggle-btn.active').data('days'), 10);
        renderVerificationPipeline(activeDays);
    }

    // Hook up the toggle buttons
    $('.pd-toggle-group .pd-toggle-btn').on('click', function(){
        $('.pd-toggle-group .pd-toggle-btn').removeClass('active');
        $(this).addClass('active');

        const days = parseInt($(this).data('days'), 10);
        renderVerificationPipeline(days);
    });

  function searchCI(q) {
    var query = q.toLowerCase();
    document.querySelectorAll('#panel-inquiries .ci-item').forEach(function(item) {
      var name = item.querySelector('.ci-item-name').textContent.toLowerCase();
      var desc = item.querySelector('.ci-item-desc').textContent.toLowerCase();
      item.style.display = (name.includes(query) || desc.includes(query)) ? '' : 'none';
    });
  }

  function switchAsTab(btn, tab) {
    document.querySelectorAll('.as-nav-item').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    ['details','notifications','password','account'].forEach(function(t) {
      var el = document.getElementById('as-content-' + t);
      if (el) el.style.display = (t === tab) ? '' : 'none';
    });
  }