(() => {
  'use strict';

  const root = document.documentElement;
  const is3d = root.classList.contains('is-3d');
  const K = 1; // unità Z per pixel di scroll
  const sections = [...document.querySelectorAll('.ch')];
  const chapters = sections.map((el) => ({
    id: el.id,
    title: el.querySelector('h1, h2').textContent.replace(/\s+/g, ' ').trim(),
    code: el.dataset.code,
    label: el.dataset.label,
    z: Number(el.dataset.z),
    el,
  }));
  const navLinks = [...document.querySelectorAll('.index a, .brand')];
  const byId = (id) => chapters.find((c) => c.id === id);
  const feedback = document.querySelector('#cart-feedback');
  const reducedToggle = document.querySelector('.reduced-toggle');
  const announce = (message) => { if (feedback) feedback.textContent = message; };
  const setReduced = (reduced) => {
    root.classList.toggle('calmo', reduced);
    reducedToggle?.setAttribute('aria-pressed', String(reduced));
    if (reducedToggle) reducedToggle.textContent = reduced ? 'Riattiva effetti 3D' : 'Riduci effetti 3D';
    try { localStorage.setItem('messicano-reduced-3d', String(reduced)); } catch {}
  };
  if (reducedToggle) {
    reducedToggle.addEventListener('click', () => setReduced(!root.classList.contains('calmo')));
    reducedToggle.setAttribute('aria-pressed', String(root.classList.contains('calmo')));
    reducedToggle.textContent = root.classList.contains('calmo') ? 'Riattiva effetti 3D' : 'Riduci effetti 3D';
  }

  /* ---------- Carrello: demo locale, pronto per essere sostituito da Shopify ---------- */
  const CART_KEY = 'messicano-cart-v1';
  const cart = (() => {
    const panel = document.querySelector('#carrello');
    if (!panel) return null;
    const body = panel.querySelector('.carrello-body');
    const total = panel.querySelector('.carrello-totale strong');
    const checkout = panel.querySelector('.carrello-checkout');
    const triggers = [...document.querySelectorAll('.cart-trigger')];
    const counts = [...document.querySelectorAll('.cart-count')];
    const backdrop = document.querySelector('.carrello-backdrop');
    const couponInput = panel.querySelector('.coupon-input');
    const couponStatus = panel.querySelector('.coupon-status');
    const shippingStatus = panel.querySelector('.spedizione-status');
    let coupon = '';
    let catalog = { shipping: { italy: 3.99, freeFrom: 100 }, discounts: { MESSICANO10: 10 } };
    fetch('catalog.json').then((r) => r.ok ? r.json() : catalog).then((data) => { catalog = { ...catalog, ...data }; render(); }).catch(() => {});
    let items = [];
    try { items = JSON.parse(localStorage.getItem(CART_KEY) || '[]'); } catch { items = []; }
    const euro = (n) => `${n.toFixed(2).replace('.', ',')} €`;
    const save = () => { localStorage.setItem(CART_KEY, JSON.stringify(items)); render(); };
    const open = () => {
      panel.setAttribute('aria-hidden', 'false');
      document.body.classList.add('carrello-aperto');
      triggers.forEach((b) => b.setAttribute('aria-expanded', 'true'));
      panel.querySelector('.carrello-chiudi').focus();
    };
    const close = () => {
      panel.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('carrello-aperto');
      triggers.forEach((b) => b.setAttribute('aria-expanded', 'false'));
    };
    const add = (item) => {
      const found = items.find((i) => i.id === item.id && i.variant === item.variant);
      if (found) found.qty += item.qty;
      else items.push(item);
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: 'add_to_cart', ecommerce: { items: [{ item_name: item.name, price: item.price, quantity: item.qty }] } });
      save(); announce(`${item.name} aggiunto al carrello. Quantità ${items.reduce((sum, i) => sum + i.qty, 0)}.`); open();
    };
    const render = () => {
      const quantity = items.reduce((sum, i) => sum + i.qty, 0);
      const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);
      const discount = coupon && catalog.discounts?.[coupon] ? subtotal * catalog.discounts[coupon] / 100 : 0;
      const shipping = subtotal && subtotal - discount < (catalog.shipping?.freeFrom || 100) ? (catalog.shipping?.italy || 3.99) : 0;
      const amount = subtotal - discount + shipping;
      counts.forEach((el) => { el.textContent = quantity; });
      total.textContent = euro(amount);
      checkout.disabled = !items.length;
      couponStatus.textContent = coupon ? `Sconto ${coupon}: −${euro(discount)}` : '';
      shippingStatus.textContent = items.length ? shipping ? `Spedizione Italia: ${euro(shipping)} · gratis oltre ${catalog.shipping.freeFrom} €` : 'Spedizione Italia gratuita' : '';
      body.innerHTML = items.length ? items.map((item, index) => `
        <article class="carrello-item">
          <img src="${item.image}" alt="">
          <div><strong>${item.name}</strong><span>${item.variant} · ${euro(item.price)}</span>
            <div class="carrello-qty"><button type="button" data-cart-action="decrease" data-index="${index}" aria-label="Riduci ${item.name}">−</button><b>${item.qty}</b><button type="button" data-cart-action="increase" data-index="${index}" aria-label="Aumenta ${item.name}">+</button><button type="button" data-cart-action="remove" data-index="${index}">Rimuovi</button></div>
          </div>
        </article>`).join('') : '<p class="carrello-vuoto">Il carrello è vuoto.<br><span>Scorri e scegli il tuo prossimo pezzo.</span></p>';
    };
    panel.addEventListener('click', (event) => {
      const button = event.target.closest('[data-cart-action]');
      if (!button) return;
      const item = items[Number(button.dataset.index)];
      if (!item) return;
      if (button.dataset.cartAction === 'remove') items.splice(Number(button.dataset.index), 1);
      if (button.dataset.cartAction === 'increase') item.qty += 1;
      if (button.dataset.cartAction === 'decrease') item.qty -= 1;
      if (item.qty <= 0) items = items.filter((i) => i !== item);
      save();
    });
    triggers.forEach((button) => button.addEventListener('click', () => panel.getAttribute('aria-hidden') === 'true' ? open() : close()));
    panel.querySelector('.carrello-chiudi').addEventListener('click', close);
    backdrop.addEventListener('click', close);
    panel.querySelector('.coupon-apply').addEventListener('click', () => {
      const value = couponInput.value.trim().toUpperCase();
      if (!value) { coupon = ''; couponStatus.textContent = ''; render(); return; }
      if (!catalog.discounts?.[value]) { couponStatus.textContent = 'Codice non valido'; return; }
      coupon = value; render();
    });
    checkout.addEventListener('click', () => window.alert('Checkout Shopify non ancora collegato: questa è una bozza del carrello.'));
    render();
    return { add };
  })();

  const prezzoDaTesto = (text) => {
    const matches = [...text.replace(',', '.').matchAll(/(\d+(?:\.\d{1,2})?)/g)];
    return matches.length ? Number(matches[matches.length - 1][1]) : 0;
  };
  document.querySelectorAll('.photo:not(.feed):not(.tachimetro)').forEach((photo) => {
    const button = photo.querySelector('.zoom');
    const label = photo.querySelector('.cartellino b');
    const price = photo.querySelector('.cartellino .eur');
    if (!button || !label || !price || !cart) return;
    const addButton = document.createElement('button');
    addButton.className = 'add-cart';
    addButton.type = 'button';
    addButton.textContent = 'Aggiungi';
    const section = photo.closest('.ch')?.id || 'shop';
    const needsSize = ['criminal', 'fuego'].includes(section);
    let variantSelect;
    if (needsSize) {
      variantSelect = document.createElement('select');
      variantSelect.className = 'variant-select';
      variantSelect.setAttribute('aria-label', `Scegli la taglia per ${label.textContent.trim()}`);
      ['S', 'M', 'L', 'XL'].forEach((size) => variantSelect.add(new Option(`Taglia ${size}`, size)));
      photo.querySelector('.cartellino').append(variantSelect);
    }
    addButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const name = label.textContent.trim();
      const variant = variantSelect ? `Taglia ${variantSelect.value}` : 'Unica';
      cart.add({ id: button.dataset.url, name, price: prezzoDaTesto(price.textContent), image: button.querySelector('img').src, variant, qty: 1 });
    });
    photo.querySelector('.cartellino').append(addButton);
    const detailsButton = document.createElement('button');
    detailsButton.className = 'product-details';
    detailsButton.type = 'button';
    detailsButton.textContent = 'Dettagli';
    detailsButton.addEventListener('click', (event) => {
      event.stopPropagation();
      const dialog = document.querySelector('#prodotto-dialog');
      dialog.querySelector('.prodotto-img').src = button.querySelector('img').currentSrc || button.querySelector('img').src;
      dialog.querySelector('.prodotto-img').alt = button.querySelector('img').alt;
      dialog.querySelector('#prodotto-titolo').textContent = label.textContent.trim();
      dialog.querySelector('.prodotto-prezzo').textContent = price.textContent.trim();
      dialog.querySelector('.prodotto-aggiungi').onclick = () => { addButton.click(); dialog.close(); };
      dialog.showModal();
    });
    photo.querySelector('.cartellino').append(detailsButton);
  });

  const productDialog = document.querySelector('#prodotto-dialog');
  productDialog?.querySelector('.prodotto-chiudi').addEventListener('click', () => productDialog.close());

  /* ---------- Ricerca e filtri: nasconde solo i piani del catalogo ---------- */
  const search = document.querySelector('#shop-search');
  const filter = document.querySelector('#shop-filter');
  const productCards = [...document.querySelectorAll('.photo:not(.feed):not(.tachimetro)')];
  const applyFilter = () => {
    const query = (search?.value || '').trim().toLowerCase();
    const category = filter?.value || 'all';
    productCards.forEach((card) => {
      const text = card.textContent.toLowerCase();
      const section = card.closest('.ch')?.id || '';
      const isClothing = ['criminal', 'fuego'].includes(section);
      const matchesCategory = category === 'all' || (category === 'abbigliamento' ? isClothing : !isClothing);
      card.classList.toggle('catalogo-nascosto', !matchesCategory || !text.includes(query));
    });
  };
  search?.addEventListener('input', applyFilter);
  filter?.addEventListener('change', applyFilter);

  let goTo;

  /* ---------- Foto in primo piano (anche nella versione piatta) ---------- */
  const luce = document.querySelector('#luce');
  if (luce) {
    const lImg = luce.querySelector('img');
    const lTesto = luce.querySelector('.luce-testo');
    const lPrezzo = luce.querySelector('.luce-prezzo');
    const lLink = luce.querySelector('.luce-link');
    document.querySelectorAll('.photo .zoom').forEach((b) => b.addEventListener('click', () => {
      const img = b.querySelector('img');
      lImg.src = img.currentSrc || img.src;
      lImg.alt = img.alt;
      const t = b.closest('figure').querySelector('.cartellino');
      lTesto.textContent = t ? t.querySelector('b').textContent : img.alt;
      const prezzo = t && t.querySelector('.eur');
      lPrezzo.innerHTML = prezzo ? prezzo.innerHTML : '';
      lPrezzo.hidden = !prezzo;
      // il bottone porta alla scheda del prodotto sullo shop
      if (b.dataset.url) { lLink.href = b.dataset.url; lLink.hidden = false; }
      else lLink.hidden = true;
      luce.showModal();
    }));
    luce.querySelector('.luce-chiudi').addEventListener('click', () => luce.close());
    if (!('closedBy' in luce)) luce.addEventListener('click', (e) => { if (e.target === luce) luce.close(); });
  }

  if (!is3d) {
    goTo = (id, { instant = false } = {}) => {
      const ch = byId(id);
      if (!ch) return false;
      ch.el.scrollIntoView({ behavior: instant ? 'auto' : 'smooth', block: 'start' });
      return true;
    };
    expose();
    return;
  }

  /* ---------- Profondità ---------- */
  const spacer = document.querySelector('.spacer');
  const skies = [...document.querySelectorAll('.sky')];
  // Rotella: camera morbida. Dito: lo scorrimento del telefono è già fluido, la camera lo segue da vicino.
  const SEGUI = matchMedia('(pointer: coarse)').matches ? 16 : 5.5;
  // colori della barra del browser letti una volta sola (niente getComputedStyle durante lo scroll)
  const coloreTono = Object.fromEntries(skies.map((s) => [s.dataset.tone, getComputedStyle(s).getPropertyValue('--sky-a').trim()]));
  const clock = document.querySelector('.clock');
  const flaps = [...clock.querySelectorAll('.flap')];
  const PERSP = 1000; // distanza dell'osservatore in px, come la vecchia perspective CSS
  const narrowMq = matchMedia('(max-width: 760px), (max-aspect-ratio: 4/5)');
  const velo = document.querySelector('.velo');
  const world = document.querySelector('.world');
  const chiusura = document.querySelector('.chiusura');
  const tachi = document.querySelector('.tachimetro');
  const barra = document.querySelector('.avanzamento i');
  const minimap = document.querySelector('.minimap');
  const minimapTitle = document.querySelector('.minimap-title');
  const minimapNum = document.querySelector('.minimap-num');
  const minimapBar = document.querySelector('.minimap-track i');
  const minimapLinks = document.querySelector('.minimap-links ol');
  const prevButton = document.querySelector('.chapter-prev');
  const nextButton = document.querySelector('.chapter-next');
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  const ingresso = document.querySelector('.ingresso');
  const lastZ = chapters[chapters.length - 1].z;

  if (minimapLinks) {
    minimapLinks.innerHTML = chapters.map((ch, i) => `<li><a href="#${ch.id}" data-chapter="${ch.id}" aria-label="Vai a ${ch.label}"><span>${String(i + 1).padStart(2, '0')}</span><b>${ch.label}</b></a></li>`).join('');
    minimapLinks.querySelectorAll('a').forEach((a) => a.addEventListener('click', (event) => {
      event.preventDefault();
      goTo(a.dataset.chapter);
      history.replaceState(null, '', `#${a.dataset.chapter}`);
    }));
  }

  const planes = [];
  chapters.forEach((ch) => {
    ch.el.querySelectorAll('.plane').forEach((el) => {
      const d = el.dataset;
      const kind = el.classList.contains('deco') ? 'deco' : el.classList.contains('copy') ? 'copy' : 'photo';
      planes.push({
        el, kind,
        z: ch.z + Number(d.dz || 0),
        x: Number(d.x || 0), y: Number(d.y || 0),
        xm: Number(d.xm ?? d.x ?? 0), ym: Number(d.ym ?? d.y ?? 0),
        rot: d.ry ? ` perspective(${PERSP}px) rotateY(${d.ry}deg)` : '',
        far: kind === 'copy' ? 1000 : kind === 'deco' ? 900 : 1500,
        back: kind === 'deco' ? 700 : 320,
        o: -1, live: false,
      });
    });
  });

  let narrow = narrowMq.matches;
  let cam = 0;
  let vx = 0, vy = 0, tvx = 0, tvy = 0; // punto di fuga (vw, vh) e suo obiettivo
  let target = 0;
  let current = -1;
  let raf = 0;
  let last = 0;

  function layout() {
    narrow = narrowMq.matches;
    spacer.style.height = `${lastZ / K + innerHeight}px`;
  }

  function opacityFor(p, d) {
    if (d < 0) return Math.max(0, 1 + d / p.back);
    if (d < 180) return 1;
    return Math.max(0, 1 - (d - 180) / p.far);
  }

  function render() {
    for (const p of planes) {
      const d = p.z - cam;
      const o = opacityFor(p, d);
      if (o === 0 && p.o === 0) continue;
      const dz = Math.min(Math.max(d, -p.back - 80), 4200);
      const x = narrow ? p.xm : p.x;
      const y = narrow ? p.ym : p.y;
      // Prospettiva calcolata a mano (scala + posizione verso il punto di fuga):
      // stesso risultato del 3D CSS, ma funziona uguale su Safari iPhone.
      const s = PERSP / (PERSP + dz);
      const tx = x * s + vx * (1 - s);
      const ty = y * s + vy * (1 - s);
      p.el.style.transform = `translate(-50%,-50%) translate(${tx.toFixed(3)}vw,${ty.toFixed(3)}vh) scale(${s.toFixed(4)})${p.rot}`;
      // Solo proprietà composite ogni fotogramma (transform, opacity). Ordine di profondità
      // e scala per i cartellini si aggiornano solo quando cambiano davvero.
      const zi = 5000 - Math.round(dz / 20) * 20;
      if (p.zi !== zi) { p.zi = zi; p.el.style.zIndex = zi; }
      if (p.kind === 'photo') {
        const s3 = s.toFixed(3);
        if (p.s !== s3) { p.s = s3; p.el.style.setProperty('--s', s3); } // serve ai cartellini su telefono
      }
      p.el.style.opacity = o.toFixed(3);
      p.o = o;
      // le foto restano cliccabili (e mostrano il cartellino) finché sono nella tappa davanti
      const live = p.kind === 'copy' ? o > 0.5 && d > -140 && d < 460
        : p.kind === 'photo' && o > 0.6 && d > -140 && d < 720;
      if (live !== p.live) {
        p.live = live;
        p.el.classList.toggle('is-live', live);
        if (p.kind === 'photo') p.el.classList.toggle('near-camera', live && d < 300);
      }
    }

    // Tachimetro: arrivando a "Spedizioni" l'ago sale da zero al fondo scala
    if (tachi) {
      let u = (cam - (lastZ - 1100)) / 1100;
      u = Math.min(Math.max(u, 0), 1);
      const giro = u * u * (3 - 2 * u);
      if (tachi._g === undefined || Math.abs(tachi._g - giro) > 0.01 || (giro === 1 && tachi._g !== 1)) {
        tachi._g = giro;
        tachi.style.setProperty('--giro', giro.toFixed(3));
      }
    }

    // Barra di avanzamento tra le tappe
    if (barra) {
      const v = Math.min(Math.max(cam / lastZ, 0), 1);
      if (barra._v !== v) { barra._v = v; barra.style.transform = `scaleX(${v.toFixed(4)})`; }
    }
    if (minimapBar) minimapBar.style.transform = `scaleX(${Math.min(Math.max(cam / lastZ, 0), 1).toFixed(4)})`;

    // Fondo: dissolvenza tra la tappa corrente e la successiva a metà tragitto
    let i = 0;
    while (i < chapters.length - 1 && cam >= chapters[i + 1].z) i++;
    const next = chapters[i + 1];
    let t = next ? (cam - chapters[i].z) / (next.z - chapters[i].z) : 0;
    t = Math.min(Math.max((t - 0.2) / 0.6, 0), 1);
    t = t * t * (3 - 2 * t);
    skies.forEach((s, j) => {
      const v = j === i ? 1 : j === i + 1 ? t : 0;
      if (s._o !== v) { s.style.opacity = v; s._o = v; }
    });

    // Polvere che nasconde il cambio di colore a metà del passaggio
    if (velo && velo._t !== t) {
      velo._t = t;
      const v = next ? Math.pow(Math.sin(Math.PI * t), 1.5) * 0.78 : 0;
      velo.style.opacity = v.toFixed(3);
      velo.style.visibility = v > 0.01 ? 'visible' : 'hidden';
    }

    // Chiusura: arrivati in fondo, l'insegna compare per un attimo
    if (chiusura) {
      if (cam >= lastZ - 2 && !chiusura._fatto) {
        chiusura._fatto = true;
        chiusura.classList.add('on');
        clearTimeout(chiusura._t);
        chiusura._t = setTimeout(() => chiusura.classList.remove('on'), 1900);
      } else if (cam < lastZ - 60) {
        chiusura.classList.remove('on');
        if (cam < lastZ - 400) chiusura._fatto = false;
      }
    }

    // Insegna sulla saracinesca: svanisce e si avvicina nei primi passi
    if (ingresso) {
      const e = Math.max(0, 1 - cam / 380);
      if (ingresso._e !== e) {
        ingresso._e = e;
        ingresso.style.opacity = e.toFixed(3);
        ingresso.style.visibility = e ? 'visible' : 'hidden';
        ingresso.style.transform = `scale(${(1 + (1 - e) * 0.3).toFixed(3)})`;
      }
    }

    let near = 0;
    chapters.forEach((c, j) => { if (Math.abs(c.z - cam) < Math.abs(chapters[near].z - cam)) near = j; });
    if (near !== current) setChapter(near, current !== -1);
  }

  function setChapter(i, animate) {
    current = i;
    const ch = chapters[i];
    root.dataset.tone = ch.id;
    // barra del browser su telefono dello stesso colore della tappa
    if (themeMeta && coloreTono[ch.id]) themeMeta.setAttribute('content', coloreTono[ch.id]);
    navLinks.forEach((a) => {
      if (a.classList.contains('brand')) return;
      if (a.getAttribute('href') === `#${ch.id}`) a.setAttribute('aria-current', 'step');
      else a.removeAttribute('aria-current');
    });
    if (minimap) minimap.dataset.chapter = ch.id;
    if (minimapTitle) minimapTitle.textContent = ch.label;
    if (minimapNum) minimapNum.textContent = `${String(i + 1).padStart(2, '0')} / ${String(chapters.length).padStart(2, '0')}`;
    minimapLinks?.querySelectorAll('a').forEach((a) => {
      if (a.dataset.chapter === ch.id) a.setAttribute('aria-current', 'step'); else a.removeAttribute('aria-current');
    });
    if (prevButton) prevButton.disabled = i === 0;
    if (nextButton) nextButton.disabled = i === chapters.length - 1;
    setClock(ch, animate);
  }

  // Tabellone a palette: 5 caselle, codici più corti centrati ("BOX" -> " BOX ")
  const GIRO = '0123456789ABCDEFGHILMNORSTUV';
  function setClock(ch, animate) {
    clock.setAttribute('aria-label', `Tappa: ${ch.label}`);
    const chars = [...ch.code].slice(0, flaps.length);
    const pad = Math.max(0, flaps.length - chars.length);
    const digits = [...Array(Math.ceil(pad / 2)).fill(' '), ...chars, ...Array(Math.floor(pad / 2)).fill(' ')];
    flaps.forEach((el, k) => {
      const nv = digits[k];
      const ov = el.dataset.v;
      if (nv === ov) return;
      el.dataset.v = nv;
      const nodes = [...el.children];
      const [top, bottom, flipTop, flipBottom] = nodes;
      const put = (node, v) => { node.firstElementChild.textContent = v; };
      const token = (el._token || 0) + 1;
      el._token = token;
      if (!animate) {
        nodes.forEach((n) => put(n, nv));
        el._shown = nv;
        return;
      }
      // Come un tabellone vero: qualche carattere di passaggio prima di quello giusto
      const seq = [];
      const giri = 2 + ((k * 7 + nv.charCodeAt(0)) % 3);
      for (let i = 0; i < giri; i++) seq.push(GIRO[(k * 5 + i * 11 + nv.charCodeAt(0)) % GIRO.length]);
      seq.push(nv);
      let shown = el._shown ?? ov;
      const step = (i) => {
        if (el._token !== token) return;
        const v = seq[i];
        const ultimo = i === seq.length - 1;
        put(top, v); put(bottom, shown); put(flipTop, shown); put(flipBottom, v);
        el.style.setProperty('--dur', ultimo ? '.2s' : '.07s');
        el.style.setProperty('--delay', i === 0 ? `${k * 0.06}s` : '0s');
        el.classList.remove('go');
        requestAnimationFrame(() => requestAnimationFrame(() => { if (el._token === token) el.classList.add('go'); }));
        flipBottom.addEventListener('animationend', () => {
          if (el._token !== token) return;
          shown = v;
          el._shown = v;
          nodes.forEach((n) => put(n, v));
          el.classList.remove('go');
          if (!ultimo) step(i + 1);
        }, { once: true });
      };
      step(0);
    });
  }

  function tick(now) {
    const dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    // Decadimento esponenziale: stesso movimento a 30, 60 o 120 fps
    cam += (target - cam) * (1 - Math.exp(-dt * SEGUI));
    if (Math.abs(target - cam) < 0.4) cam = target;
    // punto di fuga che segue il cursore, più lento della camera
    const k = 1 - Math.exp(-dt * 3);
    vx += (tvx - vx) * k;
    vy += (tvy - vy) * k;
    if (Math.abs(tvx - vx) < 0.01 && Math.abs(tvy - vy) < 0.01) { vx = tvx; vy = tvy; }
    render();
    if (cam !== target || vx !== tvx || vy !== tvy) {
      raf = requestAnimationFrame(tick);
    } else {
      raf = 0;
      const id = chapters[current].id;
      if (Math.abs(chapters[current].z - cam) < 60 && location.hash !== `#${id}`) {
        history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
      }
    }
  }

  function wake() {
    if (raf) return;
    last = performance.now();
    raf = requestAnimationFrame(tick);
  }

  goTo = (id, { instant = false } = {}) => {
    const ch = byId(id);
    if (!ch) return false;
    target = ch.z;
    window.scrollTo({ top: ch.z / K, behavior: 'instant' });
    if (instant) {
      cam = target;
      if (raf) { cancelAnimationFrame(raf); raf = 0; }
      render();
    } else {
      wake();
    }
    if (document.activeElement instanceof HTMLElement && document.activeElement.closest('.minimap, .chapter-controls')) {
      ch.el.setAttribute('tabindex', '-1');
      ch.el.focus({ preventScroll: true });
    }
    return true;
  };

  prevButton?.addEventListener('click', () => goTo(chapters[Math.max(0, current - 1)].id));
  nextButton?.addEventListener('click', () => goTo(chapters[Math.min(chapters.length - 1, current + 1)].id));
  document.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.defaultPrevented) return;
    const tag = event.target?.tagName;
    if (['INPUT', 'SELECT', 'TEXTAREA', 'BUTTON'].includes(tag) || event.target?.isContentEditable) return;
    if (event.key === 'ArrowLeft' && current > 0) { event.preventDefault(); goTo(chapters[current - 1].id); }
    if (event.key === 'ArrowRight' && current < chapters.length - 1) { event.preventDefault(); goTo(chapters[current + 1].id); }
  });

  // Scintille: piccoli riflessi sui punti cromati delle foto di ricambi e accessori
  const conScintille = [...document.querySelectorAll('#fuego .zoom, #garage .zoom, #box .zoom')];
  const puntiLuce = new Map();
  function trovaLuci(img) {
    try {
      const N = 40;
      const c = document.createElement('canvas');
      c.width = c.height = N;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, N, N);
      const d = g.getImageData(0, 0, N, N).data;
      const L = (x, y) => { const i = (y * N + x) * 4; return d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11; };
      const pts = [];
      for (let y = 1; y < N - 1; y++) for (let x = 1; x < N - 1; x++) {
        const l = L(x, y);
        const intorno = (L(x - 1, y) + L(x + 1, y) + L(x, y - 1) + L(x, y + 1)) / 4;
        // luce puntiforme: chiara e più chiara di ciò che ha intorno (non un fondo bianco uniforme)
        if (l > 190 && l - intorno > 18) pts.push([(x + 0.5) / N, (y + 0.5) / N, l - intorno]);
      }
      pts.sort((a, b) => b[2] - a[2]);
      const scelti = [];
      for (const p of pts) {
        if (scelti.every((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) > 0.1)) scelti.push(p);
        if (scelti.length === 6) break;
      }
      return scelti;
    } catch { return []; }
  }
  function scintilla() {
    if (document.hidden || raf) return;
    const vivi = conScintille.filter((b) => b.closest('.plane').classList.contains('is-live'));
    if (!vivi.length) return;
    const b = vivi[Math.floor(Math.random() * vivi.length)];
    const img = b.querySelector('img');
    if (!img.complete || !img.naturalWidth) return;
    if (!puntiLuce.has(img)) puntiLuce.set(img, { pts: trovaLuci(img), W: img.offsetWidth, H: img.offsetHeight });
    const { pts, W, H } = puntiLuce.get(img);
    if (!pts.length) return;
    const [px, py] = pts[Math.floor(Math.random() * pts.length)];
    // la foto è ritagliata con object-fit: cover, quindi si ricalcola la posizione visibile
    const w = img.naturalWidth, h = img.naturalHeight;
    const k = Math.max(W / w, H / h);
    const x = (W - w * k) / 2 + px * w * k;
    const y = (H - h * k) / 2 + py * h * k;
    if (x < 6 || y < 6 || x > W - 6 || y > H - 6) return;
    const stella = document.createElement('span');
    stella.className = 'stella';
    stella.style.left = `${x}px`;
    stella.style.top = `${y}px`;
    stella.addEventListener('animationend', () => stella.remove(), { once: true });
    b.append(stella);
  }
  if (!root.classList.contains('calmo')) setInterval(scintilla, 850);

  // Luce del cursore sulle foto e scena che si inclina appena
  let mx = 0.5, my = 0.5, lightRaf = 0;
  addEventListener('pointermove', (e) => {
    if (e.pointerType !== 'mouse') return;
    mx = e.clientX / innerWidth;
    my = e.clientY / innerHeight;
    if (!lightRaf) lightRaf = requestAnimationFrame(() => {
      lightRaf = 0;
      // sulla scena, non su tutta la pagina: meno stili da ricalcolare
      world.style.setProperty('--mx', mx.toFixed(3));
      world.style.setProperty('--my', my.toFixed(3));
      tvx = (mx - 0.5) * 8;
      tvy = (my - 0.5) * 6;
      wake();
    });
  }, { passive: true });

  addEventListener('scroll', () => {
    target = Math.min(Math.max(scrollY * K, 0), lastZ);
    wake();
  }, { passive: true });

  let ultimaW = innerWidth, ultimaH = innerHeight;
  addEventListener('resize', () => {
    if (innerWidth === ultimaW && Math.abs(innerHeight - ultimaH) < 160) return;
    ultimaW = innerWidth; ultimaH = innerHeight;
    puntiLuce.clear();
    layout();
    target = Math.min(scrollY * K, lastZ);
    for (const p of planes) p.o = -1;
    render();
  });

  navLinks.forEach((a) => a.addEventListener('click', (e) => {
    const id = a.getAttribute('href').slice(1);
    if (!byId(id)) return;
    e.preventDefault();
    goTo(id);
    history.replaceState(null, '', `#${id}`);
  }));

  // Tastiera: l'elemento che riceve il focus viene portato davanti alla camera
  document.addEventListener('focusin', (e) => {
    const sec = e.target.closest && e.target.closest('.ch');
    if (!sec) return;
    const ch = byId(sec.id);
    if (ch && Math.abs(ch.z - target) > 1) goTo(ch.id);
  });

  addEventListener('hashchange', () => goTo(location.hash.slice(1)));

  document.querySelectorAll('.plane img').forEach((img) => {
    const decodifica = () => img.decode && img.decode().catch(() => {});
    if (img.complete) decodifica(); else img.addEventListener('load', decodifica, { once: true });
  });

  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  layout();
  const start = byId(decodeURIComponent(location.hash.slice(1)));
  // chi apre direttamente l'ultima tappa non deve vedere la chiusura
  if (chiusura && start && start.z === lastZ) chiusura._fatto = true;
  if (start) goTo(start.id, { instant: true });
  else { window.scrollTo(0, 0); render(); }

  expose();

  function expose() {
    window.messicano = {
      chapters: chapters.map(({ id, title, code, z }) => ({ id, title, code, z })),
      goTo,
    };
  }
})();
