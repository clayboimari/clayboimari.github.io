(function () {
  'use strict';

  /* ----------------------------------------------------------
     Settings you can tweak
     ---------------------------------------------------------- */
  const CONFIG = {
    continuousScrollMs: 5000,  // keep scrolling this long and the wheel pops up (greyed)
    scrollGapMs: 600,          // a pause longer than this counts as "stopped scrolling"
    ghostHideDelayMs: 1500,    // how long after scrolling stops the greyed wheel disappears
    readLinePct: 0.3,          // the post crossing this height on screen is the "current" one
    storageKey: 'site.highlights.v1'
  };

  const $ = (sel) => document.querySelector(sel);
  const pad = (n) => (n < 10 ? '0' + n : String(n));
  const parseISO = (s) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  };
  const prefersReduced = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
    : false;

  /* ----------------------------------------------------------
     Header: live date and time (uses the visitor's local time)
     ---------------------------------------------------------- */
  const nowDate = $('#nowDate');
  const nowTime = $('#nowTime');
  const clockDateFmt = new Intl.DateTimeFormat(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
  const clockTimeFmt = new Intl.DateTimeFormat(undefined, {
    hour: 'numeric', minute: '2-digit', second: '2-digit'
  });

  function tickClock() {
    const now = new Date();
    nowDate.textContent = clockDateFmt.format(now);
    nowDate.dateTime = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate());
    nowTime.textContent = clockTimeFmt.format(now);
    nowTime.dateTime = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
    setTimeout(tickClock, 1000 - (Date.now() % 1000));
  }
  tickClock();

  /* ----------------------------------------------------------
     Banner: placeholder links should not jump the page
     ---------------------------------------------------------- */
  document.querySelectorAll('.banner-cell').forEach((a) => {
    a.addEventListener('click', (e) => e.preventDefault());
  });

  /* ----------------------------------------------------------
     Blog feed
     ---------------------------------------------------------- */
  const posts = Array.isArray(window.POSTS) ? window.POSTS.slice() : [];
  const feed = $('#feed');
  const postDateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  const wheelDateFmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' });

  posts.forEach((p, i) => {
    const article = document.createElement('article');
    article.className = 'post';
    article.id = 'post-' + i;

    const title = document.createElement('h2');
    title.className = 'post-title';
    title.textContent = p.title;

    const date = document.createElement('time');
    date.className = 'post-date';
    date.dateTime = p.date;
    date.textContent = postDateFmt.format(parseISO(p.date));

    const body = document.createElement('div');
    body.className = 'post-body';
    (p.body || []).forEach((text) => {
      const para = document.createElement('p');
      para.textContent = text;
      body.appendChild(para);
    });

    article.append(title, date, body);
    feed.appendChild(article);
  });

  const articles = Array.from(feed.querySelectorAll('.post'));

  /* ----------------------------------------------------------
     Date wheel
     ---------------------------------------------------------- */
  const zone = $('#wheelZone');
  const track = $('#wheelTrack');
  const CENTER_SLOT = 3; // the wheel shows 7 slots; the selected date sits in the middle one

  const wheelItems = posts.map((p, i) => {
    const li = document.createElement('li');
    li.className = 'wheel-item';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'wheel-btn';
    btn.textContent = wheelDateFmt.format(parseISO(p.date));
    btn.setAttribute('aria-label', 'Go to post from ' + postDateFmt.format(parseISO(p.date)));
    btn.addEventListener('click', () => goToPost(i));

    li.appendChild(btn);
    track.appendChild(li);
    return { li, btn };
  });

  let itemHeight = 36;
  let activeIndex = -1;

  function measureItem() {
    if (wheelItems.length && wheelItems[0].li.offsetHeight) {
      itemHeight = wheelItems[0].li.offsetHeight;
    }
  }

  function setActive(index) {
    if (index === activeIndex || !wheelItems.length) return;
    activeIndex = index;
    wheelItems.forEach((item, i) => {
      item.li.style.setProperty('--d', String(Math.abs(i - index)));
      if (i === index) item.btn.setAttribute('aria-current', 'true');
      else item.btn.removeAttribute('aria-current');
    });
    track.style.transform = 'translateY(' + (CENTER_SLOT - index) * itemHeight + 'px)';
  }

  function goToPost(index) {
    const el = articles[index];
    if (el) el.scrollIntoView({ behavior: prefersReduced ? 'auto' : 'smooth', block: 'start' });
  }

  function updateActiveFromScroll() {
    if (!articles.length) return;
    const readLine = window.innerHeight * CONFIG.readLinePct;
    let index = 0;
    for (let i = 0; i < articles.length; i++) {
      if (articles[i].getBoundingClientRect().top <= readLine) index = i;
      else break;
    }
    const atBottom = window.scrollY > 0 &&
      window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2;
    if (atBottom) index = articles.length - 1;
    setActive(index);
  }

  /* ----------------------------------------------------------
     Scroll handling: keep the wheel in sync, and show it
     (greyed) after more than 5 seconds of continuous scrolling
     ---------------------------------------------------------- */
  let runStart = 0;
  let lastScroll = 0;
  let idleTimer = null;
  let framePending = false;

  function trackContinuousScroll() {
    const now = performance.now();
    if (now - lastScroll > CONFIG.scrollGapMs) runStart = now; // new run of scrolling
    lastScroll = now;

    if (now - runStart >= CONFIG.continuousScrollMs) zone.classList.add('is-ghost');

    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      zone.classList.remove('is-ghost');
      runStart = 0;
    }, CONFIG.ghostHideDelayMs);
  }

  window.addEventListener('scroll', () => {
    trackContinuousScroll();
    if (!framePending) {
      framePending = true;
      requestAnimationFrame(() => {
        framePending = false;
        updateActiveFromScroll();
      });
    }
  }, { passive: true });

  function refreshWheel() {
    measureItem();
    activeIndex = -1;
    updateActiveFromScroll();
  }
  window.addEventListener('resize', refreshWheel);
  window.addEventListener('load', refreshWheel);
  refreshWheel();

  /* ----------------------------------------------------------
     Highlights box: pin, rename, add, remove
     ---------------------------------------------------------- */
  const PIN_SVG =
    '<svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">' +
    '<path d="M5.5 1.5h5M6.5 1.5v4.2L4 9h8L9.5 5.7V1.5M8 9v5.5"/></svg>';

  const defaults = [
    { id: 'h1', text: 'Highlight placeholder one', pinned: true },
    { id: 'h2', text: 'Highlight placeholder two', pinned: true },
    { id: 'h3', text: 'Highlight placeholder three', pinned: false },
    { id: 'h4', text: 'Highlight placeholder four', pinned: false },
    { id: 'h5', text: 'Highlight placeholder five', pinned: false }
  ];

  function loadHighlights() {
    try {
      const raw = localStorage.getItem(CONFIG.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((x) => x && typeof x.text === 'string')
            .map((x) => ({ id: String(x.id), text: x.text, pinned: !!x.pinned }));
        }
      }
    } catch (e) { /* storage unavailable: fall back to defaults */ }
    return defaults.map((x) => ({ ...x }));
  }

  function saveHighlights() {
    try { localStorage.setItem(CONFIG.storageKey, JSON.stringify(highlights)); }
    catch (e) { /* storage unavailable: changes last until reload */ }
  }

  let highlights = loadHighlights();
  let editing = false;

  const list = $('#highlightList');
  const editBtn = $('#editToggle');
  const addBtn = $('#addItem');
  const note = $('#editNote');

  const inOrder = () => [
    ...highlights.filter((h) => h.pinned),
    ...highlights.filter((h) => !h.pinned)
  ];

  function focusById(selector, id) {
    const el = Array.from(list.querySelectorAll(selector)).find((n) => n.dataset.id === id);
    if (el) el.focus();
    return el;
  }

  function renderHighlights() {
    list.textContent = '';
    const rows = inOrder();

    if (!rows.length) {
      const empty = document.createElement('li');
      empty.className = 'highlight-empty';
      empty.textContent = 'No highlights yet. Select Edit, then Add item.';
      list.appendChild(empty);
      return;
    }

    rows.forEach((item) => {
      const li = document.createElement('li');
      li.className = 'highlight' + (item.pinned ? ' is-pinned' : '');

      const pin = document.createElement('button');
      pin.type = 'button';
      pin.className = 'pin-btn';
      pin.dataset.id = item.id;
      pin.setAttribute('aria-pressed', String(item.pinned));
      pin.setAttribute('aria-label', 'Pin ' + (item.text || 'highlight'));
      pin.innerHTML = PIN_SVG;
      li.appendChild(pin);

      if (editing) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'highlight-input';
        input.dataset.id = item.id;
        input.value = item.text;
        input.setAttribute('aria-label', 'Highlight text');
        li.appendChild(input);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'link-btn remove-btn';
        remove.dataset.id = item.id;
        remove.textContent = 'Remove';
        li.appendChild(remove);
      } else {
        const text = document.createElement('span');
        text.className = 'highlight-text';
        text.textContent = item.text;
        li.appendChild(text);
      }

      list.appendChild(li);
    });
  }

  list.addEventListener('click', (e) => {
    const pin = e.target.closest('.pin-btn');
    if (pin) {
      const item = highlights.find((h) => h.id === pin.dataset.id);
      if (item) {
        item.pinned = !item.pinned;
        saveHighlights();
        renderHighlights();
        focusById('.pin-btn', item.id);
      }
      return;
    }

    const remove = e.target.closest('.remove-btn');
    if (remove) {
      highlights = highlights.filter((h) => h.id !== remove.dataset.id);
      saveHighlights();
      renderHighlights();
      (list.querySelector('.remove-btn') || editBtn).focus();
    }
  });

  list.addEventListener('input', (e) => {
    const input = e.target.closest('.highlight-input');
    if (!input) return;
    const item = highlights.find((h) => h.id === input.dataset.id);
    if (item) {
      item.text = input.value;
      saveHighlights();
    }
  });

  editBtn.addEventListener('click', () => {
    editing = !editing;
    editBtn.textContent = editing ? 'Done' : 'Edit';
    editBtn.setAttribute('aria-pressed', String(editing));
    addBtn.hidden = !editing;
    note.hidden = !editing;
    renderHighlights();
  });

  addBtn.addEventListener('click', () => {
    const id = 'h' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    highlights.push({ id, text: 'New highlight', pinned: false });
    saveHighlights();
    renderHighlights();
    const input = focusById('.highlight-input', id);
    if (input) input.select();
  });

  renderHighlights();
})();
