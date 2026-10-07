// ================================================================
// views.js: 实录矩阵、随笔阅读与大盘总参 (全面消除文字竖排挤压与负重明细渲染)
// 纯净拼接，无嵌套反引号，完全免疫正则篡改破坏
// ================================================================
function setSafeValue(id, val) {
var el = document.getElementById(id);
if (el) el.value = (val !== undefined && val !== null) ? val : '';
}
function getSafeNumber(id, fallback) {
fallback = fallback || 0;
var el = document.getElementById(id);
if (!el) return fallback;
var v = parseFloat(el.value);
return isNaN(v) ? fallback : v;
}
function getSafeString(id, fallback) {
fallback = fallback || '';
var el = document.getElementById(id);
return el ? el.value : fallback;
}
var diaryFilter = 'all';
var diaryView = 'entry';
var diarySort = 'dateDesc';
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
var src = String(d.source == null ? '' : d.source).toLowerCase().trim();
if (src === 'chat_ai' || src === 'ai' || src === 'ai_chat' || src === 'chat') return true;
if (typeof d.id === 'string' && d.id.indexOf('diary_chat_') === 0) return true;
if (typeof d.tag === 'string' && /ai\s*复盘/i.test(d.tag)) return true;
return false;
}
function normalizeDiarySources() {
if (!Array.isArray(data.diaries)) return 0;
var fixed = 0;
data.diaries.forEach(function (d) {
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
var n = String(d.content || '').length;
var s = d.structured;
if (s) {
if (s.summary) n += String(s.summary).length;
(Array.isArray(s.sections) ? s.sections : []).forEach(function (x) {
if (x) n += String(x.body || '').length + String(x.heading || '').length;
});
['keyPoints', 'decisions', 'warnings'].forEach(function (k) {
(Array.isArray(s[k]) ? s[k] : []).forEach(function (x) { n += String(x).length; });
});
}
return n;
}
function diaryCardEntries(d) {
var out = [];
var s = d.structured;
if (diaryIsStructured(d)) {
s.sections.forEach(function (sec, i) {
var body = String((sec && sec.body) || '').trim();
var heading = String((sec && sec.heading) || '').trim();
if (!body && !heading) return;
out.push({
idx: i,
heading: heading,
body: body,
title: heading || firstTextLine(body) || ('卡片 #' + (i + 1))
});
});
} else {
var lines = String(d.content || '').split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
if (lines.length) out.push({ idx: -1, heading: '', body: lines.join('\n'), title: d.title || '无题随笔', single: true });
}
return out;
}
function firstTextLine(s) {
var t = String(s || '').split('\n').map(function (x) { return x.trim(); }).find(Boolean) || '';
return t.length > 26 ? t.slice(0, 26) + '…' : t;
}
function diarySortCompare(a, b) {
var aDate = String(a.date || '');
var bDate = String(b.date || '');
if (diarySort === 'dateAsc') return aDate.localeCompare(bDate);
if (diarySort === 'lenDesc') return diaryCharCount(b) - diaryCharCount(a);
return bDate.localeCompare(aDate);
}
function diaryEntryCardHTML(d) {
var cards = diaryCardEntries(d);
var isAi = diaryIsAiSource(d);
var tocLimit = 8;
var toc = '';
if (cards.length) {
var chips = cards.slice(0, tocLimit).map(function (c) {
var numPrefix = c.idx >= 0 ? '#' + (c.idx + 1) + ' ' : '';
return '<button type="button" class="diary-toc-chip" onclick="openDiaryReader(\'' + escAttr(d.id) + '\', ' + c.idx + ')">' + numPrefix + escHtml(c.title) + '</button>';
}).join('');
var more = cards.length > tocLimit ? '<span class="diary-toc-chip" style="cursor:default; opacity:.75;">…共 ' + cards.length + ' 张</span>' : '';
toc = '<div class="diary-toc">' + chips + more + '</div>';
}
var aiBadge = isAi ? '<span class="badge badge-cyan">🧠 AI聊天</span>' : '<span class="badge badge-green">✍️ 手写</span>';
var cardCountBadge = cards.length ? '<span class="badge badge-amber">📇 ' + cards.length + '卡</span>' : '';
var tagBadge = d.tag ? '<span class="badge badge-police">' + escHtml(d.tag) + '</span>' : '';

return '<div class="diary-card">' +
    '<div style="display:flex; align-items:flex-start; gap:6px; min-width:0;">' +
        '<input type="checkbox" class="diary-check" data-did="' + escAttr(d.id) + '" ' + (selectedDiaryIds.has(d.id) ? 'checked' : '') + ' onchange="diaryCheckToggle(this)">' +
        '<div style="flex:1; min-width:0;">' +
            '<div class="diary-header">' +
                '<div style="min-width:0; flex:1;">' +
                    '<div class="diary-title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">' + escHtml(d.title || '无题随笔') + '</div>' +
                    '<div class="diary-meta" style="margin-top:2px; display:flex; gap:4px; flex-wrap:wrap;">' +
                        aiBadge + cardCountBadge +
                        '<span>📅 ' + escHtml(d.date || '') + '</span>' +
                        '<span class="badge badge-amber">' + escHtml(d.mood || '平稳') + '</span>' +
                        tagBadge +
                    '</div>' +
                '</div>' +
                '<div class="diary-actions" style="flex-shrink:0;">' +
                    '<button class="btn btn-sm btn-cyan" onclick="openDiaryReader(\'' + escAttr(d.id) + '\')">📖</button>' +
                    '<button class="btn btn-sm btn-outline" onclick="editDiaryEntry(\'' + escAttr(d.id) + '\')">✏️</button>' +
                    '<button class="btn btn-sm btn-danger" onclick="deleteDiaryEntry(\'' + escAttr(d.id) + '\')">🗑</button>' +
                '</div>' +
            '</div>' +
            toc +
            '<div class="diary-content">' + diaryBodyHTML(d) + '</div>' +
            '<div class="diary-footer">' +
                '<span class="diary-tag">🕒 ' + (d.createdAt ? new Date(d.createdAt).toLocaleTimeString() : '') + '</span>' +
            '</div>' +
        '</div>' +
    '</div>' +
'</div>';
}
function diaryCardIndexRowHTML(d, c) {
var one = c.body.replace(/\s+/g, ' ').slice(0, 40);
return '<div class="diary-card-index-row" onclick="openDiaryReader(\'' + escAttr(d.id) + '\', ' + c.idx + ')">' +
'<span class="dci-no">' + (c.idx >= 0 ? '#' + (c.idx + 1) : '单篇') + '</span>' +
'<span class="dci-body" style="min-width:0;">' +
'<span class="dci-title">' + escHtml(c.title) + '</span>' +
'<span class="dci-meta">📅 ' + escHtml(d.date || '') + ' · ' + escHtml(d.title || '随笔') + (one ? ' · ' + escHtml(one) : '') + '</span>' +
'</span>' +
'<span class="dci-count">' + c.body.length + '字</span>' +
'</div>';
}
function diaryMonthKey(d) {
return (d.date || '').slice(0, 7) || '未标注';
}
function diaryMonthLabel(key) {
var m = /^(\d{4})-(\d{2})$/.exec(key);
return m ? m[1] + '年' + parseInt(m[2], 10) + '月' : key;
}
function renderDiaryList() {
var container = document.getElementById('diaryCardList');
if (!container) return;
var searchEl = document.getElementById('diarySearchInput');
var searchVal = (searchEl ? searchEl.value : '').toLowerCase();
var counts = { all: (data.diaries || []).length, ai: 0, manual: 0, cards: 0 };
(data.diaries || []).forEach(function (d) {
    if (diaryIsAiSource(d)) counts.ai++; else counts.manual++;
    if (diaryIsStructured(d)) counts.cards++;
});
document.querySelectorAll('#diaryFilterChips [data-dfilter]').forEach(function (btn) {
    var k = btn.getAttribute('data-dfilter');
    btn.classList.toggle('active', k === diaryFilter);
    var b = btn.querySelector('b');
    if (b) b.textContent = counts[k] || 0;
});
document.querySelectorAll('#diaryViewChips [data-dview]').forEach(function (btn) {
    btn.classList.toggle('active', btn.getAttribute('data-dview') === diaryView);
});

var countTextEl = document.getElementById('diaryCountText');
if (!data.diaries || !data.diaries.length) {
    container.innerHTML =
        '<div class="diary-empty">' +
            '<span>📖</span>尚未著录随笔<br>' +
            '<span style="font-size:11px; color:var(--text-dim);">点击「+ 撰写」记录心得</span>' +
        '</div>';
    if (countTextEl) countTextEl.textContent = '在册 0 篇';
    updateDiaryBatchUI();
    return;
}

var filtered = data.diaries
    .filter(function (d) { return diaryMatchesFilter(d, diaryFilter); })
    .filter(function (d) { return !searchVal || diarySearchText(d).indexOf(searchVal) !== -1; })
    .sort(diarySortCompare);

var totalCards = filtered.reduce(function (n, d) { return n + diaryCardEntries(d).length; }, 0);
var totalChars = filtered.reduce(function (n, d) { return n + diaryCharCount(d); }, 0);
if (countTextEl) {
    countTextEl.textContent = '在册 ' + counts.all + ' 篇 · 当前 ' + filtered.length + ' 篇 · 共 ' + totalChars + ' 字';
}

updateDiaryBatchUI();

if (!filtered.length) {
    container.innerHTML = '<div class="diary-empty" style="padding:16px;"><span>🔍</span>无匹配随笔</div>';
    return;
}

var groups = new Map();
filtered.forEach(function (d) {
    var key = diaryMonthKey(d);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(d);
});

var htmlOut = '';
groups.forEach(function (list, key) {
    htmlOut += '<div class="diary-month-head">📅 ' + diaryMonthLabel(key) + ' <span class="diary-month-count">' + list.length + ' 篇</span></div>';
    for (var i = 0; i < list.length; i++) {
        htmlOut += diaryEntryCardHTML(list[i]);
    }
});
container.innerHTML = htmlOut;
}
function diarySearchText(d) {
var parts = [d.title, d.mood, d.tag, d.content];
var s = d.structured || {};
if (s.summary) parts.push(s.summary);
(Array.isArray(s.sections) ? s.sections : []).forEach(function (x) {
if (x) parts.push(x.heading, x.body);
});
return parts.join(' ').toLowerCase();
}
function diaryBodyHTML(d) {
if (d.structured && typeof d.structured === 'object') return vaultHTML(d.structured);
if (!d.content) return '<div class="diary-empty" style="padding:6px 0; text-align:left;">（无内容）</div>';
return mdLiteFlowing(d.content);
}
function vaultHTML(s) {
if (!s) return '';
var parts = [];
if (s.summary) parts.push('<div class="vault-summary">' + escHtml(s.summary) + '</div>');
if (Array.isArray(s.sections) && s.sections.length) {
var cardNo = 0;
s.sections.forEach(function (sec) {
var body = sec && sec.body ? mdLiteFlowing(sec.body) : '';
if (!body) return;
cardNo++;
var headHtml = sec && sec.heading
? '<div class="vault-section-head">' + escHtml(sec.heading) + '</div>'
: '<div class="vault-section-head vault-section-head-auto">卡片 #' + cardNo + '</div>';
parts.push('<div class="vault-section">' + headHtml + '<div class="vault-section-body">' + body + '</div></div>');
});
}
return parts.length ? '<div class="diary-vault">' + parts.join('') + '</div>' : '';
}
var selectedDiaryIds = new Set();
function diaryCheckToggle(cb) {
var id = cb.getAttribute('data-did');
if (!id) return;
if (cb.checked) selectedDiaryIds.add(id); else selectedDiaryIds.delete(id);
updateDiaryBatchUI();
}
function diarySelectAll() {
data.diaries.forEach(function (d) { selectedDiaryIds.add(d.id); });
syncDiaryChecks();
}
function diarySelClear() {
selectedDiaryIds.clear();
syncDiaryChecks();
}
function syncDiaryChecks() {
document.querySelectorAll('#diaryCardList .diary-check').forEach(function (cb) {
cb.checked = selectedDiaryIds.has(cb.getAttribute('data-did'));
});
updateDiaryBatchUI();
}
function updateDiaryBatchUI() {
var bar = document.getElementById('diaryBatchBar');
var cnt = document.getElementById('diarySelCount');
if (!bar) return;
var n = selectedDiaryIds.size;
if (cnt) cnt.textContent = n;
bar.classList.toggle('hidden', n === 0);
}
function diaryBatchDelete() {
var n = selectedDiaryIds.size;
if (!n) return alert('请先勾选要删除的日记');
if (!confirm('确定永久删除选中的 ' + n + ' 篇随笔？')) return;
data.diaries = data.diaries.filter(function (d) { return !selectedDiaryIds.has(d.id); });
selectedDiaryIds.clear();
saveData();
renderDiaryList();
alert('✅ 已批量删除 ' + n + ' 篇随笔。');
}
var diaryReaderCurrentId = null;
function openDiaryReader(id, cardIdx) {
var d = data.diaries.find(function (x) { return x.id === id; });
if (!d) return;
diaryReaderCurrentId = id;
var formCard = document.getElementById('diaryFormCard');
var wbCard = document.getElementById('chatWorkbenchCard');
if (formCard) formCard.classList.add('hidden');
if (wbCard) wbCard.classList.add('hidden');
var rTitle = document.getElementById('diaryReaderTitle');
if (rTitle) rTitle.textContent = '📖 ' + (d.title || '无题随笔');

var rMeta = document.getElementById('diaryReaderMeta');
if (rMeta) {
    var aiTag = diaryIsAiSource(d) ? '<span class="badge badge-cyan">🧠 AI聊天</span>' : '<span class="badge badge-green">✍️ 手写</span>';
    var tagPart = d.tag ? '<span class="badge badge-police">' + escHtml(d.tag) + '</span>' : '';
    rMeta.innerHTML =
        '<span>📅 ' + escHtml(d.date || '') + '</span>' +
        '<span class="badge badge-amber">' + escHtml(d.mood || '平稳') + '</span>' +
        tagPart + aiTag;
}
var rBody = document.getElementById('diaryReaderBody');
if (rBody) rBody.innerHTML = diaryBodyHTML(d);

var rCard = document.getElementById('diaryReaderCard');
if (rCard) {
    rCard.classList.remove('hidden');
    setAiImmersive(true);
    rCard.scrollIntoView({ behavior: 'auto', block: 'start' });
}
}
function closeDiaryReader() {
var rCard = document.getElementById('diaryReaderCard');
if (rCard) rCard.classList.add('hidden');
setAiImmersive(false);
diaryReaderCurrentId = null;
}
function showDiaryForm() {
var duty = getDutyShiftInfo();
var fCard = document.getElementById('diaryFormCard');
if (fCard) fCard.classList.remove('hidden');
setSafeValue('diaryEditId', '');
setSafeValue('diaryDate', duty.dutyDateStr);
setSafeValue('diaryMood', '⚡ 状态极佳·气血充沛');
setSafeValue('diaryTag', '');
setSafeValue('diaryTitle', '');
setSafeValue('diaryContent', '');
if (fCard) fCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function editDiaryEntry(id) {
var entry = data.diaries.find(function (d) { return d.id === id; });
if (!entry) return;
var fCard = document.getElementById('diaryFormCard');
if (fCard) fCard.classList.remove('hidden');
setSafeValue('diaryEditId', id);
setSafeValue('diaryDate', entry.date || '');
setSafeValue('diaryMood', entry.mood || '⚡ 状态极佳·气血充沛');
setSafeValue('diaryTag', entry.tag || '');
setSafeValue('diaryTitle', entry.title || '');
setSafeValue('diaryContent', entry.content || '');
if (fCard) fCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
}
function saveDiaryEntry() {
var id = getSafeString('diaryEditId');
var date = getSafeString('diaryDate');
var mood = getSafeString('diaryMood');
var tag = getSafeString('diaryTag').trim();
var title = getSafeString('diaryTitle').trim();
var rawContent = getSafeString('diaryContent').trim();
var cleanDiaryContent = stripBlankLines(rawContent);
var content = cleanDiaryContent === null ? rawContent : cleanDiaryContent;
if (!date) return alert('请选择随笔日期！');
if (!title) return alert('请拟定随笔标题！');
if (!content) return alert('正文内容不能为空！');

var now = new Date().toISOString();

if (id) {
    var idx = data.diaries.findIndex(function (d) { return d.id === id; });
    if (idx !== -1) {
        data.diaries[idx] = Object.assign({}, data.diaries[idx], { date: date, mood: mood, tag: tag, title: title, content: content, updatedAt: now });
    }
} else {
    data.diaries.push({
        id: 'diary_' + Date.now(),
        date: date, mood: mood, tag: tag, title: title, content: content,
        createdAt: now, updatedAt: now
    });
}

saveData();
renderDiaryList();
cancelDiaryForm();
alert('✅ 随笔已封存入卷！');
}
function cancelDiaryForm() {
var fCard = document.getElementById('diaryFormCard');
if (fCard) fCard.classList.add('hidden');
setSafeValue('diaryEditId', '');
setSafeValue('diaryTitle', '');
setSafeValue('diaryContent', '');
}
function deleteDiaryEntry(id) {
if (!confirm('确定永久删除这篇随笔？')) return;
data.diaries = data.diaries.filter(function (d) { return d.id !== id; });
saveData();
renderDiaryList();
}
function renderDashboard() {
var duty = getDutyShiftInfo();
renderDutyStatus();
var todayLogs = data.logs.filter(function (l) { return l.date === duty.dutyDateStr; });
var stCount = document.getElementById('statTodayCount');
if (stCount) stCount.textContent = todayLogs.reduce(function (s, l) { return s + (l.total || 0), 0; }, 0);
var stTypes = document.getElementById('statTodayTypes');
if (stTypes) stTypes.textContent = Array.from(new Set(todayLogs.map(function (l) { return l.type; }))).join('、') || '尚未开练';

var weekAgo = new Date();
weekAgo.setDate(weekAgo.getDate() - 7);
var weekLogs = data.logs.filter(function (l) { return l.date >= weekAgo.toISOString().slice(0, 10); });
var stWeek = document.getElementById('statWeekCount');
if (stWeek) stWeek.textContent = weekLogs.reduce(function (s, l) { return s + (l.total || 0), 0; }, 0);

var streak = 0, checkD = new Date();
while (true) {
    var dStr = checkD.toISOString().slice(0, 10);
    var hit = data.logs.some(function (l) { return l.date === dStr; });
    if (hit) { streak++; checkD.setDate(checkD.getDate() - 1); } else break;
}
var stStreak = document.getElementById('statStreak');
if (stStreak) stStreak.textContent = streak;

var recent = data.logs.slice(-5).reverse();
var recentEl = document.getElementById('recentLogs');
if (recentEl) {
    var recentHtml = '';
    if (recent.length) {
        for (var i = 0; i < recent.length; i++) {
            var l = recent[i];
            recentHtml +=
                '<div class="item-strip" style="border-left:3px solid var(--orange-primary);">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; min-width:0;">' +
                        '<span style="font-weight:bold; font-size:12px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:70%;">' +
                            l.date.slice(5) + ' · ' + l.type + ' <span style="color:var(--cyan-accent);">' + l.total + '</span>' +
                        '</span>' +
                        '<span class="badge badge-police" style="font-size:9.5px;">' + (l.dutyTag || '日常') + '</span>' +
                    '</div>' +
                '</div>';
        }
    } else {
        recentHtml = '<div style="color:var(--text-dim); padding:4px 0; font-size:11.5px;">今日尚未登记功课，警官请出征！</div>';
    }
    recentEl.innerHTML = recentHtml;
}

renderMasterPlanSettings();
}
// ----------------------------------------------------------------
// ★ 淬体实录矩阵渲染（彻底杜绝文字竖排、清晰呈现负重细节）
// ----------------------------------------------------------------
function renderLogs() {
var container = document.getElementById('logList');
if (!container) return;
if (!data.logs.length) {
container.innerHTML = '<div style="color:var(--text-dim); padding:10px 0; font-size:12px;">实录矩阵尚无数据。</div>';
return;
}
var sorted = data.logs.slice().sort(function (a, b) {
var dateComp = (b.date || '').localeCompare(a.date || '');
if (dateComp !== 0) return dateComp;
return (b.createdAt || '').localeCompare(a.createdAt || '');
});
var rowsHtml = '';
for (var i = 0; i < sorted.length; i++) {
    var l = sorted[i];
    var isAerobic = l.isAerobic || l.type.indexOf('跑') !== -1 || l.type.indexOf('球') !== -1;
    var unitSuffix = isAerobic ? '分钟' : (l.type.indexOf('静蹲') !== -1 || l.type.indexOf('悬挂') !== -1 || l.type.indexOf('压腿') !== -1 ? '秒' : '次');
    var noteHtml = l.note ? '<div style="font-size:11px; color:#cfc4b6; margin-top:3px; word-break:break-all; line-height:1.4;">' + escHtml(l.note) + '</div>' : '';

    rowsHtml +=
        '<div class="item-strip">' +
            '<div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:nowrap; gap:4px; min-width:0;">' +
                '<div style="min-width:0; flex:1; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' +
                    '<strong style="font-size:12.5px; color:#fff;">' + l.date + ' · ' + l.type + '</strong>' +
                    '<span style="color:var(--orange-primary); font-family:var(--font-mono); font-weight:bold; margin-left:3px;">' + (l.total || 0) + unitSuffix + '</span>' +
                    '<span class="badge badge-police" style="margin-left:3px;">' + (l.dutyTag || '勤务') + '</span>' +
                '</div>' +
                '<div style="flex-shrink:0; display:flex; gap:3px;">' +
                    '<button class="btn btn-sm btn-outline" style="padding:2px 5px;" onclick="editLog(\'' + l.id + '\')">✏️</button>' +
                    '<button class="btn btn-sm btn-danger" style="padding:2px 5px;" onclick="deleteLog(\'' + l.id + '\')">🗑</button>' +
                '</div>' +
            '</div>' +
            noteHtml +
        '</div>';
}
container.innerHTML = rowsHtml;
}
function editLog(id) {
var l = data.logs.find(function (x) { return x.id === id; });
if (!l) return;
var newNote = prompt('修改【' + l.type + '】的实录备注内容:', l.note || '');
if (newNote === null) return;
l.note = newNote.trim();
saveData();
renderLogs();
}
function deleteLog(id) {
if (!confirm('抹除该条实录？')) return;
data.logs = data.logs.filter(function (x) { return x.id !== id; });
saveData();
renderAll();
}
function applyPresetRange(p) {
var end = new Date();
var start = new Date();
if (p === 'all') start.setFullYear(2024);
else if (p !== 'custom') start.setDate(end.getDate() - (parseInt(p) || 7));
setSafeValue('analysisStart', start.toISOString().slice(0, 10));
setSafeValue('analysisEnd', end.toISOString().slice(0, 10));
refreshPromptData();
}
function refreshPromptData() {
var startStr = getSafeString('analysisStart');
var endStr = getSafeString('analysisEnd');
if (!startStr || !endStr) return;
var filtered = data.logs.filter(function (l) { return l.date >= startStr && l.date <= endStr; });
var totalReps = filtered.reduce(function (s, l) { return s + (l.total || 0); }, 0);
var totalTutSeconds = filtered.reduce(function (s, l) { return s + (l.tutSeconds || (l.total * 2) || 0); }, 0);

var pBox = document.getElementById('analysisPrompt');
if (pBox) {
    pBox.textContent = '时空做功汇总（' + startStr + ' 至 ' + endStr + '）：总做功 ' + totalReps + '，TUT有效时间 ' + totalTutSeconds + '秒。请将此数据发送至大模型进行内分泌与降糖医学研判。';
}
}
function copyDynamicPrompt() {
var box = document.getElementById('analysisPrompt');
if (!box) return;
navigator.clipboard.writeText(box.textContent).then(function () {
alert('✅ AI 深度推演 Prompt 已复制！');
});
}
function renderKnowledge() {
var s = getSafeString('knowledgeSearch').toLowerCase();
var list = data.knowledge.filter(function (k) {
return (k.title + k.content + (k.category || '')).toLowerCase().indexOf(s) !== -1;
});
var kList = document.getElementById('knowledgeList');
if (!kList) return;
var html = '';
for (var i = 0; i < list.length; i++) {
var k = list[i];
html +=
'<div class="item-strip">' +
'<div style="display:flex; justify-content:space-between; align-items:center;">' +
'<strong style="font-size:12.5px;">[' + (k.category || '通纲') + '] ' + k.title + '</strong>' +
'</div>' +
'<div style="font-size:11.5px; color:#d2c6ba; margin-top:3px;">' + mdLiteFlowing(k.content) + '</div>' +
'</div>';
}
kList.innerHTML = html || '<div style="color:var(--text-dim); font-size:11px;">无匹配秘卷</div>';
}
function renderMasterPlanSettings() {
var p = data.masterPlan;
if (!p) return;
setSafeValue('planPushupSetReps', p.pushupSetReps || 40);
setSafeValue('planDailyPushupTarget', p.dailyPushupTarget || 60);

var grid = document.getElementById('dashboardPlanGrid');
if (grid) {
    grid.innerHTML =
        '<div class="stat-box" style="--box-color:var(--orange-primary);">' +
            '<div class="stat-number">' + (p.pushupSetReps || 40) + '</div><div class="stat-label">单组基准 (次)</div>' +
        '</div>' +
        '<div class="stat-box" style="--box-color:var(--amber-accent);">' +
            '<div class="stat-number">' + (p.dailyPushupTarget || 60) + '</div><div class="stat-label">日目标 (次)</div>' +
        '</div>';
}
}
function saveMasterPlan() {
var p = data.masterPlan || (data.masterPlan = {});
p.pushupSetReps = getSafeNumber('planPushupSetReps', 40);
p.dailyPushupTarget = getSafeNumber('planDailyPushupTarget', 60);
saveData();
renderAll();
alert('🎯 全局宏观战令已保存！');
}
function renderSettings() {
var s = data.settings;
if (!s) return;
renderMasterPlanSettings();
}