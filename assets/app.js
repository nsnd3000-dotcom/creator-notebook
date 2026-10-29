/* ============================================================
   app.js — 界面逻辑：路由 / 渲染 / 编辑 / 导出
   ============================================================ */
(function () {
  'use strict';

  const $ = s => document.querySelector(s);
  const $$ = s => Array.from(document.querySelectorAll(s));

  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[m]));

  /* ---------------- 图标 ---------------- */
  const IC = {
    grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.2"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.2"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.2"/>',
    user: '<circle cx="12" cy="8" r="3.8"/><path d="M4.6 20.4c0-3.6 3.3-6.4 7.4-6.4s7.4 2.8 7.4 6.4"/>',
    net: '<circle cx="12" cy="5.5" r="2.2"/><circle cx="5.5" cy="18" r="2.2"/><circle cx="18.5" cy="18" r="2.2"/><path d="M10.6 7.4L7 15.8M13.4 7.4L17 15.8M7.7 18h8.6"/>',
    flag: '<path d="M6 21V3.8M6 4.4c4-1.6 7 1.4 12 0v9c-5 1.4-8-1.6-12 0"/>',
    city: '<path d="M3.2 20.5h17.6M5 20.5V9.4l5.2-3v14.1M10.2 20.5V11l5.3-1.8v11.3M15.5 20.5V9.8l4 3v7.7"/>',
    book: '<path d="M5 4.8A2 2 0 017 3h12v18H7a2 2 0 00-2 2z"/><path d="M5 18.6c0-1 .7-1.8 1.8-1.8H19M9 7.6h6"/>',
    time: '<path d="M3.6 6.4h16.8M6.6 6.4v3.2M12 6.4v5M17.4 6.4v2.4M3.6 13h16.8M6.6 13v3.6M12 13v6M17.4 13v2.8"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    edit: '<path d="M4 20h4L19 9a2.1 2.1 0 00-3-3L5 17z"/>',
    trash: '<path d="M4.5 7h15M9.5 7V4.6h5V7M6.5 7l1 13h9l1-13M10 11v5M14 11v5"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    img: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="M4 17l5-4.6 4 3.4 3-2.4 4 3.6"/>',
    down: '<path d="M12 3.5v11.8M12 15.3l-4-4M12 15.3l4-4M4.5 19.5h15"/>',
    refresh: '<path d="M19.5 12a7.5 7.5 0 11-2.2-5.3M19.8 4.5v4.4h-4.4"/>',
    lock: '<rect x="4.6" y="10.4" width="14.8" height="9.9" rx="1.4"/><path d="M8.2 10.4V7.7a3.8 3.8 0 017.6 0v2.7"/><circle cx="12" cy="15.3" r="1.05"/>',
    note: '<path d="M6.2 3.6h7.6l4 4v12.8H6.2z"/><path d="M13.8 3.6v4h4M9.2 11.6h5.6M9.2 15h5.6"/>',
    check: '<rect x="3.8" y="3.8" width="16.4" height="16.4" rx="1.6"/><path d="M8 12.4l2.7 2.7 5.3-5.6"/>',
    tick: '<path d="M5 12.9l4.5 4.5L19 6.9"/>',
    search: '<circle cx="10.6" cy="10.6" r="6.4"/><path d="M15.4 15.4L21 21"/>'
  };
  const ic = (n, cls) => `<svg viewBox="0 0 24 24" class="ico${cls ? ' ' + cls : ''}">${IC[n] || ''}</svg>`;

  /* ---------------- 导航 ---------------- */
  const NAV = [
    { id: 'overview', label: '总览', icon: 'grid' },
    { id: 'characters', label: '人物', icon: 'user', key: 'characters' },
    { id: 'relations', label: '关系网', icon: 'net', key: 'relations' },
    { id: 'factions', label: '势力', icon: 'flag', key: 'factions' },
    { id: 'cities', label: '城市与背景', icon: 'city', key: 'cities' },
    { id: 'stories', label: '故事', icon: 'book', key: 'stories' },
    { id: 'timeline', label: '时间线', icon: 'time', key: 'timeline' },
    { id: 'memos', label: '备忘录', icon: 'note', key: 'memos' },
    { id: 'todos', label: '待办', icon: 'check', key: 'todos' },
    { id: 'privacy', label: '本地模式', icon: 'lock' }
  ];

  /* ---------------- 表单 Schema ---------------- */
  const REL_KINDS = ['亲情', '爱情', '师徒', '盟友', '敌对', '主仆', '同僚', '其他'];

  const SCHEMA = {
    characters: {
      kicker: 'Character', title: '人物',
      fields: [
        { k: 'name', label: '姓名', type: 'text', req: true, ph: '林砚' },
        { k: 'alias', label: '称号 / 别称', type: 'text', ph: '守灯人' },
        { k: 'role', label: '身份定位', type: 'text', ph: '主角 / 反派 / 配角' },
        { k: 'factionId', label: '所属势力', type: 'select', source: 'factions' },
        { k: 'age', label: '年龄', type: 'text', ph: '27' },
        { k: 'desc', label: '人物简介', type: 'textarea', rows: 5, ph: '一段能让人记住他的话。' },
        { k: 'tags', label: '标签', type: 'tags', ph: '输入后回车' },
        { k: 'color', label: '主题色', type: 'color' },
        { k: 'image', label: '立绘 / 头像', type: 'image' }
      ],
      auto: () => ({ name: '', alias: '', role: '', factionId: '', age: '', desc: '', tags: [], color: '#c9a86a', image: '' })
    },
    factions: {
      kicker: 'Faction', title: '势力',
      fields: [
        { k: 'name', label: '势力名称', type: 'text', req: true, ph: '灯塔公署' },
        { k: 'motto', label: '格言 / 口号', type: 'text', ph: '光不熄灭，雾便退让' },
        { k: 'leader', label: '首领', type: 'text', ph: '可从人物列表选，也可直接输入', list: 'charNames' },
        { k: 'desc', label: '势力简介', type: 'textarea', rows: 5 },
        { k: 'tags', label: '标签', type: 'tags' },
        { k: 'color', label: '主题色', type: 'color' },
        { k: 'image', label: '徽记 / 旗帜', type: 'image' }
      ],
      auto: () => ({ name: '', motto: '', leader: '', desc: '', tags: [], color: '#7f93b8', image: '' })
    },
    cities: {
      kicker: 'Place', title: '城市与背景',
      fields: [
        { k: 'name', label: '名称', type: 'text', req: true, ph: '雾港' },
        { k: 'region', label: '所在地域', type: 'text', ph: '北岸 · 潮汐三角洲' },
        { k: 'factionId', label: '归属势力', type: 'select', source: 'factions' },
        { k: 'desc', label: '背景描述', type: 'textarea', rows: 6 },
        { k: 'tags', label: '标签', type: 'tags' },
        { k: 'color', label: '主题色', type: 'color' },
        { k: 'image', label: '场景图（横向更佳）', type: 'image', wide: true }
      ],
      auto: () => ({ name: '', region: '', factionId: '', desc: '', tags: [], color: '#8f8f7a', image: '' })
    },
    stories: {
      kicker: 'Story', title: '故事',
      fields: [
        { k: 'title', label: '标题', type: 'text', req: true, ph: '《第十三座灯塔》' },
        { k: 'type', label: '篇幅', type: 'select', options: [{ v: 'long', t: '长篇' }, { v: 'short', t: '短篇' }] },
        { k: 'status', label: '状态', type: 'select', options: [{ v: '构思中', t: '构思中' }, { v: '连载中', t: '连载中' }, { v: '已完成', t: '已完成' }, { v: '搁置', t: '搁置' }] },
        { k: 'characters', label: '相关人物', type: 'checks', source: 'characters', hint: '出场或提及的人物，可多个' },
        { k: 'cityId', label: '发生地', type: 'select', source: 'cities' },
        { k: 'factionId', label: '涉及势力', type: 'select', source: 'factions' },
        { k: 'summary', label: '一句话简介', type: 'textarea', rows: 3, ph: '用一句话说出这个故事的核心。' },
        { k: 'body', label: '正文 / 大纲', type: 'textarea', rows: 12, ph: '在这里写完整的故事，或先搭大纲。' },
        { k: 'tags', label: '标签', type: 'tags' },
        { k: 'color', label: '主题色', type: 'color' },
        { k: 'image', label: '封面图', type: 'image' }
      ],
      auto: () => ({ title: '', type: 'short', status: '构思中', characters: [], cityId: '', factionId: '', summary: '', body: '', tags: [], color: '#c9a86a', image: '' })
    },
    timeline: {
      kicker: 'Timeline', title: '时间线事件',
      fields: [
        { k: 'era', label: '纪元 / 时期', type: 'text', ph: '雾历', list: 'eraList' },
        { k: 'date', label: '具体时间', type: 'text', ph: '雾历 74 年 · 春' },
        { k: 'title', label: '事件标题', type: 'text', req: true, ph: '第十三座灯塔重新点亮' },
        { k: 'type', label: '类型', type: 'select', options: [{ v: '事件', t: '事件' }, { v: '战争', t: '战争' }, { v: '灾难', t: '灾难' }, { v: '诞生', t: '诞生' }, { v: '逝世', t: '逝世' }, { v: '其他', t: '其他' }] },
        { k: 'desc', label: '事件描述', type: 'textarea', rows: 5 }
      ],
      auto: () => ({ era: '', date: '', title: '', type: '事件', desc: '' })
    },
    relations: {
      kicker: 'Relation', title: '人物关系',
      fields: [
        { k: 'a', label: '人物 A', type: 'select', source: 'characters', req: true },
        { k: 'b', label: '人物 B', type: 'select', source: 'characters', req: true },
        { k: 'label', label: '关系描述', type: 'text', ph: '旧识 / 杀父之仇 / 未婚夫妻' },
        { k: 'kind', label: '关系类型', type: 'select', options: REL_KINDS.map(k => ({ v: k, t: k })) }
      ],
      auto: () => ({ a: '', b: '', label: '', kind: '其他' })
    },
    memos: {
      kicker: 'Memo', title: '备忘录',
      fields: [
        { k: 'title', label: '标题', type: 'text', ph: '留空就只显示正文' },
        { k: 'body', label: '内容', type: 'textarea', rows: 15, ph: '随手记点什么。想到一半也行，反正只有你看得到。' }
      ],
      auto: () => ({ title: '', body: '', createdAt: Date.now(), updatedAt: Date.now() })
    },
    todos: {
      kicker: 'Todo', title: '待办',
      fields: [
        { k: 'text', label: '内容', type: 'textarea', rows: 3, req: true, ph: '要做什么' }
      ],
      auto: () => ({ text: '', done: false, createdAt: Date.now() })
    }
  };

  /* ---------------- 应用状态 ---------------- */
  const App = {
    world: null,
    route: 'overview',
    storyFilter: 'all',
    memoQuery: '',
    draft: null,
    draftKey: null,
    relGraph: null,
    posterScale: 1,
    posterTimer: null
  };

  /* ============================================================
     启动
     ============================================================ */
  async function boot() {
    App.world = await Store.load();
    renderNav();
    bindGlobal();
    syncTitle();
    App.route = (location.hash || '#overview').slice(1) || 'overview';
    if (!NAV.some(n => n.id === App.route)) App.route = 'overview';
    render();
  }

  function syncTitle() {
    $('#worldTitle').value = App.world.meta.name || '';
    document.title = (App.world.meta.name || '未命名世界') + ' · 创世者的笔记本';
  }

  /* ============================================================
     持久化
     ============================================================ */
  let saveTimer = null;
  function persist() {
    const el = $('#saveState');
    el.className = 'save-state saving';
    el.innerHTML = '<i></i>保存中';
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      const r = await Store.save();
      if (r === 'fail') {
        el.className = 'save-state err';
        el.innerHTML = '<i></i>保存失败';
        toast('浏览器存储已满，先「备份」导出一次，再删掉几张不用的图', true);
        return;
      }
      el.className = 'save-state';
      el.innerHTML = '<i></i>已保存';
      renderNav();
    }, 400);
  }

  function toast(msg, isErr) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = 'toast on' + (isErr ? ' err' : '');
    clearTimeout(t._tm);
    t._tm = setTimeout(() => { t.className = 'toast' + (isErr ? ' err' : ''); }, 2200);
  }

  /* ============================================================
     导航
     ============================================================ */
  function renderNav() {
    const w = App.world;
    $('#nav').innerHTML = NAV.map(n => {
      // 待办只数没做完的，做完的不占数字
      const cnt = n.key
        ? (n.key === 'todos' ? (w.todos || []).filter(t => !t.done).length : (w[n.key] || []).length)
        : '';
      return `<button class="nav-item${App.route === n.id ? ' active' : ''}" data-act="nav" data-route="${n.id}">
        ${ic(n.icon)}<span>${n.label}</span>${cnt !== '' ? `<em class="count">${cnt}</em>` : ''}
      </button>`;
    }).join('');
  }

  function go(route) {
    if (App.route === route) return;
    App.route = route;
    location.hash = route;
    render();
  }

  /* ============================================================
     主渲染
     ============================================================ */
  function render() {
    if (App.relGraph) { App.relGraph.destroy(); App.relGraph = null; }
    renderNav();

    const crumb = NAV.find(n => n.id === App.route);
    $('#crumb').textContent = crumb ? crumb.label : '';

    const view = $('#view');
    const map = {
      overview: renderOverview,
      characters: renderCharacters,
      relations: renderRelations,
      factions: renderFactions,
      cities: renderCities,
      stories: renderStories,
      timeline: renderTimeline,
      memos: renderMemos,
      todos: renderTodos,
      privacy: renderPrivacy
    };
    view.innerHTML = `<div class="view-inner">${(map[App.route] || renderOverview)()}</div>`;
    view.scrollTop = 0;

    if (App.route === 'overview') paintPoster();
    if (App.route === 'relations') mountRelations();
    if (App.route === 'memos') filterMemos(App.memoQuery);
  }

  function pageHead(title, desc, actions) {
    return `<div class="page-head">
      <div><h1>${title}</h1><p>${desc}</p></div>
      <div class="head-actions">${actions || ''}</div>
    </div>`;
  }

  /* ---------------- 总览 / 长图 ---------------- */
  function worldIsEmpty() {
    const w = App.world;
    return !(w.characters || []).length && !(w.factions || []).length &&
      !(w.stories || []).length && !(w.cities || []).length && !(w.timeline || []).length;
  }

  function renderOverview() {
    const w = App.world;
    const po = w.poster || {};
    const stats = [
      ['人物', (w.characters || []).length],
      ['势力', (w.factions || []).length],
      ['城市', (w.cities || []).length],
      ['故事', (w.stories || []).length],
      ['事件', (w.timeline || []).length]
    ];
    const blank = worldIsEmpty();

    return `
      ${pageHead('世界观总图', '左侧为长图预览，与导出图片完全一致。右侧挑选要出现在图上的内容，版式会自动排布。',
        `<button class="btn" data-act="export-json">${ic('down')} 备份</button>
         <button class="btn primary" data-act="export-poster">${ic('down')} 导出长图</button>`)}

      <div class="local-banner">
        <div class="lb-ico">${ic('lock')}</div>
        <div class="lb-text">
          <b>纯本地模式 · 你写的一切只存在这台设备上</b>
          <span>没有服务器、没有账号、没有统计，页面加载完成后不向任何第三方发送请求；内容不会被上传、同步，也无从被爬取。断网也能照常编辑与导出。</span>
        </div>
        <button class="btn sm ghost" data-act="nav" data-route="privacy">看原理</button>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:20px;flex-wrap:wrap">
        ${stats.map(s => `<span class="chip">${s[0]} <b style="color:#e6cf9e;margin-left:2px">${s[1]}</b></span>`).join('')}
        <span class="chip gold">${esc(w.meta.subtitle || '未填写副标题')}</span>
      </div>

      <div class="poster-layout">
        <div class="poster-stage${blank ? ' is-blank' : ''}">
          <div class="canvas-holder"><canvas id="posterCanvas"></canvas></div>
          ${blank ? `<div class="stage-empty">
            <strong>这张图还是空的</strong>
            <span>长图里每个文字、每张图都来自你填写的内容——<br>先去加一个人物，图就会跟着长出来。</span>
            <div class="stage-empty-acts">
              <button class="btn sm" data-act="new-item" data-key="characters">新增人物</button>
              <button class="btn sm ghost" data-act="nav" data-route="stories">去写故事</button>
              <button class="btn sm ghost" data-act="load-sample">载入示例看看</button>
            </div>
          </div>` : ''}
          <div class="stage-tip">
            <span>1080 × 自适应高度 · 与导出一致</span>
            <span id="stageSize">上下滚动查看</span>
          </div>
        </div>
        ${posterPanel(po)}
      </div>`;
  }

  /* ---------------- 本地模式说明 ---------------- */
  function renderPrivacy() {
    return `
      ${pageHead('本地模式', '这份声明写的是这个站点的运行方式，不是一串口号——下面每一条，都能在浏览器里当场验证。')}
      <div class="priv">
        <p class="priv-lede">你在这里写下的每一个字、上传的每一张图，都只存在于<em>这台设备的浏览器</em>里。没有服务器接收，没有账号绑定，没有云端副本，也没有任何一条路径能让它被上传、同步，或被爬虫取走。</p>

        <div class="priv-sec">
          <div class="priv-promise">
            <div class="priv-card">
              <span class="pc-n">01</span>
              <strong>没有后端</strong>
              <span>站点只有 HTML、CSS、JS、一张背景图和一份字体文件。没有接口、没有数据库、没有账号系统——不存在一个"收数据的地方"。</span>
            </div>
            <div class="priv-card">
              <span class="pc-n">02</span>
              <strong>没有网络请求</strong>
              <span>首屏加载完成后，页面不再发出任何请求：没有 fetch、没有 XHR、没有 WebSocket、没有统计埋点，也没有第三方 CDN 或在线字体服务。</span>
            </div>
            <div class="priv-card">
              <span class="pc-n">03</span>
              <strong>没有被爬取的面</strong>
              <span>爬虫能拿到的只有 GitHub 上这份公开源码，以及一个对所有人都一样的空白编辑器。你的世界从未进入网络，因此不存在"被爬"的介质。</span>
            </div>
          </div>
        </div>

        <div class="priv-sec">
          <h2>这一切的原理 <i>How it works</i></h2>
          <ol class="priv-list">
            <li><b>纯静态，没有任何服务端。</b>整个应用是几个 JS 文件在浏览器里运行，零依赖、无框架、无构建步骤。所谓"保存"，就是写进浏览器的本地存储，没有任何一步是发给别人的。</li>
            <li><b>数据落在哪。</b>世界内容写进浏览器的 <code>IndexedDB</code>（库名 <code>worldcraft</code>）；关系图的节点坐标、长图设置写进 <code>localStorage</code>。两者都受<b>同源策略</b>保护：只有本域名的脚本能读，别的网站、别的标签页都拿不到；网页也没有权限直接读写你的硬盘。</li>
            <li><b>请求面只有首屏那几个文件。</b>打开页面时浏览器只请求本站的 <code>index.html</code>、<code>style.css</code>、几个 <code>.js</code>、<code>bg.jpg</code> 和一份 <code>woff2</code> 字体。字体放在仓库里，而不是字体 CDN 上——很多号称"本地"的工具恰恰在这一步把访问记录交给了第三方，这里没有这一步。</li>
            <li><b>图片不出设备。</b>选择、拖拽、Ctrl+V 粘贴的图，都由浏览器读成内存里的数据；压缩和裁剪在 Canvas 上完成，全程不经过任何网络。</li>
            <li><b>导出是本地绘制。</b>长图和关系图由 Canvas 在内存里逐像素画出来，<code>toBlob()</code> 生成 PNG，再用一个隐藏的下载链接交给浏览器的下载通道存到你的硬盘。没有上传接口，也没有图片服务器。</li>
            <li><b>备份是一个文件。</b>"备份数据"生成的 JSON 通过本地 Blob 下载。它只在你主动发给别人（聊天、邮件、网盘）时，才会离开这台设备。</li>
            <li><b>从爬虫的视角看。</b>AI 爬虫抓的是公开网页。这个站点的公开部分永远只有"一份空白编辑器加源码"；内容躺在 IndexedDB 里，需要你这台机器的浏览器上下文才能读，任何外部 HTTP 请求都触不到它。</li>
          </ol>
        </div>

        <div class="priv-sec">
          <h2>怎么自己验证 <i>Verify yourself</i></h2>
          <ol class="priv-list">
            <li><b>拔网线。</b>打开页面、载入示例、改两个人物、导出一张长图——断网状态下一切照常。一个真的在偷偷上传的应用，这时候会卡住或报错。</li>
            <li><b>看 Network 面板。</b>按 F12 打开开发者工具，切到 Network 并勾上 Preserve log，然后把上面那套操作做一遍：除了最开始加载的几个静态文件，不会出现任何新请求。</li>
            <li><b>看存储。</b>开发者工具 → Application → IndexedDB → <code>worldcraft</code>，你的资料就在本地的库里；点一下 Clear site data，内容彻底消失，没有任何"云端副本"残留。</li>
            <li><b>读源码。</b>在仓库里搜 <code>fetch(</code>、<code>XMLHttpRequest</code>、<code>sendBeacon</code>，全项目只有一处，且只在你主动粘贴图片链接时触发（见下方边界说明）。</li>
          </ol>
        </div>

        <div class="priv-sec">
          <h2>数据都在哪、怎么删 <i>Where &amp; how to erase</i></h2>
          <table class="priv-table">
            <tr><th>内容</th><th>存在哪</th><th>怎么删</th></tr>
            <tr><td>世界设定、备忘录、待办</td><td>本机 IndexedDB（库名 worldcraft）</td><td>浏览器「清除站点数据」，或删除浏览数据</td></tr>
            <tr><td>关系图坐标、长图设置</td><td>本机 localStorage</td><td>同上</td></tr>
            <tr><td>导入的图片</td><td>以 dataURL 存进 IndexedDB</td><td>同上</td></tr>
            <tr><td>导出图、备份 JSON</td><td>你选择的下载目录</td><td>自己删文件即可</td></tr>
          </table>
        </div>

        <div class="priv-sec">
          <div class="priv-bound">
            <h3>边界：这几件事说清楚，才算严格</h3>
            <ul>
              <li><b>托管平台会看到"有人打开了这个页面"。</b>GitHub Pages 的服务器日志会记录访问本身（IP、时间、浏览器标识），这是任何网站都有的一层。它记录的是"打开过页面"，不是你在页面里写了什么——那些内容从未发送出去。</li>
              <li><b>你主动粘贴图片链接导入时，会向那个地址发一次请求。</b>目标是你给的图片所在网站，与本站无关，且已关闭凭据携带；不想要这次请求，就改成本地选图上传。</li>
              <li><b>你设备上的其他程序不在这份声明范围内。</b>浏览器扩展、输入法的云候选、把浏览器配置目录同步到网盘的软件，都可能读到本地数据——那是你自己装的东西，不是这个站点。</li>
              <li><b>分享即公开。</b>把导出图或备份 JSON 发给别人，对方就拿到了内容。这是你按下的动作，不是后台行为。</li>
            </ul>
          </div>
        </div>

        <div class="priv-foot">
          <span>最后核对：2026.10.29 · 测试版 v0.1.0</span>
          <a href="https://github.com/nsnd3000-dotcom/creator-notebook" target="_blank" rel="noopener">github.com/nsnd3000-dotcom/creator-notebook</a>
        </div>
      </div>`;
  }

  function posterPanel(po) {
    const w = App.world;
    return `<aside class="side-panel">
      <h3>长图设置</h3>

      <div class="field-row">
        <label>画面风格</label>
        <div class="seg" data-seg="theme">
          <button class="${po.theme !== 'light' ? 'on' : ''}" data-act="set-theme" data-v="dark">墨黑</button>
          <button class="${po.theme === 'light' ? 'on' : ''}" data-act="set-theme" data-v="light">纸白</button>
        </div>
      </div>
      <div class="field-row">
        <label>副标题</label>
        <div class="seg">
          <button class="${po.showSubtitle !== false ? 'on' : ''}" data-act="set-opt" data-k="showSubtitle" data-v="1">显示</button>
          <button class="${po.showSubtitle === false ? 'on' : ''}" data-act="set-opt" data-k="showSubtitle" data-v="0">隐藏</button>
        </div>
      </div>
      <div class="field-row">
        <label>底部落款</label>
        <div class="seg">
          <button class="${po.showFooter ? 'on' : ''}" data-act="set-opt" data-k="showFooter" data-v="1">显示</button>
          <button class="${!po.showFooter ? 'on' : ''}" data-act="set-opt" data-k="showFooter" data-v="0">隐藏</button>
        </div>
      </div>
      <div class="field-row">
        <label>导出清晰度</label>
        <div class="seg">
          <button class="${App.posterScale === 1 ? 'on' : ''}" data-act="set-scale" data-v="1">1×</button>
          <button class="${App.posterScale === 2 ? 'on' : ''}" data-act="set-scale" data-v="2">2×</button>
        </div>
      </div>

      <div style="margin-top:18px">
        <div class="field-row" style="padding:0;margin-bottom:9px">
          <label>世界一角</label>
          <div class="seg">
            <button class="${po.showScene !== false ? 'on' : ''}" data-act="set-opt" data-k="showScene" data-v="1">启用</button>
            <button class="${po.showScene === false ? 'on' : ''}" data-act="set-opt" data-k="showScene" data-v="0">关闭</button>
          </div>
        </div>
        <select id="sceneSelect" data-act="set-scene" ${po.showScene === false ? 'disabled' : ''} style="width:100%;background:#0c0c11;border:1px solid #26262e;border-radius:2px;padding:7px 9px;font-size:12.5px;color:#ececee;outline:none;${po.showScene === false ? 'opacity:.45' : ''}">
          ${sceneOptions(po)}
        </select>
        <div style="display:flex;gap:8px;margin-top:8px">
          <button class="btn sm ghost block" data-act="pick-scene" ${po.showScene === false ? 'disabled style="opacity:.45"' : ''}>上传自定义场景图</button>
        </div>
        <p style="font-size:10.5px;color:#63636f;line-height:1.7;margin:8px 0 0;letter-spacing:.02em">
          ${po.showScene === false
            ? '已关闭：导出图底部不会出现这张大图，其余区块自动上移。'
            : '不选时自动取第一张带图的城市或故事封面。卡片文字 = 名字 + 称号/势力 + 简介，改表单即改图。'}
        </p>
      </div>

      ${pickBlock('主要人物', 'characters', 'characters', 6)}
      ${pickBlock('背景与势力', 'factions', 'factions', 6)}
      ${pickBlock('故事', 'stories', 'stories', 4)}

      <div style="margin-top:20px;display:flex;flex-direction:column;gap:8px">
        <button class="btn primary block" data-act="export-poster">${ic('down')} 导出长图 PNG</button>
        <p style="font-size:11px;color:#63636f;margin:0;line-height:1.7">
          逐行排布：每行 3 个人物、3 个势力、2 个故事，底部一张大场景图。未选时自动取最前面的条目。
        </p>
      </div>
    </aside>`;
  }

  function sceneOptions(po) {
    const w = App.world;
    const ref = po.sceneRef || { type: 'auto' };
    let html = `<option value="auto">自动（取第一张有图的城市）</option>`;
    (w.cities || []).forEach(c => {
      html += `<option value="city:${c.id}" ${ref.type === 'city' && ref.id === c.id ? 'selected' : ''}>城市 · ${esc(c.name)}</option>`;
    });
    (w.stories || []).forEach(s => {
      html += `<option value="story:${s.id}" ${ref.type === 'story' && ref.id === s.id ? 'selected' : ''}>故事封面 · ${esc(s.title)}</option>`;
    });
    if (ref.type === 'custom') html += `<option value="custom" selected>自定义上传图</option>`;
    return html;
  }

  function pickBlock(title, key, listKey, max) {
    const w = App.world;
    const list = w[listKey] || [];
    if (!list.length) {
      return `<div style="margin-top:18px"><h3 style="font-size:12.5px">${title}</h3>
        <p style="font-size:11.5px;color:#63636f;margin:0">暂无内容</p></div>`;
    }
    const po = w.poster || {};
    const picked = po[key] || [];
    return `<div style="margin-top:18px">
      <h3 style="font-size:12.5px">${title} <em style="font-style:normal;color:#6b6b76;font-weight:400;font-size:11px">最多 ${max}</em></h3>
      <div class="pick-list">
        ${list.map(it => {
          const i = picked.indexOf(it.id);
          const on = i >= 0 || !picked.length && list.indexOf(it) < max;
          const label = it.name || it.title || '未命名';
          const img = it.image;
          return `<div class="pick ${on ? 'on' : ''}" data-act="toggle-pick" data-key="${key}" data-id="${it.id}" data-max="${max}">
            <span class="box"></span>
            ${img ? `<img class="thumb" src="${img}" alt="">` : `<span class="thumb ph">${esc(label.slice(0, 1))}</span>`}
            <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(label)}</span>
            ${i >= 0 ? `<span class="order">${i + 1}</span>` : ''}
            <button class="pick-edit" data-act="edit-item" data-key="${listKey}" data-id="${it.id}" title="编辑这条（文字 / 头像）">${ic('edit')}</button>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }

  async function paintPoster() {
    const canvas = $('#posterCanvas');
    if (!canvas) return;
    if (worldIsEmpty()) { canvas.width = 0; canvas.height = 0; return; }
    const po = App.world.poster || {};
    try {
      const res = await Poster.render(canvas, App.world, {
        scale: App.posterScale,
        theme: po.theme || 'dark',
        subtitle: po.showSubtitle !== false,
        showFooter: !!po.showFooter,
        showScene: po.showScene !== false,
        alwaysShowScene: true
      });
      const st = document.getElementById('stageSize');
      if (st && res) st.textContent = `${res.width * res.scale} × ${res.height * res.scale} px`;
    } catch (e) {
      console.error(e);
      toast('长图渲染出错：' + e.message, true);
    }
  }

  function repaintPoster() {
    clearTimeout(App.posterTimer);
    App.posterTimer = setTimeout(paintPoster, 60);
  }

  /* ---------------- 人物 ---------------- */
  function renderCharacters() {
    const list = App.world.characters || [];
    const cards = list.map(c => {
      const fac = c.factionId ? Store.factionName(c.factionId) : '';
      return `<article class="card" data-act="edit-item" data-key="characters" data-id="${c.id}">
        <div class="card-media">
          ${c.image ? `<img src="${c.image}" alt="${esc(c.name)}">` : `<div class="ph" style="color:${esc(c.color || '#2a2a33')}">${esc((c.name || '?').slice(0, 1))}</div>`}
          <div class="card-actions">
            <button class="card-act" data-act="del-item" data-key="characters" data-id="${c.id}" title="删除">${ic('trash')}</button>
          </div>
        </div>
        <div class="card-body">
          <h3>${esc(c.name || '未命名')}</h3>
          <p class="sub">${esc([c.alias, c.role, fac].filter(Boolean).join(' · '))}</p>
          <p class="desc">${esc(c.desc || '还没有写下这个人的故事。')}</p>
          ${(c.tags || []).length ? `<div class="card-tags">${c.tags.slice(0, 3).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>
      </article>`;
    }).join('');

    return `
      ${pageHead('人物', `共 ${list.length} 位。点击卡片编辑，右上角可删除。人物会出现在长图的「主要人物」区块。`,
        `<button class="btn primary" data-act="new-item" data-key="characters">${ic('plus')} 新增人物</button>`)}
      <div class="grid c4">
        ${cards}
        <button class="card add" data-act="new-item" data-key="characters">
          <div style="text-align:center"><div class="plus">+</div><span>新增人物</span></div>
        </button>
      </div>`;
  }

  /* ---------------- 势力 ---------------- */
  function renderFactions() {
    const list = App.world.factions || [];
    const cards = list.map(f => {
      const members = (App.world.characters || []).filter(c => c.factionId === f.id);
      return `<article class="card" data-act="edit-item" data-key="factions" data-id="${f.id}">
        <div class="card-media">
          ${f.image ? `<img src="${f.image}" alt="${esc(f.name)}">` : `<div class="ph" style="color:${esc(f.color || '#2a2a33')}">${esc((f.name || '?').slice(0, 1))}</div>`}
          <div class="card-actions">
            <button class="card-act" data-act="del-item" data-key="factions" data-id="${f.id}" title="删除">${ic('trash')}</button>
          </div>
        </div>
        <div class="card-body">
          <h3>${esc(f.name || '未命名')}</h3>
          <p class="sub">${esc(f.motto || f.leader || '')}</p>
          <p class="desc">${esc(f.desc || '还没有描述这个势力的立场。')}</p>
          ${members.length ? `<div class="card-tags">${members.slice(0, 3).map(m => `<span class="chip">${esc(m.name)}</span>`).join('')}${members.length > 3 ? `<span class="chip">+${members.length - 3}</span>` : ''}</div>` : ''}
        </div>
      </article>`;
    }).join('');

    return `
      ${pageHead('势力', `共 ${list.length} 个。势力会出现在长图的「背景与势力」区块。`,
        `<button class="btn primary" data-act="new-item" data-key="factions">${ic('plus')} 新增势力</button>`)}
      <div class="grid c3">
        ${cards}
        <button class="card add" data-act="new-item" data-key="factions">
          <div style="text-align:center"><div class="plus">+</div><span>新增势力</span></div>
        </button>
      </div>`;
  }

  /* ---------------- 城市 ---------------- */
  function renderCities() {
    const list = App.world.cities || [];
    const cards = list.map(c => `
      <article class="card" data-act="edit-item" data-key="cities" data-id="${c.id}">
        <div class="card-media wide">
          ${c.image ? `<img src="${c.image}" alt="${esc(c.name)}">` : `<div class="ph" style="color:${esc(c.color || '#2a2a33')}">${esc((c.name || '?').slice(0, 1))}</div>`}
          <div class="card-actions">
            <button class="card-act" data-act="del-item" data-key="cities" data-id="${c.id}" title="删除">${ic('trash')}</button>
          </div>
        </div>
        <div class="card-body">
          <h3>${esc(c.name || '未命名')}</h3>
          <p class="sub">${esc([c.region, c.factionId ? Store.factionName(c.factionId) : ''].filter(Boolean).join(' · '))}</p>
          <p class="desc">${esc(c.desc || '还没有描述这座城的样子。')}</p>
          ${(c.tags || []).length ? `<div class="card-tags">${c.tags.slice(0, 4).map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>` : ''}
        </div>
      </article>`).join('');

    return `
      ${pageHead('城市与背景', `共 ${list.length} 处。城市图可直接用作长图底部的「世界一角」。`,
        `<button class="btn primary" data-act="new-item" data-key="cities">${ic('plus')} 新增地点</button>`)}
      <div class="grid c3">
        ${cards}
        <button class="card add" data-act="new-item" data-key="cities">
          <div style="text-align:center"><div class="plus">+</div><span>新增地点</span></div>
        </button>
      </div>`;
  }

  /* ---------------- 故事 ---------------- */
  function renderStories() {
    const all = App.world.stories || [];
    const f = App.storyFilter;
    const list = f === 'all' ? all : all.filter(s => s.type === f);
    const longN = all.filter(s => s.type === 'long').length;
    const shortN = all.filter(s => s.type === 'short').length;

    const cards = list.map(s => {
      const cityName = s.cityId ? ((App.world.cities || []).find(c => c.id === s.cityId) || {}).name : '';
      const relChars = (s.characters || [])
        .map(id => (App.world.characters || []).find(c => c.id === id))
        .filter(Boolean);
      return `
      <article class="card" data-act="edit-item" data-key="stories" data-id="${s.id}">
        <div class="card-media wide">
          ${s.image ? `<img src="${s.image}" alt="${esc(s.title)}">` : `<div class="ph" style="color:${esc(s.color || '#2a2a33')};font-size:32px">${esc((s.title || '?').replace(/[《》]/g, '').slice(0, 1))}</div>`}
          <div class="card-actions">
            <button class="card-act" data-act="del-item" data-key="stories" data-id="${s.id}" title="删除">${ic('trash')}</button>
          </div>
        </div>
        <div class="card-body">
          <h3 style="font-size:15px">${esc(s.title || '未命名')}</h3>
          <p class="sub">${esc([s.type === 'long' ? '长篇' : '短篇', s.status, cityName].filter(Boolean).join(' · '))}</p>
          <p class="desc" style="-webkit-line-clamp:3">${esc(s.summary || (s.body || '').slice(0, 40) || '还没有写下故事。')}</p>
          ${relChars.length ? `<div class="card-tags">${relChars.slice(0, 3).map(c => `<span class="chip">${esc(c.name)}</span>`).join('')}${relChars.length > 3 ? `<span class="chip">+${relChars.length - 3}</span>` : ''}</div>` : ''}
        </div>
      </article>`;
    }).join('');

    return `
      ${pageHead('故事', `长篇 ${longN} 篇 · 短篇 ${shortN} 篇。长图里会以「2 列」排布，取标题与一句话简介。`,
        `<button class="btn" data-act="new-story" data-type="long">${ic('plus')} 新建长篇</button>
         <button class="btn primary" data-act="new-story" data-type="short">${ic('plus')} 新建短篇</button>`)}

      <div class="seg" style="width:fit-content;margin-bottom:20px">
        <button class="${f === 'all' ? 'on' : ''}" data-act="filter-story" data-v="all">全部 ${all.length}</button>
        <button class="${f === 'long' ? 'on' : ''}" data-act="filter-story" data-v="long">长篇 ${longN}</button>
        <button class="${f === 'short' ? 'on' : ''}" data-act="filter-story" data-v="short">短篇 ${shortN}</button>
      </div>

      <div class="grid c3">
        ${cards}
        <button class="card add" data-act="new-story" data-type="${f === 'long' ? 'long' : 'short'}">
          <div style="text-align:center"><div class="plus">+</div><span>写一个新故事</span></div>
        </button>
      </div>`;
  }

  /* ---------------- 时间线 ---------------- */
  /* 时间线：按画面上的分组顺序摊平，保证 ↑↓ 移动的就是「看到的上/下一条」 */
  function visualTimeline(list) {
    const names = [];
    list.forEach(it => {
      const n = it.era || '未归类';
      if (!names.includes(n)) names.push(n);
    });
    const out = [];
    names.forEach(n => list.forEach(it => {
      if ((it.era || '未归类') === n) out.push(it);
    }));
    return out;
  }

  function renderTimeline() {
    const list = App.world.timeline || [];
    const eras = [];
    list.forEach(t => {
      const name = t.era || '未归类';
      let e = eras.find(x => x.name === name);
      if (!e) { e = { name, items: [] }; eras.push(e); }
      e.items.push(t);
    });

    const body = eras.length ? eras.map((e, ei) => `
      <div class="era">
        <div class="era-head">
          <h2>${esc(e.name)}</h2>
          <span class="num">${e.items.length} 个节点</span>
          <span class="rule"></span>
        </div>
        <div class="tl">
          ${e.items.map((t, i) => `
            <div class="tl-item" data-act="edit-item" data-key="timeline" data-id="${t.id}">
              <div class="tl-acts">
                <button class="tl-act" data-act="move-tl" data-dir="-1" data-id="${t.id}" title="上移一位"${ei === 0 && i === 0 ? ' disabled' : ''}>↑</button>
                <button class="tl-act" data-act="move-tl" data-dir="1" data-id="${t.id}" title="下移一位"${ei === eras.length - 1 && i === e.items.length - 1 ? ' disabled' : ''}>↓</button>
              </div>
              <div class="tl-date">${esc(t.date || '时间待定')}</div>
              <h3>${esc(t.title || '未命名事件')} ${t.type ? `<span class="chip">${esc(t.type)}</span>` : ''}</h3>
              <p>${esc(t.desc || '')}</p>
            </div>`).join('')}
        </div>
      </div>`).join('') : `<div class="empty">
        <h3>时间线还是空的</h3>
        <p>把世界的大事件按纪元排好，故事就有了骨架。</p>
        <button class="btn primary" data-act="new-item" data-key="timeline">${ic('plus')} 添加第一个事件</button>
      </div>`;

    return `
      ${pageHead('总时间线', `共 ${list.length} 个节点，按纪元分组。新事件加在末尾；悬停节点，右上角 ↑ ↓ 可手动调整顺序。`,
        `<button class="btn primary" data-act="new-item" data-key="timeline">${ic('plus')} 新增事件</button>`)}
      ${body}`;
  }

  /* ---------------- 备忘录 ---------------- */
  const pad2 = n => String(n).padStart(2, '0');
  function fmtDay(ts) {
    if (!ts) return '';
    const d = new Date(ts);
    return `${d.getFullYear()}.${pad2(d.getMonth() + 1)}.${pad2(d.getDate())}`;
  }

  function renderMemos() {
    const list = (App.world.memos || []).slice()
      .sort((a, b) => (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0));

    const cards = list.map(m => {
      const title = (m.title || '').trim();
      const body = (m.body || '').trim();
      const hay = (title + ' ' + body).toLowerCase();
      return `<article class="memo" data-act="edit-item" data-key="memos" data-id="${m.id}" data-search="${esc(hay)}">
        <div class="memo-head">
          <h3${title ? '' : ' class="untitled"'}>${esc(title || '无标题便签')}</h3>
          <div class="memo-acts">
            <button class="card-act" data-act="del-item" data-key="memos" data-id="${m.id}" title="删除">${ic('trash')}</button>
          </div>
        </div>
        <p class="memo-body">${esc(body || '（还没有写内容）')}</p>
        <time>${fmtDay(m.updatedAt || m.createdAt)}</time>
      </article>`;
    }).join('');

    const body = list.length ? `
      <div class="memo-bar">
        <div class="memo-search">
          ${ic('search')}
          <input type="text" id="memoSearch" placeholder="搜标题或正文" value="${esc(App.memoQuery)}" spellcheck="false">
        </div>
        <span class="memo-count">共 ${list.length} 张</span>
      </div><div class="memo-grid">${cards}
        <button class="memo memo-new" data-act="new-item" data-key="memos">
          <span class="plus">+</span><span>写一张新便签</span>
        </button>
      </div>
      <div class="memo-nohit" id="memoNoHit">没有找到包含这段字的便签。</div>` : `
      <div class="empty">
        <h3>还没有便签</h3>
        <p>想到什么就先记下来——一句设定、一个名字、一段没头没尾的对话。<br>便签只存在这台设备上，不会出现在导出的长图里。</p>
        <button class="btn primary" data-act="new-item" data-key="memos">${ic('plus')} 写第一张便签</button>
      </div>`;

    return `
      ${pageHead('备忘录', '一个只给你自己看的便签本，不计入长图。最近改过的排在最前面。',
        `<button class="btn primary" data-act="new-item" data-key="memos">${ic('plus')} 新建便签</button>`)}
      ${body}`;
  }

  function filterMemos(q) {
    q = String(q || '').trim().toLowerCase();
    let hit = 0;
    $$('.memo[data-id]').forEach(c => {
      const ok = !q || (c.dataset.search || '').indexOf(q) >= 0;
      c.classList.toggle('hide', !ok);
      if (ok) hit += 1;
    });
    const hint = $('#memoNoHit');
    if (hint) hint.classList.toggle('on', !!q && hit === 0);
  }

  /* ---------------- 待办 ---------------- */
  function renderTodos() {
    const all = App.world.todos || [];
    const open = all.filter(t => !t.done);
    const done = all.filter(t => t.done);
    const pct = all.length ? Math.round(done.length / all.length * 100) : 0;

    const row = t => `<div class="todo${t.done ? ' done' : ''}" data-id="${t.id}">
      <button class="todo-box" data-act="todo-toggle" data-id="${t.id}" title="${t.done ? '标记为未完成' : '标记为已完成'}" aria-checked="${t.done ? 'true' : 'false'}">${t.done ? ic('tick') : ''}</button>
      <div class="todo-text" data-act="edit-item" data-key="todos" data-id="${t.id}">${esc(t.text || '')}</div>
      <div class="todo-acts">
        <button class="card-act" data-act="edit-item" data-key="todos" data-id="${t.id}" title="编辑">${ic('edit')}</button>
        <button class="card-act" data-act="todo-del" data-id="${t.id}" title="删除">${ic('trash')}</button>
      </div>
    </div>`;

    return `
      ${pageHead('待办事项', `共 ${all.length} 条，${open.length} 条还没做完。勾掉一条算一条，勾完会沉到下面。`,
        done.length ? `<button class="btn ghost" data-act="todo-clear-done">清除已完成</button>` : '')}

      <div class="todo-panel">
        <div class="todo-add">
          <input type="text" id="todoAdd" placeholder="写一件要做的事，回车添加" spellcheck="false" autocomplete="off">
          <button class="btn primary" data-act="todo-add">${ic('plus')} 添加</button>
        </div>

        ${all.length ? `<div class="todo-prog-row"><span class="todo-stat">已完成 ${done.length} / ${all.length}</span><div class="todo-prog"><i style="width:${pct}%"></i></div></div>` : ''}

        <div class="todo-list">
          ${open.map(row).join('')}
          ${!all.length ? `<div class="empty">
            <h3>还没有待办</h3>
            <p>要写的情节、要查的资料、要给人物补的设定——丢进来一件件划掉。<br>待办和便签一样，只存在本地，不进长图。</p>
          </div>` : ''}
        </div>

        ${done.length ? `<div class="todo-sec"><h2>已完成</h2><span>${done.length} 条</span><i></i></div>
        <div class="todo-list done-list">${done.map(row).join('')}</div>` : ''}
      </div>`;
  }

  function addTodo(text) {
    text = String(text || '').trim();
    if (!text) { toast('先写点什么', true); return; }
    Store.add('todos', { text, done: false, createdAt: Date.now() });
    persist();
    render();
    const inp = $('#todoAdd');
    if (inp) inp.focus();
    toast('已添加');
  }

  /* ---------------- 关系网 ---------------- */
  function renderRelations() {
    const chars = App.world.characters || [];
    const rels = App.world.relations || [];

    if (chars.length < 2) {
      return `${pageHead('人物关系', '至少需要两位人物才能连线。',
        `<button class="btn" data-act="new-item" data-key="characters">${ic('plus')} 新增人物</button>`)}
        <div class="empty"><h3>人物还不够</h3><p>先去「人物」里添几个人，再回来建立他们之间的关系。</p></div>`;
    }

    const relRows = rels.length ? rels.map(r => `
      <div class="rel-row">
        <span class="who">${esc(Store.charName(r.a))}</span>
        <span class="arrow">↔</span>
        <span class="who">${esc(Store.charName(r.b))}</span>
        <span class="lbl">${esc(r.label || r.kind || '关系')}</span>
        <span class="spacer"></span>
        <button class="card-act" style="opacity:1;position:static" data-act="del-relation" data-id="${r.id}" title="删除">${ic('trash')}</button>
      </div>`).join('') : `<p style="font-size:12.5px;color:#63636f">还没有连线。点上面的「新增关系」把它们连起来。</p>`;

    return `
      ${pageHead('人物关系', '按住节点拖动即可自由摆放，松手会自动记住位置；点击节点打开该人物。',
        `<button class="btn" data-act="relayout">${ic('refresh')} 重新布局</button>
         <button class="btn" data-act="export-rel">${ic('down')} 导出关系图</button>
         <button class="btn primary" data-act="new-item" data-key="relations">${ic('plus')} 新增关系</button>`)}

      <div class="rel-wrap">
        <svg id="relSvg"></svg>
        <div class="rel-tip">拖动节点自由摆放 · 点击查看人物</div>
        <div class="rel-legend">
          <span><i style="background:#c9a86a"></i>节点大小 = 关系数量</span>
        </div>
      </div>

      <div style="margin-top:26px">
        <div class="era-head" style="margin-bottom:14px">
          <h2 style="font-size:14px">关系清单</h2><span class="num">${rels.length} 条</span><span class="rule"></span>
        </div>
        <div class="rel-list">${relRows}</div>
      </div>`;
  }

  function mountRelations() {
    const svg = $('#relSvg');
    if (!svg) return;
    App.relGraph = RelGraph.mount(svg, App.world, {
      onNodeClick: id => openDrawer('characters', id)
    });
  }

  /* ============================================================
     抽屉 / 表单
     ============================================================ */
  function openDrawer(key, id, preset) {
    const schema = SCHEMA[key];
    if (!schema) return;
    const isNew = !id;
    const base = isNew ? schema.auto() : Object.assign({}, schema.auto(), findItem(key, id) || {});
    App.draft = Object.assign({}, base, isNew ? (preset || {}) : {});
    App.draftKey = key;
    App.draftId = id || null;

    $('#drawerKicker').textContent = schema.kicker;
    $('#drawerTitle').textContent = (isNew ? '新增' : '编辑') + schema.title;
    $('#drawerBody').innerHTML = schema.fields.map(f => fieldHTML(f, App.draft[f.k])).join('');
    App.imgField = firstImageField();
    schema.fields.filter(f => f.type === 'image').forEach(f => fillImageMeta(f.k));
    $('#drawer').classList.add('on');
    $('#drawerMask').classList.add('on');
    $('#drawer').setAttribute('aria-hidden', 'false');
    setTimeout(() => {
      const first = $('#drawerBody input, #drawerBody textarea');
      if (first) first.focus();
    }, 320);
  }

  function closeDrawer() {
    $('#drawer').classList.remove('on');
    $('#drawerMask').classList.remove('on');
    $('#drawer').setAttribute('aria-hidden', 'true');
    App.draft = null;
    App.draftKey = null;
    App.draftId = null;
    App.imgField = null;
  }

  function findItem(key, id) {
    return (App.world[key] || []).find(x => x.id === id);
  }

  /*  datalist：给文本框提供「可选也可手输」的候选，来源是其他子页面 */
  function datalistHTML(listId) {
    let opts = [];
    if (listId === 'charNames') opts = (App.world.characters || []).map(c => c.name).filter(Boolean);
    else if (listId === 'eraList') opts = [...new Set((App.world.timeline || []).map(t => t.era).filter(Boolean))];
    if (!opts.length) return '';
    return `<datalist id="${listId}">${opts.map(o => `<option value="${esc(o)}">`).join('')}</datalist>`;
  }

  function fieldHTML(f, val) {
    const lbl = `<div class="f-label"><span>${f.label}${f.req ? ' <span class="req">*</span>' : ''}</span></div>`;
    let inner = '';

    if (f.type === 'text') {
      inner = `<input type="text" data-f="${f.k}" value="${esc(val || '')}" placeholder="${esc(f.ph || '')}" ${f.list ? `list="${f.list}"` : ''}>` +
        (f.list ? datalistHTML(f.list) : '');
    } else if (f.type === 'textarea') {
      inner = `<textarea data-f="${f.k}" rows="${f.rows || 4}" placeholder="${esc(f.ph || '')}">${esc(val || '')}</textarea>`;
    } else if (f.type === 'select') {
      let opts = '';
      if (f.options) {
        opts = f.options.map(o => `<option value="${esc(o.v)}" ${String(val) === String(o.v) ? 'selected' : ''}>${esc(o.t)}</option>`).join('');
      } else if (f.source) {
        const src = App.world[f.source] || [];
        const nameKey = f.source === 'stories' ? 'title' : 'name';
        opts = `<option value="">${f.req ? '请选择…' : '（无）'}</option>` +
          src.map(it => `<option value="${it.id}" ${val === it.id ? 'selected' : ''}>${esc(it[nameKey] || '未命名')}</option>`).join('');
      }
      inner = `<select data-f="${f.k}">${opts}</select>`;
    } else if (f.type === 'checks') {
      const src = App.world[f.source] || [];
      const sel = Array.isArray(val) ? val : [];
      const nameKey = f.source === 'stories' ? 'title' : 'name';
      inner = src.length
        ? `<div class="check-pills" data-checks="${f.k}">` + src.map(it =>
            `<label class="check-pill"><input type="checkbox" value="${it.id}" ${sel.includes(it.id) ? 'checked' : ''}><span>${esc(it[nameKey] || '未命名')}</span></label>`
          ).join('') + `</div>`
        : `<div class="hint">还没有可选项，先到对应子页面添加。</div>`;
    } else if (f.type === 'tags') {
      const tags = Array.isArray(val) ? val : [];
      inner = `<div class="tag-input-wrap" data-tags="${f.k}">
        ${tags.map(t => `<span class="tag-pill">${esc(t)}<button data-act="del-tag" data-tag="${esc(t)}" data-field="${f.k}">×</button></span>`).join('')}
        <input type="text" data-taginput="${f.k}" placeholder="${esc(f.ph || '回车添加')}">
      </div>`;
    } else if (f.type === 'color') {
      const sw = ['#c9a86a', '#7f93b8', '#a86a6a', '#6aa89a', '#9a7fb8', '#8a8a92', '#c9885a', '#6a9a7f'];
      inner = `<div class="color-row">
        <input type="color" data-f="${f.k}" value="${esc(val || '#c9a86a')}">
        <div class="swatches">${sw.map(c => `<button type="button" style="background:${c}" data-act="pick-color" data-field="${f.k}" data-c="${c}"></button>`).join('')}</div>
      </div>`;
    } else if (f.type === 'image') {
      inner = `<div class="img-field" data-imgfield="${f.k}">
        <div class="img-picker${f.wide ? ' wide' : ''}" data-act="pick-image" data-field="${f.k}" data-wide="${f.wide ? 1 : 0}">
          ${val ? `<img src="${val}" alt="">` : `<div class="ph2">${ic('img')}<span>点击上传图片</span><em>拖进来、或直接 Ctrl+V 粘贴</em></div>`}
          <div class="drop">松开即可上传</div>
          ${val ? `<button class="clear" data-act="clear-image" data-field="${f.k}">${ic('x')}</button>` : ''}
        </div>
        <div class="img-tools">
          <button type="button" data-act="pick-image" data-field="${f.k}">${ic('img')}<span>选择文件</span></button>
          <button type="button" data-act="image-url" data-field="${f.k}"><span>链接导入</span></button>
          <span class="img-meta" data-meta="${f.k}"></span>
        </div>
      </div>`;
    }

    return `<div class="f">${lbl}${inner}${f.hint ? `<div class="hint">${f.hint}</div>` : ''}</div>`;
  }

  function refreshImagePicker(field) {
    const picker = document.querySelector(`.img-picker[data-field="${field}"]`);
    if (!picker) return;
    const v = App.draft[field];
    picker.innerHTML =
      (v
        ? `<img src="${v}" alt="">`
        : `<div class="ph2">${ic('img')}<span>点击上传图片</span><em>拖进来、或直接 Ctrl+V 粘贴</em></div>`)
      + `<div class="drop">松开即可上传</div>`
      + (v ? `<button class="clear" data-act="clear-image" data-field="${field}">${ic('x')}</button>` : '');
    fillImageMeta(field);
  }

  /* 显示已选图片的尺寸与体积 */
  function fillImageMeta(field) {
    const box = document.querySelector(`[data-meta="${field}"]`);
    if (!box) return;
    const v = App.draft[field];
    if (!v) { box.textContent = ''; return; }
    const bytes = Math.round(((v.split(',')[1] || '').length) * 3 / 4);
    const probe = new Image();
    probe.onload = () => {
      if (document.querySelector(`[data-meta="${field}"]`) !== box) return;
      box.textContent = `${probe.naturalWidth}×${probe.naturalHeight} · ${ImageKit.fmtBytes(bytes)}`;
    };
    probe.onerror = () => { box.textContent = ImageKit.fmtBytes(bytes); };
    probe.src = v;
  }

  function collectDraft() {
    const schema = SCHEMA[App.draftKey];
    if (!schema) return;
    schema.fields.forEach(f => {
      if (f.type === 'image' || f.type === 'tags') return;
      if (f.type === 'checks') {
        App.draft[f.k] = [...document.querySelectorAll(`[data-checks="${f.k}"] input:checked`)].map(i => i.value);
        return;
      }
      const el = document.querySelector(`[data-f="${f.k}"]`);
      if (!el) return;
      App.draft[f.k] = el.value;
    });
  }

  function saveDraft() {
    collectDraft();
    const key = App.draftKey;
    const schema = SCHEMA[key];
    // 校验
    for (const f of schema.fields) {
      if (f.req && !String(App.draft[f.k] || '').trim()) {
        toast('请填写「' + f.label + '」', true);
        const el = document.querySelector(`[data-f="${f.k}"]`);
        if (el) el.focus();
        return;
      }
    }
    if (key === 'relations') {
      if (App.draft.a === App.draft.b) { toast('不能和自己建立关系', true); return; }
      const dup = (App.world.relations || []).find(r =>
        r.id !== App.draftId &&
        ((r.a === App.draft.a && r.b === App.draft.b) || (r.a === App.draft.b && r.b === App.draft.a)));
      if (dup) { toast('这条关系已经存在了', true); return; }
    }

    if (key === 'memos') {
      if (!String(App.draft.title || '').trim() && !String(App.draft.body || '').trim()) {
        toast('便签是空的，写点什么再保存', true);
        const el = document.querySelector('[data-f="body"]');
        if (el) el.focus();
        return;
      }
      App.draft.updatedAt = Date.now();
    }

    if (App.draftId) {
      Store.update(key, App.draftId, App.draft);
    } else {
      Store.add(key, App.draft);
    }
    persist();
    closeDrawer();
    render();
    toast('已保存');
  }

  /* ============================================================
     图片（选择 / 拖拽 / 粘贴 / 链接）
     ============================================================ */
  function maxSideOf(field) {
    const picker = document.querySelector(`.img-picker[data-field="${field}"]`);
    return picker && picker.dataset.wide === '1' ? 2200 : 1500;
  }

  /* 各图片位的目标比例：方卡 1:1，横卡 16:10 */
  function aspectOf(field) {
    const picker = document.querySelector(`.img-picker[data-field="${field}"]`);
    return picker && picker.dataset.wide === '1' ? 16 / 10 : 1;
  }

  function setImageBusy(field, on) {
    const picker = document.querySelector(`.img-picker[data-field="${field}"]`);
    if (picker) picker.classList.toggle('busy', !!on);
  }

  async function applyImageFile(field, file) {
    if (!field || !file) return;
    try {
      if (file.size > ImageKit.MAX_FILE) {
        throw new Error('图片太大了（' + (file.size / 1048576).toFixed(1) + 'MB），请压到 30MB 以内');
      }
      const raw = await ImageKit.readFile(file);
      const picked = await ImageKit.crop(raw, { aspect: aspectOf(field) });
      if (!picked) return;                       // 取消裁剪 = 放弃这次上传
      setImageBusy(field, true);
      const res = await ImageKit.prepare(picked, { maxSide: maxSideOf(field) });
      App.draft[field] = res.data;
      refreshImagePicker(field);
      toast(`图片已就位 · ${res.width}×${res.height} · ${ImageKit.fmtBytes(res.bytes)}`);
    } catch (err) {
      toast(err.message || '图片读取失败', true);
    } finally {
      setImageBusy(field, false);
    }
  }

  async function pickImageInto(field) {
    App.imgField = field;
    const files = await ImageKit.pick();
    if (!files.length) return;
    await applyImageFile(field, files[0]);
  }

  function firstImageField() {
    const schema = SCHEMA[App.draftKey];
    const f = schema && schema.fields.find(x => x.type === 'image');
    return f ? f.k : null;
  }

  function targetImageField(e) {
    const picker = e.target && e.target.closest ? e.target.closest('.img-picker') : null;
    if (picker) return picker.dataset.field;
    return App.imgField || firstImageField();
  }

  function markDrag(field, on) {
    document.querySelectorAll('.img-picker.drag').forEach(el => {
      if (el.dataset.field !== field) el.classList.remove('drag');
    });
    const picker = field && document.querySelector(`.img-picker[data-field="${field}"]`);
    if (picker) picker.classList.toggle('drag', !!on);
  }

  function clearAllDrag() {
    document.querySelectorAll('.img-picker.drag').forEach(el => el.classList.remove('drag'));
  }

  /* 链接导入：行内输入框 */
  function openUrlBar(field) {
    const wrap = document.querySelector(`.img-field[data-imgfield="${field}"]`);
    if (!wrap) return;
    const exist = wrap.querySelector('.img-urlbar');
    if (exist) { exist.querySelector('input').focus(); return; }
    const bar = document.createElement('div');
    bar.className = 'img-urlbar';
    bar.innerHTML = `<input type="url" placeholder="粘贴图片链接，回车导入"><button type="button" data-act="image-url-go" data-field="${field}">导入</button><button type="button" data-act="image-url-close">取消</button>`;
    wrap.appendChild(bar);
    const inp = bar.querySelector('input');
    inp.focus();
    inp.addEventListener('keydown', ev => {
      if (ev.key === 'Enter') { ev.preventDefault(); importImageURL(field, inp.value); }
      if (ev.key === 'Escape') { ev.stopPropagation(); bar.remove(); }
    });
    inp.addEventListener('paste', () => setTimeout(() => { if (inp.value.trim()) importImageURL(field, inp.value); }, 30));
  }

  async function importImageURL(field, url) {
    const wrap = document.querySelector(`.img-field[data-imgfield="${field}"]`);
    const btn = wrap && wrap.querySelector('[data-act="image-url-go"]');
    if (btn) { btn.disabled = true; btn.textContent = '拉取中'; }
    try {
      const blob = await ImageKit.fromURL(url);
      const raw = await ImageKit.readFile(blob);
      const picked = await ImageKit.crop(raw, { aspect: aspectOf(field) });
      if (!picked) return;                       // 取消裁剪，链接输入条保留可重试
      setImageBusy(field, true);
      const res = await ImageKit.prepare(picked, { maxSide: maxSideOf(field) });
      App.draft[field] = res.data;
      if (wrap) {
        const bar = wrap.querySelector('.img-urlbar');
        if (bar) bar.remove();
      }
      refreshImagePicker(field);
      toast(`已从链接导入 · ${res.width}×${res.height}`);
    } catch (err) {
      toast(err.message || '链接导入失败', true);
    } finally {
      setImageBusy(field, false);
      if (btn) { btn.disabled = false; btn.textContent = '导入'; }
    }
  }

  /* ============================================================
     导出
     ============================================================ */
  /* 导出人物关系图（按当前节点的实际摆放位置画一张 PNG） */
  async function exportRelations() {
    if (!App.relGraph || !App.relGraph.exportCanvas) {
      toast('关系图还没准备好，稍等一下再导出', true);
      return;
    }
    if (!(App.world.characters || []).length) {
      toast('还没有人物，先加一个人物再导出', true);
      return;
    }
    toast('正在生成关系图…');
    try {
      // 关系图是单独分享用的图，至少 2 倍，避免文字发虚
      const cv = await App.relGraph.exportCanvas({ scale: Math.max(2, App.posterScale || 1) });
      const name = (App.world.meta.name || '世界观').replace(/[\\/:*?"<>|]/g, '')
        + `_人物关系_${cv.width}x${cv.height}.png`;
      const ok = await Poster.download(cv, name);
      toast(ok ? `已导出关系图 ${cv.width}×${cv.height}` : '导出失败', !ok);
    } catch (e) {
      console.error(e);
      toast('导出失败：' + e.message, true);
    }
  }

  async function exportPoster() {
    if (worldIsEmpty()) {
      toast('图上还没有内容，先加点人物或故事再导出', true);
      return;
    }
    toast('正在生成长图…');
    const canvas = document.createElement('canvas');
    const po = App.world.poster || {};
    const res = await Poster.render(canvas, App.world, {
      scale: App.posterScale,
      theme: po.theme || 'dark',
      subtitle: po.showSubtitle !== false,
      showFooter: !!po.showFooter,
      showScene: po.showScene !== false,
      alwaysShowScene: true
    });
    const name = (App.world.meta.name || '世界观').replace(/[\\/:*?"<>|]/g, '') + `_${canvas.width}x${canvas.height}.png`;
    const ok = await Poster.download(canvas, name);
    toast(ok ? `已导出 ${canvas.width}×${canvas.height}` : '导出失败', !ok);
  }

  function exportJSON() {
    const data = JSON.stringify(App.world, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (App.world.meta.name || 'world') + '_备份.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 3000);
    toast('已导出备份');
  }

  function importJSON() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.json,application/json';
    inp.onchange = () => {
      const f = inp.files && inp.files[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = async () => {
        try {
          const data = JSON.parse(r.result);
          if (!confirm('导入会覆盖当前世界的全部内容，确定继续？')) return;
          Store.replace(data);
          App.world = Store.state;
          await Store.save();
          syncTitle();
          render();
          toast('已导入');
        } catch (e) {
          toast('文件格式不对：' + e.message, true);
        }
      };
      r.readAsText(f);
    };
    inp.click();
  }

  /* ============================================================
     全局事件
     ============================================================ */
  function bindGlobal() {
    document.addEventListener('click', e => {
      const t = e.target.closest('[data-act]');
      if (!t) {
        // 点遮罩关抽屉
        if (e.target.id === 'drawerMask') closeDrawer();
        if (e.target.id === 'lightbox') $('#lightbox').classList.remove('on');
        return;
      }
      const act = t.dataset.act;

      switch (act) {
        case 'nav': go(t.dataset.route); break;
        case 'goto-poster': go('overview'); break;
        case 'close-drawer': closeDrawer(); break;
        case 'save-drawer': saveDraft(); break;

        case 'new-item':
          openDrawer(t.dataset.key, null);
          break;

        case 'new-story':
          openDrawer('stories', null, { type: t.dataset.type || 'short' });
          break;

        case 'todo-add': {
          const inp = $('#todoAdd');
          addTodo(inp ? inp.value : '');
          break;
        }

        case 'todo-toggle': {
          e.stopPropagation();
          const item = findItem('todos', t.dataset.id);
          if (!item) break;
          item.done = !item.done;
          item.doneAt = item.done ? Date.now() : 0;
          persist();
          render();
          break;
        }

        case 'todo-del': {
          e.stopPropagation();
          Store.remove('todos', t.dataset.id);
          persist();
          render();
          toast('已删除');
          break;
        }

        case 'todo-clear-done': {
          const n = (App.world.todos || []).filter(x => x.done).length;
          if (!n) break;
          if (!confirm(`确定清掉这 ${n} 条已完成的待办？此操作不可撤销。`)) break;
          App.world.todos = (App.world.todos || []).filter(x => !x.done);
          persist();
          render();
          toast(`已清除 ${n} 条`);
          break;
        }

        case 'edit-item': {
          e.stopPropagation();
          openDrawer(t.dataset.key, t.dataset.id);
          break;
        }

        case 'move-tl': {
          e.stopPropagation();
          const id = t.dataset.id, dir = +t.dataset.dir;
          // 按「页面上看到的顺序」取序列：先纪元、纪元内再按数组顺序
          const list = App.world.timeline || [];
          const order = visualTimeline(list);
          const i = order.findIndex(x => x.id === id);
          const j = i + dir;
          if (i < 0 || j < 0 || j >= order.length) break;
          const a = order[i], b = order[j];
          const ia = list.indexOf(a), ib = list.indexOf(b);
          const eraName = it => it.era || '未归类';
          if (eraName(a) === eraName(b)) {
            // 同一纪元内：交换数组位置即可
            list[ia] = b; list[ib] = a;
          } else {
            // 跨纪元：节点自己并入相邻纪元（放到该纪元最靠上/最靠下的位置），
            // 其它节点的纪元保持不变
            list.splice(ia, 1);
            const at = list.indexOf(b);
            a.era = b.era;
            list.splice(dir > 0 ? at : at + 1, 0, a);
          }
          App.world.timeline = list;
          persist();
          render();
          break;
        }

        case 'del-item': {
          e.stopPropagation();
          const key = t.dataset.key, id = t.dataset.id;
          const schema = SCHEMA[key];
          if (!confirm('确定删除这条「' + schema.title + '」？此操作不可撤销。')) break;
          Store.remove(key, id);
          persist();
          render();
          toast('已删除');
          break;
        }

        case 'del-relation': {
          const id = t.dataset.id;
          Store.remove('relations', id);
          persist(); render(); toast('已删除');
          break;
        }

        case 'filter-story':
          App.storyFilter = t.dataset.v;
          render();
          break;

        case 'set-theme':
          App.world.poster.theme = t.dataset.v;
          persist(); render();
          break;

        case 'set-opt': {
          const k = t.dataset.k;
          App.world.poster[k] = t.dataset.v === '1';
          persist(); render();
          break;
        }

        case 'set-scale':
          App.posterScale = Number(t.dataset.v) || 1;
          render();
          break;

        case 'toggle-pick': {
          const key = t.dataset.key, id = t.dataset.id;
          const max = +(t.dataset.max || 6);
          const po = App.world.poster;
          po[key] = po[key] || [];
          // 还没手动选过时，先把当前默认勾选的这几条落成真实选择，
          // 否则点一下就会把其它几条一起取消掉
          if (!po[key].length) {
            po[key] = (App.world[key] || []).slice(0, max).map(x => x.id);
          }
          const i = po[key].indexOf(id);
          if (i >= 0) po[key].splice(i, 1);
          else {
            if (po[key].length >= max) { toast(`最多选 ${max} 个，先取消一个`, true); break; }
            po[key].push(id);
          }
          persist();
          render();
          break;
        }

        case 'export-poster': exportPoster(); break;
        case 'export-json': exportJSON(); break;
        case 'import-json': importJSON(); break;

        case 'reset-world': {
          if (!confirm('新建会清空当前世界的所有内容，确定继续？建议先「备份数据」。')) break;
          Store.replace(Store.blankWorld(''));
          App.world = Store.state;
          Store.save().then(() => {
            syncTitle();
            go('overview');
            render();
          });
          toast('已新建空白世界');
          break;
        }

        case 'load-sample': {
          if (!confirm('示例会顶掉你当前的编辑内容（人物、势力、故事等都会被替换）。\n想看排版效果再看：建议先「备份数据」。要继续吗？')) break;
          Store.replace(Store.sampleWorld());
          App.world = Store.state;
          Store.save().then(() => {
            syncTitle();
            go('overview');
            render();
          });
          toast('已载入示例，可随意改或「新建」清空');
          break;
        }

        case 'relayout':
          if (App.relGraph) App.relGraph.relayout();
          break;

        case 'export-rel':
          exportRelations();
          break;

        case 'pick-image': {
          e.stopPropagation();
          pickImageInto(t.dataset.field);
          break;
        }

        case 'image-url': {
          e.stopPropagation();
          App.imgField = t.dataset.field;
          openUrlBar(t.dataset.field);
          break;
        }

        case 'image-url-go': {
          e.stopPropagation();
          const bar = t.closest('.img-urlbar');
          importImageURL(t.dataset.field, bar ? bar.querySelector('input').value : '');
          break;
        }

        case 'image-url-close': {
          e.stopPropagation();
          const bar = t.closest('.img-urlbar');
          if (bar) bar.remove();
          break;
        }

        case 'clear-image': {
          e.stopPropagation();
          const field = t.dataset.field;
          App.draft[field] = '';
          refreshImagePicker(field);
          const bar = document.querySelector(`.img-field[data-imgfield="${field}"] .img-urlbar`);
          if (bar) bar.remove();
          break;
        }

        case 'pick-color': {
          const f = t.dataset.field;
          App.draft[f] = t.dataset.c;
          const inp = document.querySelector(`input[type=color][data-f="${f}"]`);
          if (inp) inp.value = t.dataset.c;
          break;
        }

        case 'del-tag': {
          const f = t.dataset.field, tag = t.dataset.tag;
          App.draft[f] = (App.draft[f] || []).filter(x => x !== tag);
          rerenderTags(f);
          break;
        }

        case 'pick-scene': {
          (async () => {
            const files = await ImageKit.pick();
            if (!files.length) return;
            try {
              const raw = await ImageKit.readFile(files[0]);
              // 「世界一角」在长图上是 752×541 的横图
              const picked = await ImageKit.crop(raw, { aspect: 752 / 541, title: '裁剪场景图' });
              if (!picked) return;
              const res = await ImageKit.prepare(picked, { maxSide: 2400 });
              App.world.poster.sceneRef = { type: 'custom', src: res.data };
              persist(); render();
              toast(`场景图已更新 · ${res.width}×${res.height}`);
            } catch (err) { toast(err.message, true); }
          })();
          break;
        }

        case 'view-image': {
          $('#lightboxImg').src = t.dataset.src;
          $('#lightbox').classList.add('on');
          break;
        }

        default: break;
      }
    });

    // 标签输入
    document.addEventListener('keydown', e => {
      // 待办：回车即添加
      if (e.target.id === 'todoAdd' && e.key === 'Enter') {
        e.preventDefault();
        addTodo(e.target.value);
        return;
      }
      const inp = e.target.closest('[data-taginput]');
      if (inp && (e.key === 'Enter' || e.key === ',' || e.key === '，')) {
        e.preventDefault();
        const f = inp.dataset.taginput;
        const v = inp.value.trim();
        if (!v) return;
        App.draft[f] = App.draft[f] || [];
        if (!App.draft[f].includes(v)) App.draft[f].push(v);
        inp.value = '';
        rerenderTags(f);
        inp.focus();
      }
      if (e.key === 'Escape') {
        if ($('#drawer').classList.contains('on')) closeDrawer();
        else if ($('#lightbox').classList.contains('on')) $('#lightbox').classList.remove('on');
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if ($('#drawer').classList.contains('on')) saveDraft();
        else { persist(); toast('已保存'); }
      }
    });

    /* ---- 拖拽上传 ---- */
    const hasFiles = e => !!(e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0);

    document.addEventListener('dragover', e => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if ($('#drawer').classList.contains('on')) markDrag(targetImageField(e), true);
    });

    document.addEventListener('dragleave', e => {
      if (!hasFiles(e)) return;
      const to = e.relatedTarget;
      if (!to || !to.closest || !to.closest('#drawer')) clearAllDrag();
    });

    document.addEventListener('drop', e => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      clearAllDrag();
      const files = e.dataTransfer.files;
      if (!files || !files.length) return;
      if (!$('#drawer').classList.contains('on')) {
        toast('请先打开编辑窗口，再把图片拖到图片框里', true);
        return;
      }
      const field = targetImageField(e);
      if (!field) return;
      applyImageFile(field, files[0]);
    });

    /* ---- 粘贴上传（Ctrl+V） ---- */
    document.addEventListener('paste', e => {
      if (!$('#drawer').classList.contains('on')) return;
      const items = (e.clipboardData && e.clipboardData.items) || [];
      const hit = Array.from(items).find(it => it.type && it.type.indexOf('image/') === 0);
      if (!hit) return;
      e.preventDefault();
      const file = hit.getAsFile();
      const field = App.imgField || firstImageField();
      if (field && file) applyImageFile(field, file);
    });

    // 备忘录搜索（原地过滤，不重绘，输入框不会掉焦点）
    document.addEventListener('input', e => {
      if (e.target.id === 'memoSearch') {
        App.memoQuery = e.target.value;
        filterMemos(App.memoQuery);
      }
    });

    // 场景选择
    document.addEventListener('change', e => {      if (e.target.id === 'sceneSelect') {
        const v = e.target.value;
        if (v === 'auto') App.world.poster.sceneRef = { type: 'auto' };
        else if (v.startsWith('city:')) App.world.poster.sceneRef = { type: 'city', id: v.slice(5) };
        else if (v.startsWith('story:')) App.world.poster.sceneRef = { type: 'story', id: v.slice(6) };
        persist();
        repaintPoster();
      }
    });

    // 世界名
    $('#worldTitle').addEventListener('input', e => {
      App.world.meta.name = e.target.value;
      document.title = (e.target.value || '未命名世界') + ' · 创世者的笔记本';
      persist();
      if (App.route === 'overview') repaintPoster();
    });

    window.addEventListener('hashchange', () => {
      const r = location.hash.slice(1) || 'overview';
      if (r !== App.route) { App.route = r; render(); }
    });
  }

  function rerenderTags(field) {
    const wrap = document.querySelector(`[data-tags="${field}"]`);
    if (!wrap) return;
    const tags = App.draft[field] || [];
    const ph = wrap.querySelector('input') ? wrap.querySelector('input').getAttribute('placeholder') : '回车添加';
    wrap.innerHTML = tags.map(t =>
      `<span class="tag-pill">${esc(t)}<button data-act="del-tag" data-tag="${esc(t)}" data-field="${field}">×</button></span>`
    ).join('') + `<input type="text" data-taginput="${field}" placeholder="${esc(ph)}">`;
    const inp = wrap.querySelector('input');
    if (inp) inp.focus();
  }

  /* ---------------- 启动 ---------------- */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
