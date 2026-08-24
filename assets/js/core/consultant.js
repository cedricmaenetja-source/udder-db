import { isLoggedIn, getCurrentUser, initSession } from './auth/session.js';
import * as App from '../app.js';

export const HOSTNAME = window.location.origin;

const loggedIn = await isLoggedIn();
$(async function(){
  if (!loggedIn){location.href = `${HOSTNAME}/consultant/login.html`;return;}

  await initSession();
  const { user } = await getCurrentUser();
  window.user = user;
  const userId = user.id;

  if (userId === null){location.href = `${HOSTNAME}/consultant/login.html`;return;}
  if (user.role !== 'consultant'){
      App.showToast('Logging out...', 'warning');
      await fetch('/api/logout', {method: 'GET'});
      
      location.href = `${HOSTNAME}/consultant/login.html`;
      return;
  }

  const response = await fetch(`/api/supabase?action=getUserById&userId=${userId}`);
  const result = await response.json();
  if (result.error) {
    App.showToast(result.error, 'error');
    return;
  }
  console.log(`result.data:`, result.data);
  const fullName = `${result.data.first_name} ${result.data.last_name || ''}`;
  $('#sb-uname').text(fullName);
  $('#sb-avatar').text(App.initials(fullName));

  window.user = result.data;

  prefillDetails(result.data);
  prefillPrefs(userId);

  var loader = document.getElementById('pageLoader');
  if (loader) {
    loader.classList.add('hide');
    setTimeout(function () { loader.remove(); }, 300);
  }
});

var saveDetailsBtn = document.getElementById('csSaveDetailsBtn');

function prefillDetails(user) {
  if (document.getElementById('csFirstName')) document.getElementById('csFirstName').value = user.first_name || '';
  if (document.getElementById('csLastName')) document.getElementById('csLastName').value = user.last_name || '';
  if (document.getElementById('csEmail')) document.getElementById('csEmail').value = user.email || '';
  if (document.getElementById('csJobTitle')) document.getElementById('csJobTitle').value = user.job_title || '';
  if (document.getElementById('csPhone')) document.getElementById('csPhone').value = user.phone || '';
}

if (saveDetailsBtn) {
  saveDetailsBtn.addEventListener('click', async function () {
    var fname = document.getElementById('csFirstName').value.trim();
    var lname = document.getElementById('csLastName').value.trim();
    var email = document.getElementById('csEmail').value.trim();
    var jobTitle = document.getElementById('csJobTitle').value.trim();
    var phone = document.getElementById('csPhone').value.trim();
    if (!fname || !lname || !email) {
      App.showToast('First name, last name and email are required.', 'error');
      return;
    }

    var reset = App.lockBtn($(saveDetailsBtn));
    if (!reset) return;

    try {
      const response = await fetch('/api/supabase?action=updatePersonalDetails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: window.user.id,
          payload: {
            first_name: fname,
            last_name: lname,
            email: email,
            phone: phone,
            job_title: jobTitle,
          }
        })
      });

      const result = await response.json();
      reset();

      if (result.error) {
        App.showToast(result.error, 'error');
        return;
      }

      window.user.first_name = fname;
      window.user.last_name = lname;
      window.user.email = email;

      const fullName = `${fname} ${lname || ''}`;
      $('#sb-uname').text(fullName);
      $('#sb-avatar').text(App.initials(fullName));
      App.showToast('Details saved.', 'success');
    } catch (e) {
      reset();
      App.showToast('Something went wrong. Please try again.', 'error');
    }
  });
}

var savePrefsBtn = document.getElementById('csSavePrefsBtn');
if (savePrefsBtn) {
  savePrefsBtn.addEventListener('click', async function () {
    var reset = App.lockBtn($(savePrefsBtn));
    if (!reset) return;

    var notifPayload = {
      intro_request_updates: document.getElementById('csNotifIntro').checked,
      new_comparisons: document.getElementById('csNotifComparisons').checked,
      verification_updates: document.getElementById('csNotifVerification').checked,
      weekly_digest: document.getElementById('csNotifWeeklyDigest').checked,
      product_updates: document.getElementById('csNotifProductUpdates').checked,
      market_insights: document.getElementById('csNotifMarketInsights').checked
    };

    try {
      const response = await fetch('/api/supabase?action=saveNotificationPrefs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: window.user.id, prefs: notifPayload })
      });

      const result = await response.json();
      reset();

      if (result.error) {
        App.showToast(result.error, 'error');
        return;
      }

      Object.keys(notifPayload).forEach(function (key) {
        localStorage.setItem('cons_notif_' + key, notifPayload[key]);
      });

      App.showToast('Preferences saved.', 'success');
    } catch (e) {
      reset();
      App.showToast('Something went wrong. Please try again.', 'error');
    }
  });
}

var NOTIF_KEYS = {
  csNotifIntro: 'intro_request_updates',
  csNotifComparisons: 'new_comparisons',
  csNotifVerification: 'verification_updates',
  csNotifWeeklyDigest: 'weekly_digest',
  csNotifProductUpdates: 'product_updates',
  csNotifMarketInsights: 'market_insights'
};

async function prefillPrefs(userId) {
  try {
    const response = await fetch(`/api/supabase?action=getNotificationPrefs&userId=${userId}`);
    const result = await response.json();
    if (result.error) return App.showToast(result.error, 'error');

    Object.keys(NOTIF_KEYS).forEach(function (elId) {
      var key = NOTIF_KEYS[elId];
      var el = document.getElementById(elId);
      if (el && Object.prototype.hasOwnProperty.call(result.data, key)) {
        el.checked = !!result.data[key];
      }
    });
  } catch (e) {
    App.showToast(e, 'error');
  }
}

/* ── PASSWORD ── */
var updatePwdBtn = document.getElementById('csUpdatePwdBtn');
var resetEmailBtn = document.getElementById('csResetEmailBtn');

function pwErrorEl() {
  var el = document.querySelector('#as-content-password .pw-error');
  if (!el) {
    el = document.createElement('div');
    el.className = 'pw-error';
    el.style.cssText = 'display:none;margin-bottom:16px;padding:10px 14px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:8px;font-size:12px;color:#ef4444';
    document.getElementById('csUpdatePwdBtn').closest('.as-panel').querySelector('.as-actions').before(el);
  }
  return el;
}

if (updatePwdBtn) {
  updatePwdBtn.addEventListener('click', async function () {
    var currentPwd = document.getElementById('csCurrentPw').value;
    var newPwd = document.getElementById('csNewPw').value;
    var confirmPwd = document.getElementById('csConfirmPw').value;

    var errEl = pwErrorEl();
    function showErr(msg) {
      errEl.textContent = msg;
      errEl.style.display = 'block';
    }
    errEl.style.display = 'none';

    if (!currentPwd) { showErr('Please enter your current password.'); return; }
    if (!newPwd) { showErr('Please enter a new password.'); return; }
    if (newPwd.length < 12) { showErr('New password must be at least 12 characters.'); return; }
    if (!/[A-Z]/.test(newPwd)) { showErr('Password must contain at least one uppercase letter.'); return; }
    if (!/[0-9!@#$%^&*]/.test(newPwd)) { showErr('Password must contain a number or symbol.'); return; }
    if (newPwd !== confirmPwd) { showErr('Passwords do not match.'); return; }

    var reset = App.lockBtn($(updatePwdBtn));
    if (!reset) return;

    try {
      const response = await fetch('/api/supabase?action=updateUserPassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: window.user.email,
          oldPassword: currentPwd,
          newPassword: newPwd
        })
      });

      const result = await response.json();
      reset();

      if (result.error) { showErr(result.error); return; }

      document.getElementById('csCurrentPw').value = '';
      document.getElementById('csNewPw').value = '';
      document.getElementById('csConfirmPw').value = '';
      showToast('Password updated successfully.', 'success');

      showToast('Logging out...', 'neutral');
      const res = await fetch('/api/logout', { method: 'GET' });
      const r = await res.json();
      if (r.error) { showToast(r.error, 'error'); return; }
      window.location.href = '/login.html';
    } catch (e) {
      reset();
      showErr('Something went wrong. Please try again.');
    }
  });
}

if (resetEmailBtn) {
  resetEmailBtn.addEventListener('click', async function () {
    const reset = App.lockBtn($(resetEmailBtn), {spinnerColor: 'black'});
    if (!reset) return;

    try {
      const r = await fetch('/api/supabase?action=getUserByEmail', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: window.user.email })
      });
      const rs = await r.json();
      if (rs.error) { App.showToast(rs.error, 'error'); reset(); return; }
      if (rs.data === null) { App.showToast('Email address could not be found.', 'error'); reset(); return; }

      const tokenResponse = await fetch('/api/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: { email: window.user.email }, expiresIn: '1h' })
      });
      const tokenResult = await tokenResponse.json();
      if (tokenResult.error) { App.showToast(tokenResult.error, 'error'); reset(); return; }

      const emailRes = await fetch('/api/send-email?action=resetPassword', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: window.user.email,
          token: tokenResult.token,
          host: window.location.origin,
          redirect: 'consultant'
        })
      });
      const emailResult = await emailRes.json();
      if (emailResult.error) { App.showToast(emailResult.error, 'error'); reset(); return; }

      App.showToast('Email sent!', 'success');
      reset();
    } catch (e) {
      reset();
      App.showToast('Something went wrong. Please try again.', 'error');
    }
  });
}

/* ── ACCOUNT (danger zone) — type-DELETE confirmation modal ── */
(function () {
  var deleteBtn = document.getElementById('csDeleteAccountBtn');
  var modal = document.getElementById('deleteAccountModal');
  if (!deleteBtn || !modal) return; 

  var input = document.getElementById('daConfirmInput');
  var submitBtn = document.getElementById('daSubmit');
  var cancelBtn = document.getElementById('daCancel');

  function closeModal() {
    modal.classList.remove('visible');
    input.value = '';
    submitBtn.classList.remove('enabled');
    submitBtn.disabled = true;
  }

  /* Open */
  deleteBtn.addEventListener('click', function () {
    input.value = '';
    submitBtn.classList.remove('enabled');
    submitBtn.disabled = true;
    modal.classList.add('visible');
    setTimeout(function () { input.focus(); }, 200);
  });

  /* Enable submit only when the user types DELETE exactly */
  input.addEventListener('input', function () {
    var valid = this.value === 'DELETE';
    submitBtn.classList.toggle('enabled', valid);
    submitBtn.disabled = !valid;
  });

  /* Cancel */
  cancelBtn.addEventListener('click', closeModal);
  modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeModal(); });

  /* Submit */
  submitBtn.addEventListener('click', async function () {
    if (submitBtn.disabled) return;

    const reset = App.lockBtn($(submitBtn));
    if (!reset) return;

    submitBtn.textContent = 'Deleting…';
    submitBtn.style.opacity = '0.7';
    submitBtn.style.pointerEvents = 'none';

    try {
      const response = await fetch('/api/supabase?action=deleteAction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: window.user.id })
      });

      const result = await response.json();
      reset();

      if (result.error) {
        App.showToast(result.error, 'error');
        submitBtn.textContent = 'Delete my account';
        submitBtn.style.opacity = '';
        submitBtn.style.pointerEvents = '';
        return;
      }

      closeModal();
      App.showToast('Account deleted. Redirecting…', 'success');
      await fetch('/api/logout', { method: 'GET' });
      setTimeout(function () { window.location.href = '/'; }, 2000);
    } catch (e) {
      reset();
      submitBtn.textContent = 'Delete my account';
      submitBtn.style.opacity = '';
      submitBtn.style.pointerEvents = '';
      App.showToast('Something went wrong. Please try again.', 'error');
    }
  });
})();

/* ── Page loader controls ── */
function showPageLoader() {
  var loader = document.getElementById('pageLoader');
  if (!loader) return;
  loader.classList.remove('hide');
  loader.style.display = 'flex';
}

function hidePageLoader() {
  var loader = document.getElementById('pageLoader');
  if (!loader) return;
  loader.classList.add('hide');
}

/* ── Panel switching ── */
function setActiveNavLink(link) {
  document.querySelectorAll('.nav-link').forEach(function (l) { l.classList.remove('on'); });
  link.classList.add('on');
}

function showPanel(panelName) {
  document.querySelectorAll('.panel').forEach(function (p) { p.classList.remove('active'); });
  var panel = document.getElementById('panel-' + panelName);
  if (panel) panel.classList.add('active');
}

/* ── Data fetch per panel ── */
async function loadPanelData(panelName) {
  if (panelName === 'vq') {
    await loadVerificationQueueClaims();
    return;
  }
  return new Promise(function (resolve) { setTimeout(resolve, 300); });
}

async function fetchAllVendorClaims() {
  var res = await fetch('/api/supabase?action=getAllVendorClaims');
  
  var json = await res.json();
  if (json.error) throw new Error(json.error);

  return json.data || [];
}

function timeAgo(dateString) {
  if (!dateString) return 'Unknown';
  var diffMs = Date.now() - new Date(dateString).getTime();
  var mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return mins + (mins === 1 ? ' min ago' : ' mins ago');
  var hours = Math.floor(mins / 60);
  if (hours < 24) return hours + (hours === 1 ? ' hour ago' : ' hours ago');
  var days = Math.floor(hours / 24);
  return days + (days === 1 ? ' day ago' : ' days ago');
}

async function handleNavClick(e) {
  e.preventDefault();
  var link = this;
  var panelName = link.dataset.panel;
  if (!panelName) return;

  showPageLoader();
  try {
    await loadPanelData(panelName);
    setActiveNavLink(link);
    showPanel(panelName);
  } catch (err) {
    console.error('Panel load failed:', err);
    App.showToast(err?.message || 'Failed to load section', 'error');
  } finally {
    hidePageLoader();
  }
}

async function fetchVendorById(vendorId) {
  var res = await fetch(`/api/supabase?action=getVendorById&vendorId=${vendorId}`);
  var json = await res.json();
  if (json.error) return null;
  return json.data || null;
}

async function fetchUserById(userId) {
  var res = await fetch(`/api/supabase?action=getUserById&userId=${userId}`);
  var json = await res.json();
  if (json.error) return null;
  return json.data || null;
}

async function enrichClaim(claim) {
  var [vendor, user] = await Promise.all([
    fetchVendorById(claim.vendor_id),
    fetchUserById(claim.user_id)
  ]);

  console.log('vendor', vendor);

  return {
    vendorName: vendor?.name || 'Unknown vendor',
    vendorInitials: App.initials(vendor?.name || 'Unknown vendor'),
    vendorSub: vendor?.name || 'Unknown vendor',
    claimantName: `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Unknown user',
    claimantRole: user?.job_title || '',
    claimantEmail: user?.email || '',
    submitted: timeAgo(claim.created_at),
    verified: claim.verified === 'Y',
    evidence: ['Dummy evidence item 1', 'Dummy evidence item 2'], // placeholder until endpoint exists
    status: claim.verified === 'Y' ? 'Verified' : 'Pending'
  };
}

async function enrichAllClaims(claims) {
  return Promise.all(claims.map(enrichClaim));
}

function renderVqClaimsRow(claim) {
  var statusClass = claim.status === 'Pending' ? '' : 'review';
  return `
    <div class="vq-row">
      <div class="vq-product">
        <div class="vq-product-avatar">${claim.vendorInitials}</div>
        <div>
          <div class="vq-product-name">${claim.vendorName}</div>
          <div class="vq-product-sub">${claim.vendorSub}</div>
        </div>
      </div>
      <div>
        <div class="vq-claimant-name">${claim.claimantName}</div>
        <div class="vq-claimant-role">${claim.claimantRole}</div>
        <div class="vq-claimant-email">${claim.claimantEmail}</div>
      </div>
      <ul class="vq-evidence">
        ${claim.evidence.map(function (e) { return `<li>${e}</li>`; }).join('')}
      </ul>
      <div class="vq-submitted">${claim.submitted}</div>
      <div><span class="vq-status-pill ${statusClass}">${claim.status}</span></div>
      <div class="vq-actions">
        <button class="vq-accept-btn">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>
          Accept
        </button>
        <button class="vq-reject-btn">
          <svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
          Reject
        </button>
      </div>
    </div>`;
}

function renderVqClaimsTable(claims) {
  var table = document.querySelector('.vq-table');
  if (!table) return;

  var head = table.querySelector('.vq-table-head');
  var rowsHtml = claims.length
    ? claims.map(renderVqClaimsRow).join('')
    : '<div style="padding:32px;text-align:center;color:var(--t4);font-size:13px">No pending claims</div>';

  table.innerHTML = '';
  table.appendChild(head);
  table.insertAdjacentHTML('beforeend', rowsHtml);
}

function updateVqTabBadge(count) {
  var badge = document.querySelector('#tab-claims .vq-tab-badge');
  if (badge) badge.textContent = count;
}

/* ── Orchestration ── */
async function loadVerificationQueueClaims() {
  var claims = await fetchAllVendorClaims();
  var enriched = await enrichAllClaims(claims);
  renderVqClaimsTable(enriched);
  updateVqTabBadge(enriched.length);
}

function initNavPanelSwitching() {
  document.querySelectorAll('.nav-link[data-panel]').forEach(function (link) {
    link.addEventListener('click', handleNavClick);
  });
}

initNavPanelSwitching();

document.getElementById('sbUserToggle').addEventListener('click', (e) => {
    document.getElementById('sbUserMenu').classList.toggle('open');
    e.stopPropagation();
});

document.addEventListener('click', () => {
    document.getElementById('sbUserMenu').classList.remove('open');
});

document.getElementById('sbLogoutBtn').addEventListener('click', async (e) => {
    e.stopPropagation();
    App.showToast('Loggin out. Redirecting…', 'success');
    await fetch('/api/logout', {method: 'GET'});

    location.href = 'login.html';
});

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
    
    $('.no-product').removeClass('hide');
    
    dismissLoader();
    window._hideSpinner('overviewSpinner');
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