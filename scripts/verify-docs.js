import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const markdownRoots = ['docs', 'system', 'decks', 'archive'];
const rootMarkdownFiles = ['AGENTS.md', 'README.md', 'QUICK_START.md'];
const problems = [];

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function collectMarkdownFiles(dir) {
  if (!await exists(dir)) return [];

  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectMarkdownFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(fullPath);
    }
  }

  return files;
}

function relative(filePath) {
  return path.relative(rootDir, filePath);
}

function report(filePath, message) {
  problems.push(`${relative(filePath)}: ${message}`);
}

function checkBasicMarkdown(filePath, content) {
  if (!content.trim()) {
    report(filePath, 'file is empty');
  }

  if (/^(<<<<<<<|=======|>>>>>>>) /m.test(content)) {
    report(filePath, 'contains unresolved conflict markers');
  }

  if (content.includes('\r')) {
    report(filePath, 'contains CRLF line endings');
  }
}

function checkLegacyRtlBlueprint(filePath, content) {
  const declaredMatch = content.match(/^## 建议页序：(\d+)个主页面$/m);
  if (!declaredMatch) {
    report(filePath, 'missing "建议页序：N个主页面" heading');
    return;
  }

  const start = declaredMatch.index + declaredMatch[0].length;
  const endMarker = content.indexOf('\n## 可选展开层', start);
  if (endMarker === -1) {
    report(filePath, 'missing "可选展开层" boundary after main page list');
    return;
  }

  const mainSection = content.slice(start, endMarker);
  const pageMatches = [...mainSection.matchAll(/^\d+\. .+$/gm)];
  const declaredCount = Number(declaredMatch[1]);

  if (pageMatches.length !== declaredCount) {
    report(filePath, `declares ${declaredCount} main pages but lists ${pageMatches.length}`);
  }

  for (const match of pageMatches) {
    const nextPageStart = mainSection.indexOf('\n' + String(Number(match[0].split('.')[0]) + 1) + '. ', match.index);
    const blockEnd = nextPageStart === -1 ? mainSection.length : nextPageStart;
    const block = mainSection.slice(match.index, blockEnd);
    if (!block.includes('核心表达：')) {
      report(filePath, `page "${match[0]}" is missing 核心表达`);
    }
  }
}

function checkLegacyRtlBlueprintAcceptance(filePath, content) {
  const requiredFields = [
    '本页讲什么：',
    '怎么讲述：',
    '可借鉴资料：',
    '版面安排：',
    '交互模块：',
    '设计难度：',
    '替代方案：',
    '验收结论：',
  ];
  const allowedDifficulties = ['S', 'M', 'L', 'XL'];
  const allowedInteractionDecisions = ['不需要', '灰盒占位'];
  const allowedConclusions = ['通过', '需改写', '需合并', '需拆分', '暂缓'];
  const requiredPages = Array.from({ length: 25 }, (_, index) => index + 1);

  for (const page of requiredPages) {
    const heading = new RegExp(`^### ${page}\\. .+$`, 'm');
    const headingMatch = content.match(heading);
    if (!headingMatch) {
      report(filePath, `missing acceptance card for page ${page}`);
      continue;
    }

    const start = headingMatch.index + headingMatch[0].length;
    const nextHeadingMatch = content.slice(start).match(/^### \d+\. .+$/m);
    const end = nextHeadingMatch ? start + nextHeadingMatch.index : content.length;
    const block = content.slice(start, end);

    for (const field of requiredFields) {
      if (!block.includes(field)) {
        report(filePath, `page ${page} acceptance card is missing ${field}`);
      }
    }

    const interactionMatch = block.match(/交互模块：([^。\n]+)/);
    if (interactionMatch && !allowedInteractionDecisions.some((label) => interactionMatch[1].trim().startsWith(label))) {
      report(filePath, `page ${page} has unsupported interaction decision "${interactionMatch[1].trim()}"`);
    }

    const difficultyMatch = block.match(/设计难度：([^。\n]+)/);
    if (difficultyMatch && !allowedDifficulties.includes(difficultyMatch[1].trim())) {
      report(filePath, `page ${page} has unsupported design difficulty "${difficultyMatch[1].trim()}"`);
    }

    const conclusionMatch = block.match(/验收结论：([^。\n]+)/);
    if (conclusionMatch && !allowedConclusions.includes(conclusionMatch[1].trim())) {
      report(filePath, `page ${page} has unsupported acceptance conclusion "${conclusionMatch[1].trim()}"`);
    }
  }
}

function checkDeckBrief(filePath, content) {
  const requiredSections = ['## 目标', '## 范围', '## 页面草案'];
  for (const section of requiredSections) {
    if (!content.includes(section)) {
      report(filePath, `deck brief is missing ${section}`);
    }
  }
}

function checkSpecializedDocs(filePath, content) {
  const rel = relative(filePath);

  if (rel === 'docs/03_presentation_blueprint.md') {
    checkLegacyRtlBlueprint(filePath, content);
  }

  if (rel === 'docs/14_blueprint_acceptance.md') {
    checkLegacyRtlBlueprintAcceptance(filePath, content);
  }

  if (/^decks\/[^/]+\/brief\.md$/.test(rel)) {
    checkDeckBrief(filePath, content);
  }
}

const markdownFiles = [
  ...(await Promise.all(markdownRoots.map((dir) => collectMarkdownFiles(path.join(rootDir, dir))))).flat(),
  ...rootMarkdownFiles.map((file) => path.join(rootDir, file)),
];

for (const filePath of markdownFiles) {
  if (!await exists(filePath)) continue;

  const content = await readFile(filePath, 'utf8');
  checkBasicMarkdown(filePath, content);
  checkSpecializedDocs(filePath, content);
}

if (problems.length > 0) {
  console.error('Document verification failed:');
  for (const problem of problems) {
    console.error(`- ${problem}`);
  }
  process.exit(1);
}

console.log(`Document verification passed for ${markdownFiles.length} Markdown files.`);
