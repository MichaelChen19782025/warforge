// ================================================================
//  pnf-timer.js: 压腿舒筋战钟（严格 60 秒起步，倒计时/秒表/PNF全语音）
// ================================================================

let stretchMode = 'countdown'; // 'countdown' | 'stopwatch' | 'pnf'
let stretchState = 'idle'; // 'idle' | 'running' | 'paused'
let stretchSeconds = 60; // 默认 60 秒起步
let stretchTarget = 60;
let stretchInterval = null;

// PNF 专用状态
let pnfSteps = [];
let pnfStepIndex = 0;

function switchStretchMode(mode) {
    if (stretchState !== 'idle') stopStretchTimer(false);
    stretchMode = mode;

    document.getElementById('btnStretchModeCountdown')?.classList.toggle('active', mode === 'countdown');
    document.getElementById('btnStretchModeStopwatch')?.classList.toggle('active', mode === 'stopwatch');
    document.getElementById('btnStretchModePnf')?.classList.toggle('active', mode === 'pnf');

    const clock = document.getElementById('stretchTimerClock');
    const phase = document.getElementById('stretchPhaseDisplay');
    const counter = document.getElementById('stretchCycleCounter');

    if (mode === 'countdown') {
        stretchTarget = Math.max(60, stretchTarget);
        stretchSeconds = stretchTarget;
        if (clock) clock.textContent = formatStretchTime(stretchSeconds);
        if (phase) phase.textContent = `目标倒计时 · 深度拉伸 (${stretchTarget}s)`;
        if (counter) counter.textContent = '单侧目标压腿 (≥60s起步)';
        renderStretchCountdownSettings();
    } else if (mode === 'stopwatch') {
        stretchSeconds = 0;
        if (clock) clock.textContent = "00:00";
        if (phase) phase.textContent = "正向秒表 · 自由舒缓压腿";
        if (counter) counter.textContent = '正向计时无上限';
        document.getElementById('stretchSettingsArea').innerHTML = '';
    } else {
        if (phase) phase.textContent = "闭眼就位 · 听令而动";
        if (counter) counter.textContent = '双腿PNF周天';
        renderPnfSettings();
    }
}

function formatStretchTime(sec) {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
}

function toggleStretchTimer() {
    if (stretchState === 'idle') {
        startStretchTimer();
    } else if (stretchState === 'running') {
        pauseStretchTimer();
    } else {
        resumeStretchTimer();
    }
}

function startStretchTimer() {
    stretchState = 'running';
    updateStretchButtonUI(true);

    if (stretchMode === 'pnf') {
        startPnfFlow();
        return;
    }

    speakFast(stretchMode === 'countdown' ? `开始压腿，设定${stretchTarget}秒，匀速吐气，拉长筋膜！` : "开始自由压腿，秒表启动！");

    clearInterval(stretchInterval);
    stretchInterval = setInterval(() => {
        const clock = document.getElementById('stretchTimerClock');
        const fill = document.getElementById('stretchProgressFill');

        if (stretchMode === 'countdown') {
            stretchSeconds--;
            if (clock) clock.textContent = formatStretchTime(Math.max(0, stretchSeconds));
            if (fill) fill.style.width = `${((stretchTarget - stretchSeconds) / stretchTarget) * 100}%`;

            if (stretchSeconds <= 3 && stretchSeconds > 0) {
                speakFast(String(stretchSeconds));
            } else if (stretchSeconds === 30) {
                speakFast("已过半，保持膝盖微屈勿憋气");
            } else if (stretchSeconds === 10) {
                speakFast("最后10秒，微沉加深！");
            }

            if (stretchSeconds <= 0) {
                stopStretchTimer(true);
            }
        } else {
            stretchSeconds++;
            if (clock) clock.textContent = formatStretchTime(stretchSeconds);
            if (stretchSeconds === 60) {
                speakFast("已满60秒基准，做功有效！");
            } else if (stretchSeconds > 60 && stretchSeconds % 30 === 0) {
                speakFast(`${stretchSeconds}秒`);
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

function stopStretchTimer(isAutoDone = false) {
    clearInterval(stretchInterval);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    const duty = getDutyShiftInfo();
    const durSec = stretchMode === 'countdown' ? stretchTarget : stretchSeconds;

    if (durSec >= 60 && isAutoDone) {
        const autoLog = {
            id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: duty.dutyDateStr,
            type: '压腿',
            sets: 1,
            reps: `${durSec}s`,
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
            note: `压腿深度舒筋：完成 ${durSec} 秒（≥60s基准破障）。`,
            createdAt: new Date().toISOString()
        };

        data.logs.push(autoLog);

        // 联动销项：移除出征台中对应的压腿动作
        data.workoutQueue = data.workoutQueue.filter(x => !(x.actionId === 'act_pnf_stretch' || x.name.includes('压腿') || x.name.includes('拉伸')));

        saveData();
        renderAll();

        speakFast(`压腿收功，有效做功${durSec}秒，战功已自动封存！`);
        showToast(`🎉 压腿（${durSec}秒）已成功入册！`);
    } else if (!isAutoDone && durSec < 60) {
        showToast("⚠️ 本次压腿未达 60 秒基准，未入册");
    }

    stretchState = 'idle';
    updateStretchButtonUI(false);
    switchStretchMode(stretchMode);
}

function updateStretchButtonUI(isRunning) {
    const btn = document.getElementById('stretchStartBtn');
    const pauseBtn = document.getElementById('stretchPauseBtn');
    if (btn) {
        btn.innerText = isRunning ? "⏸ 暂停" : "▶ 开始压腿";
        btn.className = isRunning ? "btn btn-danger" : "btn btn-primary";
    }
    if (pauseBtn) pauseBtn.disabled = !isRunning;
}

function setStretchCountdownSec(sec) {
    const val = Math.max(60, parseInt(sec) || 60);
    stretchTarget = val;
    stretchSeconds = val;
    const clock = document.getElementById('stretchTimerClock');
    if (clock) clock.textContent = formatStretchTime(val);
    renderStretchCountdownSettings();
}

function renderStretchCountdownSettings() {
    const container = document.getElementById('stretchSettingsArea');
    if (!container) return;
    const presets = [60, 75, 90, 120, 180];
    container.innerHTML = `
        <div style="display:flex; justify-content:center; align-items:center; gap:6px; flex-wrap:wrap;">
            <span style="font-size:11px; color:var(--text-muted);">设定时长:</span>
            ${presets.map(s => `
                <button type="button" class="preset-chip ${stretchTarget === s ? 'active' : ''}" onclick="setStretchCountdownSec(${s})">${s}秒</button>
            `).join('')}
            <input type="number" value="${stretchTarget}" min="60" max="600" step="15" onchange="setStretchCountdownSec(this.value)"
                   style="width:60px; padding:2px 4px; font-size:11px; text-align:center; color:var(--purple-accent); font-weight:bold;">
            <span style="font-size:11px; color:var(--text-dim);">秒</span>
        </div>
    `;
}

function renderPnfSettings() {
    const container = document.getElementById('stretchSettingsArea');
    if (!container) return;
    container.innerHTML = `
        <div style="font-size:11px; color:var(--text-muted); line-height:1.4;">
            💡 <strong>闭眼听令口诀</strong>：到位牵拉 ➔ 听到"发力"脚跟下踩对抗 ➔ 听到"下沉"彻底卸力加深 ➔ 换边休整。
        </div>
    `;
}

function startPnfFlow() {
    pnfSteps = [
        { title: '左腿 · 初阶到位牵拉', cue: '左腿在前，初阶到位牵拉，深长吐气', duration: 15 },
        { title: '左腿 · 第一次等长发力', cue: '前脚跟下踩发力对抗，严禁憋气，吐气！', duration: 7, count: true },
        { title: '左腿 · 第一次深度下沉', cue: '彻底卸力，深层下沉加深！', duration: 25 },
        { title: '缓慢收腿 · 抖腿换边', cue: '缓慢收腿，深呼吸拍打大腿，换右腿在前', duration: 15 },
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
    if (counter) counter.textContent = `第 ${pnfStepIndex + 1} / ${pnfSteps.length} 节`;

    clearInterval(stretchInterval);
    stretchInterval = setInterval(() => {
        rem--;
        if (clock) clock.textContent = formatStretchTime(rem);
        if (step.count && rem <= 3 && rem > 0) speakFast(String(rem));

        if (rem <= 0) {
            clearInterval(stretchInterval);
            pnfStepIndex++;
            runPnfStep();
        }
    }, 1000);
}