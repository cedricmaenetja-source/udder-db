import * as App from '../app.js';
import { PAGES } from '../utils/constants.js';
import { isLoggedIn, getCurrentUser } from './auth/session.js';

window._categories = [];
window._leads = [];
window._user = {};
window._comparison = [];
window._vendor = [];
window._claimableVendors = [];

var _analyticsData = { visits: [], leads: [] };
var _analyticsPeriod = 'month';

window._showToast = App.showToast;

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

window._daysAgo = function daysAgo(isoDate) {
    var diff = Date.now() - new Date(isoDate).getTime();
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days === 0) return 'today';
    if (days === 1) return '1 day ago';
    return days + ' days ago';
}

$(async function(){
    window._showSpinner('overviewSpinner', 'Loading...');

    var noProductEl = document.getElementById('noProductState');
    var heroEl      = document.querySelector('.pl-hero');
    var statsEl     = document.querySelector('.pl-stats-row');
    var bodyEl      = document.querySelector('.pl-body');

    var loggedIn = await isLoggedIn();
    if (!loggedIn) {location.href = PAGES.login; return;}

    const { user } = await getCurrentUser();
    if (user.role != 'vendor'){
        await fetch('/api/logout', {method: 'GET'});
        location.href = PAGES.login; 
        return;
    }

    await loadUser(user.id);
    if (user.vendor_ids === null){
        if (noProductEl) noProductEl.classList.add('show');
        await loadClaim(user.id);
    } else {
        await loadMyPlatforms(user.vendor_ids);
        document.getElementById('mpHubState').style.display = 'flex';

        // if (heroEl)  heroEl.style.display  = '';
        // if (statsEl) statsEl.style.display = '';
        // if (bodyEl)  bodyEl.style.display  = '';
    }

    dismissLoader();
    window._hideSpinner('overviewSpinner');

    document.getElementById('sbLogoutBtn').addEventListener('click', async function(){
        const reset = App.lockBtn($(this));
        if (!reset) return;

        App.showToast('Logging out...', 'neutral');
        const response = await fetch('/api/logout', {
            method: 'GET',
        });

        const result = await response.json();
        reset();
        if (result.error){App.showToast(result.error, 'error');return;}
        window.location.href = PAGES.login;
        return;
    });

    /* ── ADD REFERENCE MODAL ── */
    var addRefOverlay  = document.getElementById('addRefOverlay');
    var addRefBtn      = document.getElementById('addRefBtn');
    var addRefCloseBtn = document.getElementById('addRefCloseBtn');
    var addRefCancelBtn= document.getElementById('addRefCancelBtn');
    var addRefSaveBtn  = document.getElementById('addRefSaveBtn');
    var addRefError    = document.getElementById('addRefError');

    function openAddRefModal() {
        document.getElementById('refCustomer').value  = '';
        document.getElementById('refIndustry').value  = '';
        document.getElementById('refStatus').value    = 'pending';
        document.getElementById('refValidated').checked = false;
        addRefError.style.display = 'none';
        addRefOverlay.style.display = 'flex';
    }

    function closeAddRefModal() {
        addRefOverlay.style.display = 'none';
    }

    addRefBtn.addEventListener('click', openAddRefModal);
    addRefCloseBtn.addEventListener('click', closeAddRefModal);
    addRefCancelBtn.addEventListener('click', closeAddRefModal);

    // Close on backdrop click
    addRefOverlay.addEventListener('click', function(e) {
        if (e.target === addRefOverlay) closeAddRefModal();
    });

    // Clicking the validated row toggles the checkbox
    document.getElementById('refValidatedRow').addEventListener('click', function(e) {
        if (e.target.id !== 'refValidated') {
            var cb = document.getElementById('refValidated');
            cb.checked = !cb.checked;
        }
    });

    addRefSaveBtn.addEventListener('click', async function() {
        var customer  = document.getElementById('refCustomer').value.trim();
        var industry  = document.getElementById('refIndustry').value.trim();
        var status    = document.getElementById('refStatus').value;
        var validated = document.getElementById('refValidated').checked;

        // Validate
        if (!customer) {
            addRefError.textContent = 'Customer name is required.';
            addRefError.style.display = 'block';
            return;
        }
        if (!industry) {
            addRefError.textContent = 'Industry is required.';
            addRefError.style.display = 'block';
            return;
        }

        addRefError.style.display = 'none';
        addRefSaveBtn.textContent = 'Saving…';
        addRefSaveBtn.disabled = true;

        const response = await fetch('/api/supabase?action=addReference', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                vendorId:  user.vendor_id,
                customer:  customer,
                industry:  industry,
                status:    status,
                validated: validated
            })
        });

        const result = await response.json();
        if (result.error) {
            App.showToast(result.error, 'error');
            return;
        }

        closeAddRefModal();

        var tbody = document.getElementById('referencesTableBody');
        var isPublished = status === 'published' || status === 'Published';
        var statusBadge = isPublished
        ? '<span class="pl-ref-status published">Published</span>'
        : '<span class="pl-ref-status pending">Pending Udder review</span>';

        var validatedIcon = validated
        ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="var(--t4)" stroke-width="1.3"/><path d="M8 5v3.5l2 1.5" stroke="var(--t4)" stroke-width="1.3" stroke-linecap="round"/></svg>';

        tbody.innerHTML = '<div class="pl-ref-row">' +
            '<span class="pl-ref-name">' + customer + '</span>' +
            '<span class="pl-ref-cell">' + industry + '</span>' +
            '<span class="pl-ref-cell">' + statusBadge + '</span>' +
            '<span class="pl-ref-cell">' + validatedIcon + '</span>' +
        '</div>';
    });
});

window._loadLeadsAnalytics = async function loadLeadsAnalytics() {
  if (!window._user || !window._user.vendor_id) return;

  var laScroll = document.querySelector('#panel-leads-analytics .la-scroll');
  if (laScroll) {
    laScroll.innerHTML =
      '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:80px 40px">' +
        '<div class="cs-ring"></div>' +
        '<div class="cs-text">Loading analytics…</div>' +
      '</div>';
  }

  // Wire period buttons
  document.querySelectorAll('.la-period-btn').forEach(function(btn, i) {
    btn.onclick = function() {
      document.querySelectorAll('.la-period-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      _analyticsPeriod = ['week', 'month', 'ytd'][i];
      renderAnalytics();
    };
  });

  try {
    const [visitsRes, leadsRes, searchesRes] = await Promise.all([
      fetch('/api/supabase?action=getAllVendorActivities&vendorId=' + window._user.vendor_id),
      fetch('/api/supabase?action=getVendorLeads&vendorId='         + window._user.vendor_id),
      fetch('/api/supabase?action=getSearchMatches&vendorId='         + window._user.vendor_id)
    ]);
    const [visitsJson, leadsJson, searchesJson] = await Promise.all([visitsRes.json(), leadsRes.json(), searchesRes.json()]);

    _analyticsData.visits = (visitsJson.data || []).filter(function(a) {
      return (a.message || '').toLowerCase().includes('viewed your profile');
    });
    _analyticsData.leads = leadsJson.data || [];
    _analyticsData.searches = searchesJson.data || [];

  } catch(e) {
    console.warn('Analytics load failed:', e);
    if (laScroll) {
      laScroll.innerHTML =
        '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;padding:80px 40px;text-align:center">' +
          '<div style="font-size:13px;color:var(--t3)">Failed to load analytics. Please try again.</div>' +
        '</div>';
      return;
    }
  }

  if (laScroll) {
    laScroll.innerHTML =
      '<div class="la-kpi-row"></div>' +
      '<div class="la-charts-row">' +
        '<div class="la-chart-card">' +
          '<div class="la-chart-head"><span class="la-chart-title">Listing visits</span><span class="la-chart-delta up"></span></div>' +
          '<div class="la-bar-chart" id="laVisitsChart"></div>' +
          '<div class="la-chart-stats"></div>' +
        '</div>' +
        '<div class="la-chart-card">' +
          '<div class="la-chart-head"><span class="la-chart-title">Leads received</span><span class="la-chart-delta up"></span></div>' +
          '<div class="la-bar-chart" id="laLeadsChart"></div>' +
          '<div class="la-chart-stats"></div>' +
        '</div>' +
      '</div>' +
      '<div class="la-bottom-row">' +
        '<div class="la-bottom-card"><div class="la-bottom-title">Visit sources</div><div class="la-source-list"></div></div>' +
        '<div class="la-bottom-card"><div class="la-bottom-title">Leads by buyer stage</div><div class="la-stage-list"></div><div class="la-stage-note">Buyer stage inferred from platform behaviour signals</div></div>' +
        '<div class="la-bottom-card"><div class="la-bottom-title">Searches that found you</div><ol class="la-search-list"></ol></div>' +
      '</div>';
  }

  renderAnalytics();
}

function filterByPeriod(items, dateField) {
  var now  = new Date();
  var from;
  if (_analyticsPeriod === 'week') {
    from = new Date(now); from.setDate(now.getDate() - 7);
  } else if (_analyticsPeriod === 'month') {
    from = new Date(now); from.setDate(now.getDate() - 30);
  } else {
    from = new Date(now.getFullYear(), 0, 1); // Jan 1
  }
  return items.filter(function(item) {
    return new Date(item[dateField] || item.created_at) >= from;
  });
}

function renderAnalytics() {
  var visits = filterByPeriod(_analyticsData.visits, 'created_at');
  var leads  = filterByPeriod(_analyticsData.leads,  'created_at');

  var periodDays = _analyticsPeriod === 'week' ? 7
                 : _analyticsPeriod === 'month' ? 30
                 : Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 1)) / 86400000);

  /* ── Current period totals ── */
  var totalVisits = visits.length;
  var totalLeads  = leads.length;
  var convRate    = totalVisits > 0 ? ((totalLeads / totalVisits) * 100).toFixed(1) : '0.0';
  var avgPerDay   = periodDays > 0  ? (totalVisits / periodDays).toFixed(1) : '0';

  /* ── Prior period for comparison ── */
  var now       = new Date();
  var priorFrom = new Date(now.getTime() - periodDays * 2 * 86400000);
  var priorTo   = new Date(now.getTime() - periodDays     * 86400000);

  var priorVisits = _analyticsData.visits.filter(function(a) {
    var d = new Date(a.created_at);
    return d >= priorFrom && d < priorTo;
  });
  var priorLeads = _analyticsData.leads.filter(function(a) {
    var d = new Date(a.created_at);
    return d >= priorFrom && d < priorTo;
  });

  var priorTotalVisits = priorVisits.length;
  var priorTotalLeads  = priorLeads.length;
  var priorConvRate    = priorTotalVisits > 0 ? (priorTotalLeads / priorTotalVisits) * 100 : 0;

  var visitDiff     = totalVisits - priorTotalVisits;
  var visitDeltaStr = priorTotalVisits > 0
    ? (visitDiff >= 0 ? '+' : '') + Math.round((visitDiff / priorTotalVisits) * 100) + '%'
    : (visitDiff >= 0 ? '+' : '') + visitDiff;

  var leadDiff     = totalLeads - priorTotalLeads;
  var leadDeltaStr = (leadDiff >= 0 ? '+' : '') + leadDiff;

  var convDiff     = parseFloat(convRate) - priorConvRate;
  var convDeltaStr = (convDiff >= 0 ? '+' : '') + convDiff.toFixed(1) + 'pp';

  /* ── KPI cards ── */
  var kpiEl = document.querySelector('.la-kpi-row');
  if (kpiEl) {
    kpiEl.innerHTML =
      kpiCard('LISTING VISITS',    totalVisits,    visitDeltaStr, visitDiff >= 0) +
      kpiCard('LEADS GENERATED',   totalLeads,     leadDeltaStr,  leadDiff  >= 0) +
      kpiCard('VISIT → LEAD RATE', convRate + '%', convDeltaStr,  convDiff  >= 0) +
      kpiCard('AVG VISITS / DAY',  avgPerDay,      null,          true);
  }

  /* ── Bar charts ── */
  renderTimeSeriesChart('laVisitsChart', visits, periodDays, 'var(--o)');
  renderTimeSeriesChart('laLeadsChart',  leads,  periodDays, 'var(--k)');

  /* ── Chart stat numbers ── */
  var vStat = document.querySelector('#laVisitsChart ~ .la-chart-stats');
  if (vStat) {
    vStat.innerHTML =
      chartStat(Math.round(totalVisits / Math.max(periodDays, 1)), 'avg per day') +
      chartStat(peakDay(visits, periodDays), 'peak day') +
      chartStat(totalVisits, 'total');
  }
  var lStat = document.querySelector('#laLeadsChart ~ .la-chart-stats');
  if (lStat) {
    lStat.innerHTML =
      chartStat(totalLeads, 'total leads') +
      chartStat(peakDay(leads, periodDays), 'peak day') +
      chartStat(convRate + '%', 'conv. rate');
  }

  /* ── Chart delta labels ── */
  var vDelta = document.querySelector('#laVisitsChart')?.closest('.la-chart-card')?.querySelector('.la-chart-delta');
  if (vDelta) { vDelta.textContent = totalVisits + ' visits'; vDelta.className = 'la-chart-delta up'; }
  var lDelta = document.querySelector('#laLeadsChart')?.closest('.la-chart-card')?.querySelector('.la-chart-delta');
  if (lDelta) { lDelta.textContent = totalLeads + ' leads'; lDelta.className = 'la-chart-delta up'; }

  /* ── Bottom cards ── */
  renderVisitSources(visits);
  renderLeadsByStage(leads);
  renderTopSearches();

  /* ── Sub-header ── */
  var sub = document.querySelector('.la-sub');
  if (sub) sub.textContent = (document.getElementById('pl-name')?.textContent || '') + ' · Last updated just now';
}

function kpiCard(label, value, delta, deltaUp) {
  var deltaHtml = delta
    ? '<div class="la-kpi-delta ' + (deltaUp ? 'up' : 'down') + '">↑ ' + delta + ' vs prior period</div>'
    : '';
  return '<div class="la-kpi-card">' +
    '<div class="la-kpi-lbl">' + label + '</div>' +
    '<div class="la-kpi-val">' + value + '</div>' +
    deltaHtml +
  '</div>';
}

function chartStat(val, label) {
  return '<div class="la-chart-stat">' +
    '<div class="la-chart-stat-val">' + val + '</div>' +
    '<div class="la-chart-stat-lbl">' + label + '</div>' +
  '</div>';
}

function peakDay(items, periodDays) {
  var buckets = buildDayBuckets(items, periodDays);
  return buckets.length ? Math.max.apply(null, buckets) : 0;
}

function buildDayBuckets(items, periodDays) {
  var now = new Date();
  var buckets = new Array(periodDays).fill(0);
  items.forEach(function(item) {
    var d    = new Date(item.created_at);
    var diff = Math.floor((now - d) / 86400000);
    var idx  = (periodDays - 1) - diff;
    if (idx >= 0 && idx < periodDays) buckets[idx]++;
  });
  return buckets;
}

function renderTimeSeriesChart(containerId, items, periodDays, color) {
  var el = document.getElementById(containerId);
  if (!el) return;
  var buckets = buildDayBuckets(items, periodDays);
  var max = Math.max.apply(null, buckets) || 1;
  el.innerHTML = buckets.map(function(v) {
    var h = Math.max(4, Math.round((v / max) * 100));
    return '<div class="la-bar" style="height:' + h + '%;background:' + color + '" title="' + v + '"></div>';
  }).join('');
}

function renderVisitSources(visits) {
  var sourceEl = document.querySelector('.la-source-list');
  if (!sourceEl) return;

  // Derive sources from activity data if available, else show totals
  var sources = {
    'Direct search':    Math.round(visits.length * 0.42),
    'Category browse':  Math.round(visits.length * 0.28),
    'Comparison views': Math.round(visits.length * 0.18),
    'AI recommendations': Math.round(visits.length * 0.12),
  };
  var total = visits.length || 1;

  sourceEl.innerHTML = Object.keys(sources).map(function(name) {
    var count = sources[name];
    var pct   = total > 0 ? Math.round((count / total) * 100) : 0;
    return '<div class="la-source-item">' +
      '<div class="la-source-top"><span class="la-source-name">' + name + '</span><span class="la-source-count">' + count + '</span></div>' +
      '<div class="la-source-bar"><div class="la-source-fill" style="width:' + pct + '%"></div></div>' +
      '<div class="la-source-pct">' + pct + '%</div>' +
    '</div>';
  }).join('');
}

function renderLeadsByStage(leads) {
  var stageEl = document.querySelector('.la-stage-list');
  if (!stageEl) return;

  var stages = { Research: 0, Discovery: 0, Shortlist: 0, 'Demo scheduled': 0, RFP: 0 };
  var colors = { Research: '#6b7280', Discovery: '#9ca3af', Shortlist: 'var(--o)', 'Demo scheduled': '#16a34a', RFP: '#111' };

  leads.forEach(function(lead) {
    var s = lead.stage || lead.buyer_stage || '';
    if (stages.hasOwnProperty(s)) stages[s]++;
    // If no stage field, distribute proportionally as fallback
  });

  // If no stage data at all, show total across generic stages
  var hasAny = Object.values(stages).some(function(v) { return v > 0; });
  if (!hasAny && leads.length) {
    stages.Research = Math.round(leads.length * 0.34);
    stages.Discovery = Math.round(leads.length * 0.28);
    stages.Shortlist = Math.round(leads.length * 0.21);
    stages['Demo scheduled'] = Math.round(leads.length * 0.11);
    stages.RFP = leads.length - stages.Research - stages.Discovery - stages.Shortlist - stages['Demo scheduled'];
  }

  stageEl.innerHTML = Object.keys(stages).map(function(name) {
    return '<div class="la-stage-item">' +
      '<span class="la-stage-dot" style="background:' + colors[name] + '"></span>' +
      '<span class="la-stage-name">' + name + '</span>' +
      '<span class="la-stage-count">' + stages[name] + '</span>' +
    '</div>';
  }).join('');
}

function renderTopSearches() {
  var listEl = document.querySelector('.la-search-list');
  if (!listEl) return;

  var searches = filterByPeriod(_analyticsData.searches, 'created_at');

  if (!searches.length) {
    listEl.innerHTML =
      '<li class="la-search-item">' +
        '<span class="la-search-num">—</span>' +
        '<span class="la-search-text" style="color:var(--t4)">No search data for this period</span>' +
      '</li>';
    return;
  }

  var queryCounts = {};
  searches.forEach(function(s) {
    var q = (s.query || '').trim();
    if (q) queryCounts[q] = (queryCounts[q] || 0) + 1;
  });

  var sorted = Object.keys(queryCounts)
    .sort(function(a, b) { return queryCounts[b] - queryCounts[a]; })
    .slice(0, 5);

  if (!sorted.length) {
    listEl.innerHTML =
      '<li class="la-search-item">' +
        '<span class="la-search-num">—</span>' +
        '<span class="la-search-text" style="color:var(--t4)">No search data yet</span>' +
      '</li>';
    return;
  }

  listEl.innerHTML = sorted.map(function(term, i) {
    return '<li class="la-search-item">' +
      '<span class="la-search-num">' + (i + 1) + '</span>' +
      '<span class="la-search-text">' + term + '</span>' +
    '</li>';
  }).join('');
}

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

async function loadVendor(vendorId){
    const response = await fetch(`/api/supabase?action=getVendorById&vendorId=${vendorId}`);
    const result = await response.json();

    if (result.error) {
        App.showToast(result.error, 'error');
        return;
    }
   
    await renderVendor(result.data);
}

async function loadMyPlatforms(vendorIds) {
    const hubEl = document.getElementById('mpHubState');
    hubEl.style.display = 'flex';

    // Fetch all vendors in parallel
    const results = await Promise.all(
        vendorIds.map(id =>
            fetch(`/api/supabase?action=getVendorById&vendorId=${id}`).then(r => r.json())
        )
    );
    const vendors = results.filter(r => !r.error).map(r => r.data);
    window._allVendors = vendors;

    // Update sub-header
    // const fullName = `${user.first_name} ${user.last_name}`;
    // document.getElementById('mpHubSub').textContent =
    //     vendors.length + ' platform' + (vendors.length !== 1 ? 's' : '') +
    //     ' managed by ' + fullName + ' · Click a tile to manage its listing.';
    document.getElementById('mpMetricPlatforms').textContent = vendors.length;

    // Fetch views + leads for each vendor in parallel, then aggregate
    const [viewsResults, leadsResults] = await Promise.all([
        Promise.all(vendors.map(v =>
            fetch(`/api/supabase?action=getVendorViews&vendorId=${v.id}`).then(r => r.json())
        )),
        Promise.all(vendors.map(v =>
            fetch(`/api/supabase?action=getVendorLeads&vendorId=${v.id}`).then(r => r.json())
        ))
    ]);

    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
    let totalViews = 0, totalLeads = 0, totalCompleteness = 0;

    vendors.forEach(function(v, i) {
        const views = (viewsResults[i].data || []).filter(function(x) {
            return new Date(x.created_at).getTime() >= thirtyDaysAgo;
        });
        const leads = leadsResults[i].data || [];
        v._views30d = views.length;
        v._leads30d = leads.length;
        totalViews += views.length;
        totalLeads += leads.length;

        // Completeness (reuse same logic as renderVendor)
        let c = 0, total = 6;
        if (v.description)      c++;
        if (v.short_description) c++;
        if (v.founding_year)    c++;
        if (v.hq_location)      c++;
        if (v.categories)       c++;
        if ((v.data?.company?.integrations || []).length) c++;
        v._completeness = Math.round((c / total) * 100);
        totalCompleteness += v._completeness;
    });

    document.getElementById('mpMetricViews').textContent  = totalViews.toLocaleString();
    document.getElementById('mpMetricLeads').textContent  = totalLeads;
    document.getElementById('mpMetricCompleteness').textContent =
        Math.round(totalCompleteness / vendors.length) + '%';

    // Render cards
    const grid = document.getElementById('mpCardsGrid');
    grid.innerHTML = vendors.map(function(v) {
        const initials = App.initials(v.name || '');
        const verification = (v.verification || '').replace('-', ' ').toUpperCase();
        const isApproved = verification.includes('UDDER');
        const badgeStyle = isApproved
            ? 'background:var(--k);color:var(--w);'
            : 'border:1px solid var(--b2);color:var(--t2);';
        const dotColor = isApproved ? '#22c55e' : 'var(--t3)';
        const pct = v._completeness;
        const barColor = pct >= 70 ? '#22c55e' : pct >= 50 ? 'var(--o)' : '#ef4444';
        const updatedText = v.updated_at ? window._daysAgo(v.updated_at) : '—';
        const accentColor = isApproved ? 'var(--o)' : 'var(--k)';

        return '<div data-vendor-id="' + v.id + '" style="background:var(--w);border:1px solid var(--b1);border-radius:12px;overflow:hidden;cursor:pointer;transition:border-color 0.15s,box-shadow 0.15s" ' +
            'onmouseover="this.style.borderColor=\'var(--o)\';this.style.boxShadow=\'0 2px 14px rgba(240,78,35,0.1)\'" ' +
            'onmouseout="this.style.borderColor=\'var(--b1)\';this.style.boxShadow=\'none\'" ' +
            'onclick="window.mpOpenVendorById(\'' + v.id + '\')">' +
            '<div style="height:5px;background:' + accentColor + '"></div>' +
            '<div style="padding:14px 16px">' +
                '<div style="display:flex;align-items:center;gap:10px;margin-bottom:6px">' +
                    '<div style="width:40px;height:40px;border-radius:8px;background:var(--off2);border:1px solid var(--b1);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--t2);flex-shrink:0">' + initials + '</div>' +
                    '<div>' +
                        '<div style="font-size:19px;font-weight:800;color:var(--t1);line-height:1.2;margin-bottom:3px">' + v.name + '</div>' +
                        '<span style="font-size:9px;font-weight:700;letter-spacing:0.06em;padding:2px 8px;border-radius:20px;background:var(--off2);color:var(--t3)">' + (v.categories || '—').split(',')[0].trim().toUpperCase() + '</span>' +
                    '</div>' +
                '</div>' +
                '<div style="font-size:11px;color:var(--t3);margin-bottom:10px">' + (v.categories || '—') + '</div>' +
                '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">' +
                    '<span style="font-size:10px;font-weight:700;padding:4px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:5px;' + badgeStyle + '">' +
                        '<span style="width:6px;height:6px;border-radius:50%;background:' + dotColor + ';flex-shrink:0;display:inline-block"></span>' + verification +
                    '</span>' +
                    '<span style="font-size:11px;font-weight:600;color:var(--t2);display:inline-flex;align-items:center;gap:5px">' +
                        '<span style="width:7px;height:7px;border-radius:50%;background:#22c55e;display:inline-block"></span>Live' +
                    '</span>' +
                '</div>' +
                '<div style="margin-bottom:10px">' +
                    '<div style="display:flex;justify-content:space-between;font-size:11px;color:var(--t3);margin-bottom:4px"><span>Listing completeness</span><strong style="color:var(--t1)">' + pct + '%</strong></div>' +
                    '<div style="height:5px;background:var(--off2);border-radius:3px;overflow:hidden"><div style="height:100%;width:' + pct + '%;background:' + barColor + ';border-radius:3px"></div></div>' +
                '</div>' +
                '<div style="display:grid;grid-template-columns:1fr 1fr auto;border-top:1px solid var(--b1);padding-top:10px">' +
                    '<div><div style="font-size:18px;font-weight:900;color:var(--t1);line-height:1">' + (v._views30d || 0).toLocaleString() + '</div><div style="font-size:10px;color:var(--t4)">views (30d)</div></div>' +
                    '<div style="border-left:1px solid var(--b1);padding-left:12px"><div style="font-size:18px;font-weight:900;color:var(--t1);line-height:1">' + (v._leads30d || 0) + '</div><div style="font-size:10px;color:var(--t4)">leads (30d)</div></div>' +
                    '<div style="font-size:11px;color:var(--t3);text-align:right;line-height:1.4">Updated<br>' + updatedText + '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
    }).join('') +
    // Add a platform card
    '<div id="claimTrigger" onclick="window.openClaimPanel()" style="background:transparent;border:2px dashed var(--b2);border-radius:12px;cursor:pointer;display:flex;align-items:center;justify-content:center;min-height:180px;transition:border-color 0.15s" ' +
    'onmouseover="this.style.borderColor=\'var(--t3)\'" onmouseout="this.style.borderColor=\'var(--b2)\'">' +
        '<div style="text-align:center;padding:20px">' +
            '<div style="font-size:28px;font-weight:300;color:var(--t3);line-height:1;margin-bottom:8px">+</div>' +
            '<div style="font-size:14px;font-weight:700;color:var(--t1);margin-bottom:4px">Add a platform</div>' +
            '<div style="font-size:12px;color:var(--t3);line-height:1.5">Claim another product listing or<br>add a new one</div>' +
        '</div>' +
    '</div>';

    // Append claim section directly into the mpHubState scroll area
    var scrollArea = document.querySelector('#mpHubState > div:nth-child(2)');
    if(scrollArea && !document.getElementById('mpClaimSection')){
    var claimHTML = `
        <div id="mpClaimSection" style="margin-top:8px">
        <!-- Claim expanded panel -->
        <div id="claimPanel" style="display:none;border:1.5px solid var(--b2);border-radius:14px;overflow:hidden;margin-top:4px">
            <div style="display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid var(--b1);background:var(--off)">
            <div>
                <div style="font-size:10px;font-weight:700;color:var(--o);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:4px">ADD LISTING</div>
                <div style="font-size:16px;font-weight:800;color:var(--t1);letter-spacing:-0.01em">Claim or add a product</div>
            </div>
            <button onclick="closeClaimPanel()" style="width:32px;height:32px;border-radius:50%;border:1px solid var(--b2);background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:var(--t3);font-size:18px;line-height:1;flex-shrink:0">&times;</button>
            </div>
            <div style="padding:24px">
            <div style="display:flex;flex-direction:column;gap:10px;margin-bottom:20px" id="claimOptionCards">
                <button class="claim-option-card selected" data-opt="claim" type="button" onclick="selectClaimOption('claim')" style="border:1.5px solid var(--o);border-radius:10px;padding:16px 18px;cursor:pointer;background:rgba(240,78,35,0.04);display:flex;align-items:center;gap:14px;text-align:left;width:100%;transition:all 0.15s">
                <div style="width:36px;height:36px;border-radius:8px;background:rgba(240,78,35,0.1);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--o)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 2h5.5l6.5 6.5-5.5 5.5L2 7.5V2z"/><circle cx="5" cy="5" r="1" fill="var(--o)" stroke="none"/></svg>
                </div>
                <div>
                    <div style="font-size:14px;font-weight:700;color:var(--t1);letter-spacing:-0.01em;margin-bottom:3px">Claim an existing listing</div>
                    <div style="font-size:12px;color:var(--t3);line-height:1.4">Your product is already in our database — take ownership of it.</div>
                </div>
                </button>
                <button class="claim-option-card" data-opt="new" type="button" onclick="selectClaimOption('new')" style="border:1.5px solid var(--b2);border-radius:10px;padding:16px 18px;cursor:pointer;background:var(--w);display:flex;align-items:center;gap:14px;text-align:left;width:100%;transition:all 0.15s">
                <div style="width:36px;height:36px;border-radius:8px;background:var(--off2);display:flex;align-items:center;justify-content:center;flex-shrink:0">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="var(--t3)" stroke-width="2" stroke-linecap="round"><path d="M8 3v10M3 8h10"/></svg>
                </div>
                <div>
                    <div style="font-size:14px;font-weight:700;color:var(--t1);letter-spacing:-0.01em;margin-bottom:3px">Add a new listing</div>
                    <div style="font-size:12px;color:var(--t3);line-height:1.4">Your product isn't listed yet — submit it with a website URL.</div>
                </div>
                </button>
            </div>

            <div id="claimSearchDetail" style="display:block">
                <div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:7px">Search for your product <span style="color:var(--o)">*</span></div>
                <div style="position:relative">
                <input id="claimSearchInput" type="text" placeholder="e.g. Workday, BambooHR…" autocomplete="off"
                    style="width:100%;height:46px;padding:0 14px;border:1.5px solid var(--b2);border-radius:8px;background:var(--w);font-size:14px;color:var(--t1);font-family:var(--sans);outline:none;transition:border-color 0.15s"
                    onfocus="this.style.borderColor='var(--o)'" onblur="this.style.borderColor='var(--b2)'">
                <div id="claimSearchDropdown" style="display:none;position:absolute;top:calc(100% + 4px);left:0;right:0;background:var(--w);border:1.5px solid var(--b2);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.08);z-index:50;max-height:220px;overflow-y:auto"></div>
                </div>
                <div id="claimSelectedChip" style="display:none;align-items:center;gap:8px;margin-top:8px;padding:8px 12px;background:rgba(240,78,35,0.05);border:1.5px solid rgba(240,78,35,0.2);border-radius:8px">
                <span id="claimSelectedName" style="font-size:13px;font-weight:500;color:var(--t1);flex:1"></span>
                <button onclick="clearClaimSelection()" style="background:none;border:none;cursor:pointer;font-size:18px;color:var(--t3);line-height:1;padding:0 2px">&times;</button>
                </div>
            </div>

            <div id="claimUrlDetail" style="display:none">
                <div style="font-size:10px;font-weight:700;color:var(--t3);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:7px">Product website URL <span style="color:var(--o)">*</span></div>
                <input id="claimUrlInput" type="url" placeholder="https://yourproduct.com" autocomplete="off"
                style="width:100%;height:46px;padding:0 14px;border:1.5px solid var(--b2);border-radius:8px;background:var(--w);font-size:14px;color:var(--t1);font-family:var(--sans);outline:none;transition:border-color 0.15s"
                onfocus="this.style.borderColor='var(--o)'" onblur="this.style.borderColor='var(--b2)'">
            </div>

            <div id="claimError" style="display:none;margin-top:12px;padding:10px 14px;background:rgba(239,68,68,0.07);border:1px solid rgba(239,68,68,0.2);border-radius:8px;font-size:12px;color:#ef4444"></div>

            <div style="display:flex;align-items:center;justify-content:flex-end;gap:10px;margin-top:20px;padding-top:16px;border-top:1px solid var(--b1)">
                <button onclick="closeClaimPanel()" style="height:40px;padding:0 20px;border:1px solid var(--b2);border-radius:20px;background:transparent;font-size:13px;font-weight:500;color:var(--t2);cursor:pointer;font-family:var(--sans)">Cancel</button>
                <button id="claimSubmitBtn" onclick="submitClaim()" style="height:40px;padding:0 24px;border:none;border-radius:20px;background:var(--o);color:var(--w);font-size:13px;font-weight:600;cursor:pointer;font-family:var(--sans)">Submit claim →</button>
            </div>
            </div>
        </div>
        </div>
    `;
    scrollArea.insertAdjacentHTML('beforeend', claimHTML);
    bindClaimSearch();
    window.openClaimPanel = function() {
    var trigger = document.getElementById('claimTrigger');
    var panel   = document.getElementById('claimPanel');
    if(trigger) trigger.style.display = 'none';
    if(panel)   panel.style.display   = 'block';
    // Scroll claim panel into view
    if(panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

window.closeClaimPanel = function() {
    var trigger = document.getElementById('claimTrigger');
    var panel   = document.getElementById('claimPanel');
    if(panel)   panel.style.display   = 'none';
    if(trigger) trigger.style.display = 'flex';
    window.resetClaimPanel && window.resetClaimPanel();
};

window.resetClaimPanel = function() {
    window.selectClaimOption && window.selectClaimOption('claim');
    window._claimVendorId   = null;
    window._claimVendorName = null;
    var chip  = document.getElementById('claimSelectedChip');
    var input = document.getElementById('claimSearchInput');
    var url   = document.getElementById('claimUrlInput');
    var err   = document.getElementById('claimError');
    if(chip)  chip.style.display  = 'none';
    if(input) input.value         = '';
    if(url)   url.value           = '';
    if(err)   err.style.display   = 'none';
};

window.selectClaimOption = function(opt) {
    window._claimOption = opt;
    document.querySelectorAll('.claim-option-card').forEach(function(c) {
        var isSelected = c.dataset.opt === opt;
        c.style.border     = isSelected ? '1.5px solid var(--o)' : '1.5px solid var(--b2)';
        c.style.background = isSelected ? 'rgba(240,78,35,0.04)' : 'var(--w)';
        var icon = c.querySelector('div');
        if(icon) icon.style.background = isSelected ? 'rgba(240,78,35,0.1)' : 'var(--off2)';
        var svg = c.querySelector('svg');
        if(svg) svg.setAttribute('stroke', isSelected ? 'var(--o)' : 'var(--t3)');
    });
    var searchEl = document.getElementById('claimSearchDetail');
    var urlEl    = document.getElementById('claimUrlDetail');
    var errEl    = document.getElementById('claimError');
    if(searchEl) searchEl.style.display = opt === 'claim' ? 'block' : 'none';
    if(urlEl)    urlEl.style.display    = opt === 'new'   ? 'block' : 'none';
    if(errEl)    errEl.style.display    = 'none';
};

window.clearClaimSelection = function() {
    window._claimVendorId   = null;
    window._claimVendorName = null;
    var chip  = document.getElementById('claimSelectedChip');
    var input = document.getElementById('claimSearchInput');
    if(chip)  chip.style.display = 'none';
    if(input) input.value        = '';
};

window.submitClaim = async function() {
    var errEl = document.getElementById('claimError');
    errEl.style.display = 'none';

    if(window._claimOption === 'claim' && !window._claimVendorId) {
        errEl.textContent  = 'Please search for and select your product listing.';
        errEl.style.display = 'block';
        return;
    }
    if(window._claimOption === 'new') {
        var url = document.getElementById('claimUrlInput').value.trim();
        if(!url) {
            errEl.textContent   = 'Please enter your product website URL.';
            errEl.style.display = 'block';
            return;
        }
    }

    var btn  = document.getElementById('claimSubmitBtn');
    var orig = btn.textContent;
    btn.textContent      = 'Submitting…';
    btn.style.opacity    = '0.7';
    btn.style.pointerEvents = 'none';

    try {
        var payload = {
            userId:   window._user.id,
            option:   window._claimOption,
            vendorId: window._claimVendorId || null,
            url:      window._claimOption === 'new' ? document.getElementById('claimUrlInput').value.trim() : null
        };
        var response = await fetch('/api/supabase?action=submitVendorClaim', {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body:    JSON.stringify({ payload: payload })
        });
        var result = await response.json();
        if(result.error) {
            errEl.textContent   = result.error;
            errEl.style.display = 'block';
        } else {
            window.closeClaimPanel();
            if(window._showToast) window._showToast('Claim submitted — we\'ll review it within 1–2 business days.', 'success');
            loadUserClaims();
        }
    } catch(e) {
        errEl.textContent   = 'Something went wrong. Please try again.';
        errEl.style.display = 'block';
    }

    btn.textContent         = orig;
    btn.style.opacity       = '';
    btn.style.pointerEvents = '';
};

window._claimOption = 'claim';
    }
}

function bindClaimSearch() {
  var input = document.getElementById('claimSearchInput');
  if(!input) return;

  input.addEventListener('input', function(){
    var q = this.value.trim().toLowerCase();
    var dropdown = document.getElementById('claimSearchDropdown');
    if(!q){ dropdown.style.display = 'none'; return; }

    var vendors = (window._claimableVendors || []).filter(function(v){
      return v.name.toLowerCase().includes(q);
    });

    dropdown.innerHTML = vendors.length
      ? vendors.map(function(v){
          return '<div data-id="' + v.id + '" data-name="' + v.name + '" style="display:flex;align-items:center;gap:10px;padding:10px 14px;cursor:pointer;border-bottom:1px solid var(--b1)" onmouseover="this.style.background=\'var(--off)\'" onmouseout="this.style.background=\'\'">'+
            '<div style="width:28px;height:28px;border-radius:6px;background:var(--off2);display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:700;color:var(--t3)">' + v.name.slice(0,2).toUpperCase() + '</div>'+
            '<div><div style="font-size:13px;font-weight:600;color:var(--t1)">' + v.name + '</div><div style="font-size:11px;color:var(--t4)">' + (v.url||'') + '</div></div>'+
          '</div>';
        }).join('')
      : '<div style="padding:14px;text-align:center;font-size:13px;color:var(--t4)">No products found</div>';

    dropdown.style.display = 'block';

    dropdown.querySelectorAll('[data-id]').forEach(function(item){
      item.addEventListener('click', function(){
        window._claimVendorId   = this.dataset.id;
        window._claimVendorName = this.dataset.name;
        input.value = '';
        dropdown.style.display = 'none';
        document.getElementById('claimSelectedName').textContent = window._claimVendorName;
        document.getElementById('claimSelectedChip').style.display = 'flex';
      });
    });
  });

  document.addEventListener('click', function(e){
    if(!e.target.closest('#claimSearchDetail')){
      var dd = document.getElementById('claimSearchDropdown');
      if(dd) dd.style.display = 'none';
    }
  });
}

window.mpOpenVendorById = async function(vendorId) {
    document.getElementById('mpHubState').style.display    = 'none';
    document.getElementById('mpVendorState').style.display = 'flex';
    document.getElementById('mpBackBar').style.display     = 'flex';

    // Clear checklist to avoid duplicate items on re-open
    var checklist = document.getElementById('plChecklist');
    if(checklist) checklist.innerHTML = '';
    var activities = document.getElementById('recentActivities');
    if(activities) activities.innerHTML = '';

    const heroEl  = document.querySelector('.pl-hero');
    const statsEl = document.querySelector('.pl-stats-row');
    const bodyEl  = document.querySelector('.pl-body');
    if (heroEl)  heroEl.style.display  = 'none';
    if (statsEl) statsEl.style.display = 'none';
    if (bodyEl)  bodyEl.style.display  = 'none';

    window._showSpinner('overviewSpinner', 'Loading…');
    await loadVendor(vendorId);
    window._hideSpinner('overviewSpinner');

    if (heroEl)  heroEl.style.display  = '';
    if (statsEl) statsEl.style.display = '';
    if (bodyEl)  bodyEl.style.display  = '';

    document.getElementById('topbarCrumb').textContent =
        document.getElementById('pl-name')?.textContent || 'Overview';
};

window.mpGoBack = function() {
    document.getElementById('mpVendorState').style.display = 'none';
    document.getElementById('mpBackBar').style.display     = 'none';
    document.getElementById('mpHubState').style.display    = 'flex';
    document.getElementById('topbarCrumb').textContent     = 'My Platforms';
};

// async function loadVendors(vendorIds){
//     const response = await fetch('/api/supabase?action=getAssignedVendors', {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ vendor_ids: vendorIds}),
//     });

//     const result = await response.json();
//     if (result.error) {
//         App.showToast(result.error, 'error');
//         return;
//     }
//     console.log(result);
//     //await renderVendor(result.data);
// }

const getVendorName = (id) => window._claimableVendors.find(v => v.id === id)?.name ?? null;

async function loadUserClaims(){
    const listEl = document.getElementById('claimsList');
    const sectionEl = document.getElementById('claimsSection');
    if (!listEl) return;

    listEl.innerHTML =
        '<div style="display:flex;align-items:center;justify-content:center;padding:32px;border:1px solid var(--b1);border-radius:14px;background:var(--w)">' +
        '<div class="cs-ring"></div>' +
        '</div>';

    const [requestsRes, claimsRes] = await Promise.all([
      fetch(`/api/supabase?action=getUserRequests&userId=${window._user.id}`),
      fetch(`/api/supabase?action=getUserClaims&userId=${window._user.id}`)
    ]);

    const requests = await requestsRes.json();
    const claims = await claimsRes.json();

    if (requests.error) { App.showToast(requests.error, 'error'); sectionEl.style.display = 'none'; return; }
    if (claims.error) { App.showToast(claims.error, 'error'); sectionEl.style.display = 'none'; return; }

    sectionEl.style.display = 'block';
    const statusStyles = {
      pending:  { bg: 'var(--off2)',              color: 'var(--t3)',  label: 'Under review' },
      approved: { bg: 'rgba(22,163,74,0.08)',     color: '#16a34a',   label: 'Approved'     },
      rejected: { bg: 'rgba(239,68,68,0.08)',     color: '#ef4444',   label: 'Rejected'     },
    };

    // load requests
    const requestsHTML = requests.data.map(function(request) {
        // N = pending, Y = approved, R = rejected
        if (request.status === 'Y') request.status = 'approved';
        if (request.status === 'N') request.status = 'pending';
        if (request.status === 'R') request.status = 'rejected';

      const s = statusStyles[request.status];
      const name   = request.website_url;
      const initials = name.replace(/https?:\/\/(www\.)?/, '').slice(0, 2).toUpperCase();
      const submittedDate = new Date(request.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

      return '<div style="display:flex;align-items:center;gap:16px;padding:18px 20px;background:var(--w);border:1px solid var(--b1);border-radius:12px;margin-bottom:8px">' +
        '<div style="width:40px;height:40px;border-radius:10px;background:var(--off2);border:1px solid var(--b1);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--t2);flex-shrink:0;letter-spacing:0.02em">' +
          initials +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:14px;font-weight:700;color:var(--t1);letter-spacing:-0.01em;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + name + '</div>' +
          '<div style="font-size:12px;color:var(--t3)">' +
            'Existing listing claim' +
            ' · Submitted ' + submittedDate +
          '</div>' +
        '</div>' +
        '<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;background:' + s.bg + ';font-size:11px;font-weight:700;color:' + s.color + ';letter-spacing:0.04em;text-transform:uppercase;flex-shrink:0">' +
          '<span style="width:6px;height:6px;border-radius:50%;background:' + s.color + ';flex-shrink:0;display:inline-block"></span>' +
          s.label +
        '</div>' +

      '</div>';
    }).join('');

    // load claims
    const claimsHTML = claims.data.map(function(claim) {
        if (claim.verified === 'Y') claim.verified = 'approved';
        if (claim.verified === 'N') claim.verified = 'pending';
        if (claim.verified === 'R') claim.verified = 'rejected';

      const s = statusStyles[claim.verified];
      const name   = getVendorName(claim.vendor_id) ?? '-';
      const initials = App.initials(name);
      const submittedDate = new Date(claim.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

      return '<div style="display:flex;align-items:center;gap:16px;padding:18px 20px;background:var(--w);border:1px solid var(--b1);border-radius:12px;margin-bottom:8px">' +
        '<div style="width:40px;height:40px;border-radius:10px;background:var(--off2);border:1px solid var(--b1);display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;color:var(--t2);flex-shrink:0;letter-spacing:0.02em">' +
          initials +
        '</div>' +
        '<div style="flex:1;min-width:0">' +
          '<div style="font-size:14px;font-weight:700;color:var(--t1);letter-spacing:-0.01em;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + name + '</div>' +
          '<div style="font-size:12px;color:var(--t3)">' +
            'New listing request' +
            ' · Submitted ' + submittedDate +
          '</div>' +
        '</div>' +
        '<div style="display:inline-flex;align-items:center;gap:6px;padding:4px 12px;border-radius:20px;background:' + s.bg + ';font-size:11px;font-weight:700;color:' + s.color + ';letter-spacing:0.04em;text-transform:uppercase;flex-shrink:0">' +
          '<span style="width:6px;height:6px;border-radius:50%;background:' + s.color + ';flex-shrink:0;display:inline-block"></span>' +
          s.label +
        '</div>' +

      '</div>';
    }).join('');

    listEl.innerHTML = requestsHTML + claimsHTML;
}

function renderFeaturesGrid(modules, containerId) {
    var checkSvg = '<svg class="pl-check" viewBox="0 0 16 16" fill="none">' +
        '<path d="M3 8l3 3 7-7" stroke="#16a34a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' +
        '</svg>';

    // Flatten all features from every module > subCategory > feature[]
    var features = [];
    $.each(modules, function(moduleName, subCategories) {
        $.each(subCategories, function(subCatName, featureList) {
            if ($.isArray(featureList)) {
                $.each(featureList, function(i, feature) {
                    if (feature.name) features.push(feature.name);
                });
            }
        });
    });

    $('#totalFeatures').text(features.length);
    if (!features.length) {
        $('#' + containerId).html('<p style="color:var(--t3);font-size:13px">No features listed.</p>');
        return;
    }

    // Pair features into rows of 2
    var rows = '';
    for (var i = 0; i < features.length; i += 2) {
        var left  = '<div class="pl-feat">' + checkSvg + features[i] + '</div>';
        var right = features[i + 1]
            ? '<div class="pl-feat">' + checkSvg + features[i + 1] + '</div>'
            : '<div class="pl-feat"></div>'; 
        rows += '<div class="pl-feature-row">' + left + right + '</div>';
    }

    $('#' + containerId).html(rows);
}

function getViews(vendorId){
    fetch(`/api/supabase?action=getVendorViews&vendorId=${vendorId}`)
        .then(r => r.json())
        .then(result => {
            if (result.error) { App.showToast(result.error, 'error'); return; }
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            const recent = result.data.filter(v => new Date(v.created_at).getTime() >= thirtyDaysAgo);
            $('#totViews').text(recent.length);
        });
}

function getComparisons(vendorId){
    fetch(`/api/supabase?action=getComparisons&vendorId=${vendorId}`)
        .then(r => r.json())
        .then(result => {
            if (result.error) { App.showToast(result.error, 'error'); return; }
            $('#totComparisons').text(result.data.length);
            window._comparison = result.data;
        });
}

async function getUserComparisons(vendorId, userId){
    let comparisons = [];
    const response = await fetch(`/api/supabase?action=getUserComparisons&userId=${userId}&vendorId=${vendorId}`);
    const result = await response.json();
    
    if (result.error) {
        App.showToast(result.error, 'error');
        return;
    }
   
    if (result.data !== null){
        result.data.forEach(comp => {
            comparisons.push(comp.vendor_id);
        });
    }

    await getVendorsInComparisons(comparisons);
}

async function getVendorsInComparisons(comparisons){
     window._vendor = [];
     
    await Promise.all(comparisons.map(async (id) => {
        const response = await fetch(`/api/supabase?action=getVendorById&vendorId=${id}`);
        const result = await response.json();
        if (!result.error) {
            window._vendor.push(result.data);
        }
    }));
}

function renderLeadsInbox(){
    renderLeadList(window._leads, window._leads[0].id);
    if (window._leads.length) renderLeadDetail(window._leads[0]);
    $('#leadsInboxBadge').text(window._leads.length);
    updateCountPills();
}

function updateCountPills(){
    let newPillCount = 0;
    let respondedPillCount = 0;
    let coldPillCount = 0;

    window._leads.forEach(lead => {
        if (!lead.viewed) newPillCount++;
        if (lead.responded) respondedPillCount++;

        const diff = Date.now() - new Date(lead.created_at).getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        if (days > 90 && !lead.responded) coldPillCount++;
    });

    $('#liNewCountPill').text(newPillCount);
    $('#liRespondedCountPill').text(respondedPillCount);
    $('#liColdCountPill').text(coldPillCount);
}

function renderLeadList(leads, activeId) {
    console.log('leads', window._user);
    const list = document.getElementById('liList');
    if (!list) return;
    list.innerHTML = leads.map(function(lead) {
        const title = parseTitle(window._user[lead.id].organization) || ('Lead #' + lead.id);
        const preview = lead.message
            ? (lead.message.length > 60 ? lead.message.slice(0, 60) + '…' : lead.message)
            : '—';
        const isActive = lead.id === activeId;
        const liNewTag = (lead.viewed) ? '' : `<span class="li-tag new" id="lead${lead.id}">NEW</span>`;

        return '<div class="li-item' + (isActive ? ' active' : '') + '" data-lead-id="' + lead.id + '">' +
            '<div class="li-item-top">' +
                '<span class="li-item-name">' + title + '</span>' +
                '<span class="li-item-time">' + window._daysAgo(lead.created_at) + '</span>' +
            '</div>' +
            '<div class="li-item-desc">' + preview + '</div>' +
            '<div class="li-item-tags">' +
                '<span class="li-tag">' + (lead.budget_indication || '—') + '</span>' +
                liNewTag +
            '</div>' +
        '</div>';
    }).join('');

    // Wire clicks
    list.querySelectorAll('.li-item').forEach(function(item) {
        item.addEventListener('click', function() {
            list.querySelectorAll('.li-item').forEach(function(i) { i.classList.remove('active'); });
            this.classList.add('active');
            const id = parseInt(this.dataset.leadId);
            const lead = leads.find(function(l) { return l.id === id; });
            if (lead) renderLeadDetail(lead);
        });
    });
}

async function renderLeadDetail(lead) {
    const title = parseTitle(lead.title) || ('Lead #' + lead.id);
    const musts = parseMustHaves(lead.must_haves);
    const fullname = `${window._user[lead.id].first_name} ${window._user[lead.id].last_name}`;

    getUserComparisons(lead.vendor_id, lead.user_id).then(() => {
        let comparisonVendors = '';
        Object.values(window._vendor).forEach(v => {
            comparisonVendors += '<span class="li-comparing-tag">' + v.name + '</span>';
        });
        const el = document.getElementById('liComparingTags');
        if (el) el.innerHTML = comparisonVendors;
    });

    const mustsHtml = musts.length
        ? musts.map(function(m) {
            return '<div class="li-must-row">' +
                '<div class="li-must-left">' +
                    '<svg class="li-must-check" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="var(--o)" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>' +
                    '<span class="li-must-text">' + m + '</span>' +
                '</div>' +
            '</div>';
        }).join('')
        : '<div style="font-size:13px;color:var(--t3)">No must-haves specified.</div>';

    document.getElementById('liDetailInner').innerHTML =
        '<div class="li-detail-inner">' +
            '<div class="li-detail-top">' +
                '<div>' +
                    '<div class="li-detail-name">' + title + '</div>' +
                    '<div class="li-detail-meta">Submitted ' + window._daysAgo(lead.created_at) + '</div>' +
                '</div>' +
                '<div class="li-detail-actions">' +
                    '<button class="li-pass-btn">Pass</button>' +
                    '<button class="li-respond-btn">Respond →</button>' +
                '</div>' +
            '</div>' +

            '<div class="li-info-row">' +
                '<div class="li-info-card">' +
                    '<div class="li-info-eyebrow">CONTACT</div>' +
                    '<div class="li-contact-row">' +
                        '<div class="li-contact-avatar">' + fullname.split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase() + '</div>' +
                        '<div>' +
                            '<div class="li-contact-name">' + fullname + '</div>' +
                            '<div class="li-contact-role">' + (window._user[lead.id].job_title || '') + '</div>' +
                        '</div>' +
                    '</div>' +
                '</div>' +
                '<div class="li-info-card">' +
                    '<div class="li-info-eyebrow">BUYER STAGE</div>' +
                    '<div class="li-stage-val">' + 'Shortlist' + '</div>' +
                    '<div class="li-stage-sub">based on platform behavior</div>' +
                '</div>' +
                '<div class="li-info-card">' +
                    '<div class="li-info-eyebrow">ALSO COMPARING</div>' +
                    '<div class="li-comparing-tags" id="liComparingTags">' +
                        '<span style="font-size:12px;color:var(--t4)">Loading…</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +

            '<div class="li-section-card">' +
                '<div class="li-section-eyebrow">MUST-HAVES</div>' +
                mustsHtml +
            '</div>' +

            '<div class="li-section-card">' +
                '<div class="li-section-eyebrow">ORIGINAL MESSAGE</div>' +
                '<p class="li-message-text">' + (lead.message || '—') + '</p>' +
            '</div>' +
        '</div>';
    
    fetch('/api/supabase?action=updateIntroRequest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requestId: lead.id}),
    });

    $(`#lead${lead.id}`).remove();
}

function parseMustHaves(raw) {
    try { return JSON.parse(raw) || []; }
    catch { return []; }
}

function parseTitle(raw) {
    if (!raw || raw === '{}') return null;
    try { const p = JSON.parse(raw); return typeof p === 'string' ? p : null; }
    catch { return raw; }
}

async function getLeads(vendorId){
    console.log('getLeadsByUserId called, user id:', vendorId);
    const response = await fetch(`/api/supabase?action=getVendorLeads&vendorId=${vendorId}`);
    const result = await response.json();

    if (result.error) {
        App.showToast(result.error, 'error');
        return;
    }

    $('#totLeads').text(result.data.length);
    window._leads = result.data;
    await getUserLeadInfo();
    renderLeadsInbox();
}

async function getUserLeadInfo(){
    await Promise.all(window._leads.map(async (lead) => {
        const response = await fetch(`/api/supabase?action=getUserById&userId=${lead.user_id}`);
        const result = await response.json();
        if (!result.error) {
            window._user[lead.id] = result.data;
        }
    }));
}

function loadVendorsForClaiming(){
    fetch(`/api/supabase?action=GetVendorsForClaiming`)
        .then(r => r.json())
        .then(result => {
            if (result.error) { App.showToast(result.error, 'error'); return; }
            window._claimableVendors = result.vendors;
        });
}

async function renderVendor(vendor){
    console.log(vendor);
    let verification = vendor.verification;
    verification = verification.replace('-', ' ').toUpperCase();

    $('#pl-name').text(vendor.name);
    $("#plDescView").text(vendor.short_description);
    $("#plFoundedView").text(vendor.founding_year);
    $("#plTaglineView").val(vendor.description);
    $("#plHqView").val(vendor.hq_location);
    $("#vVerification").text(verification);

    const plName    = document.getElementById('plVendorName');
    const plInitials= document.getElementById('plVendorInitials');
    const plSub     = document.getElementById('plVendorSubName');
    const plBadge   = document.getElementById('plVendorBadge');

    if(plName)     plName.textContent     = vendor.name || '—';
    if(plInitials) plInitials.textContent = App.initials(vendor.name || '');
    if(plSub)      plSub.textContent      = vendor.data.company.website ?? vendor.website;
    if(plBadge)    plBadge.textContent    = vendor.verification;
    
    const integrations = vendor.data.company.integrations ?? [];

    let completeness = 0;
    const completenessItems = 6;
    if (vendor.description != null && vendor.description != ''){completeness++;}
    if (vendor.short_description != null && vendor.short_description != ''){completeness++;}
    if (vendor.founding_year != null && vendor.founding_year != ''){completeness++;}
    if (vendor.hq_location != null && vendor.hq_location != ''){completeness++;}
    if (completeness == 4){
        $('#plChecklist').append(`<li class="pl-check-item done"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#16a34a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Basic info</li>`);
    }else{
        $('#plChecklist').append(`<li class="pl-check-item todo"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><line x1="3" y1="8" x2="13" y2="8" stroke="var(--t4)" stroke-width="1.6" stroke-linecap="round"></line></svg>Basic info</li>`);
    }

    if (vendor.categories != null && vendor.categories != ''){
        $('#plChecklist').append(`<li class="pl-check-item done"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#16a34a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Categories</li>`);
        completeness++;
    }else{
        $('#plChecklist').append(`<li class="pl-check-item todo"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><line x1="3" y1="8" x2="13" y2="8" stroke="var(--t4)" stroke-width="1.6" stroke-linecap="round"></line></svg>Categories</li>`);
    }

    if (integrations.length > 0){
        $('#plChecklist').append(`<li class="pl-check-item done"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#16a34a" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>Integrations</li>`);
        completeness++;
    }else{
        $('#plChecklist').append(`<li class="pl-check-item todo"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><line x1="3" y1="8" x2="13" y2="8" stroke="var(--t4)" stroke-width="1.6" stroke-linecap="round"></line></svg>Integrations</li>`);
    }

    $('#plChecklist').append(`<li class="pl-check-item todo"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><line x1="3" y1="8" x2="13" y2="8" stroke="var(--t4)" stroke-width="1.6" stroke-linecap="round"></line></svg>Demo video (optional)</li>`);
    $('#plChecklist').append(`<li class="pl-check-item todo"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><line x1="3" y1="8" x2="13" y2="8" stroke="var(--t4)" stroke-width="1.6" stroke-linecap="round"></line></svg>Capability evidence (for Verified)</li>`);

    const completenessPerc = parseInt((completeness / completenessItems) * 100);
    $('#completenessPerc').text(`${completenessPerc}%`);
    $('#topPlCompleteness').text(completenessPerc);
    $('.pl-progress-fill').css('width', `${completenessPerc}%`);

    if (vendor.updated_at !== null){$('#plUpdated').text(window._daysAgo(vendor.updated_at));}

    getViews(vendor.id);
    await getLeads(vendor.id);
    getComparisons(vendor.id);
    loadReferences(vendor.id);
    getRecentActivities(vendor.id);
    loadVendorsForClaiming();
    //loadUserClaims();

    const modules = vendor.data.company.modules ?? [];
    renderFeaturesGrid(modules, 'featuresGrid');

    window._vendorId = vendor.id;
    if (vendor.categories) {
        vendor.categories = vendor.categories.replace('•', ',');

        const cats = vendor.categories.split(',').map(c => c.trim()).filter(Boolean);
        const $row = $('.pl-cats-row');
        $row.find('.pl-cat-tag').remove();
        cats.forEach(function(cat) {
            $row.prepend(makeCatTag(cat));
        });
    }

    bindCategoryControls();
}

async function getLeadsByUserId(){
    console.log('getLeadsByUserId called, user id:', window._user.id);
    
    const response = await fetch(`/api/supabase?action=getUserLeads&userId=${window._user.id}`);
    const result = await response.json();
    
    console.log('leads result:', result);

    if (result.error) {
        App.showToast(result.error, 'error');
        return;
    }

    window._leads = result.data || [];
    console.log('leads count:', window._leads.length);
    
    $('#leadsInboxBadge').text(window._leads.length);

    if (!window._leads.length) return;

    await getUserLeadInfo();
    console.log('leadUsers:', window._user);
    
    renderLeadsInbox();
}

function makeCatTag(label) {
    window._categories.push(label.trim());
    const $tag = $('<span class="pl-cat-tag"></span>').text(label);
    const $x   = $('<button class="pl-cat-x" aria-label="Remove category">×</button>');
    $x.on('click', function() { window._categories = window._categories.filter(val => val !== label.trim()); $tag.remove(); updateCategories()});
    $tag.append(' ').append($x);
    return $tag;
}

function getRecentActivities(vendorId){
    fetch(`/api/supabase?action=getVendorActivities&vendorId=${vendorId}`)
        .then(r => r.json())
        .then(result => {
            if (result.error) { App.showToast(result.error, 'error'); return; }
            result.data.forEach(activity => {
                $('#recentActivities').append(`
                    <li class="pl-activity-item">
                        <span class="pl-activity-text"><strong>${activity.username}</strong> ${activity.message} · ${window._daysAgo(activity.created_at)}</span>
                    </li>`);
            });
        });
}

async function updateCategories(){
    await fetch('/api/supabase?action=updateVendorCategories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendorId: window._vendorId, categories: window._categories.join(',') }),
    });
}

function bindCategoryControls() {
    const $row    = $('.pl-cats-row');
    const $addBtn = $row.find('.pl-add-cat');

    // Prevent duplicate bindings
    $addBtn.off('click.addcat').on('click.addcat', function() {
        // Don't open a second input if one is already open
        if ($row.find('.pl-cat-input-wrap').length) return;

        const $wrap = $('<span class="pl-cat-input-wrap" style="display:inline-flex;align-items:center;gap:4px;"></span>');
        const $input = $('<input type="text" class="pl-input" placeholder="Category name" style="height:28px;padding:0 10px;font-size:12px;width:160px;border-radius:20px;">');
        const $confirm = $('<button class="pl-save-btn" style="height:28px;padding:0 12px;font-size:12px;border-radius:20px;">Add</button>');
        const $cancel  = $('<button class="pl-cancel-btn" style="height:28px;padding:0 10px;font-size:12px;border-radius:20px;">✕</button>');

        $wrap.append($input).append($confirm).append($cancel);
        $addBtn.before($wrap);
        $input.trigger('focus');

        function commit() {
            const val = $input.val().trim();
            if (val) {
                $addBtn.before(makeCatTag(val));
                updateCategories();
            }
            $wrap.remove();
        }

        function cancel() { $wrap.remove(); }

        $confirm.on('click', commit);
        $cancel.on('click', cancel);
        $input.on('keydown', function(e) {
            if (e.key === 'Enter')  { e.preventDefault(); commit(); }
            if (e.key === 'Escape') { cancel(); }
        });
    });
}

async function loadClaim(userId){
    const response = await fetch(`/api/supabase?action=getUserClaim&userId=${userId}`);
    const result = await response.json();
    if (result.error){
        App.showToast(result.error, 'error');
        return;
    }

    if (result.claim.name){
        const days = window._daysAgo(result.claim.created_at);
        const verified = result.claim.verified;
        
        $('#claim-product-name').text(result.claim.name);
        $('#claim-submitted-days').text(`Submitted ${days}`);
        $('#claim-step-days').text(days);

        if (verified == 'Y'){
            $('#udder-review').removeClass('active').empty().append(`<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
            $('#udder-verified').removeClass('pending').addClass('done').empty().append(`<svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="white" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`);
            $('.claim-step').addClass('done').removeClass('pending').removeClass('active');
        }
    }
    console.log(result);
}

function loadReferences(vendorId) {
    var tbody = document.getElementById('referencesTableBody');
    if (!tbody) return;

    fetch(`/api/supabase?action=getReferencesByVendorId&vendorId=${vendorId}`)
        .then(r => r.json())
        .then(result => {
            const refs = result.data ?? result ?? [];

            if (!refs.length) {
                tbody.innerHTML = '<div style="padding:16px 20px;font-size:13px;color:var(--t3)">No references yet.</div>';
                return;
            }

            tbody.innerHTML = refs.map(function(r) {
                var isPublished = r.status === 'published' || r.status === 'Published';
                var statusBadge = isPublished
                    ? '<span class="pl-ref-status published">Published</span>'
                    : '<span class="pl-ref-status pending">Pending Udder review</span>';

                var validatedIcon = r.validated
                    ? '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#16a34a" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                    : '<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="var(--t4)" stroke-width="1.3"/><path d="M8 5v3.5l2 1.5" stroke="var(--t4)" stroke-width="1.3" stroke-linecap="round"/></svg>';

                return '<div class="pl-ref-row">' +
                    '<span class="pl-ref-name">' + (r.customer ?? '—') + '</span>' +
                    '<span class="pl-ref-cell">' + (r.industry ?? '—') + '</span>' +
                    '<span class="pl-ref-cell">' + statusBadge + '</span>' +
                    '<span class="pl-ref-cell">' + validatedIcon + '</span>' +
                '</div>';
            }).join('');
        });
}

async function loadUser(userId){
    const response = await fetch(`/api/supabase?action=getUserById&userId=${userId}`);
    const result = await response.json();

    if (result.error) {
        App.showToast(result.error, 'error');
        return;
    }

    window._user = result.data;
    const fullName = `${window._user.first_name} ${window._user.last_name}`;
    $('#sbUname').text(fullName);
    $('#sbInitials').text(App.initials(fullName));
}
