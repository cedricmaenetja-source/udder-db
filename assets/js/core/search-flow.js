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

    /* ── Module -> Category index ── */
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

    var CATEGORY_MODULE_INDEX = (function() {
        var idx = {};
        TAXONOMY_DATA.forEach(function(cat) {
            cat.modules.forEach(function(mod) {
                var key = cat.category + '||' + mod.module;
                if (!idx[key]) idx[key] = {};
                mod.featureTypes.forEach(function(ft) {
                    if (!idx[key][ft.featureType]) idx[key][ft.featureType] = [];
                    ft.features.forEach(function(f) {
                        if (idx[key][ft.featureType].indexOf(f) === -1) {
                            idx[key][ft.featureType].push(f);
                        }
                    });
                });
            });
        });
        return idx;
    })();

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

    /* "A", "A and B", "A, B and C" */
    function listText(items) {
        if (!items || !items.length) return '';
        if (items.length === 1) return items[0];
        return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
    }

    /* ── State ──
       modules:      array of selected module names
       featureTypes: { moduleName: [featureType, ...] } — only modules the user narrowed
       features:     flat, deduped array of selected features */
    var state;
    var step = 0;

    function resetState() {
        state = { modules: [], featureTypes: {}, features: [] };
        step = 0;
    }
    resetState();

    /* Flat, deduped list of all selected feature types */
    function flatFeatureTypes() {
        var out = [];
        state.modules.forEach(function(m) {
            (state.featureTypes[m] || []).forEach(function(t) {
                if (out.indexOf(t) === -1) out.push(t);
            });
        });
        return out;
    }

    /* Human-readable feature type selection, grouped by module when there are several */
    function describeFeatureTypes() {
        var flat = flatFeatureTypes();
        if (!flat.length) return 'All feature types';
        if (state.modules.length === 1) return flat.join(', ');
        return state.modules
            .filter(function(m) { return (state.featureTypes[m] || []).length; })
            .map(function(m) { return m + ': ' + state.featureTypes[m].join(', '); })
            .join('; ');
    }

    /* ── Flow definition ── */
    var flow = [
        {
            key: 'modules',
            qs: [
                "What solutions are you looking for? You can pick more than one."
            ],
            type: 'moduleAutocomplete',
            follow: function() {
                return "Great choice \u2014 " + listText(state.modules) + " it is.";
            }
        },
        {
            key: 'featureTypes',
            qs: function() {
                var mods = listText(state.modules);
                return [
                    "Within " + mods + ", which feature types matter most?",
                    "Which feature types of " + mods + " are must-haves?",
                    "Let\u2019s narrow down " + mods + " \u2014 which feature types apply?"
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
                var flat = flatFeatureTypes();
                var scope = flat.length ? flat.join(', ') : listText(state.modules);
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

    function clearQR() {
        qrArea.innerHTML = '';
        // The autocomplete dropdown lives on <body>; make sure none are left behind on restart
        document.querySelectorAll('.uchat-ac-dropdown').forEach(function(d) { d.remove(); });
    }

    /* Small header used to group chips by module when several modules are selected */
    function makeGroupHeader(text) {
        var h = document.createElement('div');
        h.className = 'uchat-module-group';
        h.textContent = text;
        h.style.cssText = 'width:100%;font-size:11px;font-weight:600;color:var(--t2);font-family:var(--sans);margin:8px 0 2px;';
        return h;
    }

    /* ── Render input for each step ── */
    function renderStep(s) {
        clearQR();
        if (s.type === 'moduleAutocomplete')     renderModuleAutocomplete(s);
        else if (s.type === 'featureTypeChips')  renderFeatureTypeChips(s);
        else if (s.type === 'featureChips')      renderFeatureChips(s);
    }

    function renderModuleAutocomplete(s) {
        var activeIdx = -1;
        var selected  = state.modules.slice();
        var DEFAULT_PLACEHOLDER = 'e.g. ATS, Payroll, LMS, Onboarding\u2026';

        var wrap = document.createElement('div');
        wrap.className = 'uchat-ac-wrap';

        /* Selected modules shown as removable tags */
        var tagRow = document.createElement('div');
        tagRow.className = 'uchat-ac-tags';
        tagRow.style.cssText = 'display:none;flex-wrap:wrap;gap:6px;margin-bottom:8px;';
        wrap.appendChild(tagRow);

        var inp = document.createElement('input');
        inp.className = 'uchat-ac-inp';
        inp.type = 'text';
        inp.autocomplete = 'off';
        inp.placeholder = DEFAULT_PLACEHOLDER;
        inp.style.cssText = 'width:100%;border:1px solid var(--b2);outline:none;border-radius:20px;padding:8px 14px;font-size:13px;font-family:var(--sans);color:var(--t1);background:var(--off);transition:border-color 0.15s;box-sizing:border-box;';
        inp.addEventListener('focus', function(){ this.style.borderColor='var(--o)'; this.style.background='var(--w)'; });
        inp.addEventListener('blur',  function(){ this.style.borderColor='var(--b2)'; this.style.background='var(--off)'; });
        wrap.appendChild(inp);

        var dropdown = document.createElement('div');
        dropdown.className = 'uchat-ac-dropdown';
        dropdown.style.display = 'none';
        document.body.appendChild(dropdown);

        var doneBtn = document.createElement('button');
        doneBtn.className = 'uchat-qr primary';
        doneBtn.textContent = 'Done \u2197';
        doneBtn.style.display = 'none';
        doneBtn.addEventListener('click', finish);

        function renderTags() {
            tagRow.innerHTML = '';
            selected.forEach(function(name) {
                var tag = document.createElement('span');
                tag.className = 'uchat-ac-tag';
                tag.style.cssText = 'display:inline-flex;align-items:center;gap:6px;padding:4px 6px 4px 12px;border:1px solid var(--o);border-radius:14px;font-size:12px;font-family:var(--sans);color:var(--t1);background:var(--w);';
                var label = document.createElement('span');
                label.textContent = name;
                var x = document.createElement('button');
                x.type = 'button';
                x.setAttribute('aria-label', 'Remove ' + name);
                x.textContent = '\u00d7';
                x.style.cssText = 'border:none;background:none;cursor:pointer;font-size:14px;line-height:1;color:var(--t3);padding:0 4px;';
                x.addEventListener('click', function() { removeModule(name); });
                tag.appendChild(label);
                tag.appendChild(x);
                tagRow.appendChild(tag);
            });
            tagRow.style.display  = selected.length ? 'flex' : 'none';
            doneBtn.style.display = selected.length ? 'inline-flex' : 'none';
            inp.placeholder = selected.length ? 'Add another module\u2026' : DEFAULT_PLACEHOLDER;
            scrollDown();
        }

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
                if (selected.indexOf(m) !== -1) return false; // hide already-chosen modules
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
                    item.dataset.idx  = i;
                    item.dataset.name = name;
                    item.innerHTML = q ? highlightMatch(name, q) : escHtml(name);
                    item.addEventListener('mousedown', function(e) {
                        e.preventDefault();
                        addModule(name);
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

        function addModule(name) {
            if (selected.indexOf(name) === -1) selected.push(name);
            inp.value = '';
            hideDropdown();
            renderTags();
            inp.focus();
        }

        function removeModule(name) {
            var i = selected.indexOf(name);
            if (i !== -1) selected.splice(i, 1);
            renderTags();
            if (inp.value.trim()) renderDropdown(inp.value);
            inp.focus();
        }

        function finish() {
            if (!selected.length) return;
            hideDropdown();
            window.removeEventListener('scroll', onScrollResize, true);
            window.removeEventListener('resize', onScrollResize);
            if (dropdown.parentNode) dropdown.parentNode.removeChild(dropdown);
            state.modules      = selected.slice();
            state.featureTypes = {};
            state.features     = [];
            handleAnswer(selected.join(', '), s);
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
                var q = inp.value.trim();
                if (activeIdx >= 0 && items[activeIdx]) {
                    addModule(items[activeIdx].dataset.name);
                } else if (q) {
                    var resolved = MODULE_ACRONYM_MAP[q.toLowerCase()] || null;
                    var exact = ALL_MODULES.find(function(m) { return m.toLowerCase() === q.toLowerCase(); });
                    var pick = exact || resolved || (getMatches(q)[0] || null);
                    if (pick) addModule(pick);
                } else {
                    // Empty input + Enter = confirm the current selection
                    finish();
                }
                return;
            }
            if (e.key === 'Backspace' && !inp.value && selected.length) {
                removeModule(selected[selected.length - 1]);
                return;
            }
            if (e.key === 'Escape') hideDropdown();
        });
        inp.addEventListener('blur', function() { setTimeout(hideDropdown, 150); });

        qrArea.appendChild(wrap);
        qrArea.appendChild(doneBtn);
        renderTags();
        inp.focus();
    }

    function renderFeatureTypeChips(s) {
        var sel   = {};   // module -> [featureType]
        var multi = state.modules.length > 1;
        var doneBtn;

        function selectedCount() {
            return Object.keys(sel).reduce(function(n, m) { return n + sel[m].length; }, 0);
        }

        var badge = document.createElement('div');
        badge.className = 'uchat-module-context';
        badge.textContent = 'Showing feature types for ' + listText(state.modules);
        qrArea.appendChild(badge);

        state.modules.forEach(function(mod) {
            var options = getFeatureTypesForModule(mod);
            if (!options.length) return;
            if (multi) qrArea.appendChild(makeGroupHeader(mod));

            options.forEach(function(opt) {
                var btn = document.createElement('button');
                btn.className = 'uchat-qr';
                btn.textContent = opt;
                btn.addEventListener('click', function() {
                    if (!sel[mod]) sel[mod] = [];
                    var idx = sel[mod].indexOf(opt);
                    if (idx !== -1) sel[mod].splice(idx, 1); else sel[mod].push(opt);
                    if (!sel[mod].length) delete sel[mod];
                    state.featureTypes = JSON.parse(JSON.stringify(sel));
                    btn.classList.toggle('sel', !!(sel[mod] && sel[mod].indexOf(opt) !== -1));
                    if (doneBtn) doneBtn.style.display = selectedCount() ? 'inline-flex' : 'none';
                });
                qrArea.appendChild(btn);
            });
        });

        if (multi) qrArea.appendChild(makeGroupHeader(''));

        doneBtn = document.createElement('button');
        doneBtn.className = 'uchat-qr primary';
        doneBtn.textContent = 'Done \u2197';
        doneBtn.style.display = 'none';
        doneBtn.addEventListener('click', function() {
            if (!selectedCount()) return;
            handleAnswer(describeFeatureTypes(), s);
        });
        qrArea.appendChild(doneBtn);

        var skipBtn = document.createElement('button');
        skipBtn.className = 'uchat-qr';
        skipBtn.textContent = 'Skip \u2014 show all feature types';
        skipBtn.addEventListener('click', function() {
            state.featureTypes = {};
            handleAnswer('All feature types', s);
        });
        qrArea.appendChild(skipBtn);
    }

    function renderFeatureChips(s) {
        var selFeatures = [];
        var shown       = [];  // avoid showing the same feature twice across modules
        var multi       = state.modules.length > 1;
        var doneBtn;

        state.modules.forEach(function(mod) {
            var options = getFeaturesForModuleAndTypes(mod, state.featureTypes[mod] || [])
                .filter(function(f) { return shown.indexOf(f) === -1; });
            if (!options.length) return;
            if (multi) qrArea.appendChild(makeGroupHeader(mod));

            options.forEach(function(opt) {
                shown.push(opt);
                var btn = document.createElement('button');
                btn.className = 'uchat-qr';
                btn.textContent = opt;
                btn.addEventListener('click', function() {
                    var idx = selFeatures.indexOf(opt);
                    if (idx !== -1) selFeatures.splice(idx, 1); else selFeatures.push(opt);
                    state.features = selFeatures.slice();
                    btn.classList.toggle('sel', selFeatures.indexOf(opt) !== -1);
                    if (doneBtn) doneBtn.style.display = selFeatures.length ? 'inline-flex' : 'none';
                });
                qrArea.appendChild(btn);
            });
        });

        if (multi) qrArea.appendChild(makeGroupHeader(''));

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
            advanceStep(s, displayText);
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
            var features = (state.features && state.features.length) ? state.features.join(', ') : 'none specified';
            var lines = [
                state.modules.length ? '\u00b7 ' + (state.modules.length > 1 ? 'Modules: ' : 'Module: ') + state.modules.join(', ') : null,
                '\u00b7 Feature types: ' + (flatFeatureTypes().length ? describeFeatureTypes() : 'all'),
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
    var searchStageTimer = null;

    function buildFilters() {
        var filters = [];
        var picked  = Array.isArray(state.features) ? state.features : [];

        state.modules.forEach(function(mod) {
            var chosenTypes = state.featureTypes[mod] || [];

            // Features the user picked that belong to this module at all
            var modulePool   = getFeaturesForModuleAndTypes(mod, chosenTypes);
            var modulePicked = picked.filter(function(f) { return modulePool.indexOf(f) !== -1; });

            getCategoriesForModule(mod).forEach(function(category) {
                var node = CATEGORY_MODULE_INDEX[category + '||' + mod];
                if (!node) return;

                var types = chosenTypes.filter(function(t) { return node[t]; });
                if (chosenTypes.length && !types.length) return;

                var pool = [];
                (types.length ? types : Object.keys(node)).forEach(function(t) {
                    node[t].forEach(function(f) { if (pool.indexOf(f) === -1) pool.push(f); });
                });
                var features = modulePicked.filter(function(f) { return pool.indexOf(f) !== -1; });
                if (modulePicked.length && !features.length) return;

                filters.push({
                    category:     mod, // to match the card data
                    module:       category, // to match the card data
                    feature_type: types,
                    features:     features
                });
            });
        });

        return filters;
    }

    function fireSearch() {
        var filters = buildFilters();
        var jsonStr = JSON.stringify(filters, null, 2);

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

        if (searchStageTimer) clearInterval(searchStageTimer);
        searchStageTimer = setInterval(function() {
            stageIdx = (stageIdx + 1) % stages.length;
            label.textContent = stages[stageIdx];
        }, 900);

        if (typeof window.triggerUdderSearch === 'function') {
            window.triggerUdderSearch(jsonStr);
        }
    }

    /* ── Reset + kick off ── */
    function resetAndStart() {
        resetState();
        if (searchStageTimer) { clearInterval(searchStageTimer); searchStageTimer = null; }
        chatBody.innerHTML = '';
        clearQR();
        var rb = document.getElementById('udderRestartBtn');
        if (rb) rb.style.display = 'none';
        kickOff();
    }

    var restartBtn = document.getElementById('udderRestartBtn');
    if (restartBtn) restartBtn.addEventListener('click', resetAndStart);

    function kickOff() {
        showTyping();
        setTimeout(function() {
            removeTyping();
            addMsg(nextQuestionText(flow[0]), 'bot').then(function() {
                renderStep(flow[0]);
                var rb = document.getElementById('udderRestartBtn');
                if (rb) rb.style.display = 'inline-flex';
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
            setTimeout(resetAndStart, 50);
        }
        if (!isOpen) _udderWasOpen = false;
    }

    if (_modalEl) {
        new MutationObserver(handleModalStateChange)
            .observe(_modalEl, { attributes: true, attributeFilter: ['class', 'style'] });
        handleModalStateChange();
    }
});