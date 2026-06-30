function esc(value = '') {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

export const slides = [
  {
    number: 1,
    title: '占位空白 PPT 04',
    subtitle: '用于展示工作台可以收纳多个汇报；当前没有实际内容',
    note: 'Placeholder deck',
  },
  {
    number: 2,
    title: '空白页占位',
    subtitle: '保留网格背景和固定 1600 x 900 画布',
    note: 'Blank page',
  },
  {
    number: 3,
    title: '空白页占位',
    subtitle: '可以让 Codex 删除这些占位 deck',
    note: 'Blank page',
  },
];

export function blankLayout(slide) {
  return `
    <section class="slide placeholder-slide" data-slide>
      <main class="tpl-placeholder" data-review-box>
        <p>${esc(slide.note)}</p>
        <h1>${esc(slide.title)}</h1>
        <span>${esc(slide.subtitle)}</span>
      </main>
      <div class="tpl-page-mark">${String(slide.number).padStart(2, '0')} / ${slide.total}</div>
    </section>`;
}
