function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function list(items, className = 'usage-list') {
  return `<ul class="${className}">${items.map((item) => `<li>${esc(item)}</li>`).join('')}</ul>`;
}

function frame(slide, body, className = '') {
  return `
    <section class="slide usage-slide usage-${slide.variant} ${className}" data-slide>
      <div class="usage-topline" data-review-box>
        <span>${esc(slide.section)}</span>
        <b>${String(slide.number).padStart(2, '0')} / ${slide.total}</b>
      </div>
      ${body}
      <div class="usage-page-mark">${String(slide.number).padStart(2, '0')}</div>
    </section>`;
}

function header(slide) {
  return `
    <header class="usage-header" data-review-box>
      <p>${esc(slide.kicker)}</p>
      <div>
        <h1>${esc(slide.title)}</h1>
        <span>${esc(slide.subtitle)}</span>
      </div>
    </header>`;
}

export const slides = [
  {
    number: 1,
    section: 'Entry',
    variant: 'entry',
    kicker: 'Presentation Workbench',
    title: '如何打开这个工作台',
    subtitle: '这个项目已经配置了 VS Code 自动任务。第一次打开文件夹时允许自动任务后，工作台会启动在 5174；如果网页被关掉，用 Cmd+Shift+B 重新打开即可。',
  },
  {
    number: 2,
    section: 'Folders',
    variant: 'folders',
    kicker: 'Project Map',
    title: '先理解文件夹职责',
    subtitle: '这个项目把“工作台系统”和“具体 PPT 内容”分开保存。平时做汇报主要改 decks 里的内容，除非要改工作台能力，否则不要先动 src。',
  },
  {
    number: 3,
    section: 'Deck Anatomy',
    variant: 'deck',
    kicker: 'Deck Local',
    title: '每个 PPT 都是一个独立 deck',
    subtitle: '一个 deck 目录里保存这份 PPT 的配置、页面内容、样式、截图评估结果和交付物。这样不同汇报之间不容易互相污染。',
  },
  {
    number: 4,
    section: 'Desktop',
    variant: 'desktop',
    kicker: 'Workbench Desktop',
    title: '工作台桌面负责收纳所有 PPT',
    subtitle: '首页不是一页普通幻灯片，而是所有 deck 的入口。你可以在这里浏览、打开和调整顺序。',
  },
  {
    number: 5,
    section: 'Presentation',
    variant: 'presentation',
    kicker: 'Presenter View',
    title: '进入某个 PPT 后的基本操作',
    subtitle: '演示页使用固定 1600 x 900 画布，浏览器只负责整体缩放。底部导航用于翻页、返回桌面、全屏和打开标注工具。',
  },
  {
    number: 6,
    section: 'AI Workflow',
    variant: 'ai',
    kicker: 'Human + GPT + Codex',
    title: '推荐的 AI 协作制作流程',
    subtitle: '不要直接让模型一次性生成完整 PPT。更稳定的做法是先用网页 GPT 打磨内容蓝图，再让 VS Code 里的 Codex 按蓝图分批制作和评估。',
  },
  {
    number: 7,
    section: 'Open Ends',
    variant: 'open',
    kicker: 'Still Exploring',
    title: '当前状态：刚刚够用，仍在探索',
    subtitle: '这个系统已经能明显压缩制作时间，但还不是成熟产品。设计语言、经验库、自动化评估和复杂页面能力仍需要继续验证。',
  },
];

function renderEntry(slide) {
  return frame(slide, `
    ${header(slide)}
    <main class="usage-entry-grid">
      <section class="usage-terminal" data-review-box>
        <p>.vscode/tasks.json</p>
        <div><span>自动启动</span><b>npm run start:workbench</b></div>
        <div><span>工作台地址</span><b>http://127.0.0.1:5174</b></div>
        <div><span>重新打开</span><b>Cmd+Shift+B</b></div>
        <pre class="usage-terminal-log">workspace: presentation-workbench
surface: desktop + presenter
status: ready on 5174</pre>
      </section>
      <aside class="usage-entry-path" data-review-box>
        <article>
          <span>01</span>
          <div><b>打开项目文件夹</b><p>VS Code 读取工作区任务配置。</p></div>
        </article>
        <article>
          <span>02</span>
          <div><b>自动启动工作台</b><p>本地服务固定使用 5174。</p></div>
        </article>
        <article>
          <span>03</span>
          <div><b>网页只是预览入口</b><p>关掉页面不会影响项目文件。</p></div>
        </article>
        <strong>实际使用时不用手动找入口</strong>
      </aside>
    </main>
  `);
}

function renderFolders(slide) {
  const rows = [
    ['src/', '保存工作台运行逻辑，例如桌面页、导航、标注工具和基础样式。一般做具体 PPT 时不需要先改这里。', '工作台系统'],
    ['decks/', '每个 PPT 一个独立目录。汇报内容、页面样式、截图评估和交付物优先放在对应 deck 下。', '主题内容'],
    ['scripts/', '保存辅助脚本，例如启动工作台、清理 review、创建 checkpoint 和检查文档。', '自动化脚本'],
    ['tests/', '保存自动检查脚本，用来发现页面溢出、生成截图 review，并验证工作台桌面交互。', '验证入口'],
    ['prompts/', '保存给 Codex 或其他 AI 使用的任务模板，方便复用常见制作、评估和修复流程。', '任务模板'],
    ['system/', '保存跨 deck 的长期规则、用户偏好和失败模式，不放某一个具体主题的内容。', '长期规则'],
  ];
  return frame(slide, `
    ${header(slide)}
    <main class="usage-folder-grid" data-review-box>
      ${rows.map(([name, desc, role]) => `
        <article>
          <code>${esc(name)}</code>
          <p>${esc(desc)}</p>
          <span>${esc(role)}</span>
        </article>`).join('')}
    </main>
  `);
}

function renderDeck(slide) {
  const files = [
    ['deck.config.js', '注册这个 deck 的 id、标题、默认布局和 renderer。工作台通过它找到并加载这份 PPT。'],
    ['slides.js', '保存页面内容、数据结构和渲染函数。大多数页面制作会集中修改这个文件。'],
    ['styles.css', '保存当前 deck 的页面样式。只影响这份 PPT，不应该随意改全局样式。'],
    ['review/current/', '运行 review 后生成截图总览。默认覆盖当前版本，方便反复检查最新结果。'],
    ['deliverables/', '需要把成果对外分享时，再把导出的 HTML、PDF 或其他交付物放到这里。'],
  ];
  return frame(slide, `
    ${header(slide)}
    <main class="usage-deck-shell">
      <section class="usage-tree" data-review-box>
        <p>decks/my-topic/</p>
        ${files.map(([name]) => `<span>${esc(name)}</span>`).join('')}
      </section>
      <section class="usage-file-notes" data-review-box>
        ${files.map(([name, body]) => `
          <div>
            <code>${esc(name)}</code>
            <p>${esc(body)}</p>
          </div>`).join('')}
      </section>
    </main>
  `);
}

function renderDesktop(slide) {
  const actions = [
    ['浏览', '滚轮或横向拖动', '横向查看所有 deck 卡片，适合同时管理多个 PPT。'],
    ['进入', '点击封面缩略图', '进入对应 deck 的演示文档页。'],
    ['排序', '长按卡片后拖动', '新的顺序会写入 src/workbenchOrder.json。'],
    ['清理', 'placeholder-blank-*', '只是占位空白 PPT，理解收纳效果后可以删除。'],
  ];
  return frame(slide, `
    ${header(slide)}
    <main class="usage-desktop-demo">
      <section class="usage-card-stack" data-review-box>
        <article><span>01</span><h2>Usage</h2><p>Guide / workflow</p><i>cover</i></article>
        <article><span>02</span><h2>Blank 01</h2><p>Placeholder deck</p><i>cover</i></article>
        <article><span>03</span><h2>Blank 02</h2><p>Placeholder deck</p><i>cover</i></article>
      </section>
      <aside class="usage-actions usage-action-panel" data-review-box>
        ${actions.map(([verb, trigger, result]) => `
          <article>
            <span>${esc(verb)}</span>
            <div><b>${esc(trigger)}</b><p>${esc(result)}</p></div>
          </article>`).join('')}
      </aside>
    </main>
  `);
}

function renderPresentation(slide) {
  const actions = [
    ['翻页', '左右方向键 / 底部按钮', '切换上一页或下一页。'],
    ['返回', '桌面', '回到工作台首页，不需要重新输入地址。'],
    ['演示', '全屏', '进入或退出全屏演示状态。'],
    ['标注', '标注 / 键盘 A', '打开画笔、荧光笔、橡皮、撤销和清空当前页。'],
    ['定位', 'deck + slide 参数', '直接打开某个 deck 的具体页面位置。'],
  ];
  return frame(slide, `
    ${header(slide)}
    <main class="usage-presenter-grid">
      <section class="usage-screen" data-review-box>
        <div class="usage-screen-canvas">
          <span>1600 x 900</span>
          <h2>Slide Canvas</h2>
        </div>
        <div class="usage-nav-pill">
          <b>桌面</b><b>←</b><b>1 / 7</b><b>→</b><b>标注</b><b>全屏</b>
        </div>
      </section>
      <aside class="usage-actions usage-presenter-actions" data-review-box>
        ${actions.map(([verb, trigger, result]) => `
          <article>
            <span>${esc(verb)}</span>
            <div><b>${esc(trigger)}</b><p>${esc(result)}</p></div>
          </article>`).join('')}
      </aside>
    </main>
  `);
}

function renderAi(slide) {
  const steps = [
    ['选题', '先确定要讲的主题和听众，不急着进入页面制作。', '目标边界'],
    ['内容方案', '和网页 GPT 交流，得到只涉及汇报内容的设计方案报告。', '蓝图初稿'],
    ['双窗口评估', '新开窗口评估方案，在“评估 -> 修改 -> 再评估”之间循环，直到蓝图足够好。', '可制作蓝图'],
    ['Codex 归档', '把最终设计方案交给 VS Code 里的 Codex，让它归档为蓝图并开启计划模式。', 'deck 计划'],
    ['样张通过', '先做少量样张确认方向，再继续让 Codex 分批自动制作后续页面。', '批量制作'],
    ['独立评估', '全部完成后新开窗口写评估方案，确认评估合理后按结果继续修改。', '修复清单'],
  ];
  return frame(slide, `
    ${header(slide)}
    <main class="usage-ai-flow" data-review-box>
      ${steps.map(([title, body, output], index) => `
        <article>
          <span>${String(index + 1).padStart(2, '0')}</span>
          <h2>${esc(title)}</h2>
          <p>${esc(body)}</p>
          <em>${esc(output)}</em>
        </article>`).join('')}
    </main>
    <aside class="usage-boundary" data-review-box>
      当前不是“一次生成完美 PPT”的系统。复杂生图、画图和部分页面设计仍需要人工跟 Codex 继续交流，但整体已经能大幅压缩制作时间。
    </aside>
  `);
}

function renderOpen(slide) {
  const items = [
    ['deck 卡片流程', '封面预览、卡片文案、排序和归档规则还没有形成稳定规范。'],
    ['设计语言', '还没找到足够稳定且高级的视觉语言，不同主题如何统一又不单调仍需验证。'],
    ['制作经验', '真实 deck 数量还少，不同题材、信息密度和页面类型的压力测试还不够。'],
    ['能力边界', '复杂图表、生图、代码截图、长表格和交互页的能力边界还需要继续摸清。'],
    ['自动化', '目前能检查溢出和导出截图，但审美、叙事节奏和信息取舍仍依赖人工评估。'],
    ['协作流程', '蓝图、评估报告、修改记录和交付物管理后续可以继续标准化。'],
  ];
  return frame(slide, `
    ${header(slide)}
    <main class="usage-open-board">
      ${items.map(([title, body]) => `
        <article data-review-box>
          <h2>${esc(title)}</h2>
          <p>${esc(body)}</p>
        </article>`).join('')}
    </main>
  `);
}

export function usagePlaceholderLayout(slide) {
  const renderers = {
    entry: renderEntry,
    folders: renderFolders,
    deck: renderDeck,
    desktop: renderDesktop,
    presentation: renderPresentation,
    ai: renderAi,
    open: renderOpen,
  };
  const render = renderers[slide.variant];
  if (!render) throw new Error(`Unknown usage guide variant: ${slide.variant}`);
  return render(slide);
}
