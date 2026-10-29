/* ============================================================
   store.js — 数据层：IndexedDB 持久化 + 默认示例世界
   ============================================================ */
(function () {
  'use strict';

  const DB_NAME = 'worldcraft';
  const DB_VER = 1;
  const KV = 'kv';
  const STATE_KEY = 'state';

  let dbPromise = null;

  function withTimeout(promise, ms) {
    return Promise.race([
      promise,
      new Promise(resolve => setTimeout(() => resolve(undefined), ms || 1600))
    ]);
  }

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = withTimeout(new Promise((resolve, reject) => {
      let req;
      try {
        req = indexedDB.open(DB_NAME, DB_VER);
      } catch (e) { reject(e); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
      req.onblocked = () => reject(new Error('blocked'));
    }), 2500).then(db => {
      if (!db) throw new Error('indexedDB unavailable');
      return db;
    });
    return dbPromise;
  }

  async function idbGet(key) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(KV, 'readonly');
        const r = tx.objectStore(KV).get(key);
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      });
    } catch (e) { return undefined; }
  }

  async function idbSet(key, val) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(KV, 'readwrite');
        tx.objectStore(KV).put(val, key);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => reject(tx.error);
      });
    } catch (e) { return false; }
  }

  /* ---------------- 工具 ---------------- */
  let seq = 0;
  function uid(prefix) {
    seq += 1;
    return (prefix || 'id') + '_' + Date.now().toString(36).slice(-5) + seq.toString(36) + Math.random().toString(36).slice(2, 5);
  }

  const uidBak = uid;

  /* ---------------- 默认示例世界 ---------------- */
  function sampleWorld() {
    const F1 = { id: uidBak('f'), name: '灯塔公署', motto: '光不熄灭', leader: '林砚', color: '#c9a86a', image: '', tags: ['官方', '十三灯塔'], desc: '名义上管理雾港十三座灯塔，实则是全城唯一能压制「雾中低语」的机构。' };
    const F2 = { id: uidBak('f'), name: '白鸦商行', motto: '凡有价者', leader: '沈砚秋', color: '#7f93b8', image: '', tags: ['黑市', '情报'], desc: '垄断记忆买卖与黑市情报。他们的账本比港务厅的档案更接近真相。' };
    const F3 = { id: uidBak('f'), name: '旧王庭', motto: '钟声不止', leader: '陆迟', color: '#a86a6a', image: '', tags: ['残党', '地下'], desc: '被推翻的王室残党，藏在雾港地下的旧城区，靠操纵潮汐时刻活动。' };

    const C1 = {
      id: uidBak('c'), name: '林砚', alias: '守灯人', role: '主角',
      factionId: F1.id, age: '27', color: '#c9a86a', image: '',
      tags: ['灯塔', '通感', '齿轮左手'],
      desc: '雾港最年轻的灯塔看守。能在雾里听见别人的低语，代价是每听一次，左手就多一枚齿轮。'
    };
    const C2 = {
      id: uidBak('c'), name: '沈砚秋', alias: '白鸦', role: '情报商',
      factionId: F2.id, age: '34', color: '#7f93b8', image: '',
      tags: ['白鸦商行', '赌徒'],
      desc: '把记忆当货币的女人。笑起来很好看，因为她把不好看的部分都卖掉了。'
    };
    const C3 = {
      id: uidBak('c'), name: '陆迟', alias: '钟摆', role: '反派',
      factionId: F3.id, age: '外貌二十', color: '#a86a6a', image: '',
      tags: ['旧王庭', '不死'],
      desc: '一百三十年前就该死去的人。他把整座港口当成一只钟，所有人都只是他拨动的指针。'
    };
    const C4 = {
      id: uidBak('c'), name: '汀', alias: '潮汐的女儿', role: '配角',
      factionId: F1.id, age: '12', color: '#6aa89a', image: '',
      tags: ['潮汐教团', '失忆'],
      desc: '从海底被捞起来时手里攥着一枚不属于这个时代的铜币。她不说话，但海水听她的。'
    };

    const K1 = {
      id: uidBak('k'), name: '雾港', region: '北岸 · 潮汐三角洲', factionId: F1.id,
      image: '', color: '#c9a86a', tags: ['主城', '常雾', '十三灯塔'],
      desc: '终年被雾笼罩的港口城市。雾不是天气，是某种正在缓慢醒来的东西。城里的钟表每天会慢四分钟——这四分钟，属于另一边。'
    };
    const K2 = {
      id: uidBak('k'), name: '锈阶', region: '西岭 · 废弃矿道', factionId: F2.id,
      image: '', color: '#8a8a92', tags: ['矿区', '齿轮工坊'],
      desc: '曾为雾港供应全部黄铜与齿轮，如今只剩巨大的空矿坑和不肯离开的匠人。'
    };
    const K3 = {
      id: uidBak('k'), name: '汐下', region: '雾港海域 · 水下', factionId: '',
      image: '', color: '#6aa89a', tags: ['水下城', '遗迹'],
      desc: '每逢大潮退去四小时才会露出的城市废墟。没有人知道是谁建的，只知道它的钟走得比雾港准。'
    };

    return {
      version: 1,
      meta: {
        name: '雾港纪元',
        subtitle: '在潮汐与齿轮之间',
        author: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      characters: [C1, C2, C3, C4],
      relations: [
        { id: uidBak('r'), a: C1.id, b: C2.id, label: '旧识', kind: '盟友' },
        { id: uidBak('r'), a: C1.id, b: C3.id, label: '宿敌', kind: '敌对' },
        { id: uidBak('r'), a: C2.id, b: C3.id, label: '债主', kind: '主仆' },
        { id: uidBak('r'), a: C1.id, b: C4.id, label: '收养', kind: '亲情' },
        { id: uidBak('r'), a: C2.id, b: C4.id, label: '买家', kind: '其他' }
      ],
      factions: [F1, F2, F3],
      cities: [K1, K2, K3],
      stories: [
        {
          id: uidBak('s'), type: 'long', title: '《第十三座灯塔》',
          status: '连载中', date: '', color: '#c9a86a', image: '', tags: ['主线', '悬疑'],
          characters: [C1.id, C4.id], cityId: K1.id, factionId: F1.id,
          summary: '雾港有十二座灯塔，但所有地图上都画着十三座。林砚接任第十三座的那天，发现它的光从不照向海面，只照向城里。',
          body: '第一卷 · 潮声\n\n林砚是在一个没有雾的早晨上任的。\n\n这在雾港是件怪事——雾港三百年来没有一天没有雾。老看守把钥匙交给他时说了一句话：「别让它照到人。」\n\n……'
        },
        {
          id: uidBak('s'), type: 'long', title: '《卖记忆的人》',
          status: '构思中', date: '', color: '#7f93b8', image: '', tags: ['人物前传'],
          characters: [C2.id, C3.id], cityId: K1.id, factionId: F2.id,
          summary: '沈砚秋一生卖掉了十七段记忆，唯独留下了一段从不敢看。',
          body: ''
        },
        {
          id: uidBak('s'), type: 'short', title: '雨夜的第一枚齿轮',
          status: '已完成', date: '', color: '#c9a86a', image: '', tags: ['短篇', '雨'],
          characters: [C1.id], cityId: K1.id, factionId: F1.id,
          summary: '一个关于左手、雨，和一碗没有吃完的面。',
          body: '雨下到第三个小时，林砚的左手开始发烫。\n\n他知道，又有人在雾里叫他的名字了。'
        },
        {
          id: uidBak('s'), type: 'short', title: '潮退的四小时',
          status: '已完成', date: '', color: '#6aa89a', image: '', tags: ['短篇', '汐下'],
          characters: [C4.id], cityId: K3.id, factionId: '',
          summary: '汐下城浮出水面的那四小时里，汀找到了自己的名字。',
          body: ''
        }
      ],
      timeline: [
        {
          id: uidBak('t'), era: '旧王庭纪', date: '历 812 年', type: '灾难',
          title: '大雾降临', desc: '一场持续四十天不散的白雾吞没整片海岸。幸存者在一座无名港湾登陆，这就是雾港的起点。'
        },
        {
          id: uidBak('t'), era: '旧王庭纪', date: '历 856 年', type: '事件',
          title: '十三灯塔落成', desc: '王庭下令建造十三座灯塔以驱散雾中低语。落成当日，最北的那座无故熄灭，从此地图上只剩十二座。'
        },
        {
          id: uidBak('t'), era: '雾历', date: '雾历 1 年', type: '战争',
          title: '熄灯之夜', desc: '旧王庭在一夜之间倾覆。陆迟被刺于钟楼，钟停摆四分钟。从那以后，雾港的每一天都比别处短四分钟。'
        },
        {
          id: uidBak('t'), era: '雾历', date: '雾历 47 年', type: '诞生',
          title: '林砚出生', desc: '出生时左手即为黄铜，接生婆说：「这孩子替谁还了债。」'
        },
        {
          id: uidBak('t'), era: '雾历', date: '雾历 74 年 · 春', type: '事件',
          title: '第十三座灯塔重新点亮', desc: '林砚接任第十三座灯塔看守。当夜，全城钟表同时慢了四分钟。'
        }
      ],
      poster: {
        theme: 'dark',
        showSubtitle: true,
        showFooter: false,
        showScene: true,
        sceneRef: { type: 'auto' },
        characters: [],
        factions: [],
        stories: []
      }
    };
  }

  function blankWorld(name) {
    return {
      version: 1,
      meta: {
        name: name || '',
        subtitle: '',
        author: '',
        createdAt: Date.now(),
        updatedAt: Date.now()
      },
      characters: [], relations: [], factions: [], cities: [],
      stories: [], timeline: [],
      poster: { theme: 'dark', showSubtitle: true, showFooter: false, showScene: true, sceneRef: { type: 'auto' }, characters: [], factions: [], stories: [] }
    };
  }

  /* ---------------- 迁移 / 补全 ---------------- */
  function normalize(s) {
    if (!s || typeof s !== 'object') return sampleWorld();
    s.version = s.version || 1;
    s.meta = s.meta || { name: '未命名世界' };
    ['characters', 'relations', 'factions', 'cities', 'stories', 'timeline'].forEach(k => {
      if (!Array.isArray(s[k])) s[k] = [];
    });
    s.poster = Object.assign(
      { theme: 'dark', showSubtitle: true, showFooter: false, showScene: true, sceneRef: { type: 'auto' }, characters: [], factions: [], stories: [] },
      s.poster || {}
    );
    if (!s.poster.sceneRef) s.poster.sceneRef = { type: 'auto' };
    // 清理失效引用
    const cids = new Set(s.characters.map(c => c.id));
    s.relations = s.relations.filter(r => cids.has(r.a) && cids.has(r.b));
    // 跨页面引用字段的默认值（老存档没有这些字段）
    const fids = new Set(s.factions.map(f => f.id));
    const ctids = new Set(s.cities.map(c => c.id));
    (s.cities || []).forEach(c => {
      if (!fids.has(c.factionId)) c.factionId = '';
    });
    (s.stories || []).forEach(st => {
      if (!Array.isArray(st.characters)) st.characters = [];
      st.characters = st.characters.filter(id => cids.has(id));
      if (!ctids.has(st.cityId)) st.cityId = '';
      if (!fids.has(st.factionId)) st.factionId = '';
    });
    return s;
  }

  /* ---------------- 对外接口 ---------------- */
  const Store = {
    state: null,
    uid: uidBak,
    blankWorld,
    sampleWorld,

    async load() {
      let raw = await idbGet(STATE_KEY);
      if (!raw) {
        try {
          const ls = localStorage.getItem('worldcraft.state');
          if (ls) raw = JSON.parse(ls);
        } catch (e) { /* ignore */ }
      }
      if (!raw) raw = sampleWorld();  // 默认带示例，所有文字均可在表单里自由改

      // 之前一版默认是空白，老用户浏览器里可能存着一张彻底空白的画布。
      // 只在「一个字都没填」且用户没有主动点过「新建」时，替他补回示例。
      if (raw && !window.localStorage.getItem('worldcraft.reset')) {
        const empty = !String((raw.meta || {}).name || '').trim()
          && !(raw.characters || []).length
          && !(raw.factions || []).length
          && !(raw.cities || []).length
          && !(raw.stories || []).length
          && !(raw.timeline || []).length;
        if (empty) raw = sampleWorld();
      }

      this.state = normalize(raw);
      return this.state;
    },

    async save() {
      if (!this.state) return 'idb';
      this.state.meta.updatedAt = Date.now();
      const ok = await idbSet(STATE_KEY, this.state);
      if (ok) return 'idb';
      try {
        localStorage.setItem('worldcraft.state', JSON.stringify(this.state));
        return 'local';
      } catch (e) {
        console.warn('保存失败（存储空间可能已满）', e);
        return 'fail';
      }
    },

    replace(state) {
      this.state = normalize(state);
    },

    /* 查找 */
    findChar(id) { return (this.state.characters || []).find(c => c.id === id); },
    findFaction(id) { return (this.state.factions || []).find(f => f.id === id); },
    charName(id) { const c = this.findChar(id); return c ? c.name : '未知'; },
    factionName(id) { const f = this.findFaction(id); return f ? f.name : ''; },

    /* 通用集合操作 */
    list(key) { return this.state[key] || []; },
    add(key, item) {
      item.id = item.id || uidBak(key.slice(0, 1));
      // 时间线是顺序敏感的：新事件追加到末尾，不再压到最上方
      if (key === 'timeline') this.state[key].push(item);
      else this.state[key].unshift(item);
      return item;
    },
    update(key, id, patch) {
      const arr = this.state[key] || [];
      const i = arr.findIndex(x => x.id === id);
      if (i >= 0) { arr[i] = Object.assign({}, arr[i], patch); return arr[i]; }
      return null;
    },
    remove(key, id) {
      const arr = this.state[key] || [];
      const i = arr.findIndex(x => x.id === id);
      if (i >= 0) arr.splice(i, 1);
      if (key === 'characters') {
        this.state.relations = this.state.relations.filter(r => r.a !== id && r.b !== id);
      }
    }
  };

  window.Store = Store;
})();
