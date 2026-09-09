import { isLoggedIn, getCurrentUser, initSession } from './auth/session.js';

$(async function(){
    await initSession();
        
    const response = await fetch(`/api/supabase?action=getTaxonomy`);
    const result = await response.json();
    if (result.error) {
        console.warn('Failed loading taxanomy', result.error);
        return;
    }

    var TAXONOMY_DATA = result.data[0].features;
    var MODULE_INDEX = (function() {
    var idx = {};
    TAXONOMY_DATA.forEach(function(cat) {
        cat.modules.forEach(function(mod) {
        if (!idx[mod.module]) idx[mod.module] = {};
        mod.featureTypes.forEach(function(ft) {
            if (!idx[mod.module][ft.featureType]) idx[mod.module][ft.featureType] = [];
            ft.features.forEach(function(f) {
            if (idx[mod.module][ft.featureType].indexOf(f) === -1) {
                idx[mod.module][ft.featureType].push(f);
            }
            });
        });
        });
    });
    return idx;
    })();
    
    var ALL_MODULES = Object.keys(MODULE_INDEX).sort();
    
    /* ── Module -> Category index ──
    A module can appear under more than one category in the taxonomy, so this
    maps each module name to the (deduped) list of categories it belongs to. */
    var MODULE_CATEGORIES = (function() {
    var idx = {};
    TAXONOMY_DATA.forEach(function(cat) {
        cat.modules.forEach(function(mod) {
        if (!idx[mod.module]) idx[mod.module] = [];
        if (idx[mod.module].indexOf(cat.category) === -1) {
            idx[mod.module].push(cat.category);
        }
        });
    });
    return idx;
    })();
    
    function getCategoriesForModule(moduleName) {
    return MODULE_CATEGORIES[moduleName] || [];
    }
    
    /* Optional acronym helper for module autocomplete (extend as needed —
    most modules already contain their acronym in parentheses, e.g. "(ATS)",
    so plain substring matching covers most cases without this map). */
    var MODULE_ACRONYM_MAP = {
    'ats': 'Applicant Tracking Systems (ATS)',
    'lms': 'Learning Management Systems (LMS)',
    'lxp': 'Learning Experience Platforms (LXP)',
    'hris': 'HRIS / HRMS / HCM',
    'hrms': 'HRIS / HRMS / HCM',
    'hcm': 'HRIS / HRMS / HCM',
    'vms': 'Contingent Workforce / VMS & Freelancer Management',
    'ehs': 'Health & Safety / EHS'
    };
    
    function getFeatureTypesForModule(moduleName) {
    var node = MODULE_INDEX[moduleName];
    return node ? Object.keys(node) : [];
    }
    
    function getFeaturesForModuleAndTypes(moduleName, featureTypeNames) {
    var node = MODULE_INDEX[moduleName];
    if (!node) return [];
    var typesToUse = (featureTypeNames && featureTypeNames.length) ? featureTypeNames : Object.keys(node);
    var out = [];
    typesToUse.forEach(function(ft) {
        (node[ft] || []).forEach(function(f) {
        if (out.indexOf(f) === -1) out.push(f);
        });
    });
    return out;
    }
    
    function pickRandom(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
    
    /* ── State ── */
    var state = { module: '', featureTypes: [], features: [] };
    var step = 0;
    
    /* ── Flow definition ──
    'qs' may be a static array, OR a function returning an array — use the
    function form when the question text needs to reference prior answers
    (e.g. naming the chosen module). */
    var flow = [
    {
        key: 'module',
        qs: [
        "Which module are you looking for?",
        "Which HR module should we start with?",
        "What module are you trying to find?"
        ],
        type: 'moduleAutocomplete',
        follow: function(v) {
        return [
            "Great choice — " + v + " it is.",
            v + " — solid module to explore.",
            "Good call. Let\u2019s build around " + v + "."
        ][Math.floor(Math.random() * 3)];
        }
    },
    {
        key: 'featureTypes',
        qs: function() {
        return [
            "Within " + state.module + ", which feature types matter most?",
            "Which feature types of " + state.module + " are must-haves?",
            "Let\u2019s narrow down " + state.module + " — which feature types apply?"
        ];
        },
        type: 'featureTypeChips',
        follow: function() {
        return ["Noted \u2014 that\u2019ll sharpen the results.", "Perfect \u2014 that level of detail really helps.", "Good \u2014 nearly there."][Math.floor(Math.random() * 3)];
        }
    },
    {
        key: 'features',
        qs: function() {
        var scope = (state.featureTypes && state.featureTypes.length) ? state.featureTypes.join(', ') : state.module;
        return [
            "And within " + scope + ", which specific features do you need?",
            "Which features under " + scope + " are non-negotiable?",
            "Almost done \u2014 which features from " + scope + " matter most?"
        ];
        },
        type: 'featureChips',
        follow: function() {
        return ["Got it, that helps a lot.", "Perfect \u2014 let\u2019s wrap up.", "Great, nearly there."][Math.floor(Math.random() * 3)];
        }
    }
    ];
    
    /* ── DOM refs ── */
    var chatBody = document.getElementById('udderChatBody');
    var qrArea   = document.getElementById('udderQRArea');
    
    /* ── Helpers ── */
    function scrollDown() {
    setTimeout(function() { chatBody.scrollTop = chatBody.scrollHeight; }, 0);
    setTimeout(function() { chatBody.scrollTop = chatBody.scrollHeight; }, 80);
    }
    
    function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }
    
    function highlightMatch(text, query) {
    if (!query) return escHtml(text);
    var idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return escHtml(text);
    return escHtml(text.slice(0, idx)) +
        '<strong>' + escHtml(text.slice(idx, idx + query.length)) + '</strong>' +
        escHtml(text.slice(idx + query.length));
    }
    
    function addMsg(text, type) {
    return new Promise(function(res) {
        var row = document.createElement('div');
        row.className = 'uchat-row ' + type;
        var av = document.createElement('div');
        av.className = 'uchat-av ' + type;
        av.textContent = type === 'bot' ? 'AI' : 'You';
        var bub = document.createElement('div');
        bub.className = 'uchat-bub ' + type;
        bub.textContent = text;
        row.appendChild(av);
        row.appendChild(bub);
        chatBody.appendChild(row);
        scrollDown();
        setTimeout(res, 0);
    });
    }
    
    function showTyping() {
    var row = document.createElement('div');
    row.className = 'uchat-typing-row';
    row.id = 'uchatTyping';
    var av = document.createElement('div');
    av.className = 'uchat-av bot';
    av.textContent = 'AI';
    var bub = document.createElement('div');
    bub.className = 'uchat-typing-bub';
    bub.innerHTML = '<div class="uchat-dot"></div><div class="uchat-dot"></div><div class="uchat-dot"></div>';
    row.appendChild(av);
    row.appendChild(bub);
    chatBody.appendChild(row);
    scrollDown();
    }
    
    function removeTyping() {
    var t = document.getElementById('uchatTyping');
    if (t) t.remove();
    }
    
    function clearQR() { qrArea.innerHTML = ''; }
    
    /* ── Render input for each step ── */
    function renderStep(s) {
    clearQR();
    if (s.type === 'moduleAutocomplete')  renderModuleAutocomplete(s);
    else if (s.type === 'featureTypeChips') renderFeatureTypeChips(s);
    else if (s.type === 'featureChips')     renderFeatureChips(s);
    }
    
    /* ── Step 1: module autocomplete ── */
    function renderModuleAutocomplete(s) {
    var activeIdx = -1;
    
    var wrap = document.createElement('div');
    wrap.className = 'uchat-ac-wrap';
    
    var inp = document.createElement('input');
    inp.className = 'uchat-ac-inp';
    inp.type = 'text';
    inp.autocomplete = 'off';
    inp.placeholder = 'e.g. ATS, Payroll, LMS, Onboarding\u2026';
    inp.style.cssText = 'width:100%;border:1px solid var(--b2);outline:none;border-radius:20px;padding:8px 14px;font-size:13px;font-family:var(--sans);color:var(--t1);background:var(--off);transition:border-color 0.15s;box-sizing:border-box;';
    inp.addEventListener('focus', function(){ this.style.borderColor='var(--o)'; this.style.background='var(--w)'; });
    inp.addEventListener('blur',  function(){ this.style.borderColor='var(--b2)'; this.style.background='var(--off)'; });
    wrap.appendChild(inp);
    
    var dropdown = document.createElement('div');
    dropdown.className = 'uchat-ac-dropdown';
    dropdown.style.display = 'none';
    document.body.appendChild(dropdown);
    
    function positionDropdown() {
        var rect = inp.getBoundingClientRect();
        dropdown.style.left  = rect.left + 'px';
        dropdown.style.width = rect.width + 'px';
        dropdown.style.top   = (rect.bottom + 4) + 'px';
    }
    
    function getMatches(q) {
        q = (q || '').trim();
        if (!q) return [];
        var resolved = MODULE_ACRONYM_MAP[q.toLowerCase()];
        return ALL_MODULES.filter(function(m) {
        return m.toLowerCase().indexOf(q.toLowerCase()) !== -1 || (resolved && m === resolved);
        }).slice(0, 10);
    }
    
    function renderDropdown(query) {
        dropdown.innerHTML = '';
        activeIdx = -1;
        var matches = getMatches(query);
        if (!matches.length) {
        var none = document.createElement('div');
        none.className = 'uchat-ac-none';
        none.textContent = 'No matching module';
        dropdown.appendChild(none);
        } else {
        var q = (query || '').trim();
        matches.forEach(function(name, i) {
            var item = document.createElement('div');
            item.className = 'uchat-ac-item';
            item.dataset.idx = i;
            item.innerHTML = q ? highlightMatch(name, q) : escHtml(name);
            item.addEventListener('mousedown', function(e) {
            e.preventDefault();
            selectModule(name, s);
            });
            dropdown.appendChild(item);
        });
        var hint = document.createElement('div');
        hint.className = 'uchat-ac-hint';
        hint.textContent = matches.length + ' of ' + ALL_MODULES.length + ' modules';
        dropdown.appendChild(hint);
        }
        positionDropdown();
        dropdown.style.display = 'block';
    }
    
    function hideDropdown() { dropdown.style.display = 'none'; }
    
    function onScrollResize() { if (dropdown.style.display !== 'none') positionDropdown(); }
    window.addEventListener('scroll', onScrollResize, true);
    window.addEventListener('resize', onScrollResize);
    
    function updateActive(items) {
        items.forEach(function(el, i) { el.classList.toggle('active', i === activeIdx); });
    }
    
    inp.addEventListener('input', function() {
        if (this.value.trim()) renderDropdown(this.value);
        else hideDropdown();
    });
    inp.addEventListener('keydown', function(e) {
        var items = dropdown.querySelectorAll('.uchat-ac-item');
        if (e.key === 'ArrowDown') { e.preventDefault(); activeIdx = Math.min(activeIdx + 1, items.length - 1); updateActive(items); return; }
        if (e.key === 'ArrowUp')   { e.preventDefault(); activeIdx = Math.max(activeIdx - 1, 0);               updateActive(items); return; }
        if (e.key === 'Enter') {
        e.preventDefault();
        if (activeIdx >= 0 && items[activeIdx]) {
            selectModule(items[activeIdx].textContent, s);
        } else {
            var q = inp.value.trim();
            var resolved = q ? (MODULE_ACRONYM_MAP[q.toLowerCase()] || null) : null;
            var exact = ALL_MODULES.find(function(m) { return m.toLowerCase() === q.toLowerCase(); });
            var pick = exact || resolved || (getMatches(q)[0] || null);
            if (pick) selectModule(pick, s);
        }
        return;
        }
        if (e.key === 'Escape') hideDropdown();
    });
    inp.addEventListener('blur', function() { setTimeout(hideDropdown, 150); });
    
    function selectModule(name, s) {
        inp.value = name;
        hideDropdown();
        window.removeEventListener('scroll', onScrollResize, true);
        window.removeEventListener('resize', onScrollResize);
        setTimeout(function() { if (dropdown.parentNode) dropdown.parentNode.removeChild(dropdown); }, 300);
        state.module = name;
        state.featureTypes = [];
        state.features = [];
        handleAnswer(name, s);
    }
    
    qrArea.appendChild(wrap);
    }
    
    /* ── Step 2: feature type multi-select, filtered by selected module ── */
    function renderFeatureTypeChips(s) {
    var selTypes  = [];
    var chipBtns  = {};
    var doneBtn;
    
    var options = getFeatureTypesForModule(state.module);
    
    if (state.module) {
        var badge = document.createElement('div');
        badge.className = 'uchat-module-context';
        badge.textContent = 'Showing feature types for ' + state.module;
        qrArea.appendChild(badge);
    }
    
    options.forEach(function(opt) {
        var btn = document.createElement('button');
        btn.className = 'uchat-qr';
        btn.textContent = opt;
        chipBtns[opt] = btn;
        btn.addEventListener('click', function() {
        var idx = selTypes.indexOf(opt);
        if (idx !== -1) selTypes.splice(idx, 1); else selTypes.push(opt);
        state.featureTypes = selTypes.slice();
        btn.classList.toggle('sel', selTypes.indexOf(opt) !== -1);
        if (doneBtn) doneBtn.style.display = selTypes.length ? 'inline-flex' : 'none';
        });
        qrArea.appendChild(btn);
    });
    
    doneBtn = document.createElement('button');
    doneBtn.className = 'uchat-qr primary';
    doneBtn.textContent = 'Done \u2197';
    doneBtn.style.display = 'none';
    doneBtn.addEventListener('click', function() {
        if (!selTypes.length) return;
        handleAnswer(selTypes.join(', '), s);
    });
    qrArea.appendChild(doneBtn);
    
    var skipBtn = document.createElement('button');
    skipBtn.className = 'uchat-qr';
    skipBtn.textContent = 'Skip \u2014 show all feature types';
    skipBtn.addEventListener('click', function() {
        state.featureTypes = [];
        handleAnswer('All feature types', s);
    });
    qrArea.appendChild(skipBtn);
    }
    
    /* ── Step 3: feature multi-select, filtered by selected feature type(s) ── */
    function renderFeatureChips(s) {
    var selFeatures = [];
    var chipBtns    = {};
    var doneBtn;
    
    var options = getFeaturesForModuleAndTypes(state.module, state.featureTypes);
    var scopeLabel = (state.featureTypes && state.featureTypes.length) ? state.featureTypes.join(', ') : state.module;
    
    if (scopeLabel) {
        var badge = document.createElement('div');
        badge.className = 'uchat-module-context';
        badge.textContent = 'Showing features for ' + scopeLabel;
        qrArea.appendChild(badge);
    }
    
    options.forEach(function(opt) {
        var btn = document.createElement('button');
        btn.className = 'uchat-qr';
        btn.textContent = opt;
        chipBtns[opt] = btn;
        btn.addEventListener('click', function() {
        var idx = selFeatures.indexOf(opt);
        if (idx !== -1) selFeatures.splice(idx, 1); else selFeatures.push(opt);
        state.features = selFeatures.slice();
        btn.classList.toggle('sel', selFeatures.indexOf(opt) !== -1);
        if (doneBtn) doneBtn.style.display = selFeatures.length ? 'inline-flex' : 'none';
        });
        qrArea.appendChild(btn);
    });
    
    doneBtn = document.createElement('button');
    doneBtn.className = 'uchat-qr primary';
    doneBtn.textContent = 'Done \u2197';
    doneBtn.style.display = 'none';
    doneBtn.addEventListener('click', function() {
        if (!selFeatures.length) return;
        handleAnswer(selFeatures.join(', '), s);
    });
    qrArea.appendChild(doneBtn);
    
    var skipBtn = document.createElement('button');
    skipBtn.className = 'uchat-qr';
    skipBtn.textContent = 'Skip \u2014 no specific features';
    skipBtn.addEventListener('click', function() {
        state.features = [];
        handleAnswer('No specific features', s);
    });
    qrArea.appendChild(skipBtn);
    }
    
    /* ── Answer handler ── */
    function handleAnswer(displayText, s) {
    clearQR();
    addMsg(displayText, 'user').then(function() {
        setTimeout(function() {
        showTyping();
        setTimeout(function() {
            removeTyping();
            addMsg(s.follow(displayText), 'bot').then(function() {
            advanceStep(s, displayText);
            });
        }, 700);
        }, 100);
    });
    }
    
    function nextQuestionText(s) {
    var list = (typeof s.qs === 'function') ? s.qs() : s.qs;
    return pickRandom(list);
    }
    
    function advanceStep(s, displayText) {
    step++;
    if (step < flow.length) {
        var nextStep = flow[step];
        setTimeout(function() {
        showTyping();
        setTimeout(function() {
            removeTyping();
            addMsg(nextQuestionText(nextStep), 'bot').then(function() { renderStep(nextStep); });
        }, 600);
        }, 200);
    } else {
        setTimeout(showSummary, 400);
    }
    }
    
    /* ── Summary ── */
    function showSummary() {
    showTyping();
    setTimeout(function() {
        removeTyping();
        var featureTypes = (state.featureTypes && state.featureTypes.length) ? state.featureTypes.join(', ') : 'all';
        var features      = (state.features && state.features.length) ? state.features.join(', ') : 'none specified';
        var lines = [
        state.module ? '\u00b7 Module: ' + state.module : null,
        '\u00b7 Feature types: ' + featureTypes,
        '\u00b7 Features: ' + features
        ].filter(Boolean).join('\n');
    
        addMsg("Here\u2019s what I\u2019ve captured:\n\n" + lines, 'bot').then(function() {
        clearQR();
        var fireBtn = document.createElement('button');
        fireBtn.className = 'uchat-qr primary';
        fireBtn.textContent = 'Find matching HR systems \u2197';
        fireBtn.addEventListener('click', function() { clearQR(); fireSearch(); });
        qrArea.appendChild(fireBtn);
        scrollDown();
        });
    }, 800);
    }
    
    /* ── Close modal ── */
    window.closeUdderModal = function() {
    var modal = document.getElementById('searchModal');
    if (modal) {
        modal.classList.remove('open');
        modal.classList.remove('active');
        modal.style.display = '';
        document.body.classList.remove('modal-active');
    }
    };
    
    /* ── Fire search ── */
    function fireSearch() {
    var payload = {
        module:       state.module || "",
        categories:   getCategoriesForModule(state.module),
        feature_type: Array.isArray(state.featureTypes) ? state.featureTypes : [],
        features:     Array.isArray(state.features) ? state.features : []
    };
    
    var jsonStr = JSON.stringify(payload, null, 2);
    
    clearQR();
    
    var searchRow = document.createElement('div');
    searchRow.className = 'uchat-typing-row';
    searchRow.id = 'uchatSearching';
    var av = document.createElement('div');
    av.className = 'uchat-av bot';
    av.textContent = 'AI';
    var bub = document.createElement('div');
    bub.className = 'uchat-typing-bub';
    bub.style.cssText = 'gap:8px;padding:10px 16px;min-width:180px;';
    
    var stages = ['Searching vendors\u2026', 'Matching features\u2026', 'Ranking results\u2026'];
    var stageIdx = 0;
    var label = document.createElement('span');
    label.style.cssText = 'font-size:12px;color:var(--t3);font-family:var(--sans);';
    label.textContent = stages[0];
    
    var dots = document.createElement('span');
    dots.innerHTML = '<div class="uchat-dot"></div><div class="uchat-dot"></div><div class="uchat-dot"></div>';
    dots.style.cssText = 'display:flex;gap:4px;align-items:center;';
    
    bub.appendChild(dots);
    bub.appendChild(label);
    searchRow.appendChild(av);
    searchRow.appendChild(bub);
    chatBody.appendChild(searchRow);
    scrollDown();
    
    setInterval(function() {
        stageIdx = (stageIdx + 1) % stages.length;
        label.textContent = stages[stageIdx];
    }, 900);
    
    if (typeof window.triggerUdderSearch === 'function') {
        window.triggerUdderSearch(jsonStr);
    }
    }
    
    /* ── Restart ── */
    function restart() {
    state = { module: '', featureTypes: [], features: [] };
    step  = 0;
    chatBody.innerHTML = '';
    clearQR();
    var rb = document.getElementById('udderRestartBtn');
    if (rb) rb.style.display = 'none';
    kickOff();
    }
    
    var restartBtn = document.getElementById('udderRestartBtn');
    if (restartBtn) restartBtn.addEventListener('click', restart);
    
    /* ── Kick off ── */
    function kickOff() {
    showTyping();
    setTimeout(function() {
        removeTyping();
        addMsg("Hey! What are you looking for today?", 'bot').then(function() {
        showTyping();
        setTimeout(function() {
            removeTyping();
            addMsg(nextQuestionText(flow[0]), 'bot').then(function() {
            renderStep(flow[0]);
            var rb = document.getElementById('udderRestartBtn');
            if (rb) rb.style.display = 'inline-flex';
            });
        }, 600);
        });
    }, 900);
    }
    
    /* ── Start on modal open ── */
    var _modalEl = document.getElementById('searchModal');
    var _udderWasOpen = false;
    
    function handleModalStateChange() {
    var isOpen = _modalEl.classList.contains('open') || _modalEl.classList.contains('active');
    if (isOpen && !_udderWasOpen) {
        _udderWasOpen = true;
        setTimeout(function() {
        state = { module: '', featureTypes: [], features: [] };
        step  = 0;
        chatBody.innerHTML = '';
        clearQR();
        var rb = document.getElementById('udderRestartBtn');
        if (rb) rb.style.display = 'none';
        kickOff();
        }, 50);
    }
    if (!isOpen) _udderWasOpen = false;
    }
    
    if (_modalEl) {
    new MutationObserver(handleModalStateChange)
        .observe(_modalEl, { attributes: true, attributeFilter: ['class', 'style'] });
    }
});