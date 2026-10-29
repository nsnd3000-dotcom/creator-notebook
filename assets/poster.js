/* ============================================================
   poster.js — 世界观长图渲染（1080 基准，版式参考 PSD 模板）
   区块顺序：标题 / 主要人物(3列) / 背景与势力(3列) / 故事(2列) / 世界一角(1张)
   ============================================================ */
(function () {
  'use strict';

  const FF = '"Huiwen Mincho","Songti SC","Source Han Serif SC","Noto Serif SC","STSong",SimSun,serif';

  /* 导出图底部署名 —— 改仓库地址只改这里 */
  const CREDIT = {
    title: '创世者的笔记本',
    titleEn: "THE CREATOR'S NOTEBOOK",
    url: 'github.com/nsnd3000-dotcom/creator-notebook'
  };

  /* 等字体就绪再量字，否则会先用兜底字体排版、导出时才发现行宽不对 */
  let fontReady = null;
  function ensureFont() {
    if (fontReady) return fontReady;
    const sample = '世界观总图人物势力故事时间线第十三四座灯塔雾港纪元';
    if (!document.fonts || !document.fonts.load) { fontReady = Promise.resolve(); return fontReady; }
    fontReady = Promise.all([
      document.fonts.load('110px "Huiwen Mincho"', sample),
      document.fonts.load('400 42px "Huiwen Mincho"', sample)
    ]).catch(() => {}).then(() => document.fonts.ready).catch(() => {});
    return fontReady;
  }

  /* 版式常量 —— 取自 PSD（1080 × 3630）实测坐标 */
  const P = {
    W: 1080,
    titleX: 91, titleTop: 102, titleFont: 110, titleH: 100,
    subTop: 216, subFont: 40,
    afterTitle: 196,

    /* 设计者署名：图右上角、与世界名同一行 */
    designerFont: 28, designerTop: 143, designerGap: 56, designerMaxW: 0.3,

    labelX: 28, labelFont: 42, labelH: 40,

    cardW: 274, cardH: 274,
    col3: [73, 411, 749],
    col2: [122, 636],

    imgTextGap: 34,
    textFont: 46, lineH: 64, textMaxW: 266,

    /* 卡片文字：名字 / 称号（副信息） / 简介 —— 三级字号，简介最小 */
    cardTextW: 282,
    nameFont: 46, nameH: 62,
    metaFont: 32, metaH: 44,
    bioFont: 26, bioLineH: 37, bioLines: 4,

    storyTitleGap: 25, storyTitleFont: 42, storyTitleLh: 56, storyTitleLines: 2,
    storyTextGap: 22, storyFont: 36, storyLineH: 50, storyLines: 4,

    wideX: 158, wideW: 752, wideH: 541,

    sectionGap: 104,
    rowGap: 64,
    bottom: 300
  };

  const THEMES = {
    dark: {
      bg: '#000000', text: '#ffffff', textDim: 'rgba(255,255,255,.80)',
      label: 'rgba(255,255,255,.92)', phFill: '#141418', phLine: '#2a2a33', phText: '#3a3a46',
      footer: 'rgba(255,255,255,.35)',
      designer: 'rgba(255,255,255,.60)',
      credit: 'rgba(255,255,255,.46)', creditDim: 'rgba(255,255,255,.26)',
      creditLine: 'rgba(255,255,255,.12)'
    },
    light: {
      bg: '#f3efe6', text: '#141318', textDim: 'rgba(20,19,24,.78)',
      label: 'rgba(20,19,24,.9)', phFill: '#ded5c2', phLine: '#c7bba4', phText: '#a99e86',
      footer: 'rgba(20,19,24,.4)',
      designer: 'rgba(20,19,24,.62)',
      credit: 'rgba(20,19,24,.5)', creditDim: 'rgba(20,19,24,.3)',
      creditLine: 'rgba(20,19,24,.14)'
    }
  };

  /* ---------------- 绘图工具 ---------------- */
  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function drawCover(ctx, img, x, y, w, h, r) {
    ctx.save();
    roundRect(ctx, x, y, w, h, r || 0);
    ctx.clip();
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const s = Math.max(w / iw, h / ih);
    const dw = iw * s, dh = ih * s;
    ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
    ctx.restore();
  }

  /* 单行：超宽则省略 */
  function fitOneLine(ctx, text, maxW) {
    if (!text) return '';
    if (ctx.measureText(text).width <= maxW) return text;
    let s = text;
    while (s.length > 1 && ctx.measureText(s + '…').width > maxW) s = s.slice(0, -1);
    return s + '…';
  }

  /* 单行：先整体缩小字号，缩到下限还放不下才省略 */
  function fitShrink(ctx, text, maxW, font, minFont) {
    if (!text) return { text: '', font: font };
    if (ctx.measureText(text).width <= maxW) return { text: text, font: font };
    let f = font;
    while (f > (minFont || font * 0.72)) {
      f -= 1;
      ctx.font = `${f}px ${FF}`;
      if (ctx.measureText(text).width <= maxW) return { text: text, font: f };
    }
    ctx.font = `${f}px ${FF}`;
    return { text: fitOneLine(ctx, text, maxW), font: f };
  }

  /* 故事在长图里只放一小段：优先「一句话简介」，否则取正文第一句，避免半句截断 */
  function storyText(it) {
    const sum = String(it.summary || '').replace(/\s+/g, ' ').trim();
    if (sum) return sum;
    const body = String(it.body || '').replace(/\s+/g, ' ').trim();
    const m = body.match(/^[^。！？!?]{0,48}[。！？!?]/);
    return m ? m[0] : body;
  }

  /* 多行换行（中英混排逐字推进，含避头尾标点处理） */
  const NO_START = '。，、；：？！）〕》」』”’%…·';
  function wrapLines(ctx, text, maxW, maxLines) {
    const out = [];
    if (!text) return out;
    const src = String(text).replace(/\r/g, '');
    for (const para of src.split('\n')) {
      if (out.length >= maxLines) break;
      if (!para) { out.push(''); continue; }
      let line = '';
      for (const ch of para) {
        const test = line + ch;
        if (ctx.measureText(test).width > maxW && line) {
          if (NO_START.includes(ch)) {
            // 标点不另起一行，允许略微溢出
            out.push(test);
            line = '';
          } else {
            out.push(line);
            line = ch;
          }
          if (out.length >= maxLines) break;
        } else {
          line = test;
        }
      }
      if (out.length < maxLines && line) out.push(line);
    }
    if (out.length > maxLines) out.length = maxLines;
    // 最后一行溢出加省略号
    if (out.length === maxLines) {
      const joined = out.join('');
      if (joined.length < String(text).replace(/\s+/g, '').length) {
        out[maxLines - 1] = fitOneLine(ctx, out[maxLines - 1] + '…', maxW);
      }
    }
    return out;
  }

  /* 两行时按视觉宽度对半分，避免末行只剩一两个字（如「塔》」） */
  const NO_END = '（〔《「『“‘';
  function wrapBalanced(ctx, text, maxW, maxLines) {
    const t = String(text || '').replace(/\r/g, '').trim();
    if (!t) return [];
    if (ctx.measureText(t).width <= maxW) return [t];
    if (maxLines < 2) return wrapLines(ctx, t, maxW, maxLines);
    const half = ctx.measureText(t).width / 2;
    let best = -1, bestDiff = Infinity;
    for (let i = 1; i < t.length; i++) {
      const w = ctx.measureText(t.slice(0, i)).width;
      if (w > maxW) break;
      const prev = t[i - 1], next = t[i];
      if (NO_END.includes(prev) || NO_START.includes(next)) continue;
      const d = Math.abs(w - half);
      if (d < bestDiff) { bestDiff = d; best = i; }
    }
    if (best > 0) {
      const a = t.slice(0, best), b = t.slice(best);
      if (ctx.measureText(b).width <= maxW) return [a, b];
    }
    return wrapLines(ctx, t, maxW, maxLines);
  }

  /* 末行只剩一两个字时（「看。」这种），收窄行宽重新折行，把字匀回去 */
  function wrapNice(ctx, text, maxW, maxLines) {
    const t = String(text || '').replace(/\r/g, '').trim();
    if (!t) return [];
    const best = wrapLines(ctx, t, maxW, maxLines);
    if (best.length < 2) return best;
    const lastW = w => ctx.measureText(w).width;
    if (lastW(best[best.length - 1]) >= maxW * 0.42) return best;
    for (let k = 1; k <= 14; k++) {
      const trial = wrapLines(ctx, t, maxW * (1 - k * 0.025), maxLines);
      if (trial.length === best.length && lastW(trial[trial.length - 1]) >= maxW * 0.42) return trial;
    }
    return best;
  }

  /* ---------------- 数据选取 ---------------- */
  function pickByOrder(all, order, limit) {
    if (!order || !order.length) return all.slice(0, limit);
    const map = new Map(all.map(x => [x.id, x]));
    const res = [];
    for (const id of order) {
      const it = map.get(id);
      if (it && !res.includes(it)) res.push(it);
    }
    return res.length ? res : all.slice(0, limit);
  }

  function charCard(world, c) {
    const fname = c.factionId ? Store.factionName(c.factionId) : '';
    return {
      img: c.image, color: c.color, key: c.name,
      name: c.name || '未命名',
      meta: [c.alias || c.role, fname].filter(Boolean).join(' · '),
      bio: c.desc || ''
    };
  }

  function factionCard(world, f) {
    return {
      img: f.image, color: f.color, key: f.name,
      name: f.name || '未命名',
      meta: f.motto || (f.leader ? '首领 ' + f.leader : ''),
      bio: f.desc || ''
    };
  }

  /* 用离屏画布量出每张卡片的文字行数与高度 */
  function prepareCards(secs) {
    const mctx = document.createElement('canvas').getContext('2d');
    secs.forEach(s => {
      if (s.kind !== 'cards') return;
      s.items.forEach(it => {
        mctx.font = `${P.nameFont}px ${FF}`;
        it._name = fitOneLine(mctx, it.name, P.cardTextW);
        mctx.font = `${P.metaFont}px ${FF}`;
        const mo = fitShrink(mctx, it.meta, P.cardTextW, P.metaFont, 24);
        it._meta = mo.text;
        it._metaFont = mo.font;
        mctx.font = `${P.bioFont}px ${FF}`;
        it._bio = wrapLines(mctx, it.bio, P.cardTextW, P.bioLines);
        it._textH = P.nameH + (it._meta ? P.metaH : 0) + it._bio.length * P.bioLineH;
      });
    });
  }

  /* 故事标题：先缩字号凑成一行，实在放不下再两行对半分 */
  function prepareStories(secs) {
    const mctx = document.createElement('canvas').getContext('2d');
    secs.forEach(s => {
      if (s.kind !== 'stories') return;
      s.items.forEach(it => {
        const t = String(it.title || '').trim();
        mctx.font = `${P.storyTitleFont}px ${FF}`;
        const one = fitShrink(mctx, t, P.textMaxW, P.storyTitleFont, 32);
        if (one.text === t && !it.title.includes('\n')) {
          it._titleLines = [one.text];
          it._titleFont = one.font;
        } else {
          mctx.font = `${P.storyTitleFont}px ${FF}`;
          it._titleLines = wrapBalanced(mctx, t, P.textMaxW, P.storyTitleLines);
          it._titleFont = P.storyTitleFont;
        }
        // 简介按实际长度排，最多 8 行，避免半句被截断
        mctx.font = `${P.storyFont}px ${FF}`;
        it._bodyLines = wrapNice(mctx, storyText(it), P.textMaxW, 8);
      });
    });
  }

  /* ---------------- 布局 ---------------- */
  function buildSections(world, opt) {
    const po = world.poster || {};
    const chars = pickByOrder(world.characters || [], po.characters, opt.maxChars || 6);
    const facs = pickByOrder(world.factions || [], po.factions, opt.maxFacs || 6);
    const stories = pickByOrder(world.stories || [], po.stories, opt.maxStories || 4);

    const secs = [];

    if (chars.length) {
      secs.push({
        kind: 'cards', label: '主要人物：', gapAfterLabel: 44,
        cols: P.col3, items: chars.map(c => charCard(world, c))
      });
    }
    if (facs.length) {
      secs.push({
        kind: 'cards', label: '背景与势力：', gapAfterLabel: 67,
        cols: P.col3, items: facs.map(f => factionCard(world, f))
      });
    }
    if (stories.length) {
      secs.push({
        kind: 'stories', label: '故事：', gapAfterLabel: 86,
        cols: P.col2,
        items: stories.map(s => ({
          title: s.title || '未命名',
          body: s.summary || (s.body || '').split('\n')[0] || '',
          img: s.image, color: s.color, key: s.title
        }))
      });
    }

    // 世界一角
    const ref = po.sceneRef || { type: 'auto' };
    let sceneImg = '';
    let sceneTitle = '';
    if (ref.type === 'custom' && ref.src) {
      sceneImg = ref.src;
    } else if (ref.type === 'city') {
      const c = (world.cities || []).find(x => x.id === ref.id);
      if (c) { sceneImg = c.image || ''; sceneTitle = c.name; }
    } else if (ref.type === 'story') {
      const s = (world.stories || []).find(x => x.id === ref.id);
      if (s) { sceneImg = s.image || ''; sceneTitle = s.title; }
    }
    if (!sceneImg) {
      const city = (world.cities || []).find(c => c.image);
      if (city) { sceneImg = city.image; sceneTitle = sceneTitle || city.name; }
    }
    if (!sceneImg) {
      const st = (world.stories || []).find(s => s.image);
      if (st) { sceneImg = st.image; sceneTitle = sceneTitle || st.title; }
    }
    // 世界一角：保留 PSD 底部大图位，没图时给占位框；也可在设置里整个关掉
    if (opt.showScene !== false && (sceneImg || opt.alwaysShowScene)) {
      secs.push({
        kind: 'wide', label: '世界一角：', gapAfterLabel: 80,
        item: { img: sceneImg, key: sceneTitle }
      });
    }

    return secs;
  }


  /* 不满一行时把卡片居中，避免右侧空出一大块 */
  function rowXs(cols, count) {
    if (count >= cols.length || count <= 0) return cols;
    const gap = cols[1] - cols[0] - P.cardW;
    const spanStart = cols[0];
    const spanW = cols[cols.length - 1] + P.cardW - cols[0];
    const total = count * P.cardW + (count - 1) * gap;
    const start = spanStart + (spanW - total) / 2;
    const out = [];
    for (let i = 0; i < count; i++) out.push(start + i * (P.cardW + gap));
    return out;
  }

  function cardContentH(s) {
    const rows = Math.ceil(s.items.length / 3);
    s._rowTextH = [];
    let h = 0;
    for (let r = 0; r < rows; r++) {
      let t = 0;
      for (let c = 0; c < 3; c++) {
        const it = s.items[r * 3 + c];
        if (it) t = Math.max(t, it._textH || 0);
      }
      s._rowTextH[r] = t;
      h += P.cardH + P.imgTextGap + t;
    }
    return h + (rows - 1) * P.rowGap;
  }

  function storyContentH(s) {
    const rows = Math.ceil(s.items.length / 2);
    s._rowTitleH = []; s._rowTextH = [];
    let h = 0;
    for (let r = 0; r < rows; r++) {
      let t = 0, bl = 0;
      for (let c = 0; c < 2; c++) {
        const it = s.items[r * 2 + c];
        if (!it) continue;
        t = Math.max(t, (it._titleLines || []).length * P.storyTitleLh || P.storyTitleLh);
        bl = Math.max(bl, (it._bodyLines || []).length);
      }
      s._rowTitleH[r] = t || P.storyTitleLh;
      s._rowTextH[r] = (bl || P.storyLines) * P.storyLineH;
      h += P.cardH + P.storyTitleGap + s._rowTitleH[r] + P.storyTextGap + s._rowTextH[r];
    }
    return h + (rows - 1) * P.rowGap;
  }

  function measure(secs, opt) {
    let y = P.titleTop + P.titleH + (opt._hasSub ? 56 : 0) + P.afterTitle;
    secs.forEach(s => {
      const contentH = s.kind === 'cards'
        ? cardContentH(s)
        : s.kind === 'stories'
          ? storyContentH(s)
          : P.wideH;
      s._contentH = contentH;
      s._top = y;
      y += P.labelH + s.gapAfterLabel + contentH + P.sectionGap;
    });
    return y - P.sectionGap + P.bottom;
  }

  /* ---------------- 图片预加载 ---------------- */
  function loadImage(src) {
    return new Promise(resolve => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });
  }

  /* ---------------- 主渲染 ---------------- */
  async function render(canvas, world, options) {
    const opt = Object.assign({
      scale: 1, theme: 'dark', subtitle: false, alwaysShowScene: true, showFooter: false,
      maxChars: 6, maxFacs: 6, maxStories: 4
    }, options || {});

    const T = THEMES[opt.theme] || THEMES.dark;
    opt._hasTitle = !!(world.meta && world.meta.name);
    opt._hasSub = !!(opt.subtitle && world.meta && world.meta.subtitle);
    await ensureFont();
    const secs = buildSections(world, opt);
    prepareCards(secs);
    prepareStories(secs);
    const H = Math.round(Math.max(measure(secs, opt), 900));

    // 预加载图片
    const allSrc = [];
    secs.forEach(s => {
      if (s.kind === 'wide') { if (s.item.img) allSrc.push(s.item.img); }
      else s.items.forEach(i => { if (i.img) allSrc.push(i.img); });
    });
    const imgMap = new Map();
    await Promise.all(allSrc.map(async src => {
      if (!imgMap.has(src)) imgMap.set(src, await loadImage(src));
    }));

    const S = opt.scale || 1;
    canvas.width = P.W * S;
    canvas.height = H * S;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(S, 0, 0, S, 0, 0);
    ctx.clearRect(0, 0, P.W, H);

    // 背景
    ctx.fillStyle = T.bg;
    ctx.fillRect(0, 0, P.W, H);

    // 标题（没填就留白，不塞占位词）+ 右上角「设计者」
    const titleText = (world.meta && world.meta.name) || '未命名世界';
    const designerName = String((world.meta && world.meta.designer) || '').trim();
    const designerText = designerName ? `设计者：${designerName}` : '';

    // 先量设计者那行要占多宽：标题太长时自动缩字号，两者不会撞在一起
    let dText = '', dFont = P.designerFont;
    if (designerText) {
      // 设计者最多占可用宽度的 30%，保证世界名始终是主角
      ctx.font = `${dFont}px ${FF}`;
      const fit = fitShrink(ctx, designerText, (P.W - P.titleX * 2) * P.designerMaxW, dFont, 16);
      dText = fit.text; dFont = fit.font;
      ctx.font = `${dFont}px ${FF}`;
    }
    const dw = dText ? ctx.measureText(dText).width : 0;

    let titleFont = P.titleFont;
    ctx.font = `${titleFont}px ${FF}`;
    const titleMax = P.W - P.titleX * 2 - (dw ? dw + P.designerGap : 0);
    while (titleFont > 64 && ctx.measureText(titleText).width > titleMax) {
      titleFont -= 2;
      ctx.font = `${titleFont}px ${FF}`;
    }
    const titleOut = ctx.measureText(titleText).width > titleMax
      ? fitOneLine(ctx, titleText, titleMax)
      : titleText;

    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillStyle = T.text;
    ctx.font = `${titleFont}px ${FF}`;
    ctx.fillText(titleOut, P.titleX, P.titleTop);

    if (dText) {
      ctx.textAlign = 'right';
      ctx.fillStyle = T.designer;
      ctx.font = `${dFont}px ${FF}`;
      ctx.fillText(dText, P.W - P.titleX, P.designerTop);
    }

    if (opt._hasSub && opt._hasTitle) {
      ctx.font = `${P.subFont}px ${FF}`;
      ctx.fillStyle = T.textDim;
      ctx.fillText(world.meta.subtitle, P.titleX + 3, P.subTop);
    }

    // 区块
    secs.forEach(s => {
      let y = s._top;

      // 标签
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillStyle = T.label;
      ctx.font = `${P.labelFont}px ${FF}`;
      ctx.fillText(s.label, P.labelX, y);
      y += P.labelH + s.gapAfterLabel;

      if (s.kind === 'cards') {
        const rows = Math.ceil(s.items.length / 3);
        for (let r = 0; r < rows; r++) {
          const n = Math.min(3, s.items.length - r * 3);
          const xs = rowXs(P.col3, n);
          for (let c = 0; c < n; c++) {
            const it = s.items[r * 3 + c];
            if (!it) continue;
            drawCard(ctx, T, it, xs[c], y, imgMap);
          }
          y += P.cardH + P.imgTextGap + (s._rowTextH[r] || 0) + P.rowGap;
        }
      } else if (s.kind === 'stories') {
        const rows = Math.ceil(s.items.length / 2);
        for (let r = 0; r < rows; r++) {
          const sn = Math.min(2, s.items.length - r * 2);
          const sxs = rowXs(P.col2, sn);
          for (let c = 0; c < sn; c++) {
            const it = s.items[r * 2 + c];
            if (!it) continue;
            const x = sxs[c];
            const tx = x + P.cardW / 2;
            const img = it.img ? imgMap.get(it.img) : null;
            drawImageBox(ctx, T, img, x, y, P.cardW, P.cardH, it.key, it.color);

            // 标题（优先一行，放不下两行对半分）
            const titleH = (s._rowTitleH && s._rowTitleH[r]) || P.storyTitleLh;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'top';
            ctx.fillStyle = T.text;
            ctx.font = `${it._titleFont || P.storyTitleFont}px ${FF}`;
            let ty = y + P.cardH + P.storyTitleGap;
            (it._titleLines || wrapBalanced(ctx, it.title, P.textMaxW, P.storyTitleLines)).forEach(l => {
              ctx.fillText(l, tx, ty);
              ty += P.storyTitleLh;
            });

            // 正文：优先用「一句话简介」，没填就用正文的第一句
            ty = y + P.cardH + P.storyTitleGap + titleH + P.storyTextGap;
            ctx.font = `${P.storyFont}px ${FF}`;
            ctx.fillStyle = T.textDim;
            const lines = (it._bodyLines && it._bodyLines.length)
              ? it._bodyLines
              : wrapLines(ctx, storyText(it), P.textMaxW, P.storyLines);
            lines.forEach(l => {
              ctx.fillText(l, tx, ty);
              ty += P.storyLineH;
            });
          }
          y += P.cardH + P.storyTitleGap + ((s._rowTitleH && s._rowTitleH[r]) || P.storyTitleLh)
             + P.storyTextGap + ((s._rowTextH && s._rowTextH[r]) || P.storyLines * P.storyLineH) + P.rowGap;
        }
      } else if (s.kind === 'wide') {
        const img = s.item.img ? imgMap.get(s.item.img) : null;
        drawImageBox(ctx, T, img, P.wideX, y, P.wideW, P.wideH, s.item.key, null);
      }
    });

    // 落款
    if (opt.showFooter) {
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.font = `32px ${FF}`;
      ctx.fillStyle = T.footer;
      const d = new Date();
      const stamp = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
      const who = world.meta.author ? `${world.meta.author}  ·  ${stamp}` : stamp;
      ctx.fillText(`${world.meta.name || ''}  ·  ${who}`, P.W / 2, H - 176);
    }

    // 署名：始终绘制，图被转走也留得住出处
    drawCredit(ctx, T, H);

    return { width: P.W, height: H, scale: S };
  }

  function drawCredit(ctx, T, H) {
    const cx = P.W / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';

    ctx.strokeStyle = T.creditLine;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 120, H - 126);
    ctx.lineTo(cx + 120, H - 126);
    ctx.stroke();

    ctx.font = `26px ${FF}`;
    const l1 = fitShrink(ctx, `${CREDIT.title}   ·   ${CREDIT.titleEn}`, P.W - 200, 26, 18);
    ctx.font = `${l1.font}px ${FF}`;
    ctx.fillStyle = T.credit;
    ctx.fillText(l1.text, cx, H - 104);

    ctx.font = `20px ${FF}`;
    ctx.fillStyle = T.creditDim;
    ctx.fillText(CREDIT.url, cx, H - 70);
  }

  function drawCard(ctx, T, it, x, y, imgMap) {
    const img = it.img ? imgMap.get(it.img) : null;
    drawImageBox(ctx, T, img, x, y, P.cardW, P.cardH, it.key, it.color);
    const cx = x + P.cardW / 2;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    let ty = y + P.cardH + P.imgTextGap;

    // 名字
    ctx.font = `${P.nameFont}px ${FF}`;
    ctx.fillStyle = T.text;
    if (it._name) ctx.fillText(it._name, cx, ty);
    ty += P.nameH;

    // 称号 · 势力 / 格言
    if (it._meta) {
      ctx.font = `${it._metaFont || P.metaFont}px ${FF}`;
      ctx.fillStyle = T.textDim;
      ctx.fillText(it._meta, cx, ty);
      ty += P.metaH;
    }

    // 简介（自由编辑的正文，自动换行）
    if (it._bio && it._bio.length) {
      ctx.font = `${P.bioFont}px ${FF}`;
      ctx.fillStyle = T.textDim;
      it._bio.forEach(l => {
        ctx.fillText(l, cx, ty);
        ty += P.bioLineH;
      });
    }
  }

  function drawImageBox(ctx, T, img, x, y, w, h, label, color) {
    if (img) {
      drawCover(ctx, img, x, y, w, h, 0);
      return;
    }
    // 占位
    ctx.save();
    ctx.fillStyle = T.phFill;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = T.phLine;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x + 0.75, y + 0.75, w - 1.5, h - 1.5);
    if (label) {
      const ch = String(label).replace(/[《》「」]/g, '').slice(0, 1);
      ctx.fillStyle = T.phText;
      ctx.font = `${Math.min(w, h) * 0.28}px ${FF}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(ch, x + w / 2, y + h / 2);
    }
    ctx.restore();
  }

  /* ---------------- 导出 ---------------- */
  function toBlob(canvas) {
    return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
  }

  async function download(canvas, filename) {
    const blob = await toBlob(canvas);
    if (!blob) return false;
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename || 'world.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
    return true;
  }

  window.Poster = { render, download, toBlob, THEMES, P, CREDIT };
})();
