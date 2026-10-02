/**
 * 天罡洗髓 · 离心慢放 · 破糖战钟 (PRO)
 * 核心特性：
 * 1. 默认次数为 10 次；
 * 2. 任何手动修改次数（按键/输入），自动保存到 settings 中作为下一次的默认值；
 * 3. 读秒与语音指导完全参考《锻炼计划.html》：
 *    - 战前准备 10s（倒数 3, 2, 1）；
 *    - 慢下阶段（默认 4s）：4, 3, 2，最后 200~250ms 提前播报“1”；
 *    - 撑起阶段（默认 1s）：即将触顶前 200~250ms 提前播报“起！”；
 *    - 全部 10 次做功圆满后，语音祝贺并全自动封存入册今日实录！
 */

let eccentricRunning = false;
let eccentricPaused = false;
let eccentricStartTime = 0;
let eccentricTotalElapsed = 0;
let eccentricAnimationFrame = null;
let spokenCues = new Set();

let timerDownSec = 4.0;
let timerUpSec = 1.0;
let timerTotalSets = 10; // 默认 10 次
const TIMER_PREP_SEC = 10;

// 初始化从持久化配置中读取默认次数
function initEccentricTimerState() {
    timerTotalSets = data?.settings?.eccentricDefaultSets || 10;
    timerDownSec = data?.settings?.eccentricDownSec || 4.0;
    timerUpSec = data?.settings?.eccentricUpSec || 1.0;

    const downInput = document.getElementById('timerDownInput');
    const upInput = document.getElementById('timerUpInput');
    const setsDisplay = document.getElementById('eccSetsDisplay');

    if (downInput) downInput.value = timerDownSec;
    if (upInput) upInput.value = timerUpSec;
    if (setsDisplay) setsDisplay.textContent = timerTotalSets;

    updateEccentricSetsChips(timerTotalSets);
    updateCounterUI();
}

function syncTimerInputs() {
    timerDownSec = Math.max(1, parseFloat(document.getElementById('timerDownInput')?.value) || 4.0);
    timerUpSec = Math.max(0.5, parseFloat(document.getElementById('timerUpInput')?.value) || 1.0);

    if (data && data.settings) {
        data.settings.eccentricDownSec = timerDownSec;
        data.settings.eccentricUpSec = timerUpSec;
        saveData();
    }
}

// 修改次数时，不仅修改当前运行时，还自动持久化为下一次的默认值！
function setEccentricQuickSets(sets) {
    const val = Math.max(1, parseInt(sets) || 10);
    timerTotalSets = val;

    if (data && data.settings) {
        data.settings.eccentricDefaultSets = val;
        saveData();
    }

    const setsDisplay = document.getElementById('eccSetsDisplay');
    if (setsDisplay) setsDisplay.textContent = val;

    updateEccentricSetsChips(val);
    updateCounterUI();

    if (typeof showToast === 'function') {
        showToast(`已将离心次数设为 ${val} 次 (已存为默认)`);
    }
}

function stepEccentricSets(delta) {
    setEccentricQuickSets(timerTotalSets + delta);
}

function updateEccentricSetsChips(sets) {
    [6, 8, 10, 12, 15, 20].forEach(n => {
        const chip = document.getElementById(`chipSet${n}`);
        if (chip) chip.classList.toggle('active', n === sets);
    });
}

function updateCounterUI() {
    const counterEl = document.getElementById('timerSetCounter');
    if (counterEl) {
        counterEl.textContent = `准备就绪 · 共 ${timerTotalSets} 次 (单次 ${timerDownSec}s下/${timerUpSec}s起)`;
    }
}

// 快速语音引擎 (参考《锻炼计划.html》)
function speakFast(text) {
    if (!('speechSynthesis' in window)) return;
    const voiceSelect = document.getElementById('voiceEnabled');
    if (voiceSelect && voiceSelect.value === 'false') return;

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 1.35;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
}

// 启动战钟
function startEccentricTimer() {
    if (eccentricRunning && !eccentricPaused) return;

    syncTimerInputs();

    if (eccentricPaused) {
        eccentricPaused = false;
        eccentricRunning = true;
        eccentricStartTime = performance.now() - eccentricTotalElapsed;
        document.getElementById('timerStartBtn').textContent = '▶ 运转中';
        document.getElementById('timerPauseBtn').disabled = false;
        runEccentricLoop();
        return;
    }

    stopEccentricTimer(false);
    eccentricRunning = true;
    eccentricPaused = false;
    eccentricTotalElapsed = 0;
    eccentricStartTime = performance.now();
    spokenCues.clear();

    const startBtn = document.getElementById('timerStartBtn');
    const pauseBtn = document.getElementById('timerPauseBtn');
    if (startBtn) startBtn.textContent = '▶ 运转中';
    if (pauseBtn) pauseBtn.disabled = false;

    speakFast(`战前就位，10秒准备！`);
    runEccentricLoop();
}

// 核心主循环（毫秒动画帧驱动）
function runEccentricLoop() {
    if (!eccentricRunning || eccentricPaused) return;

    const now = performance.now();
    eccentricTotalElapsed = now - eccentricStartTime;

    const prepMs = TIMER_PREP_SEC * 1000;
    const downMs = timerDownSec * 1000;
    const upMs = timerUpSec * 1000;
    const cycleMs = downMs + upMs;

    const phaseEl = document.getElementById('phaseDisplay');
    const clockEl = document.getElementById('timerClock');
    const progressEl = document.getElementById('timerProgressFill');
    const setCounterEl = document.getElementById('timerSetCounter');

    // 1. 战前就位阶段 (10秒缓冲)
    if (eccentricTotalElapsed < prepMs) {
        const remSec = (prepMs - eccentricTotalElapsed) / 1000;
        if (phaseEl) phaseEl.textContent = '战前就位 (趴下就位)';
        if (clockEl) clockEl.textContent = `00:${String(Math.ceil(remSec)).padStart(2, '0')}`;
        if (setCounterEl) setCounterEl.textContent = `准备阶段 / 共 ${timerTotalSets} 次`;
        if (progressEl) progressEl.style.width = `${((prepMs - eccentricTotalElapsed) / prepMs) * 100}%`;

        const intRem = Math.ceil(remSec);
        if (intRem <= 3 && intRem > 0 && !spokenCues.has(`prep_${intRem}`)) {
            spokenCues.add(`prep_${intRem}`);
            speakFast(String(intRem));
        }

        eccentricAnimationFrame = requestAnimationFrame(runEccentricLoop);
        return;
    }

    // 2. 正式离心做功阶段
    const workoutElapsed = eccentricTotalElapsed - prepMs;
    const currentSet = Math.floor(workoutElapsed / cycleMs) + 1;

    // 全部次数圆满达成！全自动封存入册
    if (currentSet > timerTotalSets) {
        const totalWorkoutSec = Math.round(workoutElapsed / 1000);
        const durMin = Math.max(1, Math.round(totalWorkoutSec / 60));
        const totalTut = Math.round(timerTotalSets * (timerDownSec + timerUpSec));
        const duty = getDutyShiftInfo();
        const startTs = getFullTimestamp(new Date(Date.now() - totalWorkoutSec * 1000));
        const endTs = getFullTimestamp();

        stopEccentricTimer(false);

        if (phaseEl) phaseEl.textContent = '周天圆满 · 已自动入册！';
        if (clockEl) clockEl.textContent = '00:00';
        if (progressEl) progressEl.style.width = '100%';
        if (setCounterEl) setCounterEl.textContent = `全部 ${timerTotalSets} 次破阵完毕！`;

        // 自动入册
        const autoLog = {
            id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: duty.dutyDateStr,
            type: '慢速离心俯卧撑',
            sets: 1,
            reps: `${timerTotalSets}次`,
            total: timerTotalSets,
            isAerobic: false,
            isIsometric: false,
            heart: '未知',
            duration: durMin,
            rpe: 8,
            dutyTag: `${duty.shift.name} (归属${duty.dutyDateStr.slice(5)})`,
            startTimeStamp: startTs,
            endTimeStamp: endTs,
            downSec: timerDownSec,
            upSec: timerUpSec,
            tutSeconds: totalTut,
            note: `离心战钟自动入册：完成 ${timerTotalSets} 次（慢下${timerDownSec}s / 撑起${timerUpSec}s），累计TUT做功 ${totalTut} 秒。`,
            createdAt: new Date().toISOString()
        };

        data.logs.push(autoLog);
        data.workoutQueue = data.workoutQueue.filter(x => !(x.actionId === 'act_pushup_ecc' || x.name.includes('离心')));
        saveData();
        renderAll();

        speakFast(`恭喜！全套${timerTotalSets}次慢速离心战阵收功，数据已自动封存入册！`);
        if (typeof showToast === 'function') {
            showToast(`🎉 慢速离心俯卧撑（${timerTotalSets}次·TUT ${totalTut}s）已自动记入今日战功！`);
        }
        return;
    }

    if (setCounterEl) setCounterEl.textContent = `第 ${currentSet} / ${timerTotalSets} 次`;
    const setElapsed = workoutElapsed % cycleMs;

    // 下放阶段 (Down)
    if (setElapsed < downMs) {
        if (phaseEl) phaseEl.textContent = `慢速离心下潜 (${timerDownSec}s)`;
        const remDownMs = downMs - setElapsed;
        if (clockEl) clockEl.textContent = `00:0${(remDownMs / 1000).toFixed(1)}`;
        if (progressEl) progressEl.style.width = `${(setElapsed / downMs) * 100}%`;

        const secMarker = Math.floor(setElapsed / 1000);
        const countNum = Math.ceil(timerDownSec - secMarker);

        // 播报整数秒：4, 3, 2
        if (countNum > 1) {
            const cueKey = `s${currentSet}_d_${countNum}`;
            if (!spokenCues.has(cueKey)) {
                spokenCues.add(cueKey);
                speakFast(String(countNum));
            }
        }
        // 最后 250ms 提前播报“1”
        else if (countNum === 1) {
            const cueKey = `s${currentSet}_d_1_anticipate`;
            if (remDownMs <= 250 && !spokenCues.has(cueKey)) {
                spokenCues.add(cueKey);
                speakFast('1');
            }
        }
    }
    // 撑起爆发阶段 (Up)
    else {
        const upElapsed = setElapsed - downMs;
        const remUpMs = upMs - upElapsed;
        if (phaseEl) phaseEl.textContent = `向心撑起爆发 (${timerUpSec}s)`;
        if (clockEl) clockEl.textContent = `00:0${(remUpMs / 1000).toFixed(1)}`;
        if (progressEl) progressEl.style.width = `${(upElapsed / upMs) * 100}%`;

        // 即将触顶前 250ms 提前有力播报“起！”
        const cueKey = `s${currentSet}_u_anticipate`;
        if (remUpMs <= 250 && !spokenCues.has(cueKey)) {
            spokenCues.add(cueKey);
            speakFast('起');
        }
    }

    eccentricAnimationFrame = requestAnimationFrame(runEccentricLoop);
}

function pauseEccentricTimer() {
    if (!eccentricRunning) return;
    eccentricPaused = true;
    cancelAnimationFrame(eccentricAnimationFrame);
    const startBtn = document.getElementById('timerStartBtn');
    const pauseBtn = document.getElementById('timerPauseBtn');
    if (startBtn) startBtn.textContent = '▶ 恢复运转';
    if (pauseBtn) pauseBtn.disabled = true;
}

function stopEccentricTimer(shouldResetUI = true) {
    eccentricRunning = false;
    eccentricPaused = false;
    cancelAnimationFrame(eccentricAnimationFrame);
    spokenCues.clear();

    const startBtn = document.getElementById('timerStartBtn');
    const pauseBtn = document.getElementById('timerPauseBtn');
    const phaseEl = document.getElementById('phaseDisplay');
    const clockEl = document.getElementById('timerClock');
    const progressEl = document.getElementById('timerProgressFill');

    if (startBtn) startBtn.textContent = '▶ 开始离心慢放 (留10s准备)';
    if (pauseBtn) pauseBtn.disabled = true;

    if (shouldResetUI) {
        if (phaseEl) phaseEl.textContent = '战法就绪';
        if (clockEl) clockEl.textContent = '00:00';
        if (progressEl) progressEl.style.width = '0%';
        updateCounterUI();
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initEccentricTimerState();
});