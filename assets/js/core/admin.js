import { isLoggedIn, getCurrentUser, initSession } from './auth/session.js';
  import { showToast, initials, lockBtn } from '../app.js';

  export const HOSTNAME = window.location.origin;
  window.vendors = null;
  let ANALYTICS_CACHE = null;
  window.user = null;
  const VENDORS_ENDPOINT = '/api/supabase?action=getVendors';
  const PAGE_SIZE = 20;
  let allProductsCache = [];

  let vtAllRows = [];
  let vtFilteredRows = [];
  let vtSortKey = null;
  let vtSortDir = 'asc';
  let vtPage = 1;
  let vtLoaded = false;

  const USERS_ENDPOINT = '/api/supabase?action=getUsers';
    const UT_PAGE_SIZE = 20;

    let utAllRows = [];
    let utFilteredRows = [];
    let utSortKey = null;
    let utSortDir = 'asc';
    let utPage = 1;
    let utLoaded = false;

    const NOTIF_FIELD_MAP = {
        a_intro_requests: 'as-notif-intro-updates',
        a_new_comparison: 'as-notif-new-comparisons',
        a_verification_updates: 'as-notif-verification-updates',
        a_weekly_digest: 'as-notif-weekly-digest',
        a_product_updates: 'as-notif-product-updates',
        a_market_insights: 'as-notif-market-insights'
    };
  
  const loggedIn = await isLoggedIn();
  $(async function(){
    if (!loggedIn){location.href = `${HOSTNAME}/admin/login.html`;return;}

    await initSession();
    const { user } = await getCurrentUser();
    window.user = user;
    const userId = user.id;

    if (userId === null){location.href = `${HOSTNAME}/admin/login.html`;return;}
    if (user.role !== 'admin'){
        showToast('Logging out...', 'warning');
        await fetch('/api/logout', {method: 'GET'});
        
        location.href = `${HOSTNAME}/admin/login.html`;
        return;
    }

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
    $('#as-first-name').val(result.data.first_name);
    $('#as-last-name').val(result.data.last_name || '');
    $('#as-work-email').val(result.data.email);
    $('#as-job-title').val(result.data.job_title || '');

    getUsers();
    getIntroRequests();
    getSearchFilters();
    await getVendors();
    getVerifications();
    getAdminActivities(userId);
    loadNotificationPrefs(userId);

    var loader = document.getElementById('pageLoader');
    if (loader) {
      loader.classList.add('hide');
      setTimeout(function () { loader.remove(); }, 300);
    }
  });

  async function loadNotificationPrefs(userId) {
    try {
      const res = await fetch(`/api/supabase?action=getNotificationPrefs&userId=${userId}`);
      const prefs = await res.json();
       
      Object.keys(NOTIF_FIELD_MAP).forEach(function (key) {
        //if (!(key in prefs)) return; // leave default checked state if API omits a field
        const el = document.getElementById(NOTIF_FIELD_MAP[key]);
        if (el) el.checked = !!prefs.data[key];
      });
    } catch (err) {
      showToast(`Failed to load notification preferences: ${err}`, 'error');
    }
  }

  function collectDetails() {
    return {
      first_name: document.getElementById('as-first-name').value.trim(),
      last_name: document.getElementById('as-last-name').value.trim(),
      email: document.getElementById('as-work-email').value.trim(),
      job_title: document.getElementById('as-job-title').value.trim(),
    };
  }

  const detailsSaveBtn = document.getElementById('as-details-save-btn');
    if (detailsSaveBtn) {
        detailsSaveBtn.addEventListener('click', async function () {
            const payload = collectDetails();

            if (!payload.first_name){showToast('First name is required', 'error');return;}

            if (!window.user){
                const { user } = await getCurrentUser();
                window.user.id = user.id;
            }
            
            const reset = lockBtn($(this));
            if (!reset) return;
            
            const response = await fetch('/api/supabase?action=updatePersonalDetails', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                    id: window.user.id,
                    payload: payload
                })
            });

            const result = await response.json();
            if (result.error){showToast(result.error, 'error'); return;}
            showToast('Updated Successfully!', 'success');
            reset();
        });
  }

  function collectNotifications() {
    return {
      a_intro_requests: document.getElementById('as-notif-intro-updates').checked,
      a_new_comparison: document.getElementById('as-notif-new-comparisons').checked,
      a_verification_updates: document.getElementById('as-notif-verification-updates').checked,
      a_weekly_digest: document.getElementById('as-notif-weekly-digest').checked,
      a_product_updates: document.getElementById('as-notif-product-updates').checked,
      a_market_insights: document.getElementById('as-notif-market-insights').checked
    };
  }

  const notifSaveBtn = document.getElementById('as-notif-save-btn');
  if (notifSaveBtn) {
    notifSaveBtn.addEventListener('click', async function () {
        const payload = collectNotifications();

        var reset = lockBtn($(this));
        if (!reset) return;

        if (!window.user){
            const { user } = await getCurrentUser();
            window.user.id = user.id;
        }
        
        const response = await fetch('/api/supabase?action=saveNotificationPrefs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: window.user.id, prefs: payload })
        });

        const result = await response.json();
        if (result.error){showToast(result.error, 'error'); return;}
        showToast('Updated Successfully!', 'success');
        reset();
    });
  }

  function collectPassword() {
    return {
      currentPassword: document.getElementById('as-current-password').value,
      newPassword: document.getElementById('as-new-password').value,
      confirmPassword: document.getElementById('as-confirm-password').value
    };
  }

  const passwordSaveBtn = document.getElementById('as-password-save-btn');
  if (passwordSaveBtn) {
    passwordSaveBtn.addEventListener('click', async function () {
        const payload = collectPassword();
        if (!payload.currentPassword || !payload.newPassword || !payload.confirmPassword) {
            showToast('All three fields are required.', 'error');
            return;
        }
        if (payload.newPassword !== payload.confirmPassword) {
            showToast('New password and confirmation do not match.', 'error');
            return;
        }

        if (payload.newPassword.length < 12) { showToast('New password must be at least 12 characters.', 'error'); return; }
        if (!/[A-Z]/.test(payload.newPassword)) { showToast('Password must contain at least one uppercase letter.', 'error'); return; }
        if (!/[0-9!@#$%^&*]/.test(payload.newPassword)) { showToast('Password must contain a number or symbol.', 'error'); return; }
        
        var reset = lockBtn($(this));
        if (!reset) return;

        if (!window.user){
            const { user } = await getCurrentUser();
            window.user.email = user.email;
        }

        const response = await fetch('/api/supabase?action=updateUserPassword', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email:       window.user.email,
                oldPassword: payload.currentPassword,
                newPassword: payload.newPassword
            })
        });

        const result = await response.json();
        reset();

        if (result.error) { showToast(result.error, 'error'); return; }
        showToast('Logging out...', 'warning');
        await fetch('/api/logout', {method: 'GET'});
    });
  }

    document.getElementById('sbUserToggle').addEventListener('click', (e) => {
        document.getElementById('sbUserMenu').classList.toggle('open');
        e.stopPropagation();
    });

    document.addEventListener('click', () => {
        document.getElementById('sbUserMenu').classList.remove('open');
    });

    document.getElementById('sbLogoutBtn').addEventListener('click', async (e) => {
        e.stopPropagation();
        showToast('Loggin out. Redirecting…', 'success');
        await fetch('/api/logout', {method: 'GET'});

        location.href = 'login.html';
    });

  document.getElementById('as-send-reset-email-btn').addEventListener('click', async function(){
        if (!window.user){
            const { user } = await getCurrentUser();
            window.user = user;
        }
        
        const confirmed = await showConfirm(
            'Send password reset email?',
            window.user.email ? `This will send a password reset link to ${window.user.email}.` : 'This will send a password reset link.'
        );

        const reset = lockBtn($(this), {spinnerColor: 'var(--t2)' });
        if (!reset) return;
        
        if (confirmed) await sendPasswordResetEmail(window.user.id, window.user.email);
        reset();
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
      if (this.dataset.panel == 'vendors') onVendorsPanelShown();
      if (this.dataset.panel == 'users') loadUsers();
      if (this.dataset.panel == 'taxonomy') loadTaxonomy();
    });
  });

  document.querySelectorAll('.pd-toggle-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      this.parentNode.querySelectorAll('.pd-toggle-btn').forEach(function(b) { b.classList.remove('active'); });
      this.classList.add('active');
    });
  });

    var modal    = document.getElementById('deleteAccountModal');
    var input    = document.getElementById('daConfirmInput');
    var submitBtn= document.getElementById('daSubmit');
    var cancelBtn= document.getElementById('daCancel');
    var deleteBtn= document.getElementById('deleteAccountBtn');

    /* Open — wire to the delete button in the account tab */
    deleteBtn.addEventListener('click', function(){
        input.value = '';
        submitBtn.classList.remove('enabled');
        modal.classList.add('visible');
        setTimeout(function(){ input.focus(); }, 200);
    });

    /* Enable submit only when user types DELETE exactly */
    input.addEventListener('input', function(){
        var valid = this.value === 'DELETE';
        submitBtn.classList.toggle('enabled', valid);
        submitBtn.disabled = !valid;
    });

    /* Cancel */
    cancelBtn.addEventListener('click', closeDeleteModal);
    modal.addEventListener('click', function(e){ if(e.target === modal) closeDeleteModal(); });
    document.addEventListener('keydown', function(e){ if(e.key === 'Escape') closeDeleteModal(); });

    function closeDeleteModal(){
        modal.classList.remove('visible');
        input.value = '';
        submitBtn.classList.remove('enabled');
        submitBtn.disabled = true;
    }

    /* Submit */
    submitBtn.addEventListener('click', async function(){
        const reset = lockBtn($(this));
        if (!reset) return;

        this.textContent = 'Deleting…';
        this.style.opacity = '0.7';
        this.style.pointerEvents = 'none';

        if (!window.user){
            const { user } = await getCurrentUser();
            window.user = user;
        }

        try {
            const response = await fetch('/api/supabase?action=deleteAction', {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                body:    JSON.stringify({userId: window.user.id})
            });

            const result = await response.json();
            reset();
            if (result.error){showToast(result.error, 'error');return;}
            console.log('Delete account confirmed for user:', window.user.id);
            closeDeleteModal();
            showToast('Account deleted. Redirecting…', 'success');
            await fetch('/api/logout', {method: 'GET'});
            setTimeout(function(){ window.location.href = '/'; }, 2000);
        } catch(e) {
            console.error('Delete account failed:', e);
            this.textContent = 'Delete my account';
            this.style.opacity = '';
            this.style.pointerEvents = '';
            showToast('Something went wrong. Please try again.', 'error');
        }
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
  window.switchVqTab = function switchVqTab(tab) {
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

  function pick(row, keys, fallback) {
    for (const k of keys) {
      if (row && row[k] !== undefined && row[k] !== null && row[k] !== '') return row[k];
    }
    return fallback;
  }

  function normalizeRow(row) {
        const name = pick(row, ['name'], 'Unnamed vendor');
        const tier = pick(row, ['verification'], null); 
        const category = pick(row, ['categories', 'industry'], null);
        const location = pick(row, ['hq_location'], null);
        const employees = pick(row, ['employee_count'], null);
        const website = pick(row, ['website'], null);
        const created = pick(row, ['created_at'], null);
        return { raw: row, name, tier, category, location, employees, website, created };
    }

  function tierPillClass(tier) {
    if (!tier) return 'grey';
    const t = String(tier).toLowerCase();
    if (t.includes('approved')) return 'black';
    if (t.includes('verified')) return 'orange';
    if (t.includes('vendor')) return 'outline';
    return 'grey';
    }

  function fmtDate(v) {
    if (!v) return '–';
    const d = new Date(v);
    if (isNaN(d.getTime())) return String(v);
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }

  function renderRows() {
    const tbody = document.getElementById('vtTableBody');
    const meta = document.getElementById('vtMeta');
    const pageInfo = document.getElementById('vtPageInfo');
    const prevBtn = document.getElementById('vtPrevBtn');
    const nextBtn = document.getElementById('vtNextBtn');
    
    if (!vtFilteredRows.length) {
      tbody.innerHTML = '<tr><td class="vt-empty-cell" colspan="7">No vendors match your search.</td></tr>';
      meta.textContent = vtAllRows.length ? '0 of ' + vtAllRows.length + ' vendors' : '0 vendors';
      pageInfo.textContent = '';
      prevBtn.disabled = true;
      nextBtn.disabled = true;
      return;
    }

    const totalPages = Math.max(1, Math.ceil(vtFilteredRows.length / PAGE_SIZE));
    vtPage = Math.min(vtPage, totalPages);
    const start = (vtPage - 1) * PAGE_SIZE;
    const pageRows = vtFilteredRows.slice(start, start + PAGE_SIZE);

    tbody.innerHTML = pageRows.map((r) => {
        const tierCls = tierPillClass(r.tier);
        return '<tr>'
            + '<td class="vt-name"><a href="#" class="vt-name-link" data-vendor-id="' + escapeHtml(r.raw.id) + '">' + escapeHtml(r.name) + '</a></td>'
            + '<td>' + (r.tier ? '<span class="vt-pill ' + tierCls + '"><span class="dot"></span>' + escapeHtml(String(r.tier).toUpperCase()) + '</span>' : '–') + '</td>'
            + '<td>' + escapeHtml(r.category || '–') + '</td>'
            + '<td>' + escapeHtml(r.location || '–') + '</td>'
            + '<td>' + escapeHtml(r.employees || '–') + '</td>'
            + '<td>' + (r.website ? '<a href="' + escapeHtml(r.website) + '" target="_blank" rel="noopener">' + escapeHtml(r.website.replace(/^https?:\/\//, '')) + '</a>' : '–') + '</td>'
            + '<td>' + escapeHtml(fmtDate(r.created)) + '</td>'
            + '</tr>';
    }).join('');

    meta.textContent = vtFilteredRows.length + (vtFilteredRows.length === vtAllRows.length ? ' vendors' : ' of ' + vtAllRows.length + ' vendors');
    pageInfo.textContent = 'Page ' + vtPage + ' of ' + totalPages;
    prevBtn.disabled = vtPage <= 1;
    nextBtn.disabled = vtPage >= totalPages;
  }

  function applySearchAndSort() {
    const query = (document.getElementById('vtSearchInput').value || '').trim().toLowerCase();
    vtFilteredRows = !query ? vtAllRows.slice() : vtAllRows.filter((r) => {
      return [r.name, r.tier, r.category, r.location].some((v) => v != null && String(v).toLowerCase().includes(query));
    });

    if (vtSortKey) {
      vtFilteredRows.sort((a, b) => {
        let av = a[vtSortKey], bv = b[vtSortKey];
        if (av == null) av = '';
        if (bv == null) bv = '';
        if (typeof av === 'number' && typeof bv === 'number') return vtSortDir === 'asc' ? av - bv : bv - av;
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
        if (av < bv) return vtSortDir === 'asc' ? -1 : 1;
        if (av > bv) return vtSortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    vtPage = 1;
    renderRows();
  }

  function setSortIndicators() {
    document.querySelectorAll('#vtTable thead th').forEach((th) => {
      const ind = th.querySelector('.vt-sort-ind');
      if (th.dataset.key === vtSortKey) {
        ind.textContent = vtSortDir === 'asc' ? '▲' : '▼';
      } else {
        ind.textContent = '';
      }
    });
  }

  async function loadVendors() {
    const tbody = document.getElementById('vtTableBody');
    const meta = document.getElementById('vtMeta');
    const refreshBtn = document.getElementById('vtRefreshBtn');

    refreshBtn.classList.add('spinning');
    tbody.innerHTML = '<tr><td class="vt-loading-cell" colspan="7">Loading vendors…</td></tr>';
    meta.textContent = 'Loading vendors…';
     
    try {
      const res = await fetch(VENDORS_ENDPOINT);
      const data = await res.json();
        console.log('data', data);
      $('#vendors-tot').text(data.data.length || '0');  
      let rows = Array.isArray(data) ? data
        : Array.isArray(data.data) ? data.data
        : Array.isArray(data.vendors) ? data.vendors
        : [];
      
      vtAllRows = rows.map(normalizeRow);
      vtLoaded = true;
      applySearchAndSort();
    } catch (err) {
      console.error('Failed to load vendors:', err);
      vtAllRows = [];
      vtFilteredRows = [];
      tbody.innerHTML = '<tr><td class="vt-error-cell" colspan="7">Couldn\'t load vendors (' + escapeHtml(err.message) + '). Check the API endpoint and try again.</td></tr>';
      meta.textContent = 'Error loading vendors';
    } finally {
      refreshBtn.classList.remove('spinning');
    }
  }

  function initVendorsTable() {
    document.getElementById('vtSearchInput').addEventListener('input', applySearchAndSort);
    document.getElementById('vtRefreshBtn').addEventListener('click', loadVendors);
    document.getElementById('vtPrevBtn').addEventListener('click', () => { vtPage--; renderRows(); });
    document.getElementById('vtNextBtn').addEventListener('click', () => { vtPage++; renderRows(); });
    document.querySelectorAll('#vtTable thead th').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (vtSortKey === key) {
          vtSortDir = vtSortDir === 'asc' ? 'desc' : 'asc';
        } else {
          vtSortKey = key;
          vtSortDir = 'asc';
        }
        setSortIndicators();
        applySearchAndSort();
      });
    });
  }

  function onVendorsPanelShown() {
    if (!vtLoaded) loadVendors();
  }

  initVendorsTable();

  function normalizeUserRow(row) {
    const first = pick(row, ['first_name'], '');
    const last = pick(row, ['last_name'], '');
    const name = (first + ' ' + last).trim() || 'Unnamed user';
    const email = pick(row, ['email'], null);
    const role = pick(row, ['role'], null);
    const organization = pick(row, ['organization'], null);
    const verified = pick(row, ['verified'], null); // 'Y' / 'N' / null
    const active = row && row.active === true ? true : row && row.active === false ? false : null;
    const created = pick(row, ['created_at'], null);
    return { raw: row, name, email, role, organization, verified, active, created };
    }

    function roleLabel(role) {
    if (!role) return '–';
    return String(role).replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
    }

    function renderUserRows() {
        const tbody = document.getElementById('utTableBody');
        const meta = document.getElementById('utMeta');
        const pageInfo = document.getElementById('utPageInfo');
        const prevBtn = document.getElementById('utPrevBtn');
        const nextBtn = document.getElementById('utNextBtn');

        if (!utFilteredRows.length) {
            tbody.innerHTML = '<tr><td class="vt-empty-cell" colspan="7">No users match your search.</td></tr>';
            meta.textContent = utAllRows.length ? '0 of ' + utAllRows.length + ' users' : '0 users';
            pageInfo.textContent = '';
            prevBtn.disabled = true;
            nextBtn.disabled = true;
            return;
        }

        const totalPages = Math.max(1, Math.ceil(utFilteredRows.length / UT_PAGE_SIZE));
        utPage = Math.min(utPage, totalPages);
        const start = (utPage - 1) * UT_PAGE_SIZE;
        const pageRows = utFilteredRows.slice(start, start + UT_PAGE_SIZE);

        tbody.innerHTML = pageRows.map((r) => {
            const verifiedLabel = r.verified === 'Y' ? 'Yes' : r.verified === 'N' ? 'No' : '–';
            const activeLabel = r.active === true ? 'Active' : r.active === false ? 'Inactive' : '–';
            return '<tr>'
            + '<td><a href="#" class="vt-name-link" data-user-id="' + escapeHtml(r.raw.id) + '">' + escapeHtml(r.name) + '</a></td>'
            + '<td>' + escapeHtml(r.email || '–') + '</td>'
            + '<td>' + escapeHtml(roleLabel(r.role)) + '</td>'
            + '<td>' + escapeHtml(r.organization || '–') + '</td>'
            + '<td>' + escapeHtml(verifiedLabel) + '</td>'
            + '<td>' + escapeHtml(activeLabel) + '</td>'
            + '<td>' + escapeHtml(fmtDate(r.created)) + '</td>'
            + '<td class="ut-actions-cell">'
                + '<button class="ut-row-menu-btn" style="border:none;background:transparent;cursor:pointer" type="button" title="Send password reset email" data-email="' + escapeHtml(r.email || '–') + '" data-user-id="' + escapeHtml(r.raw.id) + '" aria-label="Row actions"><i class="fa fa-envelope"></i></button>'
            + '</td>'
            + '</tr>';
        }).join('');

        meta.textContent = utFilteredRows.length + (utFilteredRows.length === utAllRows.length ? ' users' : ' of ' + utAllRows.length + ' users');
        pageInfo.textContent = 'Page ' + utPage + ' of ' + totalPages;
        prevBtn.disabled = utPage <= 1;
        nextBtn.disabled = utPage >= totalPages;
    }

    function applyUserSearchAndSort() {
    const query = (document.getElementById('utSearchInput').value || '').trim().toLowerCase();
    utFilteredRows = !query ? utAllRows.slice() : utAllRows.filter((r) => {
        return [r.name, r.email, r.role, r.organization].some((v) => v != null && String(v).toLowerCase().includes(query));
    });

    if (utSortKey) {
        utFilteredRows.sort((a, b) => {
        let av = a[utSortKey], bv = b[utSortKey];
        if (av == null) av = '';
        if (bv == null) bv = '';
        av = String(av).toLowerCase();
        bv = String(bv).toLowerCase();
        if (av < bv) return utSortDir === 'asc' ? -1 : 1;
        if (av > bv) return utSortDir === 'asc' ? 1 : -1;
        return 0;
        });
    }
    utPage = 1;
    renderUserRows();
    }

    function setUserSortIndicators() {
        document.querySelectorAll('#utTable thead th').forEach((th) => {
            const ind = th.querySelector('.vt-sort-ind');
            if (th.dataset.key === utSortKey) {
            ind.textContent = utSortDir === 'asc' ? '▲' : '▼';
            } else {
            ind.textContent = '';
            }
        });
    }
    
    let TAX_ALL = [];      // internal shape: [{ id, name, subcategories: [{ id, name }] }]
    let taxRowId = null;   // the row id returned by getTaxonomy, sent back so updateTaxonomy knows which row to write
    let taxDirty = false;
    let taxLoaded = false;
    let taxIdCounter = 0;
    
    function taxUid(prefix) {
        taxIdCounter += 1;
        return prefix + '-' + Date.now() + '-' + taxIdCounter;
    }
    
    // Converts the API's { modules: [...], sub_modules: { name: [...] } } shape
    // into the internal tree shape the UI edits (so categories can be renamed
    // without losing track of which subcategories belong to them).
    function taxFromApiShape(row) {
        const modules = Array.isArray(row.modules) ? row.modules : [];
        const subModules = row.sub_modules || {};
        return modules.map(function(name) {
            return {
            id: taxUid('cat'),
            name: name,
            subcategories: (subModules[name] || []).map(function(subName) {
                return { id: taxUid('sub'), name: subName };
            })
            };
        });
    }
    
    // Converts internal shape back to { modules, sub_modules } for saving.
    function taxToApiShape() {
        const modules = TAX_ALL.map(function(c) { return c.name; });
        const sub_modules = {};
        TAX_ALL.forEach(function(c) {
            sub_modules[c.name] = c.subcategories.map(function(s) { return s.name; });
        });
        return { modules: modules, sub_modules: sub_modules };
    }
    
    function taxTotalSubcats() {
        return TAX_ALL.reduce(function(sum, c) { return sum + c.subcategories.length; }, 0);
    }
    
    function setTaxDirty(v) {
        taxDirty = v;
        const saveBtn = document.getElementById('txSaveBtn');
        if (saveBtn) saveBtn.disabled = !taxDirty;
        const meta = document.getElementById('txMeta');
        if (meta) {
            meta.textContent = taxDirty
            ? 'Unsaved changes — ' + taxTotalSubcats() + ' subcategories across ' + TAX_ALL.length + ' categories'
            : TAX_ALL.length + ' categories · ' + taxTotalSubcats() + ' subcategories';
            meta.classList.toggle('dirty', taxDirty);
        }
    }
    
    function renderTaxonomy() {
        const treeEl = document.getElementById('txTree');
        if (!treeEl) return;
        treeEl.innerHTML = '';
        
        TAX_ALL.forEach(function(cat) {
            const card = document.createElement('div');
            card.className = 'tx-cat-card';
        
            const head = document.createElement('div');
            head.className = 'tx-cat-head';
            head.innerHTML = ''
            + '<span class="tx-drag-handle">⠿</span>'
            + '<input class="tx-cat-name-input" data-cat="' + cat.id + '" value="' + escapeHtml(cat.name) + '">'
            + '<span class="tx-cat-count">' + cat.subcategories.length + ' sub' + (cat.subcategories.length === 1 ? '' : 's') + '</span>'
            + '<button class="tx-icon-btn danger" data-del-cat="' + cat.id + '" title="Delete category">'
                + '<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 4h10M6 4V3a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v1m-6 0v9a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V4" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>'
            + '</button>';
            card.appendChild(head);
        
            const subList = document.createElement('div');
            subList.className = 'tx-subcat-list';
            cat.subcategories.forEach(function(sub) {
            const row = document.createElement('div');
            row.className = 'tx-subcat-row';
            row.innerHTML = ''
                + '<span class="tx-subcat-dot"></span>'
                + '<input class="tx-subcat-input" data-cat="' + cat.id + '" data-sub="' + sub.id + '" value="' + escapeHtml(sub.name) + '">'
                + '<button class="tx-subcat-del" data-del-sub="' + sub.id + '" data-cat="' + cat.id + '" title="Remove subcategory">✕</button>';
            subList.appendChild(row);
            });
        
            const addSubBtn = document.createElement('button');
            addSubBtn.className = 'tx-add-subcat-btn';
            addSubBtn.dataset.addSub = cat.id;
            addSubBtn.innerHTML = '+ Add subcategory';
            subList.appendChild(addSubBtn);
        
            card.appendChild(subList);
            treeEl.appendChild(card);
        });
        
        setTaxDirty(taxDirty);
        attachTaxonomyHandlers();
    }
    
    function attachTaxonomyHandlers() {
    document.querySelectorAll('.tx-cat-name-input').forEach(function(input) {
        input.addEventListener('input', function(e) {
        const cat = TAX_ALL.find(function(c) { return c.id === input.dataset.cat; });
        if (cat) { cat.name = e.target.value; setTaxDirty(true); }
        });
    });
    
    document.querySelectorAll('.tx-subcat-input').forEach(function(input) {
        input.addEventListener('input', function(e) {
        const cat = TAX_ALL.find(function(c) { return c.id === input.dataset.cat; });
        const sub = cat && cat.subcategories.find(function(s) { return s.id === input.dataset.sub; });
        if (sub) { sub.name = e.target.value; setTaxDirty(true); }
        });
    });
    
    document.querySelectorAll('[data-del-cat]').forEach(function(btn) {
        btn.addEventListener('click', async function() {
        const catId = btn.dataset.delCat;
        const cat = TAX_ALL.find(function(c) { return c.id === catId; });
        if (!cat) return;
        const confirmed = await showConfirm(
            'Delete category?',
            'This will remove "' + cat.name + '" and its ' + cat.subcategories.length + ' subcategories from the taxonomy.'
        );
        if (!confirmed) return;
        TAX_ALL = TAX_ALL.filter(function(c) { return c.id !== catId; });
        setTaxDirty(true);
        renderTaxonomy();
        });
    });
    
    document.querySelectorAll('[data-del-sub]').forEach(function(btn) {
        btn.addEventListener('click', function() {
        const cat = TAX_ALL.find(function(c) { return c.id === btn.dataset.cat; });
        if (!cat) return;
        cat.subcategories = cat.subcategories.filter(function(s) { return s.id !== btn.dataset.delSub; });
        setTaxDirty(true);
        renderTaxonomy();
        });
    });
    
    document.querySelectorAll('[data-add-sub]').forEach(function(btn) {
        btn.addEventListener('click', function() {
        const cat = TAX_ALL.find(function(c) { return c.id === btn.dataset.addSub; });
        if (!cat) return;
        cat.subcategories.push({ id: taxUid('sub'), name: '' });
        setTaxDirty(true);
        renderTaxonomy();
        const lastInput = document.querySelector('.tx-subcat-input[data-cat="' + cat.id + '"]:last-of-type');
        if (lastInput) lastInput.focus();
        });
    });
    }
    
    // Called whenever the Taxonomy nav item is clicked (wired in the existing
    // panel-switch handler further up the file: `if (this.dataset.panel == 'taxonomy') loadTaxonomy();`).
    // Refetches every time the tab is opened so edits saved elsewhere show up.
    async function loadTaxonomy(){
    const treeEl = document.getElementById('txTree');
    if (treeEl) treeEl.innerHTML = '<div class="tx-loading-cell">Loading taxonomy…</div>';
    
    const res = await fetch('/api/supabase?action=getTaxonomy');
    const result = await res.json();
    if (result.error){
        showToast(result.error, 'error');
        if (treeEl) treeEl.innerHTML = '<div class="tx-error-cell">Couldn\'t load taxonomy.</div>';
        return;
    }
    
    const row = Array.isArray(result.data) ? result.data[0] : result.data;
    if (!row) {
        if (treeEl) treeEl.innerHTML = '<div class="tx-error-cell">No taxonomy found.</div>';
        return;
    }
    
    taxRowId = row.id ?? null;
    TAX_ALL = taxFromApiShape(row);
    taxLoaded = true;
    setTaxDirty(false);
    renderTaxonomy();
    }
    
    async function saveTaxonomy(){
        const hasEmptyCat = TAX_ALL.some(function(c) { return !c.name.trim(); });
        if (hasEmptyCat) { showToast('Give every category a name before saving.', 'error'); return; }
        
        const saveBtn = document.getElementById('txSaveBtn');
        const reset = lockBtn($(saveBtn));
        if (!reset) return;
        
        const payload = taxToApiShape();
        //if (taxRowId !== null) payload.id = taxRowId;
        
        try {
            const res = await fetch('/api/supabase?action=updateTaxonomy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({payload: payload})
            });
            const result = await res.json();
            if (result.error) {
                showToast(result.error, 'error');
                reset();
                return;
            }
            reset();
            showToast('Taxonomy saved', 'success');
            setTaxDirty(false);
        } catch (err) {
            console.error('Failed to save taxonomy:', err);
            showToast('Failed to save taxonomy', 'error');
            reset();
        }
    }
    
    function initTaxonomyPanel(){
        const addCatBtn = document.getElementById('txAddCatBtn');
        if (addCatBtn) {
            addCatBtn.addEventListener('click', function() {
            TAX_ALL.push({ id: taxUid('cat'), name: '', subcategories: [] });
            setTaxDirty(true);
            renderTaxonomy();
            const inputs = document.querySelectorAll('.tx-cat-name-input');
            if (inputs.length) inputs[inputs.length - 1].focus();
            });
        }
        
        const saveBtn = document.getElementById('txSaveBtn');
        if (saveBtn) saveBtn.addEventListener('click', saveTaxonomy);
    }

    let vtModalMode = 'view'; // 'view' | 'edit' | 'add'
    let vtModalVendor = null;

    function openVendorModal(vendorRow, mode) {
        vtModalVendor = vendorRow;
        vtModalMode = mode;
        renderVendorModal();
        const overlay = document.getElementById('utPanelOverlay');
        overlay.style.display = 'block';
        requestAnimationFrame(function() { overlay.classList.add('open'); });
    }

    function closeVendorModal() {
        const overlay = document.getElementById('utPanelOverlay');
        overlay.classList.remove('open');
        setTimeout(function() { overlay.style.display = 'none'; }, 220);
        vtModalVendor = null;
    }

    const VERIFICATION_OPTIONS = ['ai-generated', 'vendor-owned', 'udder-verified', 'udder-approved'];

    function renderVendorModal() {
        const v = vtModalVendor || {};
        const isAdd = vtModalMode === 'add';
        const isEdit = vtModalMode === 'edit' || isAdd;

        let contact = v.contact_person;
        if (typeof contact === 'string') {
            try { contact = JSON.parse(contact); } catch (e) { contact = null; }
        }
        contact = contact || { name: '', email: '', phone: '' };

        document.getElementById('utModalEyebrow').textContent = isAdd ? 'New vendor' : 'Vendor details';
        document.getElementById('utModalTitle').textContent = isAdd ? 'Add vendor' : (v.name || 'Unnamed vendor');

        const body = document.getElementById('utModalBody');
        const actions = document.getElementById('utModalActions');

        if (!isEdit) {
            // VIEW MODE
            body.innerHTML = [
            ['Website', v.website],
            ['Verification tier', v.verification],
            ['Category', v.categories],
            ['HQ location', v.hq_location],
            ['Region', v.region],
            ['Country', v.country],
            ['Industry', v.industry],
            ['Employees', v.employee_count],
            ['Founded', v.founding_year],
            ['Contact name', contact.name],
            ['Contact email', contact.email],
            ['Contact phone', contact.phone],
            ['Added', fmtDate(v.created_at)],
            ['Description', v.short_description || v.description]
            ].map(function(pair) {
                return '<div class="ut-view-row"><div class="ut-view-label">' + pair[0] + '</div><div class="ut-view-value">' + escapeHtml(pair[1] || '–') + '</div></div>';
            }).join('');

            actions.innerHTML = '';

            const delBtn = document.createElement('button');
            delBtn.className = 'as-danger-btn';
            delBtn.textContent = 'Delete';
            delBtn.addEventListener('click', async function() {
                const confirmed = await showConfirm(
                    'Delete this vendor?',
                    'This will permanently remove "' + (v.name || 'this vendor') + '" from UdderDB. This cannot be undone.'
                );
                if (confirmed) await deleteVendor(v.id);
            });

            const editBtn = document.createElement('button');
            editBtn.className = 'as-save-btn';
            editBtn.textContent = 'Edit';
            editBtn.addEventListener('click', function() { openVendorModal(vtModalVendor, 'edit'); });

            actions.appendChild(delBtn);
            actions.appendChild(editBtn);
            return;
        }

        body.innerHTML =
            '<div class="ut-field"><label>Name</label><input id="vtfName" value="' + escapeHtml(v.name || '') + '"></div>'
            + '<div class="ut-field"><label>Website</label><input id="vtfWebsite" value="' + escapeHtml(v.website || '') + '"></div>'
            + '<div class="ut-field"><label>Verification tier</label><select id="vtfVerification">'
                + VERIFICATION_OPTIONS.map(function(t) {
                    return '<option value="' + t + '"' + (v.verification === t ? ' selected' : '') + '>' + t + '</option>';
                }).join('')
            + '</select></div>'
            + '<div class="ut-field-row2">'
                + '<div class="ut-field"><label>Category</label><input id="vtfCategories" value="' + escapeHtml(v.categories || '') + '"></div>'
                + '<div class="ut-field"><label>Industry</label><input id="vtfIndustry" value="' + escapeHtml(v.industry || '') + '"></div>'
            + '</div>'
            + '<div class="ut-field-row2">'
                + '<div class="ut-field"><label>HQ location</label><input id="vtfHqLocation" value="' + escapeHtml(v.hq_location || '') + '"></div>'
                + '<div class="ut-field"><label>Employees</label><input id="vtfEmployeeCount" value="' + escapeHtml(v.employee_count || '') + '"></div>'
            + '</div>'
            + '<div class="ut-field-row2">'
                + '<div class="ut-field"><label>Region</label><input id="vtfRegion" value="' + escapeHtml(v.region || '') + '"></div>'
                + '<div class="ut-field"><label>Country</label><input id="vtfCountry" value="' + escapeHtml(v.country || '') + '"></div>'
            + '</div>'
            + '<div class="ut-field"><label>Founding year</label><input id="vtfFoundingYear" type="number" value="' + escapeHtml(v.founding_year || '') + '"></div>'
            + '<div class="ut-field-row2">'
                + '<div class="ut-field"><label>Contact name</label><input id="vtfContactName" value="' + escapeHtml(contact.name || '') + '"></div>'
                + '<div class="ut-field"><label>Contact email</label><input id="vtfContactEmail" type="email" value="' + escapeHtml(contact.email || '') + '"></div>'
            + '</div>'
            + '<div class="ut-field"><label>Contact phone</label><input id="vtfContactPhone" value="' + escapeHtml(contact.phone || '') + '"></div>'
            + '<div class="ut-field"><label>Short description</label>'
                + '<textarea id="vtfShortDescription" style="width:100%;min-height:90px;padding:10px 12px;border:1px solid var(--b2);border-radius:8px;font-family:var(--sans);font-size:14px;resize:vertical">' + escapeHtml(v.short_description || v.description || '') + '</textarea></div>';

        actions.innerHTML = '';
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'as-cancel-btn';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', function() {
            if (isAdd) closeVendorModal();
            else openVendorModal(vtModalVendor, 'view');
        });

        const saveBtn = document.createElement('button');
        saveBtn.className = 'as-save-btn';
        saveBtn.textContent = isAdd ? 'Create vendor' : 'Save changes';
        saveBtn.addEventListener('click', function() { saveVendorForm(isAdd); });

        actions.appendChild(cancelBtn);
        actions.appendChild(saveBtn);
    }

    async function saveVendorForm(isAdd) {
        const payload = {
            name: document.getElementById('vtfName').value.trim(),
            website: document.getElementById('vtfWebsite').value.trim() || null,
            verification: document.getElementById('vtfVerification').value,
            categories: document.getElementById('vtfCategories').value.trim() || null,
            industry: document.getElementById('vtfIndustry').value.trim() || null,
            hq_location: document.getElementById('vtfHqLocation').value.trim() || null,
            employee_count: document.getElementById('vtfEmployeeCount').value.trim() || null,
            region: document.getElementById('vtfRegion').value.trim() || null,
            country: document.getElementById('vtfCountry').value.trim() || null,
            founding_year: document.getElementById('vtfFoundingYear').value ? parseInt(document.getElementById('vtfFoundingYear').value, 10) : null,
            contact_person: {
                name: document.getElementById('vtfContactName').value.trim(),
                email: document.getElementById('vtfContactEmail').value.trim(),
                phone: document.getElementById('vtfContactPhone').value.trim()
            },
            short_description: document.getElementById('vtfShortDescription').value.trim() || null
        };

        if (!payload.name) {
            showToast('Vendor name is required', 'error');
            return;
        }

        const data = { payload: payload };
        const action = isAdd ? 'createVendor' : 'updateVendorProfile'; 
        if (!isAdd) data.vendorId = vtModalVendor.id;

        const reset = lockBtn($('.as-save-btn'));
        if (!reset) return;
        
        try {
            const res = await fetch('/api/supabase?action=' + action, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await res.json();
            if (result.error) { showToast(result.error, 'error'); reset(); return; }
            reset();
            showToast(isAdd ? 'Vendor created' : 'Vendor updated', 'success');
            closeVendorModal();
            loadVendors(); // refresh the table
        } catch (err) {
            console.error('Failed to save vendor:', err);
            showToast('Failed to save vendor', 'error');
            reset();
        }
    }

    async function deleteVendor(vendorId) {
        try {
            const res = await fetch('/api/supabase?action=deleteVendor', { 
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: vendorId })
            });
            const result = await res.json();
            if (result.error) { showToast(result.error, 'error'); return; }
            showToast('Vendor deleted', 'success');
            closeVendorModal();
            loadVendors();
        } catch (err) {
            console.error('Failed to delete vendor:', err);
            showToast('Failed to delete vendor', 'error');
        }
    }

    // Wire up the name click (delegated, since rows re-render)
    document.getElementById('vtTableBody').addEventListener('click', function(e) {
        const link = e.target.closest('.vt-name-link');
        if (!link) return;
        e.preventDefault();
        const id = link.dataset.vendorId;
        const row = vtAllRows.find(function(r) { return String(r.raw.id) === String(id); });
        if (row) openVendorModal(row.raw, 'view');
    });

    // The panel/overlay is shared with the Users modal — make the existing
    // close button and overlay-click also clear vendor state
    document.getElementById('utModalCloseBtn').addEventListener('click', closeVendorModal);
    document.getElementById('utPanelOverlay').addEventListener('click', function(e) {
        if (e.target.id === 'utPanelOverlay') closeVendorModal();
    });

    document.getElementById('vtAddBtn').addEventListener('click', function() {
        openVendorModal({}, 'add');
    });

    async function loadUsers() {
        const tbody = document.getElementById('utTableBody');
        const meta = document.getElementById('utMeta');
        const refreshBtn = document.getElementById('utRefreshBtn');

        refreshBtn.classList.add('spinning');
        tbody.innerHTML = '<tr><td class="vt-loading-cell" colspan="7">Loading users…</td></tr>';
        meta.textContent = 'Loading users…';

        try {
            const res = await fetch(USERS_ENDPOINT);
            const data = await res.json();

            $('#users-tot').text(data.data.length || '0');

            let rows = Array.isArray(data) ? data
            : Array.isArray(data.data) ? data.data
            : Array.isArray(data.users) ? data.users
            : [];

            utAllRows = rows.map(normalizeUserRow);
            utLoaded = true;
            applyUserSearchAndSort();
        } catch (err) {
            console.error('Failed to load users:', err);
            utAllRows = [];
            utFilteredRows = [];
            tbody.innerHTML = '<tr><td class="vt-error-cell" colspan="7">Couldn\'t load users (' + escapeHtml(err.message) + '). Check the API endpoint and try again.</td></tr>';
            meta.textContent = 'Error loading users';
        } finally {
            refreshBtn.classList.remove('spinning');
        }
    }

    function initUsersTable() {
        document.getElementById('utSearchInput').addEventListener('input', applyUserSearchAndSort);
        document.getElementById('utRefreshBtn').addEventListener('click', loadUsers);
        document.getElementById('utPrevBtn').addEventListener('click', () => { utPage--; renderUserRows(); });
        document.getElementById('utNextBtn').addEventListener('click', () => { utPage++; renderUserRows(); });
        document.querySelectorAll('#utTable thead th').forEach((th) => {
            th.addEventListener('click', () => {
            const key = th.dataset.key;
            if (utSortKey === key) {
                utSortDir = utSortDir === 'asc' ? 'desc' : 'asc';
            } else {
                utSortKey = key;
                utSortDir = 'asc';
            }
            setUserSortIndicators();
            applyUserSearchAndSort();
            });
        });
    }

    function onUsersPanelShown() {
    if (!utLoaded) loadUsers();
    }

    initUsersTable();
    initTaxonomyPanel();

    let utModalMode = 'view'; // 'view' | 'edit' | 'add'
let utModalUser = null;   // raw row currently open, or null when adding

const ROLE_OPTIONS = ['hr-professional', 'vendor', 'consultant', 'admin'];

function openUserModal(userRow, mode) {
  utModalUser = userRow;
  utModalMode = mode;
  renderUserModal();
  const overlay = document.getElementById('utPanelOverlay');
  overlay.style.display = 'block';
  // force reflow so the transform transition actually plays
  requestAnimationFrame(function() { overlay.classList.add('open'); });
}

function closeUserModal() {
  const overlay = document.getElementById('utPanelOverlay');
  overlay.classList.remove('open');
  setTimeout(function() { overlay.style.display = 'none'; }, 220); // match CSS transition duration
  utModalUser = null;
}

function renderUserModal() {
  const u = utModalUser || {};
  const isAdd = utModalMode === 'add';
  const isEdit = utModalMode === 'edit' || isAdd;

  document.getElementById('utModalEyebrow').textContent = isAdd ? 'New user' : 'User details';
  document.getElementById('utModalTitle').textContent = isAdd
    ? 'Add user'
    : ((u.first_name || '') + ' ' + (u.last_name || '')).trim() || 'Unnamed user';

  const body = document.getElementById('utModalBody');
  const actions = document.getElementById('utModalActions');

  if (!isEdit) {
    // VIEW MODE
    body.innerHTML = [
      ['First name', u.first_name],
      ['Last name', u.last_name],
      ['Email', u.email],
      ['Role', roleLabel(u.role)],
      ['Organisation', u.organization],
      ['Job title', u.job_title],
      ['Phone', u.phone],
      ['Primary region', u.primary_region],
      ['Organisation size', u.organization_size],
      ['Verified', u.verified === 'Y' ? 'Yes' : u.verified === 'N' ? 'No' : '–'],
      ['Active', u.active === true ? 'Yes' : u.active === false ? 'No' : '–'],
      ['Joined', fmtDate(u.created_at)]
    ].map(function(pair) {
      return '<div class="ut-view-row"><div class="ut-view-label">' + pair[0] + '</div><div class="ut-view-value">' + escapeHtml(pair[1] || '–') + '</div></div>';
    }).join('');

    actions.innerHTML = '';
    const editBtn = document.createElement('button');
    editBtn.className = 'as-save-btn';
    editBtn.textContent = 'Edit';
    editBtn.addEventListener('click', function() { openUserModal(utModalUser, 'edit'); });
    actions.appendChild(editBtn);
    return;
  }

  // EDIT / ADD MODE — build a form
  body.innerHTML =
    '<div class="ut-field-row2">'
      + '<div class="ut-field"><label>First name</label><input id="utfFirstName" value="' + escapeHtml(u.first_name || '') + '"></div>'
      + '<div class="ut-field"><label>Last name</label><input id="utfLastName" value="' + escapeHtml(u.last_name || '') + '"></div>'
    + '</div>'
    + '<div class="ut-field"><label>Email</label><input id="utfEmail" type="email" value="' + escapeHtml(u.email || '') + '"></div>'
    + '<div class="ut-field"><label>Role</label><select id="utfRole">'
      + ROLE_OPTIONS.map(function(r) { return '<option value="' + r + '"' + (u.role === r ? ' selected' : '') + '>' + roleLabel(r) + '</option>'; }).join('')
    + '</select></div>'
    + '<div class="ut-field-row2">'
      + '<div class="ut-field"><label>Organisation</label><input id="utfOrganization" value="' + escapeHtml(u.organization || '') + '"></div>'
      + '<div class="ut-field"><label>Job title</label><input id="utfJobTitle" value="' + escapeHtml(u.job_title || '') + '"></div>'
    + '</div>'
    + '<div class="ut-field-row2">'
      + '<div class="ut-field"><label>Phone</label><input id="utfPhone" value="' + escapeHtml(u.phone || '') + '"></div>'
      + '<div class="ut-field"><label>Primary region</label><input id="utfPrimaryRegion" value="' + escapeHtml(u.primary_region || '') + '"></div>'
    + '</div>'
    + '<div class="ut-field-row2">'
      + '<div class="ut-field"><label>Verified</label><select id="utfVerified">'
        + '<option value="Y"' + (u.verified === 'Y' ? ' selected' : '') + '>Yes</option>'
        + '<option value="N"' + (u.verified !== 'Y' ? ' selected' : '') + '>No</option>'
      + '</select></div>'
      + '<div class="ut-field"><label>Active</label><select id="utfActive">'
        + '<option value="true"' + (u.active !== false ? ' selected' : '') + '>Yes</option>'
        + '<option value="false"' + (u.active === false ? ' selected' : '') + '>No</option>'
      + '</select></div>'
    + '</div>';

  actions.innerHTML = '';
  const cancelBtn = document.createElement('button');
  cancelBtn.className = 'as-cancel-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', function() {
    if (isAdd) closeUserModal();
    else openUserModal(utModalUser, 'view');
  });

  const saveBtn = document.createElement('button');
  saveBtn.className = 'as-save-btn';
  saveBtn.textContent = isAdd ? 'Create user' : 'Save changes';
  saveBtn.addEventListener('click', function() { saveUserForm(isAdd); });

  actions.appendChild(cancelBtn);
  actions.appendChild(saveBtn);
}

async function saveUserForm(isAdd) {
  let data = { payload : {
    first_name: document.getElementById('utfFirstName').value.trim(),
    last_name: document.getElementById('utfLastName').value.trim(),
    email: document.getElementById('utfEmail').value.trim(),
    role: document.getElementById('utfRole').value,
    organization: document.getElementById('utfOrganization').value.trim() || null,
    job_title: document.getElementById('utfJobTitle').value.trim() || null,
    phone: document.getElementById('utfPhone').value.trim() || null,
    primary_region: document.getElementById('utfPrimaryRegion').value.trim() || null,
    verified: document.getElementById('utfVerified').value,
    active: document.getElementById('utfActive').value === 'true'
  }};

  if (!data.payload.first_name || !data.payload.email){
    showToast('First name and email are required', 'error');
    return;
  }

  try {
    const action = isAdd ? 'createUser' : 'updateUserProfile';
    if (!isAdd) data['id'] = utModalUser.id;
    
    const reset = lockBtn($('.as-save-btn'));
    if (!reset) return;
  
    const res = await fetch('/api/supabase?action=' + action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await res.json();
    if (result.error) {
      showToast(result.error, 'error');
      reset();
      return;
    }
    reset();

    showToast(isAdd ? 'User created' : 'User updated', 'success');
    closeUserModal();
    loadUsers(); // refresh the table
  } catch (err) {
    console.error('Failed to save user:', err);
    showToast('Failed to save user', 'error');
  }
}

// Wire up: name click (event delegation, since rows re-render), add button, close button
document.getElementById('utTableBody').addEventListener('click', function(e) {
  const link = e.target.closest('.vt-name-link');
  if (!link) return;
  e.preventDefault();
  const id = link.dataset.userId;
  const row = utAllRows.find(function(r) { return String(r.raw.id) === String(id); });
  if (row) openUserModal(row.raw, 'view');
}); 

document.getElementById('utAddBtn').addEventListener('click', function() {
  openUserModal({}, 'add');
});

document.getElementById('utTableBody').addEventListener('click', async function(e) {
  const menuBtn = e.target.closest('.ut-row-menu-btn');
  if (menuBtn) {
    const userId = menuBtn.dataset.userId;
    const email = menuBtn.dataset.email;

    const confirmed = await showConfirm(
      'Send password reset email?',
      email ? `This will send a password reset link to ${email}.` : 'This will send a password reset link to this user.'
    );
    if (confirmed) await sendPasswordResetEmail(userId, email);
  }
});

async function sendPasswordResetEmail(userId, email){
    const res = await fetch('/api/send-email?action=resetPassword', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            to: email, 
            host: window.location.origin,
            redirect: 'admin'
        })
    });

    showToast('Email Sent!', 'success');
}

document.getElementById('utModalCloseBtn').addEventListener('click', closeUserModal);
document.getElementById('utPanelOverlay').addEventListener('click', function(e) {
  if (e.target.id === 'utPanelOverlay') closeUserModal(); // click outside closes
});

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

  function showConfirm(title, message) {
    return new Promise(function(resolve) {
        const overlay = document.getElementById('confirmOverlay');
        document.getElementById('confirmTitle').textContent = title;
        document.getElementById('confirmMessage').textContent = message;
        overlay.style.display = 'flex';

        const okBtn = document.getElementById('confirmOkBtn');
        const cancelBtn = document.getElementById('confirmCancelBtn');

        function cleanup(result) {
        overlay.style.display = 'none';
        okBtn.removeEventListener('click', onOk);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlayClick);
        resolve(result);
        }
        function onOk() { cleanup(true); }
        function onCancel() { cleanup(false); }
        function onOverlayClick(e) { if (e.target === overlay) cleanup(false); }

        okBtn.addEventListener('click', onOk);
        cancelBtn.addEventListener('click', onCancel);
        overlay.addEventListener('click', onOverlayClick);
    });
    }

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
    $('#users-tot').text(result.data.length || '0');

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
    $('#vendors-tot').text(result.data.length || '0');

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

        renderPlatformActivities();
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

async function renderPlatformActivities(){
    let userId = null;
    if (!window.user){
        const { user } = await getCurrentUser();
        userId = user.id;
    }else{
        userId = window.user.id;
    }

    const response = await fetch(`/api/supabase?action=getAdminActivities&userId=${userId}`);
    const result = await response.json();
    if (result.error) {
        showToast(result.error, 'error');
        return;
    }

    const wrap = $('#pd-platform-activities'); 
    wrap.empty();
    wrap.append(`<div class="pd-panel-header"><div class="pd-panel-title">Recent platform activity</div></div>`);

    if (result.data.length > 0){
        result.data.forEach(a => {
            const initials = a.username;

            wrap.append(`
                <div class="pd-activity-item">
                    <div class="pd-activity-avatar">${initials}</div>
                    <div>
                        <div class="pd-activity-name">${a.username} (${a.user_type || '--'})</div>
                        <div class="pd-activity-action">Requested intro to SmartRecruiters</div>
                    </div>
                    <div class="pd-activity-time">${daysAgo(a.created_at)}</div>
                </div>
            `);
        });
    }else{
        wrap.append(`<div class="pd-activity-item">
            <div>
                <div class="pd-activity-name"></div>
                <div class="pd-activity-action" style="color:var(--t4)">No data available!</div>
            </div>
            <div class="pd-activity-time"></div>
            </div>`);
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

  //let allProductsCache = []; 

    function renderVerificationPipeline(days){
        const STAGES = [
            { key: 'ai-generated',    numId: '#pd-stage-ai-num',       pctId: '#pd-stage-ai-pct' },
            { key: 'vendor-owned',    numId: '#pd-stage-vendor-num',   pctId: '#pd-stage-vendor-pct' },
            { key: 'udder-verified',  numId: '#pd-stage-verified-num', pctId: '#pd-stage-verified-pct' },
            { key: 'udder-approved',  numId: '#pd-stage-approved-num', pctId: '#pd-stage-approved-pct' }
        ];

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

  window.switchAsTab = function switchAsTab(btn, tab) {
    document.querySelectorAll('.as-nav-item').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
    ['details','notifications','password','account'].forEach(function(t) {
      var el = document.getElementById('as-content-' + t);
      if (el) el.style.display = (t === tab) ? '' : 'none';
    });
  }