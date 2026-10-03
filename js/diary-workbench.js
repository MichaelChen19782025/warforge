// ================================================================
//  diary-workbench.js: AI聊天精修流水线、意群成卡编辑器与全屏阅读层
// ================================================================

let chatSegments = [];
let chatEditingIdx = -1;
let chatDraftStructured = null;
let chatDraftDigest = '';
let chatDraftSealedId = null;
const CHAT_MOODS = ['⚡ 状态极佳·气血充沛', '🩸 血糖平稳·波澜不惊', '👮 值班熬夜·交感应激', '🛡️ 轮休调元·筋膜舒缓', '🌧️ 疲态偶现·坚忍破障'];

let fullViewFontDelta = 0;
let fullViewSingle = null;
let fullViewNav = null;

function openFullView(title, html, nav) {
    fullViewSingle = { title: title, html: html };
    fullViewNav = (nav && Array.isArray(nav.items) && nav.items.length > 1)
        ? { items: nav.items, index: Math.max(0, Math.min(nav.items.length - 1, nav.index || 0)) }
        : null;
    const ov = document.getElementById('fullViewOverlay');
    const body = document.getElementById('fullViewBody');
    if (!ov || !body) return;
    fullViewFontDelta = 0;
    body.style.fontSize = '';
    renderFullView();
    ov.classList.remove('hidden');
    document.body.style.overflow = 'hidden';

    try {
        const rq = ov.requestFullscreen || ov.webkitRequestFullscreen;
        const r = rq && rq.call(ov);
        if (r && r.catch) r.catch(() => {});
    } catch (e) {}
}

function renderFullView() {
    const body = document.getElementById('fullViewBody');
    const titleEl = document.getElementById('fullViewTitle');
    const navEl = document.getElementById('fullViewNav');
    if (!body) return;
    if (fullViewNav) {
        const it = fullViewNav.items[fullViewNav.index];
        if (titleEl) titleEl.textContent = it.title;
        body.innerHTML = it.html;
        if (navEl) {
            navEl.classList.remove('hidden');
            const sel = document.getElementById('fullViewJump');
            if (sel) {
                sel.innerHTML = fullViewNav.items.map((x, i) =>
                    `<option value="${i}" ${i === fullViewNav.index ? 'selected' : ''}>${escHtml(x.label)}</option>`).join('');
            }
            const pos = document.getElementById('fullViewPos');
            if (pos) pos.textContent = (fullViewNav.index + 1) + ' / ' + fullViewNav.items.length;
        }
    } else {
        if (titleEl && fullViewSingle) titleEl.textContent = fullViewSingle.title;
        body.innerHTML = fullViewSingle ? fullViewSingle.html : '';
        if (navEl) navEl.classList.add('hidden');
    }
    body.scrollTop = 0;
}

function fullViewStep(delta) {
    if (!fullViewNav) return;
    const n = fullViewNav.items.length;
    fullViewNav.index = (fullViewNav.index + delta + n) % n;
    renderFullView();
}

function fullViewJumpTo(idx) {
    if (!fullViewNav) return;
    const i = parseInt(idx, 10);
    if (isNaN(i) || i < 0 || i >= fullViewNav.items.length) return;
    fullViewNav.index = i;
    renderFullView();
}

function closeFullView() {
    const ov = document.getElementById('fullViewOverlay');
    if (!ov || ov.classList.contains('hidden')) return;
    try {
        if (document.fullscreenElement && document.exitFullscreen) {
            const r = document.exitFullscreen();
            if (r && r.catch) r.catch(() => {});
        }
    } catch (e) {}
    ov.classList.add('hidden');
    document.body.style.overflow = '';
    fullViewNav = null;
    fullViewSingle = null;
}

function adjustFullViewFont(delta) {
    const body = document.getElementById('fullViewBody');
    if (!body) return;
    fullViewFontDelta = Math.max(-4, Math.min(16, fullViewFontDelta + delta));
    body.style.fontSize = (16 + fullViewFontDelta) + 'px';
}

function toggleFullViewTypo() {
    const row = document.getElementById('fullViewTypoRow');
    if (!row) return;
    row.classList.toggle('hidden');
    const btn = document.getElementById('fullViewTypoBtn');
    if (btn) btn.textContent = row.classList.contains('hidden') ? '📐 行距/段距' : '📐 收起行距/段距';
}

document.addEventListener('keydown', e => {
    const ov = document.getElementById('fullViewOverlay');
    const open = ov && !ov.classList.contains('hidden');
    if (!open) return;
    if (e.key === 'Escape') { closeFullView(); return; }
    if (fullViewNav && e.key === 'ArrowLeft') { e.preventDefault(); fullViewStep(-1); }
    if (fullViewNav && e.key === 'ArrowRight') { e.preventDefault(); fullViewStep(1); }
});

document.addEventListener('fullscreenchange', () => {
    const ov = document.getElementById('fullViewOverlay');
    if (ov && !ov.classList.contains('hidden') && !document.fullscreenElement) closeFullView();
});

// 原文阅读/编辑双视图
let rawViewMode = false;

function rawInputEl() { return document.getElementById('chatRawInput'); }

function updateRawCount() {
    const el = document.getElementById('rawCharCount');
    const ta = rawInputEl();
    if (el && ta) el.textContent = (ta.value ? ta.value.length.toLocaleString() : '0') + ' 字';
}

function renderRawReader() {
    const ta = rawInputEl();
    const reader = document.getElementById('chatRawReader');
    if (!ta || !reader) return;
    const txt = ta.value.replace(/^\uFEFF/, '');
    reader.innerHTML = txt.trim()
        ? mdLiteFlowing(txt)
        : '<div class="diary-empty" style="padding:16px; text-align:left;"><span>📄</span>原文为空<br><span style="font-size:12px; color:var(--text-dim);">切回「✎ 编辑原文」粘贴文本后，这里会按当前行距 / 段距排版呈现</span></div>';
}

function toggleRawView(force) {
    rawViewMode = typeof force === 'boolean' ? force : !rawViewMode;
    const ta = rawInputEl();
    const reader = document.getElementById('chatRawReader');
    const btn = document.getElementById('rawViewBtn');
    if (!ta || !reader) return;
    if (rawViewMode) {
        renderRawReader();
        ta.classList.add('hidden');
        reader.classList.remove('hidden');
    } else {
        reader.classList.add('hidden');
        ta.classList.remove('hidden');
    }
    if (btn) btn.textContent = rawViewMode ? '✎ 编辑原文' : '📖 阅读视图';
}

function resetRawView() {
    rawViewMode = false;
    const ta = rawInputEl();
    const reader = document.getElementById('chatRawReader');
    const btn = document.getElementById('rawViewBtn');
    if (reader) { reader.classList.add('hidden'); reader.innerHTML = ''; }
    if (ta) ta.classList.remove('hidden');
    if (btn) btn.textContent = '📖 阅读视图';
    updateRawCount();
}

function onRawInput() {
    const ta = rawInputEl();
    if (ta) stripBlankLinesIn(ta);
    updateRawCount();
    if (rawViewMode) renderRawReader();
    workbenchTouch();
}

function clearRawInput() {
    const ta = rawInputEl();
    if (ta) ta.value = '';
    onRawInput();
}

function openFullRawView() {
    const ta = rawInputEl();
    const raw = ta ? ta.value.replace(/^\uFEFF/, '').trim() : '';
    if (!raw) return alert('原文为空——请先在①粘贴聊天记录。');
    openFullView('📄 原文全文 · 全屏查看', mdLiteFlowing(raw));
}

function setAiImmersive(on) {
    document.body.classList.toggle('chat-immersive', !!on);
    const btn = document.getElementById('aiFullBtn');
    if (btn) btn.textContent = on ? '◱ 还原分栏' : '⛶ 全屏精修';
}

function toggleAiImmersive() {
    setAiImmersive(!document.body.classList.contains('chat-immersive'));
}

function openChatWorkbench() {
    const activeBtn = document.querySelector('.tab-btn.active');
    workbenchOriginTab = activeBtn ? activeBtn.getAttribute('data-tab') : 'diary';
    const deck = document.getElementById('leftDeckPane');
    workbenchOriginScroll = deck ? deck.scrollTop : 0;

    setAiImmersive(true);
    document.getElementById('chatWorkbenchCard').classList.remove('hidden');
    document.getElementById('chatWorkbenchCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => { const ta = rawInputEl(); if (ta) ta.focus(); }, 300);
    updateRawCount();
    initChatDelimiterUI();
    composerCheckDraftOnOpen();
}

function workbenchRedo() {
    if (chatDraftSealedId) {
        const idx = data.diaries.findIndex(d => d.id === chatDraftSealedId);
        if (idx !== -1) {
            if (!confirm('这篇随笔生成预览时已自动入册到日记。\n点「确定」= 连同日记里这一篇一起删除；点「取消」= 保留（可继续在③修订）。')) return;
            data.diaries.splice(idx, 1);
            try { saveData(); } catch (e) {}
            renderDiaryList();
        }
    }
    chatWorkbenchReset(false, true);
}

function chatWorkbenchReset(hide, skipConfirm) {
    if (!skipConfirm) {
        const hasComposerContent = composerBlocks.some(b => (b.text || '').trim());
        const previewEl = document.getElementById('wbPreviewWrap');
        const previewVisible = previewEl && !previewEl.classList.contains('hidden');
        const rawEl = document.getElementById('chatRawInput');
        const hasRaw = rawEl && rawEl.value.trim();
        if (hasComposerContent || previewVisible || hasRaw) {
            if (!confirm('工作台里还有尚未「封存为当日新随笔」的内容（原文 / 意群卡 / 预览），清空后无法恢复。确定要继续吗？')) return;
        }
    }
    const raw = document.getElementById('chatRawInput');
    if (raw) raw.value = '';
    resetRawView();
    closeFullView();
    chatSegments = [];
    chatEditingIdx = -1;
    chatDraftStructured = null;
    chatDraftDigest = '';
    chatDraftSealedId = null;
    const ids = ['wbPreviewWrap', 'aiComposerCard'];
    ids.forEach(i => { const el = document.getElementById(i); if (el) el.classList.add('hidden'); });
    composerBlocks = [];
    const compBody = document.getElementById('aiComposerBody');
    if (compBody) compBody.innerHTML = '';
    const box = document.getElementById('aiRefinePromptBox');
    if (box) box.textContent = '尚未生成精修指令……（先完成第①步的粘贴）';
    const aiPanel = document.getElementById('wbAiOptionalBody');
    if (aiPanel) aiPanel.classList.add('hidden');
    const jsonBox = document.getElementById('chatAiJsonInput');
    if (jsonBox) jsonBox.value = '';
    composerClearDraft();
    if (hide) {
        document.getElementById('chatWorkbenchCard').classList.add('hidden');
        setAiImmersive(false);
        returnFromWorkbench();
    }
}

function startManualComposer() {
    const raw = (document.getElementById('chatRawInput').value || '').replace(/^\uFEFF/, '').trim();
    if (!raw) return alert('请先粘贴聊天记录原文！');
    composerBlocks = [{ id: composerNextId++, kind: 'open', text: raw }];
    composerShow();
}

function toggleAiOptionalPanel() {
    const panel = document.getElementById('wbAiOptionalBody');
    if (!panel) return;
    panel.classList.toggle('hidden');
    const btn = document.getElementById('aiOptionalToggleBtn');
    if (btn) btn.textContent = panel.classList.contains('hidden') ? '🤖 可选：先发给 AI 通读精修 ▾' : '🤖 可选：先发给 AI 通读精修 ▴';
}

const DEFAULT_CHAT_DELIMITER = '本回答由 AI 生成，内容仅供参考，请仔细甄别';

function initChatDelimiterUI() {
    const input = document.getElementById('chatDelimiterInput');
    if (input) input.value = data.settings.chatDelimiter || DEFAULT_CHAT_DELIMITER;
    renderChatDelimiterPresetOptions();
}

function renderChatDelimiterPresetOptions() {
    const sel = document.getElementById('chatDelimiterPresetSelect');
    if (!sel) return;
    const presets = data.settings.chatDelimiterPresets || [];
    const keep = sel.value;
    sel.innerHTML = '<option value="">— 载入已存预设 —</option>' +
        presets.map((p, i) => `<option value="${i}">${escHtml(p.name)}</option>`).join('');
    if (keep && presets[+keep]) sel.value = keep;
}

function resetChatDelimiter() {
    const input = document.getElementById('chatDelimiterInput');
    if (input) input.value = DEFAULT_CHAT_DELIMITER;
    data.settings.chatDelimiter = DEFAULT_CHAT_DELIMITER;
    saveData();
}

function saveChatDelimiterPreset() {
    const input = document.getElementById('chatDelimiterInput');
    const text = (input && input.value || '').trim();
    if (!text) return alert('分隔句不能为空！');
    const name = prompt('给这套分隔句起个名字（例如对应的 AI 名称：DeepSeek / Kimi / 豆包……）：', '');
    if (name === null || !name.trim()) return;
    const presets = data.settings.chatDelimiterPresets || (data.settings.chatDelimiterPresets = []);
    const existIdx = presets.findIndex(p => p.name === name.trim());
    const preset = { name: name.trim(), delimiter: text };
    if (existIdx >= 0) presets[existIdx] = preset; else presets.push(preset);
    saveData();
    renderChatDelimiterPresetOptions();
    alert(`✅ 已保存为预设「${name.trim()}」。`);
}

function loadChatDelimiterPreset(idxStr) {
    if (idxStr === '' || idxStr === undefined) return;
    const presets = data.settings.chatDelimiterPresets || [];
    const p = presets[+idxStr];
    if (!p) return;
    const input = document.getElementById('chatDelimiterInput');
    if (input) input.value = p.delimiter;
}

function deleteChatDelimiterPreset() {
    const sel = document.getElementById('chatDelimiterPresetSelect');
    if (!sel || sel.value === '') return alert('请先在下拉框里选中要删除的预设。');
    const presets = data.settings.chatDelimiterPresets || [];
    const p = presets[+sel.value];
    if (!p) return;
    if (!confirm(`确定删除预设「${p.name}」吗？`)) return;
    presets.splice(+sel.value, 1);
    saveData();
    renderChatDelimiterPresetOptions();
}

function autoSplitByDelimiter() {
    const raw = (document.getElementById('chatRawInput').value || '').replace(/^\uFEFF/, '').trim();
    if (!raw) return alert('请先粘贴聊天记录原文！');
    const delimInput = document.getElementById('chatDelimiterInput');
    const delimiter = (delimInput && delimInput.value.trim()) || DEFAULT_CHAT_DELIMITER;
    data.settings.chatDelimiter = delimiter;
    saveData();

    if (!raw.includes(delimiter)) {
        if (confirm('原文中没有找到这句分隔标志句，无法自动切分。\n改用「完全手动标断点」模式吗？')) startManualComposer();
        return;
    }
    const parts = raw.split(delimiter);
    const blocks = [];
    parts.forEach((part, i) => {
        const isLast = i === parts.length - 1;
        let text = isLast ? part : (part + delimiter);
        text = text.trim();
        if (text) blocks.push({ id: composerNextId++, kind: 'card', heading: '', text, collapsed: true });
    });
    if (!blocks.length) return alert('切分后没有任何有效内容。');
    composerBlocks = blocks;
    composerShow();
    workbenchAutosaveNow();
    alert(`⚡ 已按分隔句自动切出 ${blocks.length} 张意群卡（默认收起）。可展开核对/合并/拆分/删除，满意后「完成 → 进入预览」。`);
}

function chatIsNoiseLine(l) {
    const t = l.trim();
    return /^(【【【|】】】)\s*$/.test(t);
}

function chatStripNoiseLines(p) {
    return p.split('\n')
        .filter(l => !/本回答由\s*AI\s*生成/.test(l) && !chatIsNoiseLine(l))
        .join('\n').trim();
}

function detectSegType(p) {
    const head = (p.split('\n').find(l => l.trim()) || '').trim();
    let role = 'ai';
    let auto = true;
    const scratchHead = /^(解构用户(的)?(查询|提问|请求|输入|提示|深层信息|消息)|训练方案|训练计划|组间休息|预期结果|真实极限|评估医学|评估与分类|评估(生理|医学)?\/?生理|事实核查|处理(医疗状况|医学|糖尿病|用户)|识别与分类|危险警告|潜在(情绪|动机|危险)|自我修正|起草|构建(最终)?回答结构|构建回应结构|构建策略|分析训练方案|回答结构|草案|盘点|重新(定义|评估|计算)|为(用户|糖尿病|他)制定|起草过程|检查与|回应结构)/;
    if (scratchHead.test(head) && /[：:]/.test(head)) {
        role = 'scratch'; auto = false;
    }
    if (/^解构用户/.test(head) && /[：:]/.test(head)) { role = 'scratch'; auto = false; }
    if (role === 'scratch') {
        const answerOpener = /^(我先|直接回答|看到|这个反馈|破案了|既然你|回到你|给你的|最后给你|总之|我完全理解|明天就)/;
        if (p.split('\n').some(l => answerOpener.test(l.trim()))) { role = 'ai'; auto = false; }
    }
    if (auto) {
        if (/^(用户|我|本人|User|提问|问题|Q)[：:]/.test(head)) { role = 'user'; auto = false; }
        else if (/^(AI|DeepSeek|Assistant|回答|回复)[：:]/.test(head)) { role = 'ai'; auto = false; }
    }
    return { role, auto };
}

function buildChatParagraphs(cleanedText) {
    const lines = cleanedText.split('\n');
    const marker = /^(用户|我|本人|User|AI|DeepSeek|Assistant|解构用户(的)?(查询|提问|请求|输入|提示|深层信息))[：:]/;
    const blocks = [];
    let cur = null;
    lines.forEach(rawLine => {
        const line = rawLine.trim();
        if (!line) {
            if (cur) { blocks.push(cur); cur = null; }
            return;
        }
        if (chatIsNoiseLine(rawLine)) return;
        if (cur && marker.test(line)) {
            blocks.push(cur);
            cur = [line];
            return;
        }
        (cur = cur || []).push(line);
    });
    if (cur) blocks.push(cur);
    return blocks.map(b => b.join('\n'));
}

function parseChatSegments() {
    const raw = (document.getElementById('chatRawInput').value || '').replace(/^\uFEFF/, '');
    if (!raw.trim()) return alert('请先粘贴聊天记录原文！');

    const cleanedRaw = raw.split('\n').filter(l => !chatIsNoiseLine(l)).join('\n');
    const paragraphs = buildChatParagraphs(cleanedRaw)
        .map(p => chatStripNoiseLines(p))
        .filter(p => p.length > 0);

    if (!paragraphs.length) return alert('未能解析出有效内容。请确认粘贴的是聊天文字，而不是图片或空文本。');

    const segs = paragraphs.map(p => {
        const t = detectSegType(p);
        return { role: t.role, auto: t.auto, selected: t.role !== 'scratch', text: p };
    });

    for (let i = 0; i < segs.length - 1; i++) {
        if (segs[i].auto && segs[i].role === 'ai' && segs[i + 1].role === 'scratch') {
            segs[i].role = 'user';
        }
    }

    const merged = [];
    for (const s of segs) {
        const last = merged.length ? merged[merged.length - 1] : null;
        if (last && last.role === s.role) {
            last.text += '\n\n' + s.text;
            last.selected = last.selected && s.selected;
            last.auto = false;
        } else {
            merged.push({ role: s.role, auto: s.auto, selected: s.selected, text: s.text });
        }
    }

    chatSegments = merged;
    chatEditingIdx = -1;
    renderSegmentList();
    const step2 = document.getElementById('wbStep2Wrap');
    if (step2) step2.classList.remove('hidden');
    const step3 = document.getElementById('wbStep3Wrap');
    if (step3) step3.classList.remove('hidden');
    document.getElementById('wbPreviewWrap').classList.add('hidden');
    const jsonBox = document.getElementById('chatAiJsonInput');
    if (jsonBox) jsonBox.value = '';
    const box = document.getElementById('aiRefinePromptBox');
    if (box) box.textContent = `✅ 已解析出 ${chatSegments.length} 个对话块（同一问答的相邻段落已自动合并为整块）。勾选要保留的块，进入第③步。`;
}

function loadChatSampleAndParse() {
    const sample = `用户：我先说一下我的情况。我48岁，糖尿病十几年。最近恢复做俯卧撑，一年多没练了。以前快速做能到100个，但脖子会不舒服，感觉像颈椎被前后拉扯，所以现在只敢用大概全力60%的速度慢做。慢做之后数量就下来了，一组大概40个就酸得没力气。

解构用户的查询：
- 核心矛盾：慢速（60%）下次数骤降 + 颈部安全顾虑
- 关键背景：糖尿病十余年，需防范运动性低血糖与眼底风险
- 策略：肯定其对“快慢与颈椎风险”的洞察，引入TUT概念，给出安全进阶路径
评估医学风险：慢速俯卧撑属自重耐力，负荷可控；主要雷区是餐后低血糖窗口与动作变形。

我先说结论：你能自己悟出“快慢之分”和颈椎风险，说明你比大多数健身者懂身体。慢速做1个大约等于快速做2.5-3个的肌肉做功量，所以你现在慢速40个的含金量，其实高于以前借力快速做的100个。至于第二组从40掉到20个，那是局部“磷酸肌酸没回满 + 酸中毒提前报警”，不是力气真没了。
给你的行动建议：把固定“40+20”改成三组 30-30-20，组间甩手握拳促进排酸；找一天测一次慢速“变快临界点”，那才是真实基线。另外，你餐后先原地慢跑再休息10分钟做俯卧撑的顺序本身很好，只需注意跑完别立刻开练，警惕手抖、心慌、出冷汗这类低血糖前兆。
本回答由 AI 生成，内容仅供参考，请仔细甄别`;
    const ta = document.getElementById('chatRawInput');
    if (ta) ta.value = sample;
    onRawInput();
    startManualComposer();
}

function segRoleOptions(cur) {
    const roles = [
        ['user', '👤 用户提问'],
        ['ai', '🤖 AI答复'],
        ['scratch', '🧠 AI思考草稿(默认剔除)'],
        ['chat', '💬 闲聊杂项']
    ];
    return roles.map(r => `<option value="${r[0]}" ${cur === r[0] ? 'selected' : ''}>${r[1]}</option>`).join('');
}

function segBadgeClass(role) {
    return role === 'user' ? 'badge-police' : (role === 'ai' ? 'badge-green' : (role === 'scratch' ? 'badge-amber' : 'badge-orange'));
}

const SEG_PREVIEW_CHARS = 320;

function segShownText(s) {
    if (s.expanded) return s.text;
    return s.text.length > SEG_PREVIEW_CHARS ? s.text.slice(0, SEG_PREVIEW_CHARS) + ' ……(点“展开”看全文)' : s.text;
}

function segRowEl(i) {
    return document.querySelector(`#segmentListWrap .seg-row[data-i="${i}"]`);
}

function applyRowRole(row, role) {
    if (!row) return;
    row.classList.remove('role-user', 'role-ai', 'role-scratch', 'role-chat');
    row.classList.add('role-' + role);
    const sel = row.querySelector('.seg-role');
    if (sel) sel.value = role;
}

function segSyncChecks() {
    const rows = document.querySelectorAll('#segmentListWrap .seg-row');
    rows.forEach(row => {
        const i = parseInt(row.getAttribute('data-i'), 10);
        if (!isNaN(i) && chatSegments[i]) {
            const cb = row.querySelector('.seg-check');
            if (cb) cb.checked = chatSegments[i].selected;
        }
    });
    updateSegCount();
}

function segToggleExpand(i) {
    const s = chatSegments[i];
    if (!s || s.text.length <= SEG_PREVIEW_CHARS) return;
    s.expanded = !s.expanded;
    const row = segRowEl(i);
    if (!row) return;
    const txt = row.querySelector('.seg-text');
    if (txt) txt.textContent = segShownText(s);
    const btn = row.querySelector('.seg-exp-btn');
    if (btn) btn.textContent = s.expanded ? '▲ 收起' : '▼ 展开全文';
}

function renderSegmentList() {
    const wrap = document.getElementById('segmentListWrap');
    if (!wrap) return;
    if (!chatSegments.length) {
        wrap.innerHTML = '';
        updateSegCount();
        return;
    }
    wrap.innerHTML = chatSegments.map((s, i) => {
        const isEditing = chatEditingIdx === i;
        const bodyHtml = isEditing
            ? `<textarea id="segEditArea_${i}" rows="8" style="margin-top:4px;">${escHtml(s.text)}</textarea>
               <div style="display:flex; gap:6px; margin-top:4px;">
                   <button class="btn btn-success btn-sm" onclick="segSaveEdit(${i})">💾 保存修改</button>
                   <button class="btn btn-outline btn-sm" onclick="segCancelEdit()">✕ 取消</button>
               </div>`
            : `<div class="seg-text">${escHtml(segShownText(s))}</div>`;
        const expandBtn = (!isEditing && s.text.length > SEG_PREVIEW_CHARS)
            ? `<button class="seg-mini seg-exp-btn" onclick="segToggleExpand(${i})" title="展开/收起全文">${s.expanded ? '▲ 收起' : '▼ 展开全文'}</button>`
            : '';
        return `
        <div class="seg-row role-${s.role}" data-i="${i}">
            <input type="checkbox" class="seg-check" ${s.selected ? 'checked' : ''} onchange="segCheck(${i}, this.checked)" title="勾选 = 保留给 AI / 参与批量操作">
            <div class="seg-main">
                <div class="seg-bar">
                    <select class="seg-role" onchange="segSetRole(${i}, this.value)">${segRoleOptions(s.role)}</select>
                    <span class="badge ${segBadgeClass(s.role)}" style="font-size:9.5px;">${s.text.length}字</span>
                    <span style="margin-left:auto; display:inline-flex; gap:4px;">
                        <button class="seg-mini" onclick="segEdit(${i})" title="编辑此段文本">✏️ 编辑</button>
                        <button class="seg-mini" onclick="segCopy(${i})" title="复制此段">📋 复制</button>
                        ${expandBtn}
                        <button class="seg-mini seg-mini-del" onclick="segDelete(${i})" title="删除此段">🗑 删除</button>
                    </span>
                </div>
                ${bodyHtml}
            </div>
        </div>`;
    }).join('');
    updateSegCount();
    invalidateChatPrompt();
}

function updateSegCount() {
    const el = document.getElementById('segSelCount');
    if (!el) return;
    const n = chatSegments.filter(s => s.selected).length;
    el.textContent = `已选 ${n} / ${chatSegments.length} 块`;
}

function invalidateChatPrompt() {
    const box = document.getElementById('aiRefinePromptBox');
    if (box && chatSegments.length) box.textContent = '（段落内容有更新，请重新点击「⚙️ 生成精修指令」后再复制。）';
}

function segCheck(i, checked) {
    if (chatSegments[i]) {
        chatSegments[i].selected = !!checked;
        updateSegCount();
    }
}

function segEdit(i) {
    chatEditingIdx = i;
    renderSegmentList();
}

function segSaveEdit(i) {
    const ta = document.getElementById('segEditArea_' + i);
    if (!ta) return;
    const val = chatStripNoiseLines(ta.value);
    if (!val) return alert('该段内容不能为空（如需移除请点删除）。');
    chatSegments[i].text = val;
    chatEditingIdx = -1;
    renderSegmentList();
}

function segCancelEdit() {
    chatEditingIdx = -1;
    renderSegmentList();
}

function segDelete(i) {
    if (!chatSegments[i]) return;
    if (!confirm('删除该段？（不影响其它段落）')) return;
    chatSegments.splice(i, 1);
    chatEditingIdx = -1;
    renderSegmentList();
}

function segSetRole(i, role) {
    const s = chatSegments[i];
    if (!s) return;
    s.role = role;
    if (role === 'scratch') s.selected = false;
    const row = segRowEl(i);
    if (row) {
        applyRowRole(row, role);
        if (role === 'scratch') {
            const cb = row.querySelector('.seg-check');
            if (cb) cb.checked = false;
        }
    }
    updateSegCount();
    invalidateChatPrompt();
}

function segCopy(i) {
    if (!chatSegments[i]) return;
    copyTextSafe(chatSegments[i].text).then(ok => alert(ok ? '✅ 该段已复制。' : '⚠️ 复制失败，请手动选择文本复制。'));
}

function segSelectedList() {
    const idxs = [];
    chatSegments.forEach((s, i) => { if (s.selected) idxs.push(i); });
    return idxs;
}

function segBatchSelectAll() {
    chatSegments.forEach(s => s.selected = true);
    segSyncChecks();
}

function segBatchInvert() {
    chatSegments.forEach(s => s.selected = !s.selected);
    segSyncChecks();
}

function segKeepQa() {
    chatSegments.forEach(s => s.selected = (s.role === 'user' || s.role === 'ai'));
    segSyncChecks();
}

function segSelClear() {
    chatSegments.forEach(s => s.selected = false);
    segSyncChecks();
}

function segSetSelectedRole(role) {
    const idxs = segSelectedList();
    if (!idxs.length) return alert('请先勾选要改角色的段落');
    idxs.forEach(i => {
        chatSegments[i].role = role;
        if (role === 'scratch') chatSegments[i].selected = false;
        const row = segRowEl(i);
        if (row) {
            applyRowRole(row, role);
            const cb = row.querySelector('.seg-check');
            if (cb) cb.checked = chatSegments[i].selected;
        }
    });
    updateSegCount();
    invalidateChatPrompt();
    alert(`✅ 已将 ${idxs.length} 段标记为「${role === 'user' ? '用户提问' : (role === 'ai' ? 'AI答复' : '思考草稿')}」。`);
}

function segScrubSelected() {
    const idxs = segSelectedList();
    if (!idxs.length) return alert('请先勾选要清理的段落');
    const scrubHead = /^(解构用户(的)?(查询|提问|请求|输入|提示|深层信息)|起草|构建(最终)?回答结构|构建回应结构|处理(医疗状况|医学|糖尿病|用户)|评估医学|评估与分类|事实核查|识别与分类|危险警告|自我修正|分析训练方案|分析医学风险|构建策略|步骤|草案|修正|反思|盘点)[：:]\s*$/;
    let removed = 0;
    idxs.forEach(i => {
        const kept = chatSegments[i].text.split('\n').filter(l => {
            const t = l.trim();
            if (/本回答由\s*AI\s*生成/.test(t)) { removed++; return false; }
            if (scrubHead.test(t)) { removed++; return false; }
            return true;
        });
        chatSegments[i].text = kept.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    });
    renderSegmentList();
    alert(`✅ 已从 ${idxs.length} 个块中剔除 ${removed} 行草稿/免责杂行。`);
}

function segDeleteSelected() {
    const idxs = segSelectedList();
    if (!idxs.length) return alert('请先勾选要删除的段落');
    if (!confirm(`确定删除选中的 ${idxs.length} 段吗？此操作不可恢复。`)) return;
    const delSet = new Set(idxs);
    chatSegments = chatSegments.filter((s, i) => !delSet.has(i));
    chatEditingIdx = -1;
    renderSegmentList();
    alert(`✅ 已删除 ${idxs.length} 段。`);
}

function segMergeSelected() {
    const idxs = segSelectedList();
    if (idxs.length < 2) return alert('请至少勾选 2 段进行合并');
    const firstRole = chatSegments[idxs[0]].role;
    const mergedText = idxs.map(i => chatSegments[i].text).join('\n\n');
    chatSegments = chatSegments.filter((s, i) => !idxs.includes(i));
    chatSegments.splice(idxs[0], 0, {
        role: firstRole,
        auto: false,
        selected: true,
        text: mergedText
    });
    chatEditingIdx = -1;
    renderSegmentList();
    alert(`✅ 已将 ${idxs.length} 段合并为 1 段。`);
}

function segBatchReplace() {
    const idxs = segSelectedList();
    if (!idxs.length) return alert('请先勾选要在其中查找替换的段落');
    const find = prompt('查找（在所选段落中逐段替换，区分大小写）：');
    if (find === null || !find) return;
    const rep = prompt('替换为（留空 = 删除匹配文本）：', '');
    if (rep === null) return;
    let hits = 0;
    idxs.forEach(i => {
        const parts = chatSegments[i].text.split(find);
        const occ = parts.length - 1;
        if (occ > 0) {
            chatSegments[i].text = parts.join(rep);
            hits += occ;
        }
    });
    renderSegmentList();
    alert(`✅ 已在 ${idxs.length} 段中完成替换，共命中 ${hits} 处。`);
}

function buildChosenTranscript() {
    return (document.getElementById('chatRawInput').value || '').trim();
}

function buildAiRefineInstruction() {
    const chosen = buildChosenTranscript();
    if (!chosen) return alert('请先在①粘贴聊天记录原文。');

    const duty = getDutyShiftInfo();
    const st = data.settings || {};
    let bio = '';
    if (st.birthday) bio += `\n- 使用者：${new Date().getFullYear() - new Date(st.birthday).getFullYear()} 岁（生于 ${st.birthday}）`; else bio += `\n- 使用者：年龄未知`;
    if (st.height || st.weight) bio += `，身体参数：${st.height ? '身高 ' + st.height + ' cm' : ''}${st.height && st.weight ? ' / ' : ''}${st.weight ? '体重 ' + st.weight + ' kg' : ''}`;
    if (st.diabetesYears) bio += `，2 型糖尿病约 ${st.diabetesYears} 年`;
    bio += `\n- 运动背景：有田径与羽毛球运动史；当前流程：餐后约 40 分钟原地慢跑 30–35 分钟 → 休息约 10 分钟 → 慢速俯卧撑（约全力 60%）。若与聊天原文矛盾，一律以聊天原文为准。`;

    const instruction = `你是一名严谨的「运动医学 + 糖尿病自我管理」文书精修官，为一位基层警务健身者把粗糙的聊天记录精修成当天的淬体日记素材。

你将收到一段用【【【 】】】包裹的「与 AI 的健身聊天原始记录」。该记录为纯文本直接导出，结构粗糙、口语化。

【你的任务】
把这段粗糙聊天精修成一篇用于“当天淬体日记”的优质素材：去芜存菁、重组逻辑，输出一份结构化中文数据（JSON），供前端直接排版成精美战卷风格日记。

【铁律】
1. 删除思考草稿、免责声明、寒暄客套、与训练/控糖/身体感悟无关的闲谈；保留用户提问的原意，提炼 AI 答复中最有价值的干货。
2. 医学内容必须严谨保守：不得编造任何数据；原文出现的风险与禁忌提醒必须提炼进 warnings 字段，不得删减。
3. 语言：凝练、有温度的中文随笔文风；每个 sections 小节由“小标题 + 1~4 句精炼阐述”构成。
4. 只输出一个 JSON 对象：不要任何前后解释，不要 Markdown 代码围栏；确保合法可解析。

【JSON 结构】
{
  "title": "不超过 30 字概括主题",
  "mood": "⚡ 状态极佳·气血充沛 / 🩸 血糖平稳·波澜不惊 / 👮 值班熬夜·交感应激 / 🛡️ 轮休调元·筋膜舒缓 / 🌧️ 疲态偶现·坚忍破障",
  "tag": "必须包含 AI复盘，如：AI复盘,俯卧撑进阶,糖尿病运动",
  "summary": "60~120 字总纲",
  "sections": [{"heading": "小标题", "body": "精炼阐述"}],
  "keyPoints": ["3~6 条结论"],
  "decisions": ["2~4 条行动约定"],
  "warnings": ["安全警示；无则为空数组"]
}

【使用者档案】${bio}

【原始聊天记录】
【【【
${buildChosenTranscript()}
】】】`;

    return instruction;
}

function generateAiRefinePrompt() {
    const txt = buildAiRefineInstruction();
    if (txt === undefined || txt === null) return;
    document.getElementById('aiRefinePromptBox').textContent = txt;
    document.getElementById('chatAiJsonInput').value = '';
    alert(`✅ 精修指令已生成（共 ${txt.length} 字）——请先滚动查看，再点「📋 复制完整指令」发给 DeepSeek / Claude。`);
}

function copyAiRefinePrompt() {
    const txt = buildAiRefineInstruction();
    if (txt === undefined || txt === null) return;
    const box = document.getElementById('aiRefinePromptBox');
    box.textContent = txt;
    copyTextSafe(txt).then(ok => {
        alert(ok
            ? '✅ 完整精修指令（含已选聊天）已复制。\n\n请粘贴发给 DeepSeek / Claude，要求其只输出 JSON；再把返回的 JSON 粘贴到下方输入框，点「✨ 解析 JSON → 生成精美战卷预览」。'
            : '⚠️ 一键复制未成功，请在上方指令框内手动全选复制。');
    });
}

function extractAiJson(raw) {
    let t = String(raw).trim();
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/g, '').trim();
    const a = t.indexOf('{');
    const b = t.lastIndexOf('}');
    if (a === -1 || b <= a) return null;
    try { return JSON.parse(t.slice(a, b + 1)); } catch (e) {}
    try { return JSON.parse(t.slice(a, b + 1).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ' ')); } catch (e2) { return null; }
}

function normalizeAiJson(obj) {
    const str = v => (typeof v === 'string' ? v.trim() : '');
    const arr = v => Array.isArray(v) ? v.map(str).filter(Boolean) : [];
    let mood = str(obj.mood);
    if (!CHAT_MOODS.includes(mood)) {
        const hit = CHAT_MOODS.find(m => mood.includes(m));
        mood = hit || CHAT_MOODS[1];
    }
    let sections = Array.isArray(obj.sections) ? obj.sections.map(sec => {
        if (typeof sec === 'string') return { heading: '', body: sec.trim() };
        return { heading: str(sec && sec.heading), body: str(sec && sec.body) };
    }).filter(x => x.heading || x.body) : [];
    const structured = {
        summary: str(obj.summary),
        sections,
        keyPoints: arr(obj.keyPoints),
        decisions: arr(obj.decisions),
        warnings: arr(obj.warnings)
    };
    return {
        title: str(obj.title) || ('AI对话精修 · ' + new Date().toISOString().slice(0, 10)),
        mood,
        tag: str(obj.tag) || 'AI复盘',
        structured
    };
}

function parseAiJsonToPreview() {
    const raw = document.getElementById('chatAiJsonInput').value.trim();
    if (!raw) return alert('请先把 AI 返回的 JSON 粘贴到上方输入框。');
    const obj = extractAiJson(raw);
    if (!obj) return alert('⚠️ 无法解析该 JSON。请确认粘贴的是 AI 返回的纯 JSON。');
    const norm = normalizeAiJson(obj);
    const digest = diaryDigestFromStructured(norm.structured);
    showChatPreview(norm.title, norm.mood, norm.tag, digest, norm.structured);
    alert('✨ 已解析并生成精美战卷预览！若字段缺失，可点「免AI · 直接合成草稿」或返回修改。');
}

function makeDraftFromSegments() {
    const chosen = chatSegments.filter(s => s.selected);
    if (!chosen.length) return alert('请先勾选至少一个保留段落');
    const parts = [];
    let title = 'AI对话复盘';
    chosen.forEach(s => {
        const tagTxt = s.role === 'user' ? '【我的提问】' : (s.role === 'ai' ? '【AI精要】' : '【(草稿·已剔除建议)】');
        parts.push(tagTxt + '\n' + s.text);
        if (title === 'AI对话复盘' && s.role === 'user') {
            const first = (s.text.split('\n')[0] || '').trim();
            if (first) title = 'AI复盘：' + (first.length > 34 ? first.slice(0, 34) + '…' : first);
        }
    });
    const digest = parts.join('\n\n');
    showChatPreview(title, '🩸 血糖平稳·波澜不惊', 'AI复盘', digest, null);
    alert('🛠 已按勾选段落合成文本草稿（未经 AI 精修）。可以直接修订后封存。');
}

function showChatPreview(title, mood, tag, digest, structured, skipAutoSeal) {
    chatDraftStructured = normalizeStructured(structured);
    const cleanDigest = stripBlankLines(digest);
    chatDraftDigest = cleanDigest === null ? digest : cleanDigest;
    const duty = getDutyShiftInfo();
    document.getElementById('chatDraftTitle').value = title || '';
    document.getElementById('chatDraftDate').value = duty.dutyDateStr;
    const moodSel = document.getElementById('chatDraftMood');
    moodSel.value = CHAT_MOODS.includes(mood) ? mood : CHAT_MOODS[1];
    document.getElementById('chatDraftTag').value = tag || 'AI复盘';
    document.getElementById('chatDraftContent').value = chatDraftDigest;
    document.getElementById('chatVaultPreview').innerHTML = chatDraftStructured ? vaultHTML(chatDraftStructured) : '';
    const wrap = document.getElementById('wbPreviewWrap');
    wrap.classList.remove('hidden');
    wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

    let sealed = null;
    if (!skipAutoSeal) sealed = commitWorkbenchDraft();
    workbenchAutosaveNow();
    if (sealed) {
        showToast(sealed.isUpdate
            ? '已同步更新日记中的这篇随笔'
            : '✅ 已自动入册到日记 ·「🧠 AI聊天」+1（可在下方继续修订）');
    }
}

function normalizeStructured(s) {
    if (!s || typeof s !== 'object') return s || null;
    if (Array.isArray(s.sections)) {
        s.sections.forEach(sec => {
            if (!sec || typeof sec.body !== 'string') return;
            const clean = stripBlankLines(sec.body);
            if (clean !== null) sec.body = clean;
        });
    }
    if (typeof s.summary === 'string') {
        const clean = stripBlankLines(s.summary);
        if (clean !== null) s.summary = clean;
    }
    return s;
}

function commitWorkbenchDraft() {
    const titleEl = document.getElementById('chatDraftTitle');
    if (!titleEl) return null;
    const title = titleEl.value.trim();
    const dateEl = document.getElementById('chatDraftDate');
    const date = dateEl ? dateEl.value : '';
    const moodEl = document.getElementById('chatDraftMood');
    const mood = moodEl ? moodEl.value : '';
    const tagEl = document.getElementById('chatDraftTag');
    const tag = tagEl ? tagEl.value.trim() : '';
    const contentEl = document.getElementById('chatDraftContent');
    const rawContent = contentEl ? contentEl.value.trim() : '';
    const cleanContent = stripBlankLines(rawContent);
    const content = cleanContent === null ? rawContent : cleanContent;
    if (!date || !title || !content) return null;

    const now = new Date().toISOString();
    let structured = null;
    if (chatDraftStructured) {
        if (content === chatDraftDigest) {
            structured = chatDraftStructured;
        } else {
            const parts = content.split('\n').map(p => p.trim()).filter(Boolean);
            structured = { sections: parts.length ? parts.map(p => ({ heading: '', body: p })) : [{ heading: '', body: content }] };
        }
    }

    const idx = chatDraftSealedId ? data.diaries.findIndex(d => d.id === chatDraftSealedId) : -1;
    let entry;
    let isUpdate = false;
    if (idx !== -1) {
        entry = data.diaries[idx];
        entry.date = date;
        entry.mood = mood;
        entry.tag = tag || 'AI复盘';
        entry.title = title;
        entry.content = content;
        entry.source = 'chat_ai';
        entry.updatedAt = now;
        if (structured) entry.structured = structured;
        isUpdate = true;
    } else {
        entry = {
            id: 'diary_chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            date: date,
            mood: mood,
            tag: tag || 'AI复盘',
            title: title,
            content: content,
            source: 'chat_ai',
            createdAt: now,
            updatedAt: now
        };
        if (structured) entry.structured = structured;
        data.diaries.push(entry);
        chatDraftSealedId = entry.id;
    }

    let saved = true;
    try { saveData(); } catch (e) { saved = false; }
    renderDiaryList();
    return { entry: entry, isUpdate: isUpdate, saved: saved };
}

function saveEntryFromWorkbench() {
    const res = commitWorkbenchDraft();
    if (!res) {
        const date = document.getElementById('chatDraftDate').value;
        const title = document.getElementById('chatDraftTitle').value.trim();
        const content = document.getElementById('chatDraftContent').value.trim();
        if (!date) return alert('请选择随笔日期！');
        if (!title) return alert('请为随笔拟一个标题！');
        if (!content) return alert('正文不能为空！');
        return;
    }
    chatWorkbenchReset(true, true);
    if (!res.saved) {
        return alert('⚠️ 随笔已加入日记列表，但写入本地存储失败。请先「📤 备份」再清理旧数据。');
    }
    alert(res.isUpdate
        ? '✅ 已更新这篇日记（同一篇随笔，不会重复入库）。'
        : '✅ 已封存为当日新日记！每张卡片都会在列表与精读视图中以独立卡片框呈现。');
}

// 意群成卡编辑器
let composerBlocks = [];
let composerNextId = 1;

function composerBlock(bid) {
    return composerBlocks.find(b => b.id === bid) || null;
}

function composerSync(bid) {
    const b = composerBlock(bid);
    if (!b) return;
    const ta = document.getElementById('cfTa_' + bid);
    if (ta) b.text = ta.value;
    const h = document.getElementById('cfHead_' + bid);
    if (h) b.heading = h.value;
}

function composerSyncAll() {
    composerBlocks.forEach(b => composerSync(b.id));
}

function composerAutosize(ta) {
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(1600, Math.max(130, ta.scrollHeight + 4)) + 'px';
}

function composerTaInput(ta) {
    if (stripBlankLinesIn(ta)) {
        const host = ta.closest('[data-bid]');
        if (host) composerSync(parseInt(host.getAttribute('data-bid'), 10));
    }
    composerAutosize(ta);
    workbenchTouch();
}

function composerAutoTitle() {
    for (const b of composerBlocks) {
        const t = (b.text || '').trim();
        if (!t) continue;
        if (b.kind === 'card' && b.heading && b.heading.trim()) return b.heading.trim();
        const first = t.split('\n')[0].trim().replace(/[。！？!?]$/, '');
        if (first) return first.length > 30 ? first.slice(0, 30) + '…' : first;
    }
    return '淬体随笔精修';
}

function composerCardHead(b) {
    if (b.heading && b.heading.trim()) return b.heading.trim();
    const first = (b.text || '').split('\n')[0].trim();
    return first.length > 22 ? first.slice(0, 22) + '…' : (first || '意群卡');
}

function composerCardMeta(b) {
    const t = (b.text || '').trim();
    const one = t.split(/\s+/).join(' ');
    return t.length + ' 字 · ' + (one.length > 60 ? one.slice(0, 60) + '…' : one);
}

function renderComposer() {
    const card = document.getElementById('aiComposerCard');
    const body = document.getElementById('aiComposerBody');
    if (!card || !body) return;
    composerBlocks.forEach(b => {
        const clean = stripBlankLines(b.text);
        if (clean !== null) b.text = clean;
    });
    if (!composerBlocks.length) {
        body.innerHTML = '<div class="diary-empty" style="padding:18px;"><span>📇</span>暂无内容<br><span style="font-size:0.8em; color:var(--text-dim);">点「＋ 追加一段」粘贴/输入文字</span></div>';
        return;
    }
    body.innerHTML = composerBlocks.map((b, idx) => {
        if (b.kind === 'open') {
            return `
            <div class="cf-open-wrap" data-bid="${b.id}">
                <div class="cf-openbar">
                    <button class="btn btn-sm btn-amber" onclick="composerCutCaret(${b.id})" title="从本段开头到光标处 → 一张意群卡">✂️ 光标以上 → 意群卡</button>
                    <button class="btn btn-sm btn-amber" onclick="composerCutSelection(${b.id})" title="选中的文字 → 一张意群卡">✂️ 选中内容 → 意群卡</button>
                    <span class="hint">先在上方正文里把光标停到某一行末尾，或选中一段文字，再点按钮</span>
                    <button class="seg-mini" style="margin-left:auto;" onclick="composerFull(${b.id})" title="全屏查看这段连续正文">⛶ 全屏</button>
                    <button class="seg-mini" onclick="composerDelete(${b.id})" title="删除这一整段">🗑 删本段</button>
                </div>
                <textarea class="cf-ta" id="cfTa_${b.id}" oninput="composerTaInput(this)" placeholder="整段内容（可自由修改）：">${escHtml(b.text)}</textarea>
            </div>`;
        }
        if (!b.collapsed) {
            return `
            <div class="cf-cardopen" data-bid="${b.id}">
                <div class="cf-open-sticky" ondblclick="composerHeadDbl(event, ${b.id})" title="双击此标题栏即可折叠">
                    <span class="cf-cardnum">📇 卡#${idx + 1}</span>
                    <span class="cf-cardhead">${escHtml(composerCardHead(b))}</span>
                    <span class="cf-cardtools">
                        <button class="seg-mini" onclick="composerFull(${b.id})" title="全屏查看此卡">⛶ 全屏</button>
                        <button class="seg-mini" onclick="composerCollapse(${b.id})" title="折叠此卡">▲ 折叠</button>
                    </span>
                </div>
                <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap;" ondblclick="composerHeadDbl(event, ${b.id})" title="双击此标题行即可折叠">
                    <input class="flex-1 cf-cardheading" id="cfHead_${b.id}" value="${escAttr(b.heading || '')}" placeholder="卡片小标题（可留空 → 正文直接成段）" style="flex:2; min-width:180px;">
                    <span class="hint">展开中 · 双击标题收起</span>
                </div>
                <textarea class="cf-ta" id="cfTa_${b.id}" rows="6" oninput="composerTaInput(this)">${escHtml(b.text)}</textarea>
                <div style="display:flex; gap:6px; margin-top:6px; flex-wrap:wrap;">
                    <button class="btn btn-success btn-sm" onclick="composerCollapse(${b.id})">💾 收起卡片</button>
                    <button class="btn btn-outline btn-sm" onclick="composerUnlock(${b.id})" title="解锁：把卡片内容恢复为连续正文">🔓 解锁为连续正文</button>
                    <button class="btn btn-danger btn-sm" onclick="composerDelete(${b.id})">🗑 删除此卡</button>
                </div>
            </div>`;
        }
        return `
        <div class="cf-cardbar" data-bid="${b.id}" ondblclick="composerBarDbl(event, ${b.id})" title="双击即可展开这张意群卡">
            <span class="cf-cardnum">📇 卡#${idx + 1}</span>
            <div class="cf-cardinfo">
                <span class="cf-cardhead">${escHtml(composerCardHead(b))}</span>
                <span class="cf-cardmeta">${escHtml(composerCardMeta(b))}</span>
            </div>
            <span class="cf-cardtools">
                <button class="seg-mini" onclick="composerFull(${b.id})" title="全屏查看此卡">⛶ 全屏</button>
                <button class="seg-mini" onclick="composerToggle(${b.id})" title="展开编辑">▼ 展开</button>
                <button class="seg-mini" onclick="composerUnlock(${b.id})" title="解锁：恢复为连续正文">🔓 解锁</button>
                <button class="seg-mini seg-mini-del" onclick="composerDelete(${b.id})">🗑 删除</button>
            </span>
        </div>`;
    }).join('');
    body.querySelectorAll('.cf-ta').forEach(ta => composerAutosize(ta));
    workbenchAutosaveNow();
}

const DIARY_DRAFT_KEY = 'diary_workbench_draft_v1';
let workbenchOriginTab = 'diary';
let workbenchOriginScroll = 0;
let workbenchSaveTimer = null;

function workbenchDraftSnapshot() {
    composerSyncAll();
    const rawEl = rawInputEl();
    const previewEl = document.getElementById('wbPreviewWrap');
    const get = id => { const el = document.getElementById(id); return el ? el.value : ''; };
    return {
        v: 2,
        raw: rawEl ? rawEl.value : '',
        blocks: composerBlocks.map(b => ({
            id: b.id, kind: b.kind, heading: b.heading || '', text: b.text || '',
            collapsed: b.collapsed !== false
        })),
        preview: {
            visible: !!(previewEl && !previewEl.classList.contains('hidden')),
            title: get('chatDraftTitle'),
            date: get('chatDraftDate'),
            mood: get('chatDraftMood'),
            tag: get('chatDraftTag'),
            content: get('chatDraftContent'),
            digest: chatDraftDigest,
            structured: chatDraftStructured,
            sealedId: chatDraftSealedId
        },
        composerOpen: !document.getElementById('aiComposerCard').classList.contains('hidden'),
        savedAt: Date.now()
    };
}

function workbenchHasContent(snap) {
    const s = snap || workbenchDraftSnapshot();
    return !!(s.raw.trim() || s.blocks.some(b => (b.text || '').trim())) || !!(s.preview && s.preview.visible);
}

function workbenchAutosaveNow() {
    try {
        const snap = workbenchDraftSnapshot();
        if (!workbenchHasContent(snap)) { localStorage.removeItem(DIARY_DRAFT_KEY); return; }
        localStorage.setItem(DIARY_DRAFT_KEY, JSON.stringify(snap));
    } catch (e) {}
}

function workbenchTouch() {
    clearTimeout(workbenchSaveTimer);
    workbenchSaveTimer = setTimeout(workbenchAutosaveNow, 500);
}

function composerClearDraft() {
    clearTimeout(workbenchSaveTimer);
    try { localStorage.removeItem(DIARY_DRAFT_KEY); } catch (e) {}
}

function composerCheckDraftOnOpen() {
    if (composerBlocks.length || (rawInputEl() && rawInputEl().value.trim())) return;
    let draft = null;
    try { draft = JSON.parse(localStorage.getItem(DIARY_DRAFT_KEY) || 'null'); } catch (e) {}
    if (!draft || (!Array.isArray(draft.blocks) && !Array.isArray(draft.composerBlocks))) return;
    applyWorkbenchDraft(draft, true);
}

function applyWorkbenchDraft(draft, notify) {
    const blocks = Array.isArray(draft.blocks) ? draft.blocks
        : (Array.isArray(draft.composerBlocks) ? draft.composerBlocks.map(b => ({ ...b })) : []);
    const rawEl = rawInputEl();
    if (rawEl && typeof draft.raw === 'string') rawEl.value = draft.raw;
    onRawInput();
    composerBlocks = blocks
        .filter(b => b && typeof b.text === 'string')
        .map((b, i) => ({
            id: typeof b.id === 'number' ? b.id : i + 1,
            kind: b.kind === 'card' ? 'card' : 'open',
            heading: b.heading || '',
            text: b.text,
            collapsed: b.collapsed !== false
        }));
    composerNextId = 1 + composerBlocks.reduce((m, b) => Math.max(m, b.id || 0), 0);
    const compBody = document.getElementById('aiComposerBody');
    if (compBody) compBody.innerHTML = '';

    const pv = draft.preview;
    if (pv && pv.visible) {
        chatDraftSealedId = pv.sealedId || null;
        showChatPreview(pv.title, pv.mood, pv.tag, pv.digest || pv.content || '', pv.structured || null, true);
        const dateEl = document.getElementById('chatDraftDate');
        if (dateEl && pv.date) dateEl.value = pv.date;
        const tagEl = document.getElementById('chatDraftTag');
        if (tagEl) tagEl.value = pv.tag || tagEl.value;
        const moodEl = document.getElementById('chatDraftMood');
        if (moodEl && pv.mood && CHAT_MOODS.includes(pv.mood)) moodEl.value = pv.mood;
        if (!chatDraftSealedId) {
            const recovered = commitWorkbenchDraft();
            if (recovered) showToast('已把自动存档里的 AI 聊天随笔补入日记 ·「🧠 AI聊天」+1');
        }
    } else if (pv) {
        const titleEl = document.getElementById('chatDraftTitle');
        if (titleEl && pv.title) titleEl.value = pv.title;
        if (pv.date) document.getElementById('chatDraftDate').value = pv.date;
        if (pv.tag) document.getElementById('chatDraftTag').value = pv.tag;
    }

    if (composerBlocks.length) {
        document.getElementById('aiComposerCard').classList.remove('hidden');
        renderComposer();
    } else {
        document.getElementById('aiComposerCard').classList.add('hidden');
    }
    if (notify) {
        const mins = Math.max(1, Math.round((Date.now() - (draft.savedAt || Date.now())) / 60000));
        showToast(`已恢复 ${mins} 分钟前自动存档的内容`);
    }
}

function collapseWorkbench() {
    workbenchAutosaveNow();
    closeFullView();
    document.getElementById('chatWorkbenchCard').classList.add('hidden');
    setAiImmersive(false);
    returnFromWorkbench();
    showToast(workbenchHasContent() ? '工作台已自动存档，随时可点「🧠 AI聊天精修导入」继续' : '已收起工作台');
}

function returnFromWorkbench() {
    switchTab(workbenchOriginTab || 'diary');
    const deck = document.getElementById('leftDeckPane');
    if (deck) deck.scrollTop = workbenchOriginScroll || 0;
}

function composerShow() {
    document.getElementById('aiComposerCard').classList.remove('hidden');
    renderComposer();
    setAiImmersive(true);
    document.getElementById('aiComposerCard').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function composerClose() {
    composerSyncAll();
    workbenchAutosaveNow();
    document.getElementById('aiComposerCard').classList.add('hidden');
    showToast('编辑器已收起，内容已自动存档');
}

function composerFromChosen() {
    const chosen = chatSegments.filter(s => s.selected);
    if (!chosen.length) return alert('请先在第②步勾选要保留的内容。');
    composerBlocks = [{ id: composerNextId++, kind: 'open', text: chosen.map(s => s.text).join('\n\n') }];
    composerShow();
    alert('📇 意群编辑器已打开：整段连续阅读，读到某个意群结尾点「✂️ 光标以上 → 意群卡」。');
}

function composerFromPreview() {
    const content = document.getElementById('chatDraftContent').value.trim();
    if (!content) return alert('当前没有可编辑的正文内容。');
    composerBlocks = [{ id: composerNextId++, kind: 'open', text: content }];
    composerShow();
}

function composerAddBlock() {
    composerBlocks.push({ id: composerNextId++, kind: 'open', text: '' });
    renderComposer();
    const card = document.getElementById('aiComposerCard');
    if (card) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function composerCollapseAll() {
    composerBlocks.forEach(b => { if (b.kind === 'card') b.collapsed = true; });
    renderComposer();
}

function composerCutCaret(bid) {
    composerSync(bid);
    const b = composerBlock(bid);
    if (!b) return;
    const ta = document.getElementById('cfTa_' + bid);
    if (!ta) return;
    const full = b.text || '';
    let pos = ta.selectionStart;
    if (pos == null) pos = full.length;
    const prefix = full.slice(0, pos).trimEnd();
    if (!prefix.trim()) return alert('光标位置之前没有可成卡的内容——请把光标放到某一行/某段结尾后再试。');
    const rest = full.slice(pos).trimStart();
    b.text = rest;
    composerBlocks.splice(composerBlocks.indexOf(b), 0, { id: composerNextId++, kind: 'card', heading: '', text: prefix, collapsed: true });
    renderComposer();
}

function composerCutSelection(bid) {
    composerSync(bid);
    const b = composerBlock(bid);
    if (!b) return;
    const ta = document.getElementById('cfTa_' + bid);
    if (!ta) return;
    const a = ta.selectionStart, z = ta.selectionEnd;
    if (a == null || z == null || a === z) return alert('请先用鼠标选中一段文字，再点「✂️ 选中内容 → 意群卡」。');
    const full = b.text || '';
    const sel = full.slice(a, z);
    if (!sel.trim()) return alert('选中的内容为空。');
    const pre = full.slice(0, a).trimEnd();
    const suf = full.slice(z).trimStart();
    b.text = (pre && suf) ? pre + '\n\n' + suf : (pre + suf);
    composerBlocks.splice(composerBlocks.indexOf(b), 0, { id: composerNextId++, kind: 'card', heading: '', text: sel.trim(), collapsed: true });
    renderComposer();
}

function composerToggle(bid) {
    composerSync(bid);
    const b = composerBlock(bid);
    if (!b || b.kind !== 'card') return;
    b.collapsed = !b.collapsed;
    renderComposer();
}

function composerCollapse(bid) {
    composerSync(bid);
    const b = composerBlock(bid);
    if (!b || b.kind !== 'card') return;
    b.collapsed = true;
    renderComposer();
}

function composerUnlock(bid) {
    composerSync(bid);
    const b = composerBlock(bid);
    if (!b || b.kind !== 'card') return;
    b.kind = 'open';
    b.heading = '';
    b.collapsed = false;
    renderComposer();
}

function composerBarDbl(ev, bid) {
    if (ev.target.closest('button, input, textarea, select, a')) return;
    composerToggle(bid);
}

function composerHeadDbl(ev, bid) {
    if (ev.target.closest('button, input, textarea, select, a')) return;
    composerCollapse(bid);
}

function composerFull(bid) {
    composerSyncAll();
    const items = [];
    let index = -1;
    composerBlocks.forEach((b, i) => {
        const t = (b.text || '').trim();
        if (!t) return;
        const head = b.kind === 'card' ? composerCardHead(b) : '连续正文';
        const label = (b.kind === 'card' ? '📇 卡#' + (i + 1) + ' · ' : '📄 连续正文 · ') + head;
        if (b.id === bid) index = items.length;
        items.push({
            label: label.length > 40 ? label.slice(0, 40) + '…' : label,
            title: (b.kind === 'card' ? '📇 ' : '📄 ') + head + ' · 全屏查看',
            html: '<h3 class="md-h">' + escHtml(head) + '</h3>' + mdLiteFlowing(t)
        });
    });
    if (!items.length) return alert('编辑器里还没有可查看的内容。');
    if (index < 0) index = 0;
    openFullView(items[index].title, items[index].html, { items: items, index: index });
}

function composerDelete(bid) {
    const b = composerBlock(bid);
    if (!b) return;
    const t = (b.text || '').trim();
    if (t.length > 0 && !confirm(`确定删除“${t.slice(0, 24)}${t.length > 24 ? '…' : ''}”这部分内容吗？`)) return;
    composerBlocks = composerBlocks.filter(x => x.id !== bid);
    renderComposer();
}

function composerFinish() {
    composerSyncAll();
    const sections = [];
    const digests = [];
    composerBlocks.forEach(b => {
        const t = (b.text || '').trim();
        if (!t) return;
        digests.push(t);
        sections.push({ heading: (b.kind === 'card' ? (b.heading || '').trim() : ''), body: t });
    });
    if (!sections.length) return alert('没有任何可封存的内容——请先在编辑器里粘贴/输入文字。');
    const cards = composerBlocks.filter(b => b.kind === 'card').length;
    const digest = digests.join('\n\n');
    const prevTitle = (document.getElementById('chatDraftTitle').value || '').trim();
    const title = prevTitle || composerAutoTitle();
    const structured = { sections };
    showChatPreview(title, '🩸 血糖平稳·波澜不惊', 'AI复盘,意群卡', digest, structured);
    document.getElementById('aiComposerCard').classList.add('hidden');
    document.getElementById('wbPreviewWrap').scrollIntoView({ behavior: 'smooth', block: 'start' });
    alert(`📇 已按顺序生成 ${cards} 张意群卡（${sections.length} 段内容），并已自动入册到日记。`);
}