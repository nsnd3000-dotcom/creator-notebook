/* ============================================================
   relations.js — 人物关系网络图
   增量渲染：节点/连线只创建一次，悬停与拖动只改属性，
   不重建 DOM（重建会把光标下的元素删掉，导致按不下去、拖不动）
   ============================================================ */
(function () {
  'use strict';

  const NS = 'http://www.w3.org/2000/svg';
  const POS_KEY = 'wc.relPos.v1';

  function el(tag, attrs) {
    const n = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) n.setAttribute(k, attrs[k]);
    return n;
  }

  function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

  function radiusOf(nd) { return 22 + Math.min(nd.degree, 6) * 3; }

  function hexA(hex, a) {
    if (!hex || hex[0] !== '#') return `rgba(201,168,106,${a})`;
    let h = hex.slice(1);
    if (h.length === 3) h = h.split('').map(c => c + c).join('');
    const r = parseInt(h.slice(0, 2), 16), g = parseInt(h.slice(2, 4), 16), b = parseInt(h.slice(4, 6), 16);
    return `rgba(${r},${g},${b},${a})`;
  }

  function loadImg(src) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => resolve(null);
      im.src = src;
    });
  }

  /* 环形布局：稳定、不重叠、一眼看清全部关系 */
  function ringLayout(nodes, W, H) {
    const n = nodes.length;
    if (!n) return;
    const cx = W / 2, cy = H / 2;
    if (n === 1) { nodes[0].x = cx; nodes[0].y = cy; return; }
    if (n === 2) {
      const r = Math.min(W * 0.24, H * 0.3);
      nodes[0].x = cx - r; nodes[0].y = cy;
      nodes[1].x = cx + r; nodes[1].y = cy;
      return;
    }
    const rx = Math.max(120, Math.min(W / 2 - 120, 470));
    const ry = Math.max(110, Math.min(H / 2 - 78, 300));
    nodes.forEach((nd, i) => {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2;
      nd.x = cx + Math.cos(a) * rx;
      nd.y = cy + Math.sin(a) * ry;
    });
  }

  /* ---------- 位置记忆（同一台机器刷新后仍保留手动摆放） ----------
     同时按 id 和姓名存一份：示例世界每次重建会换 id，姓名能认回来 */
  function loadPos() {
    try { return JSON.parse(localStorage.getItem(POS_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function savePos(map) {
    try { localStorage.setItem(POS_KEY, JSON.stringify(map)); } catch (e) { /* 忽略配额错误 */ }
  }
  function posKeyName(name) { return 'n:' + (name || '').trim(); }

  function mount(svg, world, opts) {
    opts = opts || {};
    const onNodeClick = opts.onNodeClick;

    const nodes = (world.characters || []).map(c => ({
      id: c.id, name: c.name || '未命名', color: c.color || '#c9a86a',
      image: c.image || '', initial: (c.name || '?').trim().slice(0, 1) || '?',
      degree: 0, x: 0, y: 0
    }));
    const nodeMap = new Map(nodes.map(n => [n.id, n]));

    const links = (world.relations || [])
      .filter(r => nodeMap.has(r.a) && nodeMap.has(r.b))
      .map(r => ({ s: nodeMap.get(r.a), t: nodeMap.get(r.b), label: r.label || '', kind: r.kind || '' }));

    links.forEach(l => { l.s.degree++; l.t.degree++; });

    let W = svg.clientWidth || 900;
    let H = svg.clientHeight || 560;

    const PAD = 34;
    const bound = () => {
      nodes.forEach(nd => {
        nd.x = clamp(nd.x, PAD, W - PAD);
        nd.y = clamp(nd.y, PAD, H - PAD);
      });
    };

    ringLayout(nodes, W, H);
    const saved = loadPos();
    nodes.forEach(nd => {
      const p = saved[nd.id] || saved[posKeyName(nd.name)];
      if (p && isFinite(p.x) && isFinite(p.y)) { nd.x = p.x; nd.y = p.y; }
    });
    bound();

    /* ---------- 结构只建一次 ---------- */
    svg.innerHTML = '';
    const defs = el('defs');
    const gEdges = el('g', { class: 'edges' });
    const gNodes = el('g', { class: 'nodes' });
    svg.appendChild(defs);
    svg.appendChild(gEdges);
    svg.appendChild(gNodes);

    /* 连线（曲线：控制点沿法线偏移，避免重叠） */
    const edgeRecs = links.map(l => {
      const path = el('path', { class: 'rel-edge' });
      gEdges.appendChild(path);
      let label = null;
      if (l.label) {
        label = el('text', { class: 'rel-edge-label' });
        label.textContent = l.label;
        gEdges.appendChild(label);
      }
      return { l, path, label };
    });

    /* 节点 */
    const nodeEls = new Map();
    nodes.forEach((nd, idx) => {
      const r = radiusOf(nd);
      const g = el('g', { class: 'rel-node' });
      g.dataset.id = nd.id;

      g.appendChild(el('circle', { class: 'halo', r: r + 10 }));
      g.appendChild(el('circle', {
        class: 'ring', r: r,
        fill: 'rgba(10,10,13,.72)',
        stroke: nd.color,
        'stroke-width': 1
      }));

      if (nd.image) {
        const cid = 'relclip-' + idx;
        const cp = el('clipPath', { id: cid, clipPathUnits: 'userSpaceOnUse' });
        cp.appendChild(el('circle', { r: r - 3 }));
        defs.appendChild(cp);
        const imgEl = el('image', {
          x: -(r - 3), y: -(r - 3), width: (r - 3) * 2, height: (r - 3) * 2,
          preserveAspectRatio: 'xMidYMid slice',
          'clip-path': `url(#${cid})`
        });
        imgEl.setAttribute('href', nd.image);
        imgEl.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', nd.image);
        g.appendChild(imgEl);
      } else {
        const ini = el('text', { class: 'rel-initial', y: 1, 'font-size': Math.round(r * .92) });
        ini.textContent = nd.initial;
        g.appendChild(ini);
      }

      const label = el('text', { y: r + 18 });
      label.textContent = nd.name;
      g.appendChild(label);

      // 命中区：透明但可点，比圆略大，方便按住
      g.appendChild(el('circle', { class: 'hit', r: r + 7, fill: 'transparent' }));

      nodeEls.set(nd.id, g);
      gNodes.appendChild(g);
    });

    /* ---------- 位置刷新（只改属性，不碰 DOM 结构） ---------- */
    function applyPositions() {
      nodes.forEach(nd => {
        const g = nodeEls.get(nd.id);
        if (g) g.setAttribute('transform', `translate(${nd.x.toFixed(2)},${nd.y.toFixed(2)})`);
      });

      // 标签避让：两条线中点在交叉处会撞在一起，沿曲线挪一挪
      const placed = [];
      const TS = [0.5, 0.33, 0.67, 0.24, 0.76];

      edgeRecs.forEach(rec => {
        const { l, path, label } = rec;
        const a = l.s, b = l.t;
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const off = Math.min(28, len * 0.14);
        const nx = -dy / len, ny = dx / len;
        const cxp = mx + nx * off, cyp = my + ny * off;
        path.setAttribute('d', `M${a.x},${a.y} Q${cxp},${cyp} ${b.x},${b.y}`);
        rec.ctrl = { x: cxp, y: cyp };

        if (!label) { rec.pt = null; return; }
        // 二次贝塞尔取点
        const at = t => ({
          x: (1 - t) * (1 - t) * a.x + 2 * (1 - t) * t * cxp + t * t * b.x,
          y: (1 - t) * (1 - t) * a.y + 2 * (1 - t) * t * cyp + t * t * b.y
        });
        let pick = at(0.5);
        for (const t of TS) {
          const p = at(t);
          const hit = placed.some(q => Math.abs(q.x - p.x) < 46 && Math.abs(q.y - p.y) < 17);
          if (!hit) { pick = p; break; }
        }
        placed.push(pick);
        rec.pt = pick;
        label.setAttribute('x', pick.x.toFixed(1));
        label.setAttribute('y', pick.y.toFixed(1));
      });
    }

    /* ---------- 悬停高亮：只切 class ---------- */
    let hoverId = null;
    function setHover(id) {
      if (hoverId === id) return;
      hoverId = id;
      nodes.forEach(nd => {
        const g = nodeEls.get(nd.id);
        if (g) g.classList.toggle('is-hover', nd.id === id);
      });
      edgeRecs.forEach(({ l, path }) => {
        const hot = !!id && (l.s.id === id || l.t.id === id);
        path.classList.toggle('hot', hot);
      });
    }

    nodeEls.forEach((g, id) => {
      g.addEventListener('pointerenter', () => { if (!drag) setHover(id); });
      g.addEventListener('pointerleave', () => { if (!drag) setHover(null); });
    });

    /* ---------- 拖拽 ---------- */
    let drag = null, moved = false, justDragged = false, dragType = 'mouse';
    const toLocal = ev => {
      const r = svg.getBoundingClientRect();
      return { x: ev.clientX - r.left, y: ev.clientY - r.top };
    };

    svg.addEventListener('pointerdown', ev => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      const g = ev.target.closest ? ev.target.closest('.rel-node') : null;
      if (!g || !svg.contains(g)) return;
      const nd = nodeMap.get(g.dataset.id);
      if (!nd) return;

      // 关键：阻止默认的文本选择 / 原生图片拖拽，否则指针流会被打断
      ev.preventDefault();
      const p = toLocal(ev);
      drag = { nd, g, ox: nd.x, oy: nd.y, sx: p.x, sy: p.y };
      dragType = ev.pointerType || 'mouse';
      moved = false;
      svg.classList.add('dragging');
      g.classList.add('is-drag');
      setHover(nd.id);
      try { svg.setPointerCapture(ev.pointerId); } catch (e) { /* 某些环境不支持 */ }
    });

    svg.addEventListener('pointermove', ev => {
      if (!drag) return;
      const p = toLocal(ev);
      const dx = p.x - drag.sx, dy = p.y - drag.sy;
      if (!moved && Math.abs(dx) + Math.abs(dy) > 3) moved = true;
      if (!moved) return;
      drag.nd.x = clamp(drag.ox + dx, PAD, W - PAD);
      drag.nd.y = clamp(drag.oy + dy, PAD, H - PAD);
      applyPositions();
    });

    function endDrag() {
      if (!drag) return;
      const { nd, g } = drag;
      const wasMoved = moved;
      drag = null;
      svg.classList.remove('dragging');
      g.classList.remove('is-drag');
      // 松手时节点仍在光标下，保持高亮，等移开再清除
      setHover(nd.id);
      if (wasMoved) {
        justDragged = true;
        setTimeout(() => { justDragged = false; }, 80);
        const map = loadPos();
        map[nd.id] = { x: Math.round(nd.x), y: Math.round(nd.y) };
        map[posKeyName(nd.name)] = { x: Math.round(nd.x), y: Math.round(nd.y) };
        savePos(map);
      } else if (!justDragged && onNodeClick) {
        // pointerdown 里 preventDefault 会吞掉 click，这里自己判定「按下未移动 = 点击」
        onNodeClick(nd.id);
      }
      moved = false;
      // 触屏没有 pointerleave，高亮会一直挂着，延时收掉
      if (dragType !== 'mouse') setTimeout(() => { if (!drag && hoverId === nd.id) setHover(null); }, 900);
    }
    svg.addEventListener('pointerup', endDrag);
    svg.addEventListener('pointercancel', endDrag);
    window.addEventListener('blur', endDrag);

    /* ---------- 尺寸变化：按比例平移，保留手动摆放 ---------- */
    let rt = null;
    const ro = new ResizeObserver(() => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const nw = svg.clientWidth || W, nh = svg.clientHeight || H;
        if (Math.abs(nw - W) > 20 || Math.abs(nh - H) > 20) {
          const sx = nw / W, sy = nh / H;
          nodes.forEach(n => { n.x *= sx; n.y *= sy; });
          W = nw; H = nh;
          bound();
          applyPositions();
        }
      }, 180);
    });
    ro.observe(svg);

    applyPositions();

    /* ---------- 导出为图片（按当前摆放位置画一张 PNG） ---------- */
    async function exportCanvas(opts) {
      const o = opts || {};
      const scale = o.scale || 2;
      const FONT = '"Noto Serif SC","Songti SC","STSong",serif';
      try { await document.fonts.ready; } catch (e) { /* 字体没就绪就用兜底 */ }

      const PAD = 56, HEAD = 88, CREDIT_H = 38;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      nodes.forEach(nd => {
        const r = radiusOf(nd);
        minX = Math.min(minX, nd.x - r - 12);
        minY = Math.min(minY, nd.y - r - 12);
        maxX = Math.max(maxX, nd.x + r + 12);
        maxY = Math.max(maxY, nd.y + r + 34);
      });
      if (!nodes.length) { minX = 0; minY = 0; maxX = 360; maxY = 170; }

      const gw = maxX - minX, gh = maxY - minY;
      const W = Math.round(Math.max(440, gw + PAD * 2));
      const H = Math.round(Math.max(240, HEAD + gh + PAD + CREDIT_H));

      const cv = document.createElement('canvas');
      cv.width = Math.round(W * scale);
      cv.height = Math.round(H * scale);
      const ctx = cv.getContext('2d');
      ctx.scale(scale, scale);

      const BG = '#08080b';
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, W, H);

      const rg = ctx.createRadialGradient(W / 2, H / 2, 12, W / 2, H / 2, Math.max(W, H) * 0.64);
      rg.addColorStop(0, 'rgba(201,168,106,.07)');
      rg.addColorStop(1, 'rgba(201,168,106,0)');
      ctx.fillStyle = rg;
      ctx.fillRect(0, 0, W, H);

      /* 标题区 */
      const name = (world.meta && world.meta.name) || '世界观';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.font = `700 21px ${FONT}`;
      ctx.fillStyle = '#ececee';
      ctx.fillText(name, PAD, 46);
      const nameW = ctx.measureText(name).width;

      ctx.font = `700 13px ${FONT}`;
      ctx.fillStyle = '#c9a86a';
      ctx.fillText('· 人物关系', PAD + nameW + 10, 45);

      ctx.textAlign = 'right';
      ctx.font = `11px ${FONT}`;
      ctx.fillStyle = '#6b6b76';
      ctx.fillText(`${nodes.length} 位人物 · ${links.length} 条关系`, W - PAD, 45);

      ctx.strokeStyle = 'rgba(255,255,255,.08)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, 62.5);
      ctx.lineTo(W - PAD, 62.5);
      ctx.stroke();

      /* 图形区 */
      ctx.save();
      ctx.translate(PAD - minX, HEAD - minY);

      // 连线
      ctx.strokeStyle = 'rgba(255,255,255,.17)';
      ctx.lineWidth = 1;
      edgeRecs.forEach(rec => {
        const a = rec.l.s, b = rec.l.t;
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.quadraticCurveTo(rec.ctrl.x, rec.ctrl.y, b.x, b.y);
        ctx.stroke();
      });

      // 连线标签：先描一圈底色再填字，压住连线
      ctx.font = `11px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      edgeRecs.forEach(rec => {
        if (!rec.pt || !rec.l.label) return;
        ctx.lineWidth = 4;
        ctx.strokeStyle = BG;
        ctx.strokeText(rec.l.label, rec.pt.x, rec.pt.y);
        ctx.fillStyle = '#9a9aa6';
        ctx.fillText(rec.l.label, rec.pt.x, rec.pt.y);
      });

      // 头像
      const imgs = await Promise.all(nodes.map(nd => (nd.image ? loadImg(nd.image) : Promise.resolve(null))));

      nodes.forEach((nd, i) => {
        const r = radiusOf(nd);
        ctx.beginPath();
        ctx.arc(nd.x, nd.y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(12,12,17,.94)';
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = hexA(nd.color, .72);
        ctx.stroke();

        const img = imgs[i];
        if (img && img.width && img.height) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(nd.x, nd.y, r - 3, 0, Math.PI * 2);
          ctx.clip();
          const d = (r - 3) * 2;
          const sc = Math.max(d / img.width, d / img.height);
          const iw = img.width * sc, ih = img.height * sc;
          ctx.drawImage(img, nd.x - iw / 2, nd.y - ih / 2, iw, ih);
          ctx.restore();
        } else {
          ctx.fillStyle = '#d8c6a0';
          ctx.font = `700 ${Math.round(r * 0.92)}px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(nd.initial, nd.x, nd.y + 1);
        }

        ctx.fillStyle = '#e8e8ee';
        ctx.font = `13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(nd.name, nd.x, nd.y + r + 16);
      });

      ctx.restore();

      /* 外框 */
      ctx.strokeStyle = 'rgba(255,255,255,.07)';
      ctx.lineWidth = 1;
      ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

      /* 底部署名 */
      const CREDIT = (window.Poster && window.Poster.CREDIT) || { title: '创世者的笔记本', url: 'github.com/nsnd3000-dotcom/creator-notebook' };
      ctx.textAlign = 'center';
      ctx.textBaseline = 'alphabetic';
      ctx.font = `12px ${FONT}`;
      ctx.fillStyle = '#74747f';
      ctx.fillText(`${CREDIT.title}  ·  ${CREDIT.url}`, W / 2, H - 18);

      return cv;
    }

    return {
      redraw() { applyPositions(); },
      exportCanvas,
      relayout() {
        // 清掉手动摆放，恢复环形
        const map = loadPos();
        nodes.forEach(nd => { delete map[nd.id]; delete map[posKeyName(nd.name)]; });
        savePos(map);
        ringLayout(nodes, W, H);
        bound();
        applyPositions();
      },
      destroy() {
        ro.disconnect();
        window.removeEventListener('blur', endDrag);
      }
    };
  }

  window.RelGraph = { mount };
})();
