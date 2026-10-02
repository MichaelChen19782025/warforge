// ================================================================
//  utils.js: 基础排版、时间戳、HUD浮层、全局TTS语音、Markdown与Toast工具库
// ================================================================

// 全局高敏 TTS 快速语音播报（统一防崩溃与统一语速调谐）
function speakFast(text) {
    if (!('speechSynthesis' in window)) return;
    const voiceSelect = document.getElementById('voiceEnabled');
    if (voiceSelect && voiceSelect.value === 'false') return;

    try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-CN';
        u.rate = 1.35;
        u.pitch = 1.05;
        window.speechSynthesis.speak(u);
    } catch (e) {
        console.warn('TTS error:', e);
    }
}
window.speakFast = speakFast;

// 获取格式化时间戳 YYYY-MM-DD HH:mm:ss
function getFullTimestamp(d = new Date()) {
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${Y}-${M}-${D} ${h}:${m}:${s}`;
}

// 文本安全转义
function escHtml(s) {
    return String(s == null ? '' : s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
function escAttr(s) { return escHtml(s); }

// 空行清理引擎
function stripBlankLines(text) {
    const src = String(text == null ? '' : text);
    if (src.indexOf('\n') === -1) return null;
    const hasBlank = /(^|\n)[ \t\r]*(?=\n)/.test(src) || /(^|\n)[ \t\r]*$/.test(src);
    if (!hasBlank) return null;
    const kept = [];
    for (const line of src.split('\n')) {
        if (line.trim() !== '') kept.push(line.replace(/\s+$/, ''));
    }
    const out = kept.join('\n');
    return out === src ? null : out;
}

function stripBlankLinesIn(el) {
    if (!el || typeof el.value !== 'string') return false;
    const src = el.value;
    const caret = el.selectionStart, caretEnd = el.selectionEnd;
    const lastNl = src.lastIndexOf('\n');
    const protectTail = lastNl !== -1 && src.slice(lastNl + 1).trim() === '' && caret != null && caret > lastNl;
    const head = protectTail ? src.slice(0, lastNl) : src;
    const next = stripBlankLines(head);
    if (next === null) return false;
    const tail = protectTail ? src.slice(lastNl) : '';
    const segs = [];
    let idx = 0;
    for (const line of head.split('\n')) {
        const start = idx;
        idx += line.length + 1;
        if (line.trim() === '') segs.push([start, Math.min(idx, head.length)]);
    }
    const mapPos = pos => {
        if (pos == null) return pos;
        if (protectTail && pos > lastNl) return next.length + (pos - lastNl);
        let removed = 0;
        for (const s of segs) {
            if (s[0] >= pos) break;
            removed += Math.min(s[1], pos) - s[0];
        }
        return Math.max(0, pos - removed);
    };
    const nc = mapPos(caret), ne = mapPos(caretEnd);
    el.value = next + tail;
    if (caret != null) el.selectionStart = nc;
    if (caretEnd != null) el.selectionEnd = ne;
    return true;
}

function migrateBlankLinesInData() {
    let changed = 0;
    (data.diaries || []).forEach(d => {
        const c = stripBlankLines(d.content);
        if (c !== null) { d.content = c; changed++; }
        if (d.structured && Array.isArray(d.structured.sections)) {
            d.structured.sections.forEach(sec => {
                if (!sec || typeof sec.body !== 'string') return;
                const b = stripBlankLines(sec.body);
                if (b !== null) { sec.body = b; changed++; }
            });
        }
        if (d.structured && typeof d.structured.summary === 'string') {
            const b = stripBlankLines(d.structured.summary);
            if (b !== null) { d.structured.summary = b; changed++; }
        }
    });
    (data.aiReports || []).forEach(r => {
        if (!r || typeof r.content !== 'string') return;
        const c = stripBlankLines(r.content);
        if (c !== null) { r.content = c; changed++; }
    });
    (data.knowledge || []).forEach(k => {
        if (!k || typeof k.content !== 'string') return;
        const c = stripBlankLines(k.content);
        if (c !== null) { k.content = c; changed++; }
    });
    return changed;
}

// Markdown 渲染引擎
function mdLiteFlowing(text) {
    const lines = String(text || '').split('\n').map(l => l.trim()).filter(l => l !== '');
    if (!lines.length) return '<div class="md-render"><p>（无内容）</p></div>';
    return mdLite(lines.join('\n\n'));
}

function mdLite(text) {
    if (!text) return '';
    const codeBlocks = [];
    let src = String(text).replace(/```([\s\S]*?)```/g, (m, code) => {
        codeBlocks.push(code.replace(/^\n/, '').replace(/\n$/, ''));
        return '\u0000CODE' + (codeBlocks.length - 1) + '\u0000';
    });
    src = escHtml(src);
    const inline = s => s
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, '$1<em>$2</em>');
    const lines = src.split('\n');
    let html = '', inList = null, para = [];
    const flushPara = () => { if (para.length) { html += '<p>' + para.join('<br>') + '</p>'; para = []; } };
    const closeList = () => { if (inList) { html += inList === 'ul' ? '</ul>' : '</ol>'; inList = null; } };
    lines.forEach(line => {
        const codeMatch = line.match(/^\u0000CODE(\d+)\u0000$/);
        if (codeMatch) { flushPara(); closeList(); html += `<pre class="md-pre"><code>${escHtml(codeBlocks[+codeMatch[1]])}</code></pre>`; return; }
        const h = line.match(/^(#{1,4})\s+(.*)$/);
        if (h) { flushPara(); closeList(); const lvl = Math.min(6, h[1].length + 2); html += `<h${lvl} class="md-h">${inline(h[2])}</h${lvl}>`; return; }
        if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flushPara(); closeList(); html += '<hr class="md-hr">'; return; }
        const bq = line.match(/^&gt;\s?(.*)$/);
        if (bq) { flushPara(); closeList(); html += `<blockquote class="md-quote">${inline(bq[1])}</blockquote>`; return; }
        const ul = line.match(/^\s*[-•]\s+(.*)$/);
        if (ul) { flushPara(); if (inList !== 'ul') { closeList(); html += '<ul class="md-ul">'; inList = 'ul'; } html += `<li>${inline(ul[1])}</li>`; return; }
        const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
        if (ol) { flushPara(); if (inList !== 'ol') { closeList(); html += '<ol class="md-ol">'; inList = 'ol'; } html += `<li>${inline(ol[1])}</li>`; return; }
        if (/^\s*$/.test(line)) { flushPara(); closeList(); return; }
        para.push(inline(line));
    });
    flushPara(); closeList();
    return `<div class="md-render">${html || '<p></p>'}</div>`;
}

// 阅读排版调谐器
const READ_LH_MIN = 1.2, READ_LH_MAX = 3;
const READ_PG_MIN = 0, READ_PG_MAX = 3;

function syncTypoControls(key, val) {
    document.querySelectorAll(`[data-typo="${key}"]`).forEach(el => {
        if (el === document.activeElement) return;
        if (Math.abs(parseFloat(el.value) - val) > 1e-6) el.value = val;
    });
}

function applyReadingTypography() {
    const lh = clampTypo(data.settings.readLineHeight, READ_LH_MIN, READ_LH_MAX, 1.85);
    const pg = clampTypo(data.settings.readParaGapLines, READ_PG_MIN, READ_PG_MAX, 1);
    const root = document.documentElement.style;
    root.setProperty('--md-line-height', lh);
    root.setProperty('--md-para-gap-lines', pg);
    syncTypoControls('lh', lh.toFixed(2));
    syncTypoControls('pg', pg.toFixed(2));
}

function clampTypo(v, min, max, fallback) {
    const n = parseFloat(v);
    if (!isFinite(n)) return fallback;
    return Math.max(min, Math.min(max, +n.toFixed(2)));
}

function setReadLineHeight(v) {
    data.settings.readLineHeight = clampTypo(v, READ_LH_MIN, READ_LH_MAX, 1.85);
    saveData();
    applyReadingTypography();
}

function setReadParaGapLines(v) {
    data.settings.readParaGapLines = clampTypo(v, READ_PG_MIN, READ_PG_MAX, 1);
    saveData();
    applyReadingTypography();
}

function onTypoBlur(el) {
    const key = el.getAttribute('data-typo');
    const val = key === 'lh'
        ? clampTypo(data.settings.readLineHeight, READ_LH_MIN, READ_LH_MAX, 1.85)
        : clampTypo(data.settings.readParaGapLines, READ_PG_MIN, READ_PG_MAX, 1);
    el.value = val.toFixed(2);
    applyReadingTypography();
}

function toggleTypoPanel(ev) {
    if (ev && ev.stopPropagation) ev.stopPropagation();
    const panel = document.getElementById('typoPanel');
    if (!panel) return;
    if (panel.classList.contains('hidden')) {
        const header = document.querySelector('header');
        if (header) {
            const r = header.getBoundingClientRect();
            panel.style.top = Math.round(r.bottom + 6) + 'px';
            panel.style.right = Math.max(8, Math.round(window.innerWidth - r.right)) + 'px';
        }
    }
    panel.classList.toggle('hidden');
}

document.addEventListener('click', e => {
    const panel = document.getElementById('typoPanel');
    if (!panel || panel.classList.contains('hidden')) return;
    if (panel.contains(e.target)) return;
    if (e.target.closest && e.target.closest('#typoPanelBtn')) return;
    panel.classList.add('hidden');
});

// 全站穿透字号缩放
let currentFontDelta = 4;
function applyFontDelta(delta) {
    currentFontDelta = delta;
    let styleEl = document.getElementById('tacticalFontScalerStyle');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'tacticalFontScalerStyle';
        document.head.appendChild(styleEl);
    }

    styleEl.textContent = `
        :root { --base-font-size: ${14.5 + delta}px !important; }
        body, html { font-size: ${14.5 + delta}px !important; }
        header { min-height: 68px; height: auto; padding: 6px 16px; }
        .brand-logo-main { font-size: ${18 + delta}px !important; }
        .police-clock-pill { font-size: ${11 + delta}px !important; }
        .tab-btn { font-size: ${13 + delta}px !important; padding: 7px 14px !important; }
        .plan-tab-btn { font-size: ${11.5 + delta}px !important; }
        .btn { font-size: ${12 + delta}px !important; }
        .btn-sm { font-size: ${11 + delta}px !important; }
        .arsenal-btn { font-size: ${11.5 + delta}px !important; }
        .card-header { font-size: ${14.5 + delta}px !important; }
        .duty-info-title { font-size: ${15 + delta}px !important; }
        .slot-title { font-size: ${14 + delta}px !important; }
        .item-title { font-size: ${14 + delta}px !important; }
        .badge { font-size: ${10 + delta}px !important; }
        label { font-size: ${11 + delta}px !important; }
        .slot-input-group label { font-size: ${10 + delta}px !important; }
        input, select, textarea {
            font-size: ${12.5 + delta}px !important;
            min-height: ${32 + delta * 1.1}px;
        }
        .stat-number { font-size: ${24 + delta * 1.1}px !important; }
        .stat-label { font-size: ${10 + delta}px !important; }
        .timer-phase { font-size: ${20 + delta}px !important; }
        .prompt-box { font-size: ${11.5 + delta}px !important; line-height: 1.6; }
        .ai-report-view { font-size: ${13 + delta}px !important; line-height: 1.8; }
        #tacticalHudTooltip { font-size: ${12 + delta}px !important; max-width: ${330 + delta * 15}px; }
    `;

    try { localStorage.setItem('user_font_delta_pref', String(delta)); } catch (e) {}
}

function adjustFontSize(step) {
    const newDelta = Math.min(12, Math.max(0, currentFontDelta + step * 1.5));
    applyFontDelta(newDelta);
}

function resetFontSize() {
    applyFontDelta(4);
}

// 智能悬浮 HUD 说明提示引擎
let lastActiveTipTarget = null;
let hudTipAutoCloseTimer = null;

function initTacticalHudTooltips() {
    const tooltip = document.getElementById('tacticalHudTooltip');

    document.addEventListener('mouseover', (e) => {
        if ('ontouchstart' in window) return;
        const target = e.target.closest('[data-hud-tip]');
        if (!target) { hideHudTooltip(); return; }
        showHudTipFor(target, e.clientX, e.clientY);
    });

    document.addEventListener('mouseout', (e) => {
        if ('ontouchstart' in window) return;
        if (e.target.closest('[data-hud-tip]') && !e.relatedTarget?.closest('[data-hud-tip]')) {
            hideHudTooltip();
        }
    });

    document.addEventListener('click', (e) => {
        const target = e.target.closest('[data-hud-tip]');
        const isInsideTip = e.target.closest('#tacticalHudTooltip');

        if (!target) {
            if (!isInsideTip) hideHudTooltip();
            return;
        }

        if (lastActiveTipTarget === target && tooltip.classList.contains('visible')) {
            hideHudTooltip();
            e.stopPropagation();
            return;
        }

        lastActiveTipTarget = target;
        showHudTipFor(target, e.clientX, e.clientY);
    });
}

function showHudTipFor(target, clientX, clientY) {
    const tooltip = document.getElementById('tacticalHudTooltip');
    const rawTip = target.getAttribute('data-hud-tip');
    if (!rawTip) return;

    let title = '【战法参谋】';
    let body = rawTip;
    const match = rawTip.match(/^(【.*?】)(.*)/s);
    if (match) {
        title = match[1];
        body = match[2].trim();
    }

    document.getElementById('hudTipTitle').textContent = title;
    document.getElementById('hudTipContent').innerHTML = body;
    tooltip.classList.add('visible');

    let x = clientX + 16, y = clientY + 16;
    const rect = tooltip.getBoundingClientRect();
    if (x + rect.width > window.innerWidth - 12) x = clientX - rect.width - 12;
    if (y + rect.height > window.innerHeight - 12) y = clientY - rect.height - 12;

    tooltip.style.left = `${Math.max(10, x)}px`;
    tooltip.style.top = `${Math.max(10, y)}px`;

    if (hudTipAutoCloseTimer) clearTimeout(hudTipAutoCloseTimer);
    hudTipAutoCloseTimer = setTimeout(() => hideHudTooltip(), 6500);
}

function hideHudTooltip() {
    const tooltip = document.getElementById('tacticalHudTooltip');
    if (tooltip) tooltip.classList.remove('visible');
    lastActiveTipTarget = null;
    if (hudTipAutoCloseTimer) clearTimeout(hudTipAutoCloseTimer);
}

// 轻量 Toast 提示
let appToastTimer = null;
function showToast(msg, ms) {
    const el = document.getElementById('appToast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    requestAnimationFrame(() => el.classList.add('show'));
    clearTimeout(appToastTimer);
    appToastTimer = setTimeout(() => {
        el.classList.remove('show');
        setTimeout(() => el.classList.add('hidden'), 260);
    }, ms || 2800);
}

// 跨端剪贴板兼容工具
function copyTextSafe(txt) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(txt).then(() => true, () => fallbackCopyText(txt));
    }
    return Promise.resolve(fallbackCopyText(txt));
}

function fallbackCopyText(txt) {
    try {
        const ta = document.createElement('textarea');
        ta.value = txt;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        const ok = document.execCommand('copy');
        document.body.removeChild(ta);
        return ok;
    } catch (e) { return false; }
}