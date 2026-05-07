import { PAGES } from '../utils/constants.js';
import { isLoggedIn } from '../core/auth/session.js';
import { requireLogin } from '../core/auth/loginRequired.js';
import { lockBtn } from '../app.js';

$(function () {

  /* ═══════════════════════════════════════════════════
     API
  ═══════════════════════════════════════════════════ */

  async function callChat(messages) {
    const res = await fetch('/api/claude-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    // Returns { reply: string, vendors: [{ id, name, logo, categories, short_description }] }
    return res.json();
  }

  /* ═══════════════════════════════════════════════════
     STATE
  ═══════════════════════════════════════════════════ */

  const history = [];

  /* ═══════════════════════════════════════════════════
     DOM HELPERS
  ═══════════════════════════════════════════════════ */

  const botAvatarSVG = `
    <div class="msg-avatar">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="white" opacity="0.9">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    </div>`;

  function getTime() {
    return new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Plain text message bubble
  function appendMessage(text, role) {
    const $body = $('#chatBody');
    const $msg  = role === 'bot'
      ? $(`<div class="msg bot">
              ${botAvatarSVG}
              <div>
                <div class="msg-bubble">${text}</div>
                <div class="msg-time">${getTime()}</div>
              </div>
            </div>`)
      : $(`<div class="msg user">
              <div>
                <div class="msg-bubble">${text}</div>
                <div class="msg-time" style="text-align:right;">${getTime()}</div>
              </div>
            </div>`);

    $body.append($msg).scrollTop($body[0].scrollHeight);
  }

  // Vendor cards rendered below the bot message
  function appendVendorCards(vendors) {
    if (!vendors || vendors.length === 0) return;

    const $body = $('#chatBody');

    const cards = vendors.map(v => {
      const logoHtml = v.logo
        ? `<img src="${v.logo}" alt="${v.name}" class="vc-logo" />`
        : `<div class="vc-logo-placeholder">${v.name.charAt(0)}</div>`;

      const cats = v.categories
        ? v.categories.split(',').slice(0, 3).map(c =>
            `<span class="vc-tag">${c.trim()}</span>`
          ).join('')
        : '';

      const desc = v.short_description
        ? `<p class="vc-desc">${v.short_description}</p>`
        : '';

      return `
        <a href="${PAGES.platform}?vid=${v.id}" class="vendor-card" target="_blank">
          <div class="vc-header">
            ${logoHtml}
            <div class="vc-name">${v.name}</div>
          </div>
          ${desc}
          <div class="vc-tags">${cats}</div>
          <div class="vc-cta">View profile →</div>
        </a>`;
    }).join('');

    const $grid = $(`
      <div class="msg bot vendor-cards-msg">
        ${botAvatarSVG}
        <div class="vendor-cards-grid">${cards}</div>
      </div>`);

    $body.append($grid).scrollTop($body[0].scrollHeight);
  }

  function showTyping() {
    const $t = $(`<div class="msg bot typing-indicator" id="typingIndicator">
      ${botAvatarSVG}
      <div class="typing-dots"><span></span><span></span><span></span></div>
    </div>`);
    $('#chatBody').append($t).scrollTop($('#chatBody')[0].scrollHeight);
    return $t;
  }

  /* ═══════════════════════════════════════════════════
     SEND
  ═══════════════════════════════════════════════════ */

  async function sendMessage(text) {
    text = $.trim(text);
    if (!text) return;

    $('#chatChips').hide();
    $('.chat-fab-dot').remove();
    $('#chatInput').val('').prop('disabled', true);
    $('#chatSend').prop('disabled', true);

    appendMessage(text, 'user');
    history.push({ role: 'user', content: text });

    const $typing = showTyping();

    try {
      const data = await callChat(history);
      $typing.remove();

      // Render the text reply
      appendMessage(data.reply, 'bot');
      history.push({ role: 'assistant', content: data.reply });

      // Render vendor cards if any were returned
      appendVendorCards(data.vendors);

    } catch (err) {
      $typing.remove();
      appendMessage('Sorry, I had trouble connecting. Please try again in a moment.', 'bot');
      console.error('[Udder Chat]', err);
    } finally {
      $('#chatInput').prop('disabled', false).focus();
      $('#chatSend').prop('disabled', false);
    }
  }

  /* ═══════════════════════════════════════════════════
     OPEN / CLOSE
  ═══════════════════════════════════════════════════ */

  async function openChat() {
    const reset = lockBtn($('#chatFab'));
    if (!reset) return;

    const loggedIn = await isLoggedIn();
    if (!loggedIn){
      requireLogin({
          title: 'Sign in to use AI assistant',
          desc:  'Create an account or login for AI Assistant access.'
      });
      reset();
      return;
    }

    $('#gridBtn').css('z-index', 'unset');
    $('#chatOverlay').css('display', 'flex');
    requestAnimationFrame(() => $('#chatOverlay').addClass('open'));
    $('#chatInput').focus();
  }

  function closeChat() {
    $('#chatOverlay').removeClass('open');
    setTimeout(() => {
        $('#chatOverlay').css('display', 'none');
        $('#gridBtn').css('z-index', '1000');
    }, 300);
  }

  /* ═══════════════════════════════════════════════════
     EVENTS
  ═══════════════════════════════════════════════════ */

  $('#chatFab').on('click', openChat);
  $('#chatClose').on('click', closeChat);
  $('#chatBackdrop').on('click', closeChat);

  $('#chatSend').on('click', () => sendMessage($('#chatInput').val()));

  $('#chatInput').on('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage($(this).val());
    }
  });

  $(document).on('click', '.chip', function () {
    sendMessage($(this).data('msg'));
  });

});