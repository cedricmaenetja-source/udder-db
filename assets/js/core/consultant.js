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

  const fullName = `${result.data.first_name} ${result.data.last_name || ''}`;
  $('#sb-uname').text(fullName);
  $('#sb-avatar').text(App.initials(fullName));

  var loader = document.getElementById('pageLoader');
  if (loader) {
    loader.classList.add('hide');
    setTimeout(function () { loader.remove(); }, 300);
  }
});

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