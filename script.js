(function () {
  'use strict';

  /* ==========================================================
     Helpers
     ========================================================== */
  const $ = (sel, root = document) => root.querySelector(sel);

  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  // Posts come from posts.js (globalThis.POSTS)
  const POSTS = Array.isArray(globalThis.POSTS) ? globalThis.POSTS : [];

  const PLAY_SVG  = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>';
  const PAUSE_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>';

  /* ==========================================================
     Toast
     ========================================================== */
  let toastEl = null;
  let toastTimer = null;

  function toast(message) {
    if (!toastEl) {
      toastEl = el('div', 'toast');
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = message;
    requestAnimationFrame(() => toastEl.classList.add('show'));
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2200);
  }

  /* ==========================================================
     Clock (header)
     ========================================================== */
  const clockDate = $('#clockDate');
  const clockTime = $('#clockTime');

  function tickClock() {
    const now = new Date();
    clockDate.textContent = now.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
    clockTime.textContent = now.toLocaleTimeString('en-US', {
      hour: '2-digit', minute: '2-digit'
    });
  }

  /* ==========================================================
     Filters
     ========================================================== */
  const filterList = $('#filterList');
  const active = new Set();
  const filterDefs = [
    { key: 'photo', label: 'photo' },
    { key: 'video', label: 'video' },
    { key: 'audio', label: 'audio' },
    { key: 'text',  label: 'notes' }
  ];

  function renderFilters() {
    filterList.textContent = '';
    filterDefs.forEach((f) => {
      const li = document.createElement('li');
      const btn = el('button', 'filter' + (active.has(f.key) ? ' is-active' : ''), f.label);
      btn.type = 'button';
      btn.addEventListener('click', () => {
        if (active.has(f.key)) active.delete(f.key);
        else active.add(f.key);
        renderFilters();
        render();
      });
      li.appendChild(btn);
      filterList.appendChild(li);
    });
  }

  /* ==========================================================
     Audio playback (one track at a time)
     ========================================================== */
  const audioCache = new Map();
  let current = null; // { audio, btn }

  function setIcon(btn, playing) {
    btn.innerHTML = playing ? PAUSE_SVG : PLAY_SVG;
    btn.setAttribute('aria-label', playing ? 'Pause' : 'Play');
  }

  function pauseCurrent() {
    if (!current) return;
    current.audio.pause();
    setIcon(current.btn, false);
    current = null;
  }

  function toggleAudio(post, btn) {
    if (current && current.btn === btn) {
      pauseCurrent();
      return;
    }
    pauseCurrent();

    let audio = audioCache.get(post.id);
    if (!audio) {
      audio = new Audio(new URL(post.media, document.baseURI).href);
      audio.addEventListener('ended', () => {
        audio.currentTime = 0;
        if (current && current.audio === audio) pauseCurrent();
      });
      audio.addEventListener('error', () => {
        if (!current || current.audio !== audio) return;
        const mediaError = audio.error;
        pauseCurrent();
        toast(mediaError
          ? `couldn't load that audio file (media error ${mediaError.code})`
          : "couldn't load that audio file");
      });
      audioCache.set(post.id, audio);
    }

    current = { audio, btn };
    setIcon(btn, true);
    audio.play().catch((error) => {
      if (!current || current.audio !== audio) return;
      pauseCurrent();
      toast(`audio playback failed: ${error.message}`);
    });
  }

  /* ==========================================================
     Post elements
     ========================================================== */
  function formatDate(iso) {
    // Parse manually so 'YYYY-MM-DD' doesn't shift a day with timezones
    const [y, m, d] = String(iso).split('-').map(Number);
    if (!y || !m || !d) return '';
    return new Date(y, m - 1, d).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  }

  function createMedia(post) {
    if (post.type === 'photo') {
      const fig = el('figure', 'media media-photo');
      const img = new Image();
      img.src = post.media;
      img.alt = post.caption || '';
      img.loading = 'lazy';
      img.style.cssText = 'display:block;width:100%;height:100%;object-fit:cover';
      // If the file isn't there yet, fall back to the grey placeholder frame
      img.addEventListener('error', () => img.remove());
      fig.appendChild(img);
      return fig;
    }

    if (post.type === 'video') {
      const box = el('figure', 'media media-video');
      const glyph = el('button', 'play-glyph');
      glyph.type = 'button';
      glyph.setAttribute('aria-label', 'Play video');
      glyph.style.cssText = 'background:none;padding:0;cursor:pointer';
      glyph.innerHTML = PLAY_SVG;
      glyph.addEventListener('click', () => {
        pauseCurrent();
        const video = document.createElement('video');
        video.src = post.media;
        video.controls = true;
        video.autoplay = true;
        video.playsInline = true;
        video.style.cssText = 'position:absolute;inset:0;width:100%;height:100%';
        glyph.remove();
        box.appendChild(video);
      });
      box.appendChild(glyph);
      return box;
    }

    if (post.type === 'audio') {
      const box = el('div', 'media media-audio');
      const btn = el('button', 'play-btn');
      btn.type = 'button';
      setIcon(btn, false);
      btn.addEventListener('click', () => toggleAudio(post, btn));

      const info = el('div', 'audio-info');
      info.appendChild(el('p', 'audio-title', post.title || 'Untitled'));
      info.appendChild(el('div', 'audio-wave'));

      box.appendChild(btn);
      box.appendChild(info);
      box.appendChild(el('span', 'audio-dur', post.duration || ''));
      return box;
    }

    // text
    return el('div', 'media text-body', post.body || '');
  }

  function createMeta(post) {
    const meta = el('div', 'post-meta');
    meta.appendChild(el('span', 'badge', post.type === 'text' ? 'note' : post.type));

    const when = [formatDate(post.date), post.time].filter(Boolean).join(' · ');
    meta.appendChild(el('span', '', when));

    if (post.type === 'video' && post.duration) {
      meta.appendChild(el('span', '', post.duration));
    }
    return meta;
  }

  function createShareButton(post) {
    const btn = el('button', 'share-btn', 'share');
    btn.type = 'button';
    btn.addEventListener('click', async () => {
      const url = location.href.split('#')[0] + '#' + post.id;
      if (navigator.share) {
        try {
          await navigator.share({ title: document.title, url });
          return;
        } catch (err) {
          if (err && err.name === 'AbortError') return;
        }
      }
      try {
        await navigator.clipboard.writeText(url);
        toast('link copied');
      } catch (err) {
        toast(url);
      }
    });
    return btn;
  }

  function createPostElement(post) {
    const article = el('article', 'post');
    article.id = post.id;
    article.style.scrollMarginTop = '120px'; // clear the sticky header on deep links

    article.appendChild(createMedia(post));
    article.appendChild(createMeta(post));
    if (post.caption) article.appendChild(el('p', 'post-caption', post.caption));
    article.appendChild(createShareButton(post));
    return article;
  }

  /* ==========================================================
     Feed
     ========================================================== */
  const feed = $('#feed');

  function render() {
    pauseCurrent();
    feed.textContent = '';

    const list = active.size === 0 ? POSTS : POSTS.filter((p) => active.has(p.type));

    if (!list.length) {
      feed.appendChild(el('p', 'feed-empty', 'No posts available.'));
      return;
    }
    list.forEach((post) => feed.appendChild(createPostElement(post)));
  }

  /* ==========================================================
     Subscribe modal
     ========================================================== */
  const modal = $('#subscribeModal');
  const subscribeLink = $('#subscribeLink');
  const subscribeForm = $('#subscribeForm');

  // TODO: paste a form endpoint here (Formspree, Buttondown, etc.).
  // Until then the form shows a "not connected" message and stores nothing.
  const SUBSCRIBE_ENDPOINT = '';

  function openSubscribe() {
    modal.hidden = false;
    const input = $('input', modal);
    if (input) input.focus();
  }

  function closeSubscribe() {
    modal.hidden = true;
    subscribeLink.focus();
  }

  subscribeLink.addEventListener('click', openSubscribe);
  $('#subscribeClose').addEventListener('click', closeSubscribe);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeSubscribe();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal.hidden) closeSubscribe();
  });

  subscribeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!SUBSCRIBE_ENDPOINT) {
      toast("subscribe isn't connected yet");
      return;
    }
    try {
      const res = await fetch(SUBSCRIBE_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: new FormData(subscribeForm).get('email') })
      });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      subscribeForm.reset();
      closeSubscribe();
      toast("you're on the list");
    } catch (err) {
      toast('something went wrong, try again');
    }
  });

  /* ==========================================================
     Init
     ========================================================== */
  renderFilters();
  render();

  tickClock();
  setInterval(tickClock, 1000);

  // Jump to a shared post (index.html#p-03) now that the feed exists
  if (location.hash) {
    const target = document.getElementById(location.hash.slice(1));
    if (target) target.scrollIntoView();
  }
})();
