import { PAGES } from '../../utils/constants.js';

function init() {
    const lrModal = document.getElementById('loginRequiredModal');
    if (!lrModal) return;

    function closeLr() {
        lrModal.classList.remove('visible');
    }

    function requireLogin(opts = {}) {
        const title = opts.title || 'Sign in to continue';
        const desc  = opts.desc  || 'Create a free account or sign in to access this feature.';

        document.getElementById('lrTitle').textContent = title;
        document.getElementById('lrDesc').textContent  = desc;

        const returnUrl = encodeURIComponent(window.location.href);
        document.getElementById('lrSignupBtn').href = `${PAGES.signup}?return=${returnUrl}`;
        document.getElementById('lrSigninBtn').href = `${PAGES.login}?return=${returnUrl}`;

        lrModal.classList.add('visible');
    }

    document.getElementById('lrDismiss').addEventListener('click', closeLr);
    lrModal.addEventListener('click', e => { if (e.target === lrModal) closeLr(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLr(); });

    return requireLogin;
}

export const requireLogin = init();