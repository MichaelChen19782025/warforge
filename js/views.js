// ================================================================
// views.js: 淬体实录、日记矩阵与灵枢配置（移动端防竖排挤压与负重明细渲染）
// ================================================================
function setSafeValue(id, val) {
const el = document.getElementById(id);
if (el) el.value = (val !== undefined && val !== null) ? val : '';
}
function getSafeNumber(id, fallback = 0) {
const el = document.getElementById(id);
if (!el) return fallback;
const v = parseFloat(el.value);
return isNaN(v) ? fallback : v;
}
function getSafeString(id, fallback = '') {
const el = document.getElementById(id);
return el ? el.value : fallback;
}
let diaryFilter = 'all';
let diaryView = 'entry';
let diarySort = 'dateDesc';
function setDiaryFilter(mode) {
diaryFilter = mode;
renderDiaryList();
}
function setDiaryView(v) {
diaryView = v === 'card' ? 'card' : 'entry';
renderDiaryList();
}
function setDiarySort(v) {
diarySort = v || 'dateDesc';
renderDiaryList();
}
function diaryIsStructured(d) {
return !!(d && d.structured && Array.isArray(d.structured.sections) && d.structured.sections.length);
}
function diaryIsAiSource(d) {
if (!d) return false;
const src = String(d.source == null ? '' : d.source).toLowerCase().trim();
if (src === 'chat_ai' || src === 'ai' || src === 'ai_chat' || src === 'chat') return true;
if (typeof d.id === 'string' && d.id.indexOf('diary_chat_') === 0) return true;
if (typeof d.tag === 'string' && /ai\s*复盘/i.test(d.tag)) return true;
return false;
}
function normalizeDiarySources() {
if (!Array.isArray(data.diaries)) return 0;
let fixed = 0;
data.diaries.forEach(d => {
if (d && diaryIsAiSource(d) && d.source !== 'chat_ai') { d.source = 'chat_ai'; fixed++; }
});
if (fixed) { try { saveData(); } catch (e) {} }
return fixed;
}
function diaryMatchesFilter(d, mode) {
if (mode === 'ai') return diaryIsAiSource(d);
if (mode === 'manual') return !diaryIsAiSource(d);
if (mode === 'cards') return diaryIsStructured(d);
return true;
}
function diaryCharCount(d) {
let n = String(d.content || '').length;
const s = d.structured;
if (s) {
if (s.summary) n += String(s.summary).length;
(Array.isArray(s.sections) ? s.sections : []).forEach(x => {
if (x) n += String(x.body || '').length + String(x.heading || '').length;
});
['keyPoints', 'decisions', 'warnings'].forEach(k => (Array.isArray(s[k]) ? s[k] : []).forEach(x => n += String(x).length));
}
return n;
}
function diaryCardEntries(d) {
const out = [];
const s = d.structured;
if (diaryIsStructured(d)) {
s.sections.forEach((sec, i) => {
const body = String((sec && sec.body) || '').trim();
const heading = String((sec && sec.heading) || '').trim();
if (!body && !heading) return;
out.push({
idx: i,
heading: heading,
body: body,
title: heading || firstTextLine(body) || ('卡片 #' + (i + 1))
});
});
} else {
const lines = String(d.content || '').split('\n').map(x => x.trim()).filter(Boolean);
if (lines.length) out.push({ idx: -1, heading: '', body: lines.join('\n'), title: d.title || '无题随笔', single: true });
}
return out;
}
function firstTextLine(s) {
const t = String(s || '').split('\n').map(x => x.trim()).find(Boolean) || '';
return t.length > 30 ? t.slice(0, 30) + '…' : t;
}
function diarySortCompare(a, b) {
const aDate = String(a.date || '');
const bDate = String(b.date || '');
if (diarySort === 'dateAsc') return aDate.localeCompare(bDate);
if (diarySort === 'lenDesc') return diaryCharCount(b) - diaryCharCount(a);
return bDate.localeCompare(aDate);
}
function diaryEntryCardHTML(d) {
const cards = diaryCardEntries(d);
const isAi = diaryIsAiSource(d);
const tocLimit = 10;
const toc = cards.length
? <div class="diary-toc">${cards.slice(0, tocLimit).map(c =>
<button type="button" class="diary-toc-chip" onclick="openDiaryReader('${escAttr(d.id)}', `${c.idx}`)">
{escHtml(c.title)}</button>).join('')} ${cards.length > tocLimit ?<span class="diary-toc-chip" style="cursor:default; opacity:.75;">…共 
{escAttr(d.id)}" 
s
e
l
e
t
e
d
D
i
a
r
y
I
d
s
.
h
a
s
(
d
.
i
d
)
?
′
h
e
k
e
d
′
:
′
′
o
n
h
a
n
g
e
=
"
d
i
a
r
y
h
e
k
T
o
g
g
l
e
(
t
h
i
s
)
"
>
<
d
i
v
s
t
y
l
e
=
"
f
l
e
x
:
1
;
m
i
n
−
w
i
d
t
h
:
0
;
"
>
<
d
i
v
l
a
s
s
=
"
d
i
a
r
y
−
h
e
a
d
e
r
"
>
<
d
i
v
s
t
y
l
e
=
"
m
i
n
−
w
i
d
t
h
:
0
;
f
l
e
x
:
1
;
"
>
<
d
i
v
l
a
s
s
=
"
d
i
a
r
y
−
t
i
t
l
e
"
>
selectedDiaryIds.has(d.id)? 
′
 checked 
′
 : 
′′
 onchange="diaryCheckToggle(this)"><divstyle="flex:1;min−width:0;"><divclass="diary−header"><divstyle="min−width:0;flex:1;"><divclass="diary−title">
{escHtml(d.title || '无题随笔')}</div>
<div class="diary-meta" style="margin-top:4px;">
<span class="badge ${isAi ? 'badge-cyan' : 'badge-green'}">${isAi ? '🧠 AI聊天' : '✍️ 手写'}</span>
${cards.length ? <span class="badge badge-amber">📇 ${cards.length}卡</span> : ''}
<span>📅 
e
s
H
t
m
l
(
d
.
d
a
t
e
∣
∣
′
′
)
<
/
s
p
a
n
>
<
s
p
a
n
l
a
s
s
=
"
b
a
d
g
e
b
a
d
g
e
−
a
m
b
e
r
"
>
escHtml(d.date∣∣ 
′′
 )</span><spanclass="badgebadge−amber">
{escHtml(d.mood || '平稳')}</span>
{escHtml(d.tag)}</span>: ''} </div> </div> <div class="diary-actions" style="flex-shrink:0;"> <button class="btn btn-sm btn-cyan" onclick="openDiaryReader('${escAttr(d.id)}')">📖</button> <button class="btn btn-sm btn-outline" onclick="editDiaryEntry('${escAttr(d.id)}')">✏️</button> <button class="btn btn-sm btn-danger" onclick="deleteDiaryEntry('${escAttr(d.id)}')">🗑</button> </div> </div> ${toc} <div class="diary-content">${diaryBodyHTML(d)}</div> <div class="diary-footer"> <span class="diary-tag">🕒 ${d.createdAt ? new Date(d.createdAt).toLocaleString() : '未记时间'}</span> </div> </div> </div> </div>;
}
function diaryCardIndexRowHTML(d, c) {
const one = c.body.replace(/\s+/g, ' ').slice(0, 50);
return <div class="diary-card-index-row" onclick="openDiaryReader('${escAttr(d.id)}', `${c.idx}`)"> <span class="dci-no">${c.idx >= 0 ? '#' + (c.idx + 1) : '单篇'}</span> <span class="dci-body" style="min-width:0;"> <span class="dci-title">${escHtml(c.title)}</span> <span class="dci-meta">📅 ${escHtml(d.date || '')} · ${escHtml(d.title || '随笔')}${one ? ' · ' + escHtml(one) : ''}</span> </span> <span class="dci-count">${c.body.length}字</span> </div>;
}
function diaryMonthKey(d) {
return (d.date || '').slice(0, 7) || '未标注';
}
function diaryMonthLabel(key) {
const m = /^(\d{4})-(\d{2})
/
.
e
x
e
(
k
e
y
)
;
r
e
t
u
r
n
m
?
‘
/.exec(key);returnm?‘
{m[1]}年${parseInt(m[2], 10)}月` : key;
}
function renderDiaryList() {
const container = document.getElementById('diaryCardList');
if (!container) return;
const searchVal = (document.getElementById('diarySearchInput')?.value || '').toLowerCase();
const counts = { all: (data.diaries || []).length, ai: 0, manual: 0, cards: 0 };
(data.diaries || []).forEach(d => {
    if (diaryIsAiSource(d)) counts.ai++; else counts.manual++;
    if (diaryIsStructured(d)) counts.cards++;
});
document.querySelectorAll('#diaryFilterChips [data-dfilter]').forEach(btn => {
    const k = btn.getAttribute('data-dfilter');
    btn.classList.toggle('active', k === diaryFilter);
    const b = btn.querySelector('b');
    if (b) b.textContent = counts[k] || 0;
});
document.querySelectorAll('#diaryViewChips [data-dview]').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-dview') === diaryView);
});

const countTextEl = document.getElementById('diaryCountText');
if (!data.diaries || !data.diaries.length) {
    container.innerHTML = `
        <div class="diary-empty">
            <span>📖</span>
            尚未著录随笔<br>
            <span style="font-size:11px; color:var(--text-dim);">点击「+ 撰写」或「🧠 AI聊天」记录心得</span>
        </div>
    `;
    if (countTextEl) countTextEl.textContent = '在册 0 篇';
    updateDiaryBatchUI();
    return;
}

const filtered = data.diaries
    .filter(d => diaryMatchesFilter(d, diaryFilter))
    .filter(d => !searchVal || diarySearchText(d).includes(searchVal))
    .sort(diarySortCompare);

const totalCards = filtered.reduce((n, d) => n + diaryCardEntries(d).length, 0);
const totalChars = filtered.reduce((n, d) => n + diaryCharCount(d), 0);
if (countTextEl) {
    countTextEl.textContent = `在册 ${counts.all} 篇 · 当前 ${filtered.length} 篇 · 卡片 ${totalCards} 张 · 共 ${totalChars} 字`;
}

updateDiaryBatchUI();

if (!filtered.length) {
    container.innerHTML = `<div class="diary-empty" style="padding:16px;"><span>🔍</span>无匹配随笔</div>`;
    return;
}

if (diaryView === 'card') {
    const groups = new Map();
    filtered.forEach(d => {
        const key = diaryMonthKey(d);
        if (!groups.has(key)) groups.set(key, []);
        diaryCardEntries(d).forEach(c => groups.get(key).push({ d, c }));
    });
    container.innerHTML = [...groups.entries()].map(([key, rows]) => `
        <div class="diary-month-head">📅 ${diaryMonthLabel(key)} <span class="diary-month-count">${rows.length} 张卡</span></div>
        ${rows.map(r => diaryCardIndexRowHTML(r.d, r.c)).join('')}
    `).join('');
    return;
}

const groups = new Map();
filtered.forEach(d => {
    const key = diaryMonthKey(d);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
});
container.innerHTML = [...groups.entries()].map(([key, list]) => `
    <div class="diary-month-head">📅 ${diaryMonthLabel(key)} <span class="diary-month-count">${list.length} 篇</span></div>
    ${list.map(d => diaryEntryCardHTML(d)).join('')}
`).join('');
}
function diarySearchText(d) {
const parts = [d.title, d.mood, d.tag, d.content];
const s = d.structured || {};
if (s.summary) parts.push(s.summary);
(Array.isArray(s.sections) ? s.sections : []).forEach(x => { if (x) parts.push(x.heading, x.body); });
return parts.join(' ').toLowerCase();
}
function diaryBodyHTML(d) {
if (d.structured && typeof d.structured === 'object') return vaultHTML(d.structured);
if (!d.content) return '<div class="diary-empty" style="padding:8px 0; text-align:left;">（无正文内容）</div>';
return mdLiteFlowing(d.content);
}
function vaultHTML(s) {
if (!s) return '';
const parts = [];
if (s.summary) parts.push(<div class="vault-summary">${escHtml(s.summary)}</div>);
if (Array.isArray(s.sections) && s.sections.length) {
let cardNo = 0;
s.sections.forEach(sec => {
const body = sec && sec.body ? mdLiteFlowing(sec.body) : '';
if (!body) return;
cardNo++;
const headHtml = sec && sec.heading
? <div class="vault-section-head">${escHtml(sec.heading)}</div>
: <div class="vault-section-head vault-section-head-auto">卡片 #${cardNo}</div>;
parts.push(<div class="vault-section">${headHtml}<div class="vault-section-body">${body}</div></div>);
});
}
return parts.length ? <div class="diary-vault">${parts.join('')}</div> : '';
}
let selectedDiaryIds = new Set();
function diaryCheckToggle(cb) {
const id = cb.getAttribute('data-did');
if (!id) return;
if (cb.checked) selectedDiaryIds.add(id); else selectedDiaryIds.delete(id);
updateDiaryBatchUI();
}
function diarySelectAll() {
data.diaries.forEach(d => selectedDiaryIds.add(d.id));
syncDiaryChecks();
}
function diarySelClear() {
selectedDiaryIds.clear();
syncDiaryChecks();
}
function syncDiaryChecks() {
document.querySelectorAll('#diaryCardList .diary-check').forEach(cb => {
cb.checked = selectedDiaryIds.has(cb.getAttribute('data-did'));
});
updateDiaryBatchUI();
}
function updateDiaryBatchUI() {
const bar = document.getElementById('diaryBatchBar');
const cnt = document.getElementById('diarySelCount');
if (!bar) return;
const n = selectedDiaryIds.size;
if (cnt) cnt.textContent = n;
bar.classList.toggle('hidden', n === 0);
}
function diaryBatchDelete() {
const n = selectedDiaryIds.size;
if (!n) return alert('请先勾选要删除的日记');
if (!confirm(确定永久删除选中的 ${n} 篇随笔？)) return;
data.diaries = data.diaries.filter(d => !selectedDiaryIds.has(d.id));
selectedDiaryIds.clear();
saveData();
renderDiaryList();
alert(✅ 已批量删除 ${n} 篇随笔。);
}
let diaryReaderCurrentId = null;
function openDiaryReader(id, cardIdx) {
const d = data.diaries.find(x => x.id === id);
if (!d) return;
diaryReaderCurrentId = id;
document.getElementById('diaryFormCard')?.classList.add('hidden');
document.getElementById('chatWorkbenchCard')?.classList.add('hidden');
const rTitle = document.getElementById('diaryReaderTitle');
if (rTitle) rTitle.textContent = '📖 ' + (d.title || '无题随笔');
const rMeta = document.getElementById('diaryReaderMeta');
if (rMeta) {
rMeta.innerHTML = <span>📅 ${escHtml(d.date || '')}</span> <span class="badge badge-amber">${escHtml(d.mood || '平稳')}</span> ${d.tag ?<span class="badge badge-police">${escHtml(d.tag)}</span>: ''} <span class="badge ${diaryIsAiSource(d) ? 'badge-cyan' : 'badge-green'}">${diaryIsAiSource(d) ? '🧠 AI聊天' : '✍️ 手写'}</span>;
}
const rBody = document.getElementById('diaryReaderBody');
if (rBody) rBody.innerHTML = diaryBodyHTML(d);
const rCard = document.getElementById('diaryReaderCard');
if (rCard) {
    rCard.classList.remove('hidden');
    setAiImmersive(true);
    rCard.scrollIntoView({ behavior: 'auto', block: 'start' });
}
}
function closeDiaryReader() {
document.getElementById('diaryReaderCard')?.classList.add('hidden');
setAiImmersive(false);
diaryReaderCurrentId = null;
}
function showDiaryForm() {
const duty = getDutyShiftInfo();
document.getElementById('diaryFormCard')?.classList.remove('hidden');
setSafeValue('diaryEditId', '');
setSafeValue('diaryDate', duty.dutyDateStr);
setSafeValue('diaryMood', '⚡ 状态极佳·气血充沛');
setSafeValue('diaryTag', '');
setSafeValue('diaryTitle', '');
setSafeValue('diaryContent', '');
document.getElementById('diaryFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function editDiaryEntry(id) {
const entry = data.diaries.find(d => d.id === id);
if (!entry) return;
document.getElementById('diaryFormCard')?.classList.remove('hidden');
setSafeValue('diaryEditId', id);
setSafeValue('diaryDate', entry.date || '');
setSafeValue('diaryMood', entry.mood || '⚡ 状态极佳·气血充沛');
setSafeValue('diaryTag', entry.tag || '');
setSafeValue('diaryTitle', entry.title || '');
setSafeValue('diaryContent', entry.content || '');
document.getElementById('diaryFormCard')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function saveDiaryEntry() {
const id = getSafeString('diaryEditId');
const date = getSafeString('diaryDate');
const mood = getSafeString('diaryMood');
const tag = getSafeString('diaryTag').trim();
const title = getSafeString('diaryTitle').trim();
const rawContent = getSafeString('diaryContent').trim();
const cleanDiaryContent = stripBlankLines(rawContent);
const content = cleanDiaryContent === null ? rawContent : cleanDiaryContent;
if (!date) return alert('请选择随笔日期！');
if (!title) return alert('请拟定随笔标题！');
if (!content) return alert('正文内容不能为空！');

const now = new Date().toISOString();

if (id) {
    const idx = data.diaries.findIndex(d => d.id === id);
    if (idx !== -1) {
        data.diaries[idx] = { ...data.diaries[idx], date, mood, tag, title, content, updatedAt: now };
    }
} else {
    data.diaries.push({
        id: 'diary_' + Date.now(),
        date, mood, tag, title, content,
        createdAt: now, updatedAt: now
    });
}

saveData();
renderDiaryList();
cancelDiaryForm();
alert('✅ 随笔已封存入卷！');
}
function cancelDiaryForm() {
document.getElementById('diaryFormCard')?.classList.add('hidden');
setSafeValue('diaryEditId', '');
setSafeValue('diaryTitle', '');
setSafeValue('diaryContent', '');
}
function deleteDiaryEntry(id) {
if (!confirm('确定永久删除这篇随笔？')) return;
data.diaries = data.diaries.filter(d => d.id !== id);
saveData();
renderDiaryList();
}
function renderDashboard() {
const duty = getDutyShiftInfo();
renderDutyStatus();
const todayLogs = data.logs.filter(l => l.date === duty.dutyDateStr);
const stCount = document.getElementById('statTodayCount');
if (stCount) stCount.textContent = todayLogs.reduce((s, l) => s + (l.total || 0), 0);
const stTypes = document.getElementById('statTodayTypes');
if (stTypes) stTypes.textContent = [...new Set(todayLogs.map(l => l.type))].join('、') || '尚未开练';

const weekAgo = new Date();
weekAgo.setDate(weekAgo.getDate() - 7);
const weekLogs = data.logs.filter(l => l.date >= weekAgo.toISOString().slice(0, 10));
const stWeek = document.getElementById('statWeekCount');
if (stWeek) stWeek.textContent = weekLogs.reduce((s, l) => s + (l.total || 0), 0);

let streak = 0, checkD = new Date();
while (true) {
    const dStr = checkD.toISOString().slice(0, 10);
    if (data.logs.some(l => l.date === dStr)) { streak++; checkD.setDate(checkD.getDate() - 1); } else break;
}
const stStreak = document.getElementById('statStreak');
if (stStreak) stStreak.textContent = streak;

const recent = data.logs.slice(-5).reverse();
const recentEl = document.getElementById('recentLogs');
if (recentEl) {
    recentEl.innerHTML = recent.length ? recent.map(l => `
        <div class="item-strip" style="border-left:3px solid var(--orange-primary);">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:bold; font-size:12.5px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">
                    ${l.date.slice(5)} · ${l.type} <span style="color:var(--cyan-accent);">${l.total}</span>
                </span>
                <span class="badge badge-police" style="font-size:9.5px;">${l.dutyTag || '日常'}</span>
            </div>
        </div>
    `).join('') : '<div style="color:var(--text-dim); padding:6px 0; font-size:12px;">今日尚未登记功课，警官请出征！</div>';
}

renderMasterPlanSettings();
}
function renderLogs() {
const container = document.getElementById('logList');
if (!container) return;
if (!data.logs.length) {
container.innerHTML = '<div style="color:var(--text-dim); padding:12px 0;">实录矩阵尚无数据。</div>';
return;
}
const sorted = [...data.logs].sort((a, b) => {
const dateComp = (b.date || '').localeCompare(a.date || '');
if (dateComp !== 0) return dateComp;
return (b.createdAt || '').localeCompare(a.createdAt || '');
});
container.innerHTML = sorted.map(l => {
    const isAerobic = l.isAerobic || l.type.includes('跑') || l.type.includes('球');
    const unitSuffix = isAerobic ? '分钟' : (l.type.includes('静蹲') || l.type.includes('悬挂') || l.type.includes('压腿') ? '秒' : '次');

    return `
        <div class="item-strip">
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:4px;">
                <div style="min-width:0; flex:1;">
                    <strong style="font-size:13px; color:#fff;">${l.date} · ${l.type}</strong>
                    <span style="color:var(--orange-primary); font-family:var(--font-mono); font-weight:bold; margin-left:4px;">${l.total || 0}${unitSuffix}</span>
                    <span class="badge badge-police" style="margin-left:4px;">${l.dutyTag || '勤务'}</span>
                </div>
                <div style="flex-shrink:0;">
                    <button class="btn btn-sm btn-outline" onclick="editLog('${l.id}')">✏️</button>
                    <button class="btn btn-sm btn-danger" onclick="deleteLog('${l.id}')">🗑</button>
                </div>
            </div>
            ${l.note ? `<div style="font-size:11.5px; color:#cfc4b6; margin-top:3px; word-break:break-all;">${l.note}</div>` : ''}
        </div>
    `;
}).join('');
}
function editLog(id) {
const l = data.logs.find(x => x.id === id);
if (!l) return;
const newNote = prompt(修改【${l.type}】的实录备注内容:, l.note || '');
if (newNote === null) return;
l.note = newNote.trim();
saveData();
renderLogs();
}
function deleteLog(id) {
if (!confirm('抹除该条实录？')) return;
data.logs = data.logs.filter(x => x.id !== id);
saveData();
renderAll();
}
function applyPresetRange(p) {
const end = new Date();
const start = new Date();
if (p === 'all') start.setFullYear(2024);
else if (p !== 'custom') start.setDate(end.getDate() - (parseInt(p) || 7));
setSafeValue('analysisStart', start.toISOString().slice(0, 10));
setSafeValue('analysisEnd', end.toISOString().slice(0, 10));
refreshPromptData();
}
function refreshPromptData() {
const startStr = getSafeString('analysisStart');
const endStr = getSafeString('analysisEnd');
if (!startStr || !endStr) return;
const filtered = data.logs.filter(l => l.date >= startStr && l.date <= endStr);
const totalReps = filtered.reduce((s, l) => s + (l.total || 0), 0);
const totalTutSeconds = filtered.reduce((s, l) => s + (l.tutSeconds || (l.total * 2) || 0), 0);

const pBox = document.getElementById('analysisPrompt');
if (pBox) {
    pBox.textContent = `时空做功汇总（${startStr} 至 ${endStr}）：总做功 ${totalReps}，TUT有效时间 ${totalTutSeconds}秒。请将此数据发送至大模型进行内分泌与降糖医学研判。`;
}
}
function copyDynamicPrompt() {
const box = document.getElementById('analysisPrompt');
if (!box) return;
navigator.clipboard.writeText(box.textContent).then(() => {
alert('✅ AI 深度推演 Prompt 已复制！');
});
}
function renderKnowledge() {
const s = getSafeString('knowledgeSearch').toLowerCase();
const list = data.knowledge.filter(k => (k.title + k.content + (k.category || '')).toLowerCase().includes(s));
const kList = document.getElementById('knowledgeList');
if (!kList) return;
kList.innerHTML = list.map(k => <div class="item-strip"> <div style="display:flex; justify-content:space-between; align-items:center;"> <strong style="font-size:13px;">[${k.category || '通纲'}] ${k.title}</strong> </div> <div style="font-size:12px; color:#d2c6ba; margin-top:4px;">${mdLiteFlowing(k.content)}</div> </div>).join('') || '<div style="color:var(--text-dim); font-size:12px;">无匹配秘卷</div>';
}
function renderMasterPlanSettings() {
const p = data.masterPlan;
if (!p) return;
setSafeValue('planPushupSetReps', p.pushupSetReps || 40);
setSafeValue('planDailyPushupTarget', p.dailyPushupTarget || 60);

const grid = document.getElementById('dashboardPlanGrid');
if (grid) {
    grid.innerHTML = `
        <div class="stat-box" style="--box-color:var(--orange-primary);">
            <div class="stat-number">${p.pushupSetReps || 40}</div><div class="stat-label">单组基准 (次)</div>
        </div>
        <div class="stat-box" style="--box-color:var(--amber-accent);">
            <div class="stat-number">${p.dailyPushupTarget || 60}</div><div class="stat-label">日目标 (次)</div>
        </div>
    `;
}
}
function saveMasterPlan() {
const p = data.masterPlan || (data.masterPlan = {});
p.pushupSetReps = getSafeNumber('planPushupSetReps', 40);
p.dailyPushupTarget = getSafeNumber('planDailyPushupTarget', 60);
saveData();
renderAll();
alert('🎯 全局宏观战令已保存！');
}
function renderSettings() {
const s = data.settings;
if (!s) return;
renderMasterPlanSettings();
}