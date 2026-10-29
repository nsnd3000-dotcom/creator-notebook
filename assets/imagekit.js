/* ============================================================
   imagekit.js — 图片导入：选择 / 拖拽 / 粘贴 / 链接
   统一压缩、保留透明通道、给出尺寸与体积信息
   ============================================================ */
(function (global) {
  'use strict';

  const MAX_FILE = 30 * 1024 * 1024;      // 单张上限 30MB
  const ACCEPT = /^image\//i;

  /* ---------- 基础读取 ---------- */
  function readFile(file) {
    return new Promise((resolve, reject) => {
      const r = new FileReader();
      r.onload = () => resolve(r.result);
      r.onerror = () => reject(new Error('文件读取失败'));
      r.readAsDataURL(file);
    });
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('这张图片解析失败了（可能是 HEIC/RAW 等浏览器不支持的格式）'));
      img.src = src;
    });
  }

  /* ---------- 透明度检测（抽样，避免全图遍历） ---------- */
  function hasAlpha(ctx, w, h) {
    try {
      const d = ctx.getImageData(0, 0, w, h).data;
      const step = 4 * 11;                 // 每 11 个像素抽一个
      for (let i = 3; i < d.length; i += step) {
        if (d[i] < 252) return true;
      }
    } catch (e) { /* getImageData 受限时当作无透明 */ }
    return false;
  }

  function base64Bytes(dataURL) {
    const i = dataURL.indexOf(',');
    const s = i >= 0 ? dataURL.slice(i + 1) : dataURL;
    return Math.round(s.length * 3 / 4);
  }

  /* ---------- 主流程：任意来源 → 压缩后的 dataURL ---------- */
  // src 可以是 File / Blob / dataURL 字符串
  // opt: { maxSide, quality, keepAlpha }
  async function prepare(src, opt) {
    opt = opt || {};
    const maxSide = opt.maxSide || 1600;
    const quality = opt.quality || 0.88;

    let dataURL;
    if (typeof src === 'string') {
      dataURL = src;
    } else {
      if (src.size > MAX_FILE) {
        throw new Error('图片太大了（' + (src.size / 1048576).toFixed(1) + 'MB），请压到 30MB 以内');
      }
      const type = (src.type || '').toLowerCase();
      if (type && !ACCEPT.test(type) && !/\.(png|jpe?g|webp|gif|bmp|avif|svg)$/i.test(src.name || '')) {
        throw new Error('这不是图片文件：' + (src.name || type));
      }
      dataURL = await readFile(src);
    }

    const img = await loadImage(dataURL);
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    if (!w || !h) throw new Error('这张图片没有有效的尺寸信息');

    let side = Math.min(1, maxSide / Math.max(w, h));
    let out = encode(img, side, quality);

    // PNG 体积失控时降一档再试
    if (out.type === 'image/png' && out.bytes > 1.8 * 1024 * 1024 && side > 0.5) {
      const smaller = encode(img, side * 0.68, quality);
      if (smaller.bytes < out.bytes) out = smaller;
    }

    return {
      data: out.data,
      width: Math.round(w * out.side),
      height: Math.round(h * out.side),
      bytes: out.bytes,
      type: out.type,
      transparent: out.type === 'image/png'
    };
  }

  function encode(img, side, quality) {
    const w = img.naturalWidth || img.width;
    const h = img.naturalHeight || img.height;
    const cw = Math.max(1, Math.round(w * side));
    const ch = Math.max(1, Math.round(h * side));
    const cv = document.createElement('canvas');
    cv.width = cw; cv.height = ch;
    const ctx = cv.getContext('2d');
    ctx.imageSmoothingQuality = 'high';
    ctx.clearRect(0, 0, cw, ch);
    ctx.drawImage(img, 0, 0, cw, ch);

    // 有透明通道就存 PNG（徽记、抠图立绘不会被填成黑块）
    if (hasAlpha(ctx, cw, ch)) {
      const data = cv.toDataURL('image/png');
      return { data, bytes: base64Bytes(data), type: 'image/png', side };
    }
    const data = cv.toDataURL('image/jpeg', quality);
    return { data, bytes: base64Bytes(data), type: 'image/jpeg', side };
  }

  /* ---------- 文件选择框 ---------- */
  function pick(opt) {
    opt = opt || {};
    return new Promise(resolve => {
      const inp = document.createElement('input');
      inp.type = 'file';
      inp.accept = 'image/*';
      if (opt.multiple) inp.multiple = true;
      inp.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
      document.body.appendChild(inp);
      inp.onchange = () => {
        const files = Array.from(inp.files || []);
        inp.remove();
        resolve(files);
      };
      // 用户取消时（部分浏览器不触发 change）兜底清理
      inp.addEventListener('cancel', () => { inp.remove(); resolve([]); });
      inp.click();
    });
  }

  /* ---------- 从链接拉取 ---------- */
  async function fromURL(url) {
    url = String(url || '').trim();
    if (!url) throw new Error('请先粘贴图片链接');
    if (/^data:image\//i.test(url)) return url;
    if (!/^https?:\/\//i.test(url)) throw new Error('链接要以 http:// 或 https:// 开头');
    let res;
    try {
      res = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'no-cache' });
    } catch (e) {
      throw new Error('这个链接拿不到图片（可能有防盗链或跨域限制），可以先把图片存到本地再上传');
    }
    if (!res.ok) throw new Error('链接返回 ' + res.status + '，拿不到图片');
    const blob = await res.blob();
    if (!ACCEPT.test(blob.type) && !/\.(png|jpe?g|webp|gif|bmp|avif)$/i.test(url)) {
      throw new Error('这个链接不是图片');
    }
    return blob;
  }

  function fmtBytes(b) {
    if (!b && b !== 0) return '';
    if (b < 1024) return b + ' B';
    if (b < 1048576) return (b / 1024).toFixed(0) + ' KB';
    return (b / 1048576).toFixed(1) + ' MB';
  }

  /* ---------- 裁剪弹窗 ----------
     src: dataURL；opt: { aspect, title }
     resolve(croppedDataURL) —— 确认裁剪
     resolve(src)            —— 使用原图
     resolve(null)           —— 取消                                  */
  function crop(src, opt) {
    opt = opt || {};
    const aspect = opt.aspect || 1;

    return new Promise(resolve => {
      loadImage(src).then(img => {
        const W = img.naturalWidth || img.width;
        const H = img.naturalHeight || img.height;
        if (!W || !H) { resolve(src); return; }

        const mask = document.createElement('div');
        mask.className = 'crop-mask';
        mask.innerHTML =
          '<div class="crop-dialog">' +
            '<div class="crop-head"><b>' + (opt.title || '裁剪图片') + '</b><span>拖动调整位置 · 滚轮或滑杆缩放</span></div>' +
            '<div class="crop-stage"><canvas></canvas></div>' +
            '<div class="crop-tools"><span class="crop-z">−</span><input type="range" min="100" max="600" value="100"><span class="crop-z">＋</span></div>' +
            '<div class="crop-foot">' +
              '<button type="button" class="cbtn" data-x="raw">使用原图</button>' +
              '<span style="flex:1"></span>' +
              '<button type="button" class="cbtn" data-x="cancel">取消</button>' +
              '<button type="button" class="cbtn pri" data-x="ok">确认裁剪</button>' +
            '</div>' +
          '</div>';
        document.body.appendChild(mask);

        const stage = mask.querySelector('.crop-stage');
        const cv = mask.querySelector('canvas');
        const slider = mask.querySelector('input[type=range]');
        const ctx = cv.getContext('2d');

        let cw = 0, ch = 0, box = { x: 0, y: 0, w: 0, h: 0 };
        let scale = 1, minScale = 1, ox = 0, oy = 0;

        function layout() {
          const r = stage.getBoundingClientRect();
          cw = Math.max(220, r.width);
          ch = Math.max(220, r.height);
          const dpr = window.devicePixelRatio || 1;
          cv.width = Math.round(cw * dpr);
          cv.height = Math.round(ch * dpr);
          ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
          let bw = cw * 0.72, bh = bw / aspect;
          if (bh > ch * 0.72) { bh = ch * 0.72; bw = bh * aspect; }
          box = { x: (cw - bw) / 2, y: (ch - bh) / 2, w: bw, h: bh };
          minScale = Math.max(bw / W, bh / H);
          scale = minScale;
          ox = box.x + box.w / 2 - W * scale / 2;
          oy = box.y + box.h / 2 - H * scale / 2;
          draw();
        }

        function clampPan() {
          const minOx = box.x + box.w - W * scale, minOy = box.y + box.h - H * scale;
          ox = Math.min(box.x, Math.max(minOx, ox));
          oy = Math.min(box.y, Math.max(minOy, oy));
        }

        function draw() {
          ctx.clearRect(0, 0, cw, ch);
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, ox, oy, W * scale, H * scale);
          // 暗罩（中间挖出裁剪区）
          ctx.fillStyle = 'rgba(4,4,7,.55)';
          ctx.beginPath();
          ctx.rect(0, 0, cw, ch);
          ctx.rect(box.x, box.y, box.w, box.h);
          ctx.fill('evenodd');
          // 三分线
          ctx.strokeStyle = 'rgba(255,255,255,.14)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          for (let i = 1; i < 3; i++) {
            ctx.moveTo(box.x + box.w * i / 3, box.y);
            ctx.lineTo(box.x + box.w * i / 3, box.y + box.h);
            ctx.moveTo(box.x, box.y + box.h * i / 3);
            ctx.lineTo(box.x + box.w, box.y + box.h * i / 3);
          }
          ctx.stroke();
          // 边框
          ctx.strokeStyle = '#c9a86a';
          ctx.lineWidth = 1.5;
          ctx.strokeRect(box.x + .5, box.y + .5, box.w - 1, box.h - 1);
        }

        function zoomTo(next) {
          next = Math.min(minScale * 6, Math.max(minScale, next));
          if (next === scale) return;
          const cx = box.x + box.w / 2, cy = box.y + box.h / 2;
          const ix = (cx - ox) / scale, iy = (cy - oy) / scale;
          scale = next;
          ox = cx - ix * scale;
          oy = cy - iy * scale;
          clampPan();
          slider.value = Math.round(scale / minScale * 100);
          draw();
        }

        // 拖动
        let dragging = false, lx = 0, ly = 0;
        cv.addEventListener('pointerdown', e => {
          dragging = true; lx = e.clientX; ly = e.clientY;
          cv.setPointerCapture(e.pointerId);
        });
        cv.addEventListener('pointermove', e => {
          if (!dragging) return;
          ox += e.clientX - lx; oy += e.clientY - ly;
          lx = e.clientX; ly = e.clientY;
          clampPan(); draw();
        });
        const stop = () => { dragging = false; };
        cv.addEventListener('pointerup', stop);
        cv.addEventListener('pointercancel', stop);

        // 滚轮与滑杆
        cv.addEventListener('wheel', e => {
          e.preventDefault();
          zoomTo(scale * (e.deltaY < 0 ? 1.09 : 1 / 1.09));
        }, { passive: false });
        slider.addEventListener('input', () => zoomTo(minScale * slider.value / 100));

        function done(v) {
          window.removeEventListener('keydown', onKey, true);
          mask.remove();
          resolve(v);
        }
        function onKey(e) {
          if (e.key === 'Escape') { e.stopPropagation(); e.preventDefault(); done(null); }
          if (e.key === 'Enter') { e.stopPropagation(); e.preventDefault(); confirmCrop(); }
        }
        window.addEventListener('keydown', onKey, true);

        function confirmCrop() {
          const sx = (box.x - ox) / scale, sy = (box.y - oy) / scale;
          const sw = box.w / scale, sh = box.h / scale;
          const k = Math.min(1, 2400 / Math.max(sw, sh));
          const oc = document.createElement('canvas');
          oc.width = Math.max(1, Math.round(sw * k));
          oc.height = Math.max(1, Math.round(sh * k));
          const octx = oc.getContext('2d');
          octx.imageSmoothingQuality = 'high';
          octx.drawImage(img, sx, sy, sw, sh, 0, 0, oc.width, oc.height);
          done(oc.toDataURL('image/png'));
        }

        mask.addEventListener('click', e => {
          if (e.target === mask) { done(null); return; }
          const b = e.target.closest('[data-x]');
          if (!b) return;
          if (b.dataset.x === 'cancel') done(null);
          else if (b.dataset.x === 'raw') done(src);
          else if (b.dataset.x === 'ok') confirmCrop();
        });

        layout();
      }).catch(() => resolve(null));
    });
  }

  global.ImageKit = { prepare, pick, fromURL, readFile, crop, fmtBytes, MAX_FILE };
})(window);
