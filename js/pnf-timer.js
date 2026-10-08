// ================================================================
//  pnf-timer.js: 压腿舒筋战钟
//  特性：
//  1. 倒计时单侧时长、做功组数、换边间歇、组间休整、就位提前量均可修改并自动记忆！
//  2. 每一秒都清晰读秒报号，彻底消除静音死角！
// ================================================================

let stretchMode = 'countdown'; // 'countdown' | 'stopwatch' | 'pnf'
let stretchState = 'idle';
let stretchSeconds = 60;
let stretchTarget = 60;
let stretchSets = 2;
let stretchSwapRestSec = 10;
let stretchSetRestSec = 20;
let stretchPrepDuration = 10;
let stretchInterval = null;

let stretchCycleSet = 1;
let stretchPhase = 'prep';
let stretchPhaseRemaining = 0;
let stretchPhaseTotal = 0;
let stretchSetsCompleted = 0;
let stretchSessionStart = 0;

let pnfSteps = [];
let pnfStepIndex = 0;

function speakFast(text) {
    if (!('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-CN';
        u.rate = 1.38;
        u.pitch = 1.05;
        window.speechSynthesis.speak(u);
    } catch (e) {
        console.warn('TTS error in pnf-timer:', e);
    }
}
window.speakFast = speakFast;

function initStretchPreferences() {
    if (window.data && data.settings) {
        const s = data.settings;
        if (s.stretchDefaultDuration) {
            stretchTarget = Math.max(10, parseInt(s.stretchDefaultDuration) || 60);
            stretchSeconds = stretchTarget;
        }
        if (s.stretchDefaultSets) {
            stretchSets = Math.max(1, Math.min(10, parseInt(s.stretchDefaultSets) || 2));
        }
        if (s.stretchSwapRestSec !== undefined) {
            stretchSwapRestSec = Math.max(5, parseInt(s.stretchSwapRestSec) || 10);
        }
        if (s.stretchSetRestSec !== undefined) {
            stretchSetRestSec = Math.max(5, parseInt(s.stretchSetRestSec) || 20);
        }
        if (s.stretchPrepDuration !== undefined) {
            stretchPrepDuration = Math.max(3, parseInt(s.stretchPrepDuration) || 10);
        }
    }
}

function formatStretchTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return m + ':' + s;
}

function estimateStretchTotalSec(sets) {
    const n = Math.max(1, sets || 1);
    return stretchPrepDuration + n * stretchTarget * 2 + n * stretchSwapRestSec + (n - 1) * stretchSetRestSec;
}

window.switchStretchMode = function (mode) {
    if (stretchState !== 'idle') stopStretchTimer(false);
    stretchMode = mode;

    const btnCd = document.getElementById('btnStretchModeCountdown');
    const btnSw = document.getElementById('btnStretchModeStopwatch');
    const btnPnf = document.getElementById('btnStretchModePnf');

    if (btnCd) btnCd.classList.toggle('active', mode === 'countdown');
    if (btnSw) btnSw.classList.toggle('active', mode === 'stopwatch');
    if (btnPnf) btnPnf.classList.toggle('active', mode === 'pnf');

    const clock = document.getElementById('stretchTimerClock');
    const phase = document.getElementById('stretchPhaseDisplay');
    const counter = document.getElementById('stretchCycleCounter');
    const fill = document.getElementById('stretchProgressFill');
    if (fill) fill.style.width = '0%';

    if (mode === 'countdown') {
        stretchPhase = 'prep';
        stretchCycleSet = 1;
        stretchSeconds = stretchTarget;
        if (clock) clock.textContent = formatStretchTime(stretchTarget);
        if (phase) phase.textContent = '目标倒计时 · 单侧 ' + stretchTarget + 's · 共 ' + stretchSets + ' 组 (留' + stretchPrepDuration + 's准备)';
        if (counter) counter.textContent = '第 1 / ' + stretchSets + ' 组 · 左腿前置';
        renderStretchCountdownSettings();
    } else if (mode === 'stopwatch') {
        stretchSeconds = 0;
        if (clock) clock.textContent = "00:00";
        if (phase) phase.textContent = "正向秒表 · 留" + stretchPrepDuration + "s就位 (每秒读秒)";
        if (counter) counter.textContent = '秒表计时无上限';
        renderStretchStopwatchSettings();
    } else {
        if (clock) clock.textContent = formatStretchTime(stretchTarget);
        if (phase) phase.textContent = "双腿PNF周天 (留" + stretchPrepDuration + "s准备)";
        if (counter) counter.textContent = '双腿PNF · 共 ' + stretchSets + ' 组';
        renderPnfSettings();
    }
};

window.resetStretchDisplayUI = function () {
    if (stretchState !== 'idle') return;
    initStretchPreferences();
    switchStretchMode(stretchMode);
};

window.toggleStretchTimer = function () {
    if (stretchState === 'idle') {
        startStretchTimer();
    } else if (stretchState === 'running') {
        pauseStretchTimer();
    } else {
        resumeStretchTimer();
    }
};

function tickStopwatch() {
    stretchSeconds++;
    const clock = document.getElementById('stretchTimerClock');
    if (clock) clock.textContent = formatStretchTime(stretchSeconds);
    speakFast(String(stretchSeconds));
}

function startStretchTimer() {
    stretchState = 'running';
    updateStretchButtonUI(true);

    if (stretchMode === 'pnf') {
        startPnfFlow();
        return;
    }

    if (stretchMode === 'stopwatch') {
        stretchPhase = 'prep';
        stretchPhaseTotal = stretchPhaseRemaining = stretchPrepDuration;
        updateStretchPhaseUI(true);
        clearInterval(stretchInterval);
        stretchInterval = setInterval(function () {
            if (stretchState !== 'running') return;
            stretchPhaseRemaining--;
            updateStretchPhaseUI(false);
            if (stretchPhaseRemaining > 0) {
                speakFast(String(stretchPhaseRemaining));
            } else {
                clearInterval(stretchInterval);
                speakFast("开始自由压腿，秒表启动！");
                stretchSeconds = 0;
                stretchPhase = 'work';
                const phaseEl = document.getElementById('stretchPhaseDisplay');
                if (phaseEl) phaseEl.textContent = "自由秒表压腿中 (每秒读秒)";
                stretchInterval = setInterval(tickStopwatch, 1000);
            }
        }, 1000);
        return;
    }

    stretchSessionStart = Date.now();
    stretchSetsCompleted = 0;
    stretchCycleSet = 1;
    enterStretchPhase('prep');
    clearInterval(stretchInterval);
    stretchInterval = setInterval(tickCountdownPhase, 1000);
}

function pauseStretchTimer() {
    stretchState = 'paused';
    clearInterval(stretchInterval);
    const btn = document.getElementById('stretchStartBtn');
    if (btn) btn.innerText = "▶ 恢复";
}

function resumeStretchTimer() {
    stretchState = 'running';
    const btn = document.getElementById('stretchStartBtn');
    if (btn) btn.innerText = "⏸ 暂停";
    clearInterval(stretchInterval);
    if (stretchMode === 'pnf') {
        resumePnfStep();
    } else if (stretchMode === 'stopwatch') {
        if (stretchPhase === 'prep') {
            startStretchTimer();
        } else {
            stretchInterval = setInterval(tickStopwatch, 1000);
        }
    } else {
        stretchInterval = setInterval(tickCountdownPhase, 1000);
    }
}

function enterStretchPhase(phase) {
    stretchPhase = phase;
    if (phase === 'prep') {
        stretchPhaseTotal = stretchPhaseRemaining = stretchPrepDuration;
    } else if (phase === 'left' || phase === 'right') {
        stretchPhaseTotal = stretchPhaseRemaining = stretchTarget;
    } else if (phase === 'swap') {
        stretchPhaseTotal = stretchPhaseRemaining = stretchSwapRestSec;
    } else {
        stretchPhaseTotal = stretchPhaseRemaining = stretchSetRestSec;
    }
    updateStretchPhaseUI(true);
}

function stretchSideName(phase) {
    return phase === 'left' ? '左腿' : (phase === 'right' ? '右腿' : '');
}

function updateStretchPhaseUI(announce) {
    const clock = document.getElementById('stretchTimerClock');
    const phaseEl = document.getElementById('stretchPhaseDisplay');
    const counter = document.getElementById('stretchCycleCounter');
    const fill = document.getElementById('stretchProgressFill');

    if (clock) clock.textContent = formatStretchTime(Math.max(0, stretchPhaseRemaining));
    if (fill) fill.style.width = (stretchPhaseTotal ? (((stretchPhaseTotal - stretchPhaseRemaining) / stretchPhaseTotal) * 100) : 0) + '%';

    const setTag = '第 ' + stretchCycleSet + ' / ' + stretchSets + ' 组';

    if (stretchPhase === 'prep') {
        if (phaseEl) phaseEl.textContent = '⏳ 战前就位准备 (双手扶稳)';
        if (counter) counter.textContent = '准备阶段 · 还有 ' + stretchPhaseRemaining + 's';
        if (announce) speakFast('双手扶稳，' + stretchPrepDuration + '秒准备！');
    } else if (stretchPhase === 'left' || stretchPhase === 'right') {
        if (phaseEl) phaseEl.textContent = setTag + ' · ' + stretchSideName(stretchPhase) + '压腿中 (每秒读秒)';
        if (counter) counter.textContent = setTag + ' · ' + stretchSideName(stretchPhase) + ' (单侧' + stretchTarget + 's)';
        if (announce) speakFast(stretchSideName(stretchPhase) + '压腿，' + stretchTarget + '秒，深长吐气！');
    } else if (stretchPhase === 'swap') {
        if (phaseEl) phaseEl.textContent = setTag + ' · 左右脚换边休整 (还剩' + stretchPhaseRemaining + 's)';
        if (counter) counter.textContent = setTag + ' · 缓慢收腿换边 (' + stretchSwapRestSec + '秒)';
        if (announce) speakFast('换另一条腿，' + stretchSwapRestSec + '秒间隔，抖腿放松。');
    } else {
        if (phaseEl) phaseEl.textContent = '组间休整 · 下一组即将开始 (还剩' + stretchPhaseRemaining + 's)';
        if (counter) counter.textContent = '已完成 ' + stretchSetsCompleted + ' / ' + stretchSets + ' 组 · 休整 (' + stretchSetRestSec + '秒)';
        if (announce) speakFast('这一组完成，组间休息' + stretchSetRestSec + '秒。');
    }
}

function tickCountdownPhase() {
    if (stretchState !== 'running') return;
    stretchPhaseRemaining--;
    updateStretchPhaseUI(false);

    if (stretchPhaseRemaining > 0) {
        speakFast(String(stretchPhaseRemaining));
    }

    if (stretchPhaseRemaining <= 0) {
        advanceStretchPhase();
    }
}

function advanceStretchPhase() {
    if (stretchPhase === 'prep') {
        enterStretchPhase('left');
    } else if (stretchPhase === 'left') {
        enterStretchPhase('swap');
    } else if (stretchPhase === 'swap') {
        enterStretchPhase('right');
    } else if (stretchPhase === 'right') {
        stretchSetsCompleted = stretchCycleSet;
        if (stretchCycleSet < stretchSets) {
            enterStretchPhase('setrest');
        } else {
            stopStretchTimer(true);
        }
    } else {
        stretchCycleSet++;
        enterStretchPhase('left');
    }
}

window.stopStretchTimer = function (isAutoDone) {
    clearInterval(stretchInterval);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const mode = stretchMode;
    let entry = null;
    let doneSets = 0;
    let announceFull = false;

    if (mode === 'stopwatch') {
        const durSec = stretchSeconds;
        if (durSec >= 20) {
            entry = buildStretchEntry(1, durSec, false);
            doneSets = 1;
            announceFull = true;
        }
    } else {
        doneSets = stretchSetsCompleted;
        const totalSec = stretchSessionStart ? Math.max(1, Math.round((Date.now() - stretchSessionStart) / 1000)) : 0;
        if (doneSets >= 1) {
            entry = buildStretchEntry(doneSets, totalSec, !!isAutoDone);
            announceFull = (doneSets >= stretchSets);
        }
    }

    if (entry) {
        if (window.data && Array.isArray(data.logs)) {
            data.logs.push(entry);
        }
        if (window.data && announceFull && Array.isArray(data.workoutQueue)) {
            data.workoutQueue = data.workoutQueue.filter(function (x) {
                return !(x.actionId === 'act_pnf_stretch' || x.name.includes('压腿') || x.name.includes('拉伸'));
            });
        }
        saveData();
        if (typeof renderAll === 'function') renderAll();

        speakFast('压腿收功，完成' + doneSets + '组，战功已自动封存！');
        if (typeof showToast === 'function') {
            showToast('🎉 压腿（' + doneSets + '组 / 单侧' + stretchTarget + '秒）已成功入册！');
        }
    }

    stretchState = 'idle';
    stretchSetsCompleted = 0;
    stretchSessionStart = 0;
    updateStretchButtonUI(false);
    switchStretchMode(mode);
};

function buildStretchEntry(doneSets, elapsedSec, isFull) {
    const duty = (typeof getDutyShiftInfo === 'function') ? getDutyShiftInfo() : { dutyDateStr: new Date().toISOString().slice(0, 10), shift: { name: '日常' } };
    const isStopwatch = stretchMode === 'stopwatch';
    const perSide = isStopwatch ? elapsedSec : (stretchMode === 'pnf' ? PNF_LEG_SEC : stretchTarget);
    const setsDone = isStopwatch ? 1 : doneSets;
    const tutSec = setsDone * perSide;

    return {
        id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: duty.dutyDateStr,
        type: '压腿',
        sets: setsDone,
        reps: perSide + 's',
        total: tutSec,
        isAerobic: false,
        isIsometric: true,
        heart: '未知',
        duration: Math.max(1, Math.round(elapsedSec / 60)),
        rpe: 7,
        dutyTag: duty.shift.name + ' (归属' + duty.dutyDateStr.slice(5) + ')',
        startTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp(new Date(Date.now() - elapsedSec * 1000)) : new Date().toISOString(),
        endTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString(),
        downSec: 0,
        upSec: 0,
        tutSeconds: tutSec,
        stretchPerSideSec: perSide,
        stretchSwapRestSec: stretchSwapRestSec,
        stretchSetRestSec: stretchSetRestSec,
        note: isStopwatch
            ? ('压腿自由秒表：单侧 ' + perSide + ' 秒（' + (isFull ? '正常收功' : '提前收功') + '）。')
            : ('压腿 ' + setsDone + ' 组' + (isFull ? '' : '（提前收功，计划 ' + stretchSets + ' 组）') +
               '：单侧 ' + perSide + ' 秒；左右脚间隔 ' + stretchSwapRestSec + ' 秒；组间间隔 ' + stretchSetRestSec + ' 秒。'),
        createdAt: new Date().toISOString()
    };
}

function updateStretchButtonUI(isRunning) {
    const btn = document.getElementById('stretchStartBtn');
    const pauseBtn = document.getElementById('stretchPauseBtn');
    if (btn) {
        btn.innerText = isRunning ? "⏸ 暂停" : "▶ 开始压腿 (留" + stretchPrepDuration + "s准备)";
        btn.className = isRunning ? "btn btn-danger" : "btn btn-primary";
    }
    if (pauseBtn) pauseBtn.disabled = !isRunning;
}

// 自动记忆单侧秒数为新默认值
window.setStretchCountdownSec = function (sec) {
    const val = Math.max(10, parseInt(sec) || 60);
    stretchTarget = val;
    stretchSeconds = val;
    if (window.data && data.settings) {
        data.settings.stretchDefaultDuration = val;
        saveData();
    }
    renderStretchCountdownSettings();
    if (stretchState === 'idle') switchStretchMode(stretchMode);
};

// 自动记忆组数为新默认值
window.setStretchSets = function (n) {
    const val = Math.max(1, Math.min(10, parseInt(n) || 2));
    stretchSets = val;
    if (window.data && data.settings) {
        data.settings.stretchDefaultSets = val;
        saveData();
    }
    renderStretchCountdownSettings();
    if (stretchState === 'idle') switchStretchMode(stretchMode);
};

// 自动记忆换边间隔为新默认值
window.setStretchSwapRestSec = function (sec) {
    const val = Math.max(5, parseInt(sec) || 10);
    stretchSwapRestSec = val;
    if (window.data && data.settings) {
        data.settings.stretchSwapRestSec = val;
        saveData();
    }
    renderStretchCountdownSettings();
};

// 自动记忆组间间隔为新默认值
window.setStretchSetRestSec = function (sec) {
    const val = Math.max(5, parseInt(sec) || 20);
    stretchSetRestSec = val;
    if (window.data && data.settings) {
        data.settings.stretchSetRestSec = val;
        saveData();
    }
    renderStretchCountdownSettings();
};

// 自动记忆准备提前量为新默认值
window.setStretchPrepDuration = function (sec) {
    const val = Math.max(3, parseInt(sec) || 10);
    stretchPrepDuration = val;
    if (window.data && data.settings) {
        data.settings.stretchPrepDuration = val;
        saveData();
    }
    renderStretchCountdownSettings();
    if (stretchState === 'idle') switchStretchMode(stretchMode);
};

function chipRow(label, chips, activeVal, onclickName, accent, min, max, step) {
    const chipsHtml = chips.map(function (v) {
        const cls = (activeVal === v) ? 'preset-chip active' : 'preset-chip';
        return '<button type="button" class="' + cls + '" onclick="' + onclickName + '(' + v + ')">' + v + '秒</button>';
    }).join('');
    return '<div style="display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">' +
        '<span style="font-size:12.5px; color:var(--' + accent + ');">' + label + '</span>' +
        chipsHtml +
        '<input type="number" value="' + activeVal + '" min="' + min + '" max="' + max + '" step="' + step + '" onchange="' + onclickName + '(this.value)" style="width:65px; text-align:center; color:var(--' + accent + '); font-weight:bold;">' +
        '<span style="font-size:11px; color:var(--text-dim);">秒</span>' +
    '</div>';
}

function renderStretchCountdownSettings() {
    const container = document.getElementById('stretchSettingsArea');
    if (!container) return;
    const durPresets = [45, 60, 75, 90, 120, 180];
    const setPresets = [1, 2, 3, 4, 5, 6];
    const swapPresets = [5, 10, 15, 20, 30];
    const setRestPresets = [10, 20, 30, 45, 60];
    const prepPresets = [5, 10, 15, 20];

    const durChips = durPresets.map(function (s) {
        const cls = (stretchTarget === s) ? 'preset-chip active' : 'preset-chip';
        return '<button type="button" class="' + cls + '" onclick="setStretchCountdownSec(' + s + ')">' + s + '秒</button>';
    }).join('');
    const setChips = setPresets.map(function (s) {
        const cls = (stretchSets === s) ? 'preset-chip active' : 'preset-chip';
        return '<button type="button" class="' + cls + '" onclick="setStretchSets(' + s + ')">' + s + '组</button>';
    }).join('');

    container.innerHTML =
        '<div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:8px;">' +
            '<div style="display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">' +
                '<span style="font-size:12.5px; color:var(--text-muted);">单侧拉伸(自动记忆):</span>' +
                durChips +
                '<input type="number" value="' + stretchTarget + '" min="10" max="600" step="15" onchange="setStretchCountdownSec(this.value)" style="width:70px; text-align:center; color:var(--purple-accent); font-weight:bold;">' +
                '<span style="font-size:11px; color:var(--text-dim);">秒</span>' +
            '</div>' +
            '<div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px; display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">' +
                '<span style="font-size:12.5px; color:var(--purple-accent);">计划组数(自动记忆):</span>' +
                setChips +
                '<input type="number" value="' + stretchSets + '" min="1" max="10" step="1" onchange="setStretchSets(this.value)" style="width:60px; text-align:center; color:var(--purple-accent); font-weight:bold;">' +
                '<span style="font-size:11px; color:var(--text-dim);">组</span>' +
            '</div>' +
            '<div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px;">' +
                chipRow('左右脚间隔(自动记忆):', swapPresets, stretchSwapRestSec, 'setStretchSwapRestSec', 'cyan-accent', 5, 120, 5) +
            '</div>' +
            '<div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px;">' +
                chipRow('组间休整(自动记忆):', setRestPresets, stretchSetRestSec, 'setStretchSetRestSec', 'green-accent', 5, 180, 5) +
            '</div>' +
            '<div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px;">' +
                chipRow('就位提前量(自动记忆):', prepPresets, stretchPrepDuration, 'setStretchPrepDuration', 'amber-accent', 3, 60, 1) +
            '</div>' +
            '<div style="font-size:11.5px; color:var(--text-muted); text-align:center; margin-top:2px;">' +
                '⏱ 预计全程 ' + formatStretchTime(estimateStretchTotalSec(stretchSets)) + '（留' + stretchPrepDuration + 's准备 + 单侧 ' + stretchTarget + 's × ' + stretchSets + '组 + 间隔）' +
            '</div>' +
        '</div>';
}

function renderStretchStopwatchSettings() {
    const container = document.getElementById('stretchSettingsArea');
    if (!container) return;
    const prepPresets = [5, 10, 15, 20];
    container.innerHTML =
        '<div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:12px;">' +
            '<div style="text-align:center; font-size:13px; color:var(--text-muted); margin-bottom:8px;">' +
                '秒表正向模式：包含' + stretchPrepDuration + 's就位提前量，启动后全程每秒读秒，达到满意状态点击【⏹ 提前收功】自动封存！' +
            '</div>' +
            chipRow('就位提前量(自动记忆):', prepPresets, stretchPrepDuration, 'setStretchPrepDuration', 'amber-accent', 3, 60, 1) +
        '</div>';
}

function renderPnfSettings() {
    const container = document.getElementById('stretchSettingsArea');
    if (!container) return;
    const setPresets = [1, 2, 3, 4, 5, 6];
    const swapPresets = [5, 10, 15, 20, 30];
    const setRestPresets = [10, 20, 30, 45, 60];
    const prepPresets = [5, 10, 15, 20];

    const setChips = setPresets.map(function (s) {
        const cls = (stretchSets === s) ? 'preset-chip active' : 'preset-chip';
        return '<button type="button" class="' + cls + '" onclick="setStretchSets(' + s + ')">' + s + '组</button>';
    }).join('');

    container.innerHTML =
        '<div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:8px;">' +
            '<div style="display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">' +
                '<span style="font-size:12.5px; color:var(--purple-accent);">计划组数(自动记忆):</span>' +
                setChips +
                '<input type="number" value="' + stretchSets + '" min="1" max="10" step="1" onchange="setStretchSets(this.value)" style="width:60px; text-align:center; color:var(--purple-accent); font-weight:bold;">' +
                '<span style="font-size:11px; color:var(--text-dim);">组</span>' +
            '</div>' +
            '<div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px;">' +
                chipRow('左右脚间隔(自动记忆):', swapPresets, stretchSwapRestSec, 'setStretchSwapRestSec', 'cyan-accent', 5, 120, 5) +
            '</div>' +
            '<div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px;">' +
                chipRow('组间休整(自动记忆):', setRestPresets, stretchSetRestSec, 'setStretchSetRestSec', 'green-accent', 5, 180, 5) +
            '</div>' +
            '<div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px;">' +
                chipRow('就位提前量(自动记忆):', prepPresets, stretchPrepDuration, 'setStretchPrepDuration', 'amber-accent', 3, 60, 1) +
            '</div>' +
            '<div style="font-size:11.5px; color:var(--text-muted); line-height:1.5; text-align:center; margin-top:2px;">' +
                '💡 <strong>闭眼听令口诀</strong>：初阶牵拉 ➔ 听到"发力"脚跟下踩对抗(吐气不憋气) ➔ 听到"下沉"彻底卸力加深 ➔ 全程每秒读秒。' +
            '</div>' +
        '</div>';
}

const PNF_LEG_STAGES = [
    { suffix: '初阶到位牵拉', cue: '初阶轻柔牵拉，深长吐气', duration: 15 },
    { suffix: '等长发力对抗', cue: '脚跟下踩发力对抗，严禁憋气，吐气！', duration: 7 },
    { suffix: '极致下沉加深', cue: '彻底卸力，深层下沉加深！', duration: 25 }
];
const PNF_LEG_SEC = PNF_LEG_STAGES.reduce(function (a, s) { return a + s.duration; }, 0);

function buildPnfSteps() {
    const leftStages = PNF_LEG_STAGES.map(function (st) {
        return { key: 'left', suffix: '左腿 · ' + st.suffix, cue: '左腿在前，' + st.cue, duration: st.duration };
    });
    const rightStages = PNF_LEG_STAGES.map(function (st) {
        return { key: 'right', suffix: '右腿 · ' + st.suffix, cue: '右腿在前，' + st.cue, duration: st.duration };
    });

    const steps = [];
    steps.push({
        title: '战前就位准备 (' + stretchPrepDuration + '秒缓冲)',
        cue: 'PNF极意战前就位，双手扶稳，' + stretchPrepDuration + '秒就绪！',
        duration: stretchPrepDuration,
        set: 1,
        side: 'prep'
    });

    for (let s = 1; s <= stretchSets; s++) {
        leftStages.forEach(function (st) {
            steps.push({ title: '第 ' + s + '/' + stretchSets + ' 组 · ' + st.suffix, cue: st.cue, duration: st.duration, set: s, side: st.key });
        });
        steps.push({
            title: '第 ' + s + '/' + stretchSets + ' 组 · 左右脚间隔休整 (' + stretchSwapRestSec + '秒)',
            cue: '单侧完毕，' + stretchSwapRestSec + '秒抖腿换另一条腿。',
            duration: stretchSwapRestSec, set: s, side: 'swap'
        });
        rightStages.forEach(function (st) {
            steps.push({ title: '第 ' + s + '/' + stretchSets + ' 组 · ' + st.suffix, cue: st.cue, duration: st.duration, set: s, side: st.key });
        });
        if (s < stretchSets) {
            steps.push({
                title: '第 ' + s + '/' + stretchSets + ' 组完成 · 组间休整 (' + stretchSetRestSec + '秒)',
                cue: '这一组完成，组间休息' + stretchSetRestSec + '秒。',
                duration: stretchSetRestSec, set: s, side: 'setrest'
            });
        }
    }
    return steps;
}

function startPnfFlow() {
    pnfSteps = buildPnfSteps();
    pnfStepIndex = 0;
    stretchSessionStart = Date.now();
    stretchSetsCompleted = 0;
    runPnfStep();
}

function resumePnfStep() {
    if (pnfStepIndex >= pnfSteps.length) return;
    const step = pnfSteps[pnfStepIndex];
    if (!step) return;
    clearInterval(stretchInterval);
    stretchInterval = setInterval(function () {
        if (stretchState !== 'running') return;
        step.remaining--;
        const clock = document.getElementById('stretchTimerClock');
        if (clock) clock.textContent = formatStretchTime(Math.max(0, step.remaining));
        if (step.remaining > 0) speakFast(String(step.remaining));
        if (step.remaining <= 0) {
            clearInterval(stretchInterval);
            pnfStepIndex++;
            runPnfStep();
        }
    }, 1000);
}

function runPnfStep() {
    if (pnfStepIndex >= pnfSteps.length) {
        stopStretchTimer(true);
        return;
    }
    const step = pnfSteps[pnfStepIndex];
    step.remaining = step.duration;

    const phase = document.getElementById('stretchPhaseDisplay');
    const clock = document.getElementById('stretchTimerClock');
    const counter = document.getElementById('stretchCycleCounter');
    const fill = document.getElementById('stretchProgressFill');

    if (phase) phase.textContent = step.title;
    if (counter) counter.textContent = '第 ' + (pnfStepIndex + 1) + ' / ' + pnfSteps.length + ' 节';
    if (clock) clock.textContent = formatStretchTime(step.duration);
    if (fill) fill.style.width = '0%';
    speakFast(step.cue);

    clearInterval(stretchInterval);
    stretchInterval = setInterval(function () {
        if (stretchState !== 'running') return;
        step.remaining--;
        if (clock) clock.textContent = formatStretchTime(Math.max(0, step.remaining));
        if (fill) fill.style.width = (((step.duration - step.remaining) / step.duration) * 100) + '%';
        if (step.remaining > 0) speakFast(String(step.remaining));

        if (step.remaining <= 0) {
            clearInterval(stretchInterval);
            if (step.side === 'right') stretchSetsCompleted = step.set;
            pnfStepIndex++;
            runPnfStep();
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', function () {
    initStretchPreferences();
    switchStretchMode('countdown');
});