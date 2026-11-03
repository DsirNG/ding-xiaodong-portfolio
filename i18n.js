(() => {
  'use strict';

  const copy = [
    ['OPENING A LITTLE WINDOW INTO MY MIND...', '打开一扇通往我内心的小窗……'],
    ['Open menu', '打开菜单'], ['Say Hello', '打个招呼'], ['Back to home', '返回首页'],
    ['A LITTLE MAP OF MY HEAD', '我的灵感地图'],
    ['Projects', '项目'], ['Thoughts', '随笔'], ['About', '关于我'], ['Playground', '创意实验室'], ['Contact', '联系'],
    ['KEEP MAKING STRANGE THINGS ✳', '继续做点奇妙的东西 ✳'],
    ['A LITTLE CORNER OF THE WEB, BUILT TO EXPLORE', '一个值得慢慢探索的个人主页'],
    ['CURIOSITY FIRST. RULES OPTIONAL.', '好奇心领路，不被规则定义'],
    ['SCROLL TO UNPACK ↓', '向下滚动，拆开这袋灵感 ↓'],
    ['A BAG OF IDEAS, READY TO UNFOLD.', '一袋灵感，正等你拆开。'],
    ['Scroll to open the bag of creative tools', '向下滚动打开装着创意技术工具的纸袋'],
    ['Vite, click to explore projects', 'Vite，点击查看技术与项目'], ['Vite 3D object', 'Vite 3D 物件'],
    ['Vue, click to explore projects', 'Vue，点击查看技术与项目'], ['Vue 3D object', 'Vue 3D 物件'],
    ['React, click to explore interactive stories', 'React，点击查看交互式故事'], ['React 3D object', 'React 3D 物件'],
    ['Java, click to explore engineering projects', 'Java，点击查看工程项目'], ['Java 3D object', 'Java 3D 物件'],
    ['ChatGPT, click to explore AI projects', 'ChatGPT，点击查看 AI 项目'], ['ChatGPT 3D object', 'ChatGPT 3D 物件'],
    ['Cloudflare, click to explore engineering projects', 'Cloudflare，点击查看工程项目'], ['Cloudflare 3D object', 'Cloudflare 3D 物件'],
    ['WebStorm, click to explore engineering projects', 'WebStorm，点击查看工程项目'], ['WebStorm 3D object', 'WebStorm 3D 物件'],
    ['IntelliJ IDEA, click to explore engineering projects', 'IntelliJ IDEA，点击查看工程项目'], ['IntelliJ IDEA 3D object', 'IntelliJ IDEA 3D 物件'],
    ['Chrome, click to explore the playground', 'Chrome，点击查看实验室'], ['Chrome 3D object', 'Chrome 3D 物件'],
    ['Three.js softbody paper bag', 'Three.js 牛皮纸袋软体网格'], ['Closed kraft paper bag', '封闭牛皮纸袋'],
    ['View the latest project', '查看最新作品'], ['Latest', '最新作品'],
    ['NEW / A NEW KIND OF', '全新一代'], ['CREATIVE LABORATORY', '创作实验室'],
    ['2026 / NOW', '2026 / 此刻'], ['2026 / IN PROGRESS', '2026 / 进行中'],
    ['2026 / EXPERIMENT', '2026 / 实验中'], ['2026 / ENGINEERING', '2026 / 工程实践'],
    ['Interactive Stories', '互动叙事'], ['Liquid Glass', '液态玻璃'], ['Frontend Systems', '前端系统'],
    ['Work', '作品'], ['Lab', '实验室'], ['Email', '邮件'],
    ['CURIOUS THINGS AHEAD.', '好奇心即将启程。'], ['SCROLL SLOWLY ↓', '慢慢向下滚动 ↓'],
    ['01 — THE IDEA', '01 — 灵感'], ['Making the', '把'], ['ordinary', '平凡'], ['feel a little more', '变得更'], ['extraordinary.', '不平凡。'],
    ['I like taking ordinary ideas', '我喜欢把日常里的小想法，'], ['and turning them into experiences you can touch, explore, and interact with.', '变成能亲手触摸、探索和互动的体验。'],
    ['02 — WORKS IN THE WILD', '02 — 项目实践'], ["Things I've ", '我的'], ['made', '创作'],
    ['MOVE YOUR CURSOR THROUGH THESE ↗', '移动鼠标，看看它们的反应 ↗'], ['THINGS HAVE A LITTLE PERSONAL SPACE', '它们也需要一点私人空间'],
    ['View the DinQorAI project', '查看 DinQorAI 项目'], ['Imagine', '想象'], ['More', '更多'], ['What will we create today?　 →', '今天想创造什么？　→'],
    ['View the Liquid Glass project', '查看液态玻璃项目'], ['View the interactive story project', '查看分支互动故事项目'],
    ['View the frontend systems project', '查看前端架构项目'], ['View the interactive experiment', '查看交互实验'],
    ['Explore The Playground　↗', '探索实验室　↗'], ['NOT JUST PRETTY PICTURES. CLICK ANY OBJECT.', '不只是好看的图。点击任意物件来探索。'],
    ['03 — ABOUT THIS GUY', '03 — 关于我'], ['Meet', '认识一下'], ['this curious human', '这个好奇的人'],
    ['What next?', '接下来呢？'], ['A curious ', '一个好奇的'], ['mind', '灵魂'], ["that won't sit still.", '总在寻找新可能。'],
    ['DING XIAODONG', '丁晓东'], ['FRONTEND DEVELOPER', '前端开发者'], ['CREATIVE TECHNOLOGIST', '创意技术探索者'],
    ['I’m Ding Xiaodong. I like bringing ideas out of the screen.', '我是丁晓东，一个喜欢把想法从屏幕里拉出来的人。'],
    ['I build with code, interaction, and optical effects—and turn stories into worlds you can shape.', '我写代码、做交互、研究光学效果，也喜欢把故事设计成可以选择的世界。'],
    ['React / Vue / WebGL / Creative Coding', 'React / Vue / WebGL / 创意编程'], ['More About Me　↗', '更多关于我　↗'],
    ['04 — KEEPING BUSY', '04 — 最近在忙'], ['Recent', '最近的'], ['obsessions', '新鲜事'],
    ['A multimodal AI workspace for creators.', '一个面向创作者的多模态 AI 工作空间。'], ['Simple tools. Imagination without limits.', '让工具足够简单，让想象不受限制。'],
    ['Make choices inside a video.', '在视频里作出选择。'], ['Let the story branch from here.', '让故事真正从这里分叉。'],
    ['Exploring how glass in a browser', '尝试让浏览器里的玻璃'], ['can behave like a real optical material.', '像现实中的光学材料一样工作。'],
    ['Good components, clear boundaries,', '关于好的组件、清晰的边界，'], ['and code built to last.', '以及值得长久维护的代码。'],
    ['05 — A THOUGHT', '05 — 一个想法'], ['The best ideas happen when you stay ', '好奇心，总会带来'], ['curious.', '好点子。'],
    ['— MY WORKING PHILOSOPHY', '— 我的创作信念'], ['ALWAYS LEARNING. ALWAYS BUILDING.', '持续学习，持续创造。'],
    ['06 — PLAYGROUND', '06 — 实验室'], ['Ideas', '想法'], [' on the side', '也在这里发芽'], ['GO ON.', '来吧。'], ['POKE', '动手'], ['AROUND', '探索'], ['MOVE YOUR MOUSE ↗', '移动鼠标 ↗'],
    ["A FEW THINGS THAT SHOULDN'T EXIST—BUT DO.", '一些本不该存在、却真的做出来的小玩意。'],
    ['Tiny experiments, unfinished ideas, and curious web technology.', '小实验、没完成的点子、奇怪而有趣的 Web 技术。'], ["What's Inside?　↗", '里面有什么？　↗'],
    ['07 — END? NOT REALLY.', '07 — 结束？还没有。'], ['Keep in', '保持'], ['touch.', '联系。'],
    ['Have an idea? A strange question? Something worth making?', '有个想法？一个奇怪的问题？或者某件值得一起创造的事？'],
    ['Good ideas often start with “What if we tried?”', '好想法往往从一句「要不要试试」开始。'], ["Let's Make Something Together　↗", '一起做点有意思的事　↗'],
    ['MADE WITH CURIOSITY & TOO MUCH COFFEE.', '好奇心驱动，咖啡因助攻。'], ['BACK TO TOP ↑', '回到顶部 ↑'],
    ['Project details', '项目详情'], ['Close project details', '关闭项目详情'], ['Next Project ↗', '下一个项目 ↗'],
    ['View', '查看'], ['Creative portrait', '创作者概念肖像'],
    ['ARTIFICIAL INTELLIGENCE', '人工智能'], ['LIQUID', '液态'], ['GLASS', '玻璃'],
    ['EVERY CHOICE', '每一次选择'], ['CHANGES A STORY', '都能改变故事'],
    ['SYSTEMS & STRUCTURES', '系统与结构'], ['PLAY', '来玩'], ['WITH', '试试'], ['THIS!', '这个！']
  ];

  const lookup = new Map(copy.flatMap(([en, zh]) => [[en.trim(), {en:en.trim(), zh:zh.trim()}], [zh.trim(), {en:en.trim(), zh:zh.trim()}]]));
  const initialWhitespace = new WeakMap();
  const initialLocale = localStorage.getItem('site-locale');
  let locale = initialLocale === 'en' ? 'en' : 'zh';
  const toggle = document.getElementById('languageToggle');

  function translateAttributes() {
    document.querySelectorAll('[aria-label], img[alt]').forEach(el => {
      for (const name of ['aria-label', 'alt']) {
        const value = el.getAttribute(name);
        const pair = value && lookup.get(value.trim());
        if (pair) el.setAttribute(name, pair[locale]);
      }
    });
  }

  function applyLocale(next) {
    locale = next;
    localStorage.setItem('site-locale', locale);
    document.documentElement.lang = locale === 'zh' ? 'zh-CN' : 'en';
    document.title = locale === 'zh' ? '丁晓东 — 创意开发者' : 'DING XIAODONG — Creative Developer';
    const description = document.querySelector('meta[name="description"]');
    if (description) description.content = locale === 'zh'
      ? '丁晓东——前端开发者、创意技术探索者。关于创造、思考与交互的数字拼贴。'
      : 'Ding Xiaodong — frontend developer and creative technologist exploring interaction, ideas, and digital experiences.';

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const trimmed = node.nodeValue.trim();
      const pair = lookup.get(trimmed);
      if (!pair) continue;
      if (!initialWhitespace.has(node)) {
        const leading = node.nodeValue.match(/^\s*/)?.[0] || '';
        const trailing = node.nodeValue.match(/\s*$/)?.[0] || '';
        initialWhitespace.set(node, {leading, trailing});
      }
      const whitespace = initialWhitespace.get(node);
      node.nodeValue = locale === 'en' ? `${whitespace.leading}${pair.en}${whitespace.trailing}` : pair.zh;
    }
    translateAttributes();
    if (toggle) {
      toggle.textContent = locale === 'zh' ? '中' : 'EN';
      toggle.setAttribute('aria-label', locale === 'zh' ? '切换到英文' : 'Switch to Chinese');
      toggle.setAttribute('aria-pressed', String(locale === 'en'));
    }
    window.siteLocale = locale;
    window.dispatchEvent(new CustomEvent('site:locale-change', {detail:{locale}}));
  }

  toggle?.addEventListener('click', () => applyLocale(locale === 'zh' ? 'en' : 'zh'));
  window.setSiteLocale = applyLocale;
  applyLocale(locale);
})();
