// ================================================================
//  pnf-timer.js: 压腿舒筋战钟（全程读秒、换边休整与拉伸时长自调节并记忆）
// ================================================================

let stretchMode = 'countdown'; // 'countdown' | 'stopwatch' | 'pnf'
let stretchState = 'idle'; // 'idle' | 'running' | 'paused'
let stretchSeconds = 60;
let stretchTarget = 60;
let stretchSwitchRestSec = 30; // 换边/中间间隔时长
let stretchInterval = null;

// PNF 专用流状态
let pnfSteps = [];
let pnfStepIndex = 0;

// 本地稳定语音播报函数（杜绝外部未定义引发的代码崩溃）
function speakFast(text) {
    if (!('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-CN';
        u.rate = 1.35;
        u.pitch = 1.05;
        window.speechSynthesis.speak(u);
    } catch (e) {
        console.warn('TTS error in pnf-timer:', e);
    }
}
window.speakFast = speakFast;

function initStretchPreferences() {
    if (window.data && data.settings) {
        if (data.settings.stretchDefaultDuration) {
            stretchTarget = Math.max(10, parseInt(data.settings.stretchDefaultDuration) || 60);
            stretchSeconds = stretchTarget;
        }
        if (data.settings.stretchSwitchRestSec) {
            stretchSwitchRestSec = Math.max(5, parseInt(data.settings.stretchSwitchRestSec) || 30);
        }
    }
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

    if (mode === 'countdown') {
        stretchSeconds = stretchTarget;
        if (clock) clock.textContent = formatStretchTime(stretchSeconds);
        if (phase) phase.textContent = '目标倒计时 · 深度拉伸 (' + stretchTarget + 's)';
        if (counter) counter.textContent = '单侧目标压腿 (全程每秒读秒)';
        renderStretchCountdownSettings();
    } else if (mode === 'stopwatch') {
        stretchSeconds = 0;
        if (clock) clock.textContent = "00:00";
        if (phase) phase.textContent = "正向秒表 · 自由舒缓压腿 (全程读秒)";
        if (counter) counter.textContent = '正向计时无上限';
        renderStretchStopwatchSettings();
    } else {
        if (phase) phase.textContent = "闭眼就位 · 听令而动";
        if (counter) counter.textContent = '双腿PNF周天 (含换边休整)';
        renderPnfSettings();
    }
};

function formatStretchTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return m + ':' + s;
}

window.toggleStretchTimer = function () {
    if (stretchState === 'idle') {
        startStretchTimer();
    } else if (stretchState === 'running') {
        pauseStretchTimer();
    } else {
        resumeStretchTimer();
    }
};

function startStretchTimer() {
    stretchState = 'running';
    updateStretchButtonUI(true);

    if (stretchMode === 'pnf') {
        startPnfFlow();
        return;
    }

    speakFast(stretchMode === 'countdown' ? ('开始压腿，目标' + stretchTarget + '秒，匀速吐气，拉长筋膜！') : "开始自由压腿，秒表启动！");

    clearInterval(stretchInterval);
    stretchInterval = setInterval(function () {
        const clock = document.getElementById('stretchTimerClock');
        const fill = document.getElementById('stretchProgressFill');

        if (stretchMode === 'countdown') {
            stretchSeconds--;
            if (clock) clock.textContent = formatStretchTime(Math.max(0, stretchSeconds));
            if (fill) fill.style.width = (((stretchTarget - stretchSeconds) / stretchTarget) * 100) + '%';

            // 全程逐秒读秒
            if (stretchSeconds > 0) {
                if (stretchSeconds === 30) {
                    speakFast("30秒，已过半，保持呼吸勿憋气");
                } else if (stretchSeconds === 10) {
                    speakFast("10秒，最后10秒，微沉加深！");
                } else {
                    speakFast(String(stretchSeconds));
                }
            }

            if (stretchSeconds <= 0) {
                stopStretchTimer(true);
            }
        } else {
            stretchSeconds++;
            if (clock) clock.textContent = formatStretchTime(stretchSeconds);
            // 秒表模式：每秒播报读数
            speakFast(String(stretchSeconds));

            if (stretchSeconds === 60) {
                speakFast("已满60秒基准，做功有效！");
            }
        }
    }, 1000);
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
    startStretchTimer();
}

window.stopStretchTimer = function (isAutoDone) {
    clearInterval(stretchInterval);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const duty = (typeof getDutyShiftInfo === 'function') ? getDutyShiftInfo() : { dutyDateStr: new Date().toISOString().slice(0, 10), shift: { name: '日常' } };
    const durSec = stretchMode === 'countdown' ? stretchTarget : stretchSeconds;

    if (durSec >= 20 && (isAutoDone || durSec >= 45)) {
        const autoLog = {
            id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: duty.dutyDateStr,
            type: '压腿',
            sets: 1,
            reps: durSec + 's',
            total: durSec,
            isAerobic: false,
            isIsometric: true,
            heart: '未知',
            duration: Math.max(1, Math.round(durSec / 60)),
            rpe: 7,
            dutyTag: duty.shift.name + ' (归属' + duty.dutyDateStr.slice(5) + ')',
            startTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp(new Date(Date.now() - durSec * 1000)) : new Date().toISOString(),
            endTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString(),
            downSec: 0,
            upSec: 0,
            tutSeconds: durSec,
            note: '压腿深度舒筋：完成 ' + durSec + ' 秒拉伸。',
            createdAt: new Date().toISOString()
        };

        if (window.data && data.logs) {
            data.logs.push(autoLog);
            if (Array.isArray(data.workoutQueue)) {
                data.workoutQueue = data.workoutQueue.filter(function (x) {
                    return !(x.actionId === 'act_pnf_stretch' || x.name.includes('压腿') || x.name.includes('拉伸'));
                });
            }
            saveData();
            if (typeof renderAll === 'function') renderAll();
        }

        speakFast('压腿收功，有效做功' + durSec + '秒，战功已自动封存！');
        if (typeof showToast === 'function') showToast('🎉 压腿（' + durSec + '秒）已成功入册！');
    }

    stretchState = 'idle';
    updateStretchButtonUI(false);
    switchStretchMode(stretchMode);
};

function updateStretchButtonUI(isRunning) {
    const btn = document.getElementById('stretchStartBtn');
    const pauseBtn = document.getElementById('stretchPauseBtn');
    if (btn) {
        btn.innerText = isRunning ? "⏸ 暂停" : "▶ 开始压腿";
        btn.className = isRunning ? "btn btn-danger" : "btn btn-primary";
    }
    if (pauseBtn) pauseBtn.disabled = !isRunning;
}

// 设定单次倒计时秒数并记忆为下一次默认值
window.setStretchCountdownSec = function (sec) {
    const val = Math.max(10, parseInt(sec) || 60);
    stretchTarget = val;
    stretchSeconds = val;

    if (window.data && data.settings) {
        data.settings.stretchDefaultDuration = val;
        saveData();
    }

    const clock = document.getElementById('stretchTimerClock');
    if (clock) clock.textContent = formatStretchTime(val);
    renderStretchCountdownSettings();
};

// 设定换边休整/中间间隔时长并记忆为下一次默认值
window.setStretchSwitchRestSec = function (sec) {
    const val = Math.max(5, parseInt(sec) || 30);
    stretchSwitchRestSec = val;

    if (window.data && data.settings) {
        data.settings.stretchSwitchRestSec = val;
        saveData();
    }

    if (stretchMode === 'pnf') renderPnfSettings();
    else renderStretchCountdownSettings();
};

function renderStretchCountdownSettings() {
    const container = document.getElementById('stretchSettingsArea');
    if (!container) return;
    const presets = [45, 60, 75, 90, 120, 180];
    const restPresets = [15, 20, 30, 45, 60];

    const presetsChips = presets.map(function (s) {
        const cls = (stretchTarget === s) ? 'preset-chip active' : 'preset-chip';
        return '<button type="button" class="' + cls + '" onclick="setStretchCountdownSec(' + s + ')">' + s + '秒</button>';
    }).join('');

    const restChips = restPresets.map(function (r) {
        const cls = (stretchSwitchRestSec === r) ? 'preset-chip active' : 'preset-chip';
        return '<button type="button" class="' + cls + '" onclick="setStretchSwitchRestSec(' + r + ')">' + r + '秒</button>';
    }).join('');

    container.innerHTML =
        '<div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:12px; display:flex; flex-direction:column; gap:10px;">' +
            '<div style="display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">' +
                '<span style="font-size:13px; color:var(--text-muted);">设定拉伸时长 (自动记忆):</span>' +
                presetsChips +
                '<input type="number" value="' + stretchTarget + '" min="10" max="600" step="15" onchange="setStretchCountdownSec(this.value)" style="width:75px; text-align:center; color:var(--purple-accent); font-weight:bold;">' +
                '<span style="font-size:12px; color:var(--text-dim);">秒</span>' +
            '</div>' +
            '<div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:8px; display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;">' +
                '<span style="font-size:13px; color:var(--cyan-accent);">换边/中间间隔时长 (自动记忆):</span>' +
                restChips +
                '<input type="number" value="' + stretchSwitchRestSec + '" min="5" max="180" step="5" onchange="setStretchSwitchRestSec(this.value)" style="width:65px; text-align:center; color:var(--cyan-accent); font-weight:bold;">' +
                '<span style="font-size:12px; color:var(--text-dim);">秒</span>' +
            '</div>' +
        '</div>';
}

function renderStretchStopwatchSettings() {
    const container = document.getElementById('stretchSettingsArea');
    if (!container) return;
    container.innerHTML =
        '<div style="text-align:center; font-size:13px; color:var(--text-muted); padding:8px 0;">' +
            '秒表正向模式：全程每秒语音读秒，达到心满意足状态点击【⏹ 提前收功】即可自动封存！' +
        '</div>';
}

function renderPnfSettings() {
    const container = document.getElementById('stretchSettingsArea');
    if (!container) return;
    const restPresets = [15, 20, 30, 45, 60];

    const restChips = restPresets.map(function (r) {
        const cls = (stretchSwitchRestSec === r) ? 'preset-chip active' : 'preset-chip';
        return '<button type="button" class="' + cls + '" onclick="setStretchSwitchRestSec(' + r + ')">' + r + '秒</button>';
    }).join('');

    container.innerHTML =
        '<div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.1); border-radius:6px; padding:12px;">' +
            '<div style="display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap; margin-bottom:8px;">' +
                '<span style="font-size:13px; color:var(--cyan-accent);">单侧做完·换边休整时长 (自动记忆):</span>' +
                restChips +
                '<input type="number" value="' + stretchSwitchRestSec + '" min="5" max="180" step="5" onchange="setStretchSwitchRestSec(this.value)" style="width:65px; text-align:center; color:var(--cyan-accent); font-weight:bold;">' +
                '<span style="font-size:12px; color:var(--text-dim);">秒</span>' +
            '</div>' +
            '<div style="font-size:12px; color:var(--text-muted); line-height:1.5; text-align:center;">' +
                '💡 <strong>闭眼听令口诀</strong>：初阶牵拉 ➔ 听到"发力"脚跟下踩对抗(不憋气) ➔ 听到"下沉"彻底卸力加深 ➔ 换边休整。' +
            '</div>' +
        '</div>';
}

function startPnfFlow() {
    pnfSteps = [
        { title: '左腿 · 初阶到位牵拉', cue: '左腿在前，初阶轻柔牵拉，深长吐气', duration: 15 },
        { title: '左腿 · 第一次等长发力', cue: '前脚跟下踩对抗，严禁憋气，吐气！', duration: 7, count: true },
        { title: '左腿 · 第一次深度下沉', cue: '彻底卸力，深层下沉加深！', duration: 25 },
        { title: '缓慢收腿 · 换边休整 (' + stretchSwitchRestSec + '秒)', cue: '单侧完毕，缓慢收腿，' + stretchSwitchRestSec + '秒抖腿换右腿在前', duration: stretchSwitchRestSec },
        { title: '右腿 · 初阶到位牵拉', cue: '右腿在前，初阶轻柔牵拉到位', duration: 15 },
        { title: '右腿 · 等长发力对抗', cue: '脚跟下踩发力对抗，持续哈气！', duration: 7, count: true },
        { title: '右腿 · 极致下沉加深', cue: '全身放松，顺势沉到极限！', duration: 25 }
    ];
    pnfStepIndex = 0;
    runPnfStep();
}

function runPnfStep() {
    if (pnfStepIndex >= pnfSteps.length) {
        stopStretchTimer(true);
        return;
    }
    const step = pnfSteps[pnfStepIndex];
    let rem = step.duration;
    speakFast(step.cue);

    const phase = document.getElementById('stretchPhaseDisplay');
    const clock = document.getElementById('stretchTimerClock');
    const counter = document.getElementById('stretchCycleCounter');

    if (phase) phase.textContent = step.title;
    if (counter) counter.textContent = '第 ' + (pnfStepIndex + 1) + ' / ' + pnfSteps.length + ' 节';

    clearInterval(stretchInterval);
    stretchInterval = setInterval(function () {
        rem--;
        if (clock) clock.textContent = formatStretchTime(rem);

        // PNF 步骤内全程逐秒读秒
        if (rem > 0) {
            speakFast(String(rem));
        }

        if (rem <= 0) {
            clearInterval(stretchInterval);
            pnfStepIndex++;
            runPnfStep();
        }
    }, 1000);
}

document.addEventListener('DOMContentLoaded', function () {
    initStretchPreferences();
    switchStretchMode('countdown');
});