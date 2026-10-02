/**
 * 压腿舒筋 · 极意拉伸战钟 (PRO)
 * 核心修复与升级：
 * 1. 彻底解决点击无反应的问题（精准匹配 Tab 与 DOM id）；
 * 2. 全程逐秒语音读秒：做功时每一秒朗读数字，不用看手机闭眼即可盲听掌控；
 * 3. 换边间隔时长（组间休整）支持自由调整，且修改后自动持久化保存为下一次的默认值！
 * 4. 自动左腿 -> 换边休整 -> 右腿循环，时间到自动封存入册。
 */

let stretchSubMode = 'flow'; // 'flow' (双腿周天) | 'countdown' (单侧倒计时) | 'stopwatch' (秒表)
let stretchRunning = false;
let stretchPaused = false;
let stretchTimerInterval = null;

// 从 settings 读取持久化默认值
let stretchTargetDuration = 60; // 单侧拉伸时长 (默认60s)
let stretchRestDuration = 30;   // 换边间隔休整时长 (默认30s)

// 周天循环调度状态
let stretchFlowSteps = [];
let stretchFlowStepIndex = 0;
let stretchCurrentStepRemain = 0;

function initStretchTimerState() {
    stretchTargetDuration = data?.settings?.stretchDefaultDuration || 60;
    stretchRestDuration = data?.settings?.stretchRestDuration || 30;
    renderStretchSettings();
    updateStretchClockDisplay(stretchTargetDuration);
}

// 切换子模式
function switchStretchSubMode(mode) {
    if (stretchRunning) stopStretchTimer(false);
    stretchSubMode = mode;

    ['flow', 'countdown', 'stopwatch'].forEach(m => {
        const btn = document.getElementById(`btnStretchMode${m.charAt(0).toUpperCase() + m.slice(1)}`);
        if (btn) btn.classList.toggle('active', m === mode);
    });

    renderStretchSettings();

    const phaseEl = document.getElementById('stretchPhaseDisplay');
    const counterEl = document.getElementById('stretchCycleCounter');

    if (mode === 'flow') {
        if (phaseEl) phaseEl.textContent = '双腿周天循环 · 闭眼听令';
        if (counterEl) counterEl.textContent = `单侧 ${stretchTargetDuration}s | 换边间隔 ${stretchRestDuration}s`;
        updateStretchClockDisplay(stretchTargetDuration);
    } else if (mode === 'countdown') {
        if (phaseEl) phaseEl.textContent = `单侧目标倒计时 · ${stretchTargetDuration}s`;
        if (counterEl) counterEl.textContent = '全程逐秒读秒 · 深度牵拉';
        updateStretchClockDisplay(stretchTargetDuration);
    } else {
        if (phaseEl) phaseEl.textContent = '自由正向秒表';
        if (counterEl) counterEl.textContent = '正向计时无上限';
        updateStretchClockDisplay(0);
    }
}

// 调整单侧时长，并自动保存为下一次默认值！
function setStretchTargetDuration(sec) {
    const val = Math.max(30, parseInt(sec) || 60);
    stretchTargetDuration = val;

    if (data && data.settings) {
        data.settings.stretchDefaultDuration = val;
        saveData();
    }

    renderStretchSettings();
    if (!stretchRunning && stretchSubMode !== 'stopwatch') {
        updateStretchClockDisplay(val);
    }
    if (typeof showToast === 'function') {
        showToast(`已将单侧时长设为 ${val}s (已存为默认)`);
    }
}

// 调整换边间隔时长，并自动保存为下一次默认值！
function setStretchRestDuration(sec) {
    const val = Math.max(5, parseInt(sec) || 30);
    stretchRestDuration = val;

    if (data && data.settings) {
        data.settings.stretchRestDuration = val;
        saveData();
    }

    renderStretchSettings();
    const counterEl = document.getElementById('stretchCycleCounter');
    if (counterEl && stretchSubMode === 'flow') {
        counterEl.textContent = `单侧 ${stretchTargetDuration}s | 换边间隔 ${val}s`;
    }
    if (typeof showToast === 'function') {
        showToast(`已将换边间隔设为 ${val}s (已存为默认)`);
    }
}

// 渲染参数调节条
function renderStretchSettings() {
    const area = document.getElementById('stretchSettingsArea');
    if (!area) return;

    if (stretchSubMode === 'stopwatch') {
        area.innerHTML = `<div style="font-size:12px; color:var(--text-muted); text-align:center;">正向秒表模式：闭眼拉伸，每秒精准播报。</div>`;
        return;
    }

    const durPresets = [45, 60, 75, 90, 120];
    const restPresets = [15, 20, 30, 45, 60];

    area.innerHTML = `
        <div class="stretch-setting-row">
            <span style="font-size:12.5px; color:var(--text-muted); font-weight:bold;">⏱️ 单侧压腿时长:</span>
            <div class="chip-preset-row" style="margin:0;">
                ${durPresets.map(s => `
                    <button type="button" class="preset-chip ${stretchTargetDuration === s ? 'active' : ''}"
                            onclick="setStretchTargetDuration(`${s}`)">${s}s</button>
                `).join('')}
            </div>
        </div>
        ${stretchSubMode === 'flow' ? `
            <div class="stretch-setting-row">
                <span style="font-size:12.5px; color:var(--amber-accent); font-weight:bold;">☕ 换边间隔休整 (存为默认):</span>
                <div class="chip-preset-row" style="margin:0;">
                    ${restPresets.map(r => `
                        <button type="button" class="preset-chip ${stretchRestDuration === r ? 'active' : ''}"
                                style="${stretchRestDuration === r ? 'background:var(--amber-accent); border-color:var(--amber-accent);' : ''}"
                                onclick="setStretchRestDuration(${r})">${r}s</button>
                    `).join('')}
                    <input type="number" value="${stretchRestDuration}" min="5" max="180" step="5"
                           style="width:58px; text-align:center; font-size:12px; padding:2px 4px; font-weight:bold; color:var(--amber-accent);"
                           onchange="setStretchRestDuration(this.value)">
                    <span style="font-size:11px; color:var(--text-muted);">秒</span>
                </div>
            </div>
        ` : ''}
    `;
}

function updateStretchClockDisplay(sec) {
    const clockEl = document.getElementById('stretchTimerClock');
    if (!clockEl) return;
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    clockEl.textContent = `${m}:${s}`;
}

function toggleStretchTimer() {
    if (!stretchRunning) {
        startStretchTimer();
    } else {
        pauseStretchTimer();
    }
}

// 语音播报
function speakStretch(text, rate = 1.25) {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = rate;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
}

// 启动压腿战钟
function startStretchTimer() {
    stretchRunning = true;
    stretchPaused = false;
    updateStretchButtonUI(true);

    if (stretchSubMode === 'flow') {
        buildStretchFlowSchedule();
        runStretchFlowStep();
        return;
    }

    // 单侧倒计时或秒表
    let currentSec = (stretchSubMode === 'countdown') ? stretchTargetDuration : 0;
    speakStretch(stretchSubMode === 'countdown' ? `开始压腿，设定${stretchTargetDuration}秒，全程读秒，放松哈气！` : '秒表开始！');

    clearInterval(stretchTimerInterval);
    stretchTimerInterval = setInterval(() => {
        if (stretchSubMode === 'countdown') {
            currentSec--;
            updateStretchClockDisplay(Math.max(0, currentSec));
            const fill = document.getElementById('stretchProgressFill');
            if (fill) fill.style.width = `${((stretchTargetDuration - currentSec) / stretchTargetDuration) * 100}%`;

            // 核心：全程逐秒读秒！
            if (currentSec > 0) {
                speakStretch(String(currentSec));
            } else {
                stopStretchTimer(true);
            }
        } else {
            currentSec++;
            updateStretchClockDisplay(currentSec);
            // 秒表全程每秒朗读
            speakStretch(String(currentSec));
        }
    }, 1000);
}

// 构建双腿周天执行队列
function buildStretchFlowSchedule() {
    stretchFlowSteps = [
        { title: '战前就位准备', cue: '左腿在前，10秒就位准备', duration: 10, isPrep: true },
        { title: '左腿 · 深度拉伸', cue: '左腿开始拉伸，匀速吐气，拉长筋膜', duration: stretchTargetDuration, isWork: true, side: '左腿' },
        { title: `换边休整 (${stretchRestDuration}s)`, cue: `左腿收功！缓慢收腿抖腿，换边休整${stretchRestDuration}秒`, duration: stretchRestDuration, isRest: true },
        { title: '右腿 · 深度拉伸', cue: '右腿开始拉伸，全身放松，顺势下沉', duration: stretchTargetDuration, isWork: true, side: '右腿' }
    ];
    stretchFlowStepIndex = 0;
}

// 执行周天当前小节（关键：做功阶段全程每秒报数！）
function runStretchFlowStep() {
    if (stretchFlowStepIndex >= stretchFlowSteps.length) {
        stopStretchTimer(true);
        return;
    }

    const cur = stretchFlowSteps[stretchFlowStepIndex];
    stretchCurrentStepRemain = cur.duration;

    const phaseEl = document.getElementById('stretchPhaseDisplay');
    const counterEl = document.getElementById('stretchCycleCounter');
    const fill = document.getElementById('stretchProgressFill');

    if (phaseEl) phaseEl.textContent = cur.title;
    if (counterEl) counterEl.textContent = `当前进度: 第 ${stretchFlowStepIndex + 1} / ${stretchFlowSteps.length} 节`;
    updateStretchClockDisplay(stretchCurrentStepRemain);

    speakStretch(cur.cue);

    clearInterval(stretchTimerInterval);
    stretchTimerInterval = setInterval(() => {
        stretchCurrentStepRemain--;
        updateStretchClockDisplay(Math.max(0, stretchCurrentStepRemain));

        if (fill) {
            fill.style.width = `${((cur.duration - stretchCurrentStepRemain) / cur.duration) * 100}%`;
        }

        // 做功期间：全程逐秒报数！
        if (cur.isWork && stretchCurrentStepRemain > 0) {
            speakStretch(String(stretchCurrentStepRemain));
        }
        // 间隔休整期间：最后5秒预警，最后3秒倒数
        else if (cur.isRest) {
            if (stretchCurrentStepRemain === 5) {
                speakStretch('准备，右腿就位！');
            } else if (stretchCurrentStepRemain <= 3 && stretchCurrentStepRemain > 0) {
                speakStretch(String(stretchCurrentStepRemain));
            }
        }
        // 就位准备期间：倒数最后3秒
        else if (cur.isPrep && stretchCurrentStepRemain <= 3 && stretchCurrentStepRemain > 0) {
            speakStretch(String(stretchCurrentStepRemain));
        }

        if (stretchCurrentStepRemain <= 0) {
            clearInterval(stretchTimerInterval);
            stretchFlowStepIndex++;
            runStretchFlowStep();
        }
    }, 1000);
}

function pauseStretchTimer() {
    stretchRunning = false;
    stretchPaused = true;
    clearInterval(stretchTimerInterval);
    updateStretchButtonUI(false);
    const btn = document.getElementById('stretchStartBtn');
    if (btn) btn.textContent = '▶ 恢复压腿';
}

function stopStretchTimer(isAutoDone = false) {
    clearInterval(stretchTimerInterval);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const duty = getDutyShiftInfo();
    const durSec = (stretchSubMode === 'flow') ? (stretchTargetDuration * 2) : stretchTargetDuration;

    if (isAutoDone) {
        const autoLog = {
            id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: duty.dutyDateStr,
            type: '压腿',
            sets: stretchSubMode === 'flow' ? 2 : 1,
            reps: stretchSubMode === 'flow' ? `${stretchTargetDuration}s,${stretchTargetDuration}s` : `${durSec}s`,
            total: durSec,
            isAerobic: false,
            isIsometric: true,
            heart: '未知',
            duration: Math.max(1, Math.round(durSec / 60)),
            rpe: 7,
            dutyTag: `${duty.shift.name} (归属${duty.dutyDateStr.slice(5)})`,
            startTimeStamp: getFullTimestamp(new Date(Date.now() - durSec * 1000)),
            endTimeStamp: getFullTimestamp(),
            downSec: 0,
            upSec: 0,
            tutSeconds: durSec,
            note: `压腿深度舒筋收功：双腿做功 ${durSec} 秒（间隔休整 ${stretchRestDuration}s）。`,
            createdAt: new Date().toISOString()
        };

        data.logs.push(autoLog);
        data.workoutQueue = data.workoutQueue.filter(x => !(x.actionId === 'act_pnf_stretch' || x.name.includes('压腿')));
        saveData();
        renderAll();

        speakStretch(`压腿圆满收功，累计做功${durSec}秒，战功已自动封存入册！`);
        if (typeof showToast === 'function') {
            showToast(`🎉 压腿（${durSec}秒）已成功入册！`);
        }
    }

    stretchRunning = false;
    stretchPaused = false;
    updateStretchButtonUI(false);
    updateStretchClockDisplay(stretchTargetDuration);
    const fill = document.getElementById('stretchProgressFill');
    if (fill) fill.style.width = '0%';
}

function updateStretchButtonUI(isRunning) {
    const btn = document.getElementById('stretchStartBtn');
    if (btn) {
        btn.textContent = isRunning ? "⏸ 暂停压腿" : "▶ 开始压腿 (留10s准备)";
        btn.className = isRunning ? "btn btn-danger" : "btn btn-primary";
        btn.style.background = isRunning ? "" : "var(--purple-accent)";
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initStretchTimerState();
});