(function () {
  if (document.getElementById('__sn_cal__')) {
    document.getElementById('__sn_cal__').remove();
    return;
  }

  // ── 1. Parse table ────────────────────────────────────────────────────────
  const table = document.querySelector('table');
  if (!table) { alert('Keine Tabelle gefunden.'); return; }

  const headers = [];
  table.querySelectorAll('thead th').forEach((th, i) => headers[i] = th.textContent.trim());

  const col   = name => headers.findIndex(h => h === name);
  const colSW = name => headers.findIndex(h => h.startsWith(name));

  const C = {
    datumVon: col('Datum von'), datumBis: col('Datum bis'),
    von: col('von'), bis: col('bis'),
    ort: col('Ort'), beschr: col('Beschreibung'), kat: colSW('Kat'),
  };

  const parseDate = str => {
    const m = str && str.match(/(\d{2})\.(\d{2})\.(\d{4})/);
    return m ? new Date(+m[3], +m[2] - 1, +m[1]) : null;
  };

  const events = [];
  table.querySelectorAll('tbody tr').forEach(row => {
    const cells = row.querySelectorAll('td');
    const g = i => (i >= 0 && cells[i]) ? cells[i].textContent.trim() : '';
    const start = parseDate(g(C.datumVon));
    if (!start) return;
    const end = parseDate(g(C.datumBis)) || new Date(start);
    events.push({ start, end, von: g(C.von), bis: g(C.bis), ort: g(C.ort), desc: g(C.beschr), kat: g(C.kat) });
  });

  if (!events.length) { alert('Keine Termine gefunden.'); return; }

  // ── 2. State ──────────────────────────────────────────────────────────────
  events.sort((a, b) => a.start - b.start);
  let month = events[0].start.getMonth();
  let year  = events[0].start.getFullYear();
  let fontSize   = 10;      // chip font size in px
  let showLegend = true;
  const hiddenCats = new Set();

  // ── 3. Colors ─────────────────────────────────────────────────────────────
  const PAL = ['#2e86c1','#e67e22','#27ae60','#8e44ad','#c0392b','#16a085','#d35400','#2980b9','#7d3c98','#117a65'];
  const catMap = {};
  let ci = 0;
  const catColor = kat => { if (!catMap[kat]) catMap[kat] = PAL[ci++ % PAL.length]; return catMap[kat]; };
  events.forEach(e => catColor(e.kat || ''));

  // ── 4. Constants ──────────────────────────────────────────────────────────
  const MON  = ['Januar','Februar','März','April','Mai','Juni','Juli','August','September','Oktober','November','Dezember'];
  const WD   = ['Mo','Di','Mi','Do','Fr','Sa','So'];
  const MAX  = 2;

  // ── 5. Helpers ────────────────────────────────────────────────────────────
  function el(tag, attrs = {}, ...kids) {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => { if (k === 'style') n.style.cssText = v; else n.setAttribute(k, v); });
    kids.forEach(c => n.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return n;
  }

  function navBtn(lbl, fn, title = '') {
    const b = el('button', { style: 'background:rgba(255,255,255,.18);border:none;color:#fff;min-width:34px;height:34px;border-radius:7px;cursor:pointer;font-size:18px;line-height:1;flex-shrink:0;padding:0 8px', title });
    b.textContent = lbl;
    b.onclick = fn;
    return b;
  }

  // ── 6. Dynamic style (font size + hidden categories) ─────────────────────
  let styleEl;

  function updateStyle() {
    if (!styleEl) return;
    const rules = [`.ev-chip { font-size: ${fontSize}px !important; line-height: 1.3; }`];
    hiddenCats.forEach(kat => {
      rules.push(`[data-kat="${kat.replace(/"/g, '\\"')}"] { display: none !important; }`);
    });
    styleEl.textContent = rules.join('\n');
  }

  // ── 7. Popover ────────────────────────────────────────────────────────────
  let popover = null;

  function closeP() { if (popover) { popover.remove(); popover = null; } }

  function showP(ev, anchor) {
    closeP();
    const fmt = d => d.toLocaleDateString('de-CH', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' });
    const same = ev.start.toDateString() === ev.end.toDateString();
    const dateLine = same ? fmt(ev.start) : `${fmt(ev.start)} – ${fmt(ev.end)}`;
    const timeLine = ev.von && ev.bis ? `${ev.von}–${ev.bis} Uhr` : ev.von ? `ab ${ev.von} Uhr` : '';
    const color = catColor(ev.kat || '');

    popover = el('div', { style: 'position:absolute;z-index:2147483647;background:#fff;border-radius:10px;min-width:240px;max-width:320px;box-shadow:0 8px 32px rgba(0,0,0,.3);overflow:hidden;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif' });

    const bar = el('div', { style: `background:${color};padding:10px 12px;display:flex;align-items:flex-start;gap:8px` });
    const bt  = el('div', { style: 'flex:1;color:#fff;font-weight:700;font-size:13px;line-height:1.3' }, ev.desc);
    const bx  = el('button', { style: 'background:rgba(0,0,0,.2);border:none;color:#fff;width:20px;height:20px;border-radius:50%;cursor:pointer;font-size:11px;line-height:1;flex-shrink:0;padding:0' }, '✕');
    bx.onclick = e => { e.stopPropagation(); closeP(); };
    bar.append(bt, bx);
    popover.appendChild(bar);

    const body = el('div', { style: 'padding:10px 12px;font-size:12px;color:#333;display:flex;flex-direction:column;gap:6px' });
    const row = (icon, text) => {
      if (!text) return null;
      const r = el('div', { style: 'display:flex;gap:8px;align-items:flex-start' });
      r.append(el('span', { style: 'width:16px;text-align:center;flex-shrink:0;color:#888' }, icon), el('span', { style: 'line-height:1.4' }, text));
      return r;
    };
    [row('📅', dateLine), row('🕐', timeLine), row('📍', ev.ort), row('🏷', ev.kat)].filter(Boolean).forEach(r => body.appendChild(r));
    popover.appendChild(body);

    // Position relative to scrollable grid wrapper
    const wrap = document.getElementById('__sn_grid__');
    const gR = wrap.getBoundingClientRect();
    const aR = anchor.getBoundingClientRect();
    popover.style.top  = (aR.bottom - gR.top + wrap.scrollTop + 4) + 'px';
    let left = aR.left - gR.left;
    popover.style.left = left + 'px';
    wrap.appendChild(popover);
    requestAnimationFrame(() => {
      if (!popover) return;
      const pw = popover.offsetWidth, gw = wrap.offsetWidth;
      if (left + pw > gw - 8) popover.style.left = Math.max(4, gw - pw - 8) + 'px';
    });
  }

  // ── 8. Overlay + render ───────────────────────────────────────────────────
  const overlay = el('div', { style: 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:2147483646;display:flex;align-items:center;justify-content:center;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Arial,sans-serif' });
  overlay.id = '__sn_cal__';
  overlay.addEventListener('click', e => { if (e.target === overlay) { closeP(); overlay.remove(); } });
  document.body.appendChild(overlay);

  const render = () => {
    closeP();
    overlay.innerHTML = '';

    const modal = el('div', { style: 'background:#fff;border-radius:14px;width:96vw;max-width:1300px;height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 80px rgba(0,0,0,.6)' });
    overlay.appendChild(modal);

    // Dynamic style tag
    styleEl = el('style');
    modal.appendChild(styleEl);
    updateStyle();

    // Close popover when clicking anywhere in the modal that isn't a chip or the popover itself
    modal.addEventListener('click', e => {
      if (popover && !popover.contains(e.target) && !e.target.closest('[data-ev]') && !e.target.closest('[data-mehr]')) {
        closeP();
      }
    });

    // ── Header ──
    const hdr = el('div', { style: 'background:#1b4f72;color:#fff;padding:10px 16px;display:flex;align-items:center;gap:8px;flex-shrink:0;flex-wrap:wrap' });

    // Left: month nav
    const leftGrp = el('div', { style: 'display:flex;align-items:center;gap:6px' });
    leftGrp.append(
      navBtn('‹', () => { if (--month < 0) { month = 11; year--; } render(); }, 'Vorheriger Monat'),
      navBtn('›', () => { if (++month > 11) { month = 0; year++; } render(); }, 'Nächster Monat')
    );

    // Center: title
    const titleDiv = el('div', { style: 'flex:1;text-align:center;min-width:160px' });
    titleDiv.innerHTML = `<div style="font-size:19px;font-weight:700">${MON[month]} ${year}</div>
      <div style="font-size:10px;opacity:.7">${events.length} Termine geladen</div>`;

    // Right: controls
    const rightGrp = el('div', { style: 'display:flex;align-items:center;gap:6px' });

    // Font size buttons
    const fontLabel = el('span', { style: 'font-size:11px;opacity:.8;margin-right:2px' }, 'Schrift:');
    const btnFontDec = navBtn('A−', () => { if (fontSize > 7) { fontSize--; updateStyle(); } }, 'Schrift kleiner');
    const btnFontInc = navBtn('A+', () => { if (fontSize < 15) { fontSize++; updateStyle(); } }, 'Schrift grösser');
    btnFontDec.style.fontSize = '13px';
    btnFontInc.style.fontSize = '13px';

    // Legend toggle button
    const btnLeg = navBtn('🏷 Legende', () => {
      showLegend = !showLegend;
      legendEl.style.display = showLegend ? 'flex' : 'none';
      btnLeg.style.opacity = showLegend ? '1' : '0.5';
    }, 'Legende ein-/ausblenden');
    btnLeg.style.fontSize = '12px';
    btnLeg.style.padding = '0 10px';

    // Close button
    const btnClose = navBtn('✕', () => { closeP(); overlay.remove(); }, 'Schliessen');
    btnClose.style.background = 'rgba(255,255,255,.15)';
    btnClose.style.fontSize = '15px';

    rightGrp.append(fontLabel, btnFontDec, btnFontInc, btnLeg, btnClose);
    hdr.append(leftGrp, titleDiv, rightGrp);
    modal.appendChild(hdr);

    // ── Calendar grid ──
    const wrap = el('div', { style: 'flex:1;overflow-y:auto;padding:10px 12px;position:relative' });
    wrap.id = '__sn_grid__';

    const dayHdrs = el('div', { style: 'display:grid;grid-template-columns:repeat(7,1fr);gap:3px;margin-bottom:3px' });
    WD.forEach((d, i) => {
      dayHdrs.appendChild(el('div', { style: `text-align:center;font-size:11px;font-weight:700;padding:4px 2px;color:${i >= 5 ? '#c0392b' : '#666'};letter-spacing:.04em` }, d));
    });
    wrap.appendChild(dayHdrs);

    const grid = el('div', { style: 'display:grid;grid-template-columns:repeat(7,1fr);gap:3px' });

    let offset = new Date(year, month, 1).getDay() - 1;
    if (offset < 0) offset = 6;
    const dim   = new Date(year, month + 1, 0).getDate();
    const today = new Date();

    const evDay = day => {
      const d = new Date(year, month, day);
      return events.filter(ev => {
        const s  = +new Date(ev.start.getFullYear(), ev.start.getMonth(), ev.start.getDate());
        const e2 = +new Date(ev.end.getFullYear(),   ev.end.getMonth(),   ev.end.getDate());
        return +d >= s && +d <= e2;
      });
    };

    for (let i = 0; i < offset; i++) grid.appendChild(el('div', { style: 'min-height:72px;border-radius:7px;background:#f2f2f2' }));

    for (let d = 1; d <= dim; d++) {
      const isT = today.getDate() === d && today.getMonth() === month && today.getFullYear() === year;
      const isW = ((offset + d - 1) % 7) >= 5;
      const evts = evDay(d);

      const cell = el('div', { style: `min-height:72px;border-radius:7px;padding:5px;box-sizing:border-box;overflow:hidden;background:${isT ? '#d6eaf8' : isW ? '#fdf2f8' : '#fafafa'};border:${isT ? '2px solid #1b4f72' : '1px solid #e0e0e0'}` });
      cell.appendChild(el('div', { style: `font-size:12px;font-weight:700;margin-bottom:3px;color:${isT ? '#1b4f72' : isW ? '#c0392b' : '#444'}` }, String(d)));

      const vis = evts.slice(0, MAX), hid = evts.slice(MAX);

      const makeChip = (ev, hidden = false) => {
        const color = catColor(ev.kat || '');
        const chip  = el('div', {
          'class': 'ev-chip',
          'data-ev': '1',
          'data-kat': ev.kat || '',
          ...(hidden ? { 'data-hidden': '1' } : {}),
          style: `background:${color};color:#fff;border-radius:3px;padding:1px 4px;margin-bottom:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;cursor:pointer`,
        }, (ev.von ? ev.von + ' ' : '') + ev.desc);
        chip.onclick = e => { e.stopPropagation(); showP(ev, chip); };
        return chip;
      };

      vis.forEach(ev => cell.appendChild(makeChip(ev)));

      if (hid.length) {
        const mehr = el('div', { 'data-mehr': '1', style: 'font-size:9px;color:#555;cursor:pointer;padding:1px 2px;border-radius:3px;background:#e8e8e8;text-align:center' }, `+${hid.length} mehr`);
        mehr.onclick = e => {
          e.stopPropagation();
          if (mehr.dataset.open === '1') {
            mehr.dataset.open = '0';
            mehr.textContent = `+${hid.length} mehr`;
            cell.querySelectorAll('[data-hidden]').forEach(n => n.remove());
          } else {
            mehr.dataset.open = '1';
            mehr.textContent = 'weniger ▲';
            hid.forEach(ev => cell.insertBefore(makeChip(ev, true), mehr));
          }
        };
        cell.appendChild(mehr);
      }

      grid.appendChild(cell);
    }

    wrap.appendChild(grid);
    modal.appendChild(wrap);

    // ── Legend ──
    const legendEl = el('div', { style: `padding:8px 14px;border-top:1px solid #eee;display:flex;flex-wrap:wrap;gap:6px;flex-shrink:0;background:#fafafa;align-items:center` });

    const legTitle = el('span', { style: 'font-size:10px;font-weight:700;color:#888;margin-right:4px;text-transform:uppercase;letter-spacing:.05em' }, 'Kategorien:');
    legendEl.appendChild(legTitle);

    Object.entries(catMap).forEach(([kat, color]) => {
      const isHidden = hiddenCats.has(kat);
      const chip = el('div', {
        style: [
          `background:${isHidden ? '#ddd' : color};color:${isHidden ? '#999' : '#fff'}`,
          'border-radius:4px;padding:3px 8px;font-size:10px;cursor:pointer',
          `text-decoration:${isHidden ? 'line-through' : 'none'}`,
          'user-select:none;transition:all .15s',
          `title:${kat || 'Ohne Kategorie'}`,
        ].join(';'),
      }, kat || 'Ohne Kategorie');

      chip.title = isHidden ? 'Klicken zum Einblenden' : 'Klicken zum Ausblenden';
      chip.onclick = () => {
        if (hiddenCats.has(kat)) hiddenCats.delete(kat);
        else hiddenCats.add(kat);
        updateStyle();
        // Update chip appearance
        const hidden = hiddenCats.has(kat);
        chip.style.background       = hidden ? '#ddd' : color;
        chip.style.color            = hidden ? '#999' : '#fff';
        chip.style.textDecoration   = hidden ? 'line-through' : 'none';
        chip.title = hidden ? 'Klicken zum Einblenden' : 'Klicken zum Ausblenden';
      };
      legendEl.appendChild(chip);
    });

    modal.appendChild(legendEl);
  };

  render();
})();
