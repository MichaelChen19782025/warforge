// ================================================================
//  timer.js: 离心慢放战钟（默认2组/极速组数切换/间歇休息可调/一键跳过休息）
// ================================================================

let eccentricRunning = false;
let eccentricPaused = false;
let eccentricStartTime = 0;
let eccentricTotalElapsed = 0;
let eccentricAnimationFrame = null;
let spokenCues = new Set();

let timerDownSec = 4.0;
let timerUpSec = 1.0;
let timerTotalSets = 2; // 默认调整为 2 组日常标配
let timerRestSec = 60; // 科学推荐组间休息 60 秒
const TIMER_PREP_SEC = 10;

// 当前处于哪个阶段：'prep' | 'work' | 'rest'
let eccentricStage = 'prep';
let currentSetIndex = 1;
let stageElapsedStart = 0;

function syncTimerInputs() {
    timerDownSec = parseFloat(document.getElementById('timerDownInput')?.value) || 4.0;
    timerUpSec = parseFloat(document.getElementById('timerUpInput')?.value) || 1.0;
    timerTotalSets = parseInt(document.getElementById('timerSetsInput')?.value) || 2;
    updateSetsPillUI(timerTotalSets);
    const counter = document.getElementById('timerSetCounter');
    if (counter) counter.textContent = `第 0 / ${timerTotalSets} 组`;
}

// 快速调节总组数 (2组日常/3组/4组强化/5组)
function setEccentricQuickSets(n) {
    timerTotalSets = Math.max(1, parseInt(n) || 2);
    const input = document.getElementById('timerSetsInput');
    if (input) input.value = timerTotalSets;
    const disp = document.getElementById('eccSetsDisplay');
    if (disp) disp.textContent = timerTotalSets;
    data.settings.eccentricDefaultSets = timerTotalSets;
    saveData();
    updateSetsPillUI(timerTotalSets);
    const counter = document.getElementById('timerSetCounter');
    if (counter && !eccentricRunning) counter.textContent = `第 0 / ${timerTotalSets} 组`;
}

function stepEccentricSets(delta) {
    setEccentricQuickSets(timerTotalSets + delta);
}

function updateSetsPillUI(n) {
    [2, 3, 4, 5].forEach(k => {
        document.getElementById(`chipSet${k}`)?.classList.toggle('active', k === n);
    });
    const disp = document.getElementById('eccSetsDisplay');
    if (disp) disp.textContent = n;
}

// 设定组间休息秒数
function setEccentricRestSec(sec) {
    timerRestSec = Math.max(10, parseInt(sec) || 60);
    data.settings.eccentricRestSec = timerRestSec;
    saveData();
    document.querySelectorAll('.rest-settings-bar .rest-chip').forEach(c => {
        c.classList.toggle('active', parseInt(c.innerText) === timerRestSec);
    });
    const custom = document.getElementById('eccCustomRestInput');
    if (custom) custom.value = timerRestSec;
}

// ⚡ 一键跳过休息，直接开启下一组
function skipTimerRest() {
    if (!eccentricRunning || eccentricStage !== 'rest') return;
    stageElapsedStart = performance.now();
    currentSetIndex++;
    eccentricStage = 'work';
    document.getElementById('timerSkipRestBtn')?.classList.add('hidden');
    speakFast(`开始第${currentSetIndex}组！`);
}

function speakFast(text) {
    if (!('speechSynthesis' in window)) return;
    const voiceSel = document.getElementById('voiceEnabled');
    if (voiceSel && voiceSel.value === 'false') return;

    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'zh-CN';
    u.rate = 1.35;
    u.pitch = 1.05;
    window.speechSynthesis.speak(u);
}

function startEccentricTimer() {
    if (eccentricRunning && !eccentricPaused) return;

    syncTimerInputs();

    if (eccentricPaused) {
        eccentricPaused = false;
        eccentricRunning = true;
        eccentricStartTime = performance.now() - eccentricTotalElapsed;
        document.getElementById('timerStartBtn').textContent = '▶ 运转中';
        document.getElementById('timerPauseBtn').disabled = false;
        document.getElementById('timerStatus').textContent = '运转中';
        runEccentricLoop();
        return;
    }

    stopEccentricTimer();
    eccentricRunning = true;
    eccentricPaused = false;
    eccentricTotalElapsed = 0;
    eccentricStartTime = performance.now();
    stageElapsedStart = performance.now();
    currentSetIndex = 1;
    eccentricStage = 'prep';
    spokenCues.clear();

    document.getElementById('timerStartBtn').textContent = '▶ 运转中';
    document.getElementById('timerPauseBtn').disabled = false;
    document.getElementById('timerStatus').textContent = '10s战前就位';

    speakFast(`战前就位，10秒准备！本次计划做${timerTotalSets}组慢速离心。`);
    runEccentricLoop();
}

function runEccentricLoop() {
    if (!eccentricRunning || eccentricPaused) return;

    const now = performance.now();
    eccentricTotalElapsed = now - eccentricStartTime;
    const stageElapsed = now - stageElapsedStart;

    const phaseEl = document.getElementById('phaseDisplay');
    const clockEl = document.getElementById('timerClock');
    const progressEl = document.getElementById('timerProgressFill');
    const setCounterEl = document.getElementById('timerSetCounter');
    const skipBtn = document.getElementById('timerSkipRestBtn');

    // 1. 战前就位 10s
    if (eccentricStage === 'prep') {
        const prepMs = TIMER_PREP_SEC * 1000;
        const remSec = (prepMs - stageElapsed) / 1000;
        if (skipBtn) skipBtn.classList.add('hidden');

        if (remSec > 0) {
            if (phaseEl) {
                phaseEl.textContent = '战前就位 (趴下锁紧肩胛)';
                phaseEl.className = 'timer-phase phase-prep';
            }
            if (clockEl) clockEl.textContent = `00:${String(Math.ceil(remSec)).padStart(2, '0')}`;
            if (setCounterEl) setCounterEl.textContent = `准备阶段 / 共 ${timerTotalSets} 组`;
            if (progressEl) progressEl.style.width = `${((prepMs - stageElapsed) / prepMs) * 100}%`;

            const intRem = Math.ceil(remSec);
            if (intRem <= 3 && intRem > 0 && !spokenCues.has(`prep_${intRem}`)) {
                spokenCues.add(`prep_${intRem}`);
                speakFast(String(intRem));
            }

            eccentricAnimationFrame = requestAnimationFrame(runEccentricLoop);
            return;
        } else {
            // 就位完毕，进入第1组做功
            eccentricStage = 'work';
            stageElapsedStart = now;
            speakFast("开始，慢下4秒！");
        }
    }

    // 2. 单组慢下与撑起做功阶段
    if (eccentricStage === 'work') {
        if (skipBtn) skipBtn.classList.add('hidden');
        const downMs = timerDownSec * 1000;
        const upMs = timerUpSec * 1000;
        const setDurationMs = downMs + upMs;

        if (setCounterEl) setCounterEl.textContent = `第 ${currentSetIndex} / ${timerTotalSets} 组`;

        if (stageElapsed < setDurationMs) {
            if (stageElapsed < downMs) {
                // 慢下阶段
                if (phaseEl) {
                    phaseEl.textContent = `慢速离心下放 (${timerDownSec}s)`;
                    phaseEl.className = 'timer-phase phase-down';
                }
                const remDownMs = downMs - stageElapsed;
                if (clockEl) clockEl.textContent = `00:0${(remDownMs / 1000).toFixed(1)}`;
                if (progressEl) progressEl.style.width = `${(stageElapsed / downMs) * 100}%`;

                const secMarker = Math.floor(stageElapsed / 1000);
                const countNum = Math.ceil(timerDownSec - secMarker);

                if (countNum > 1) {
                    const cueKey = `s${currentSetIndex}_d_${countNum}`;
                    if (!spokenCues.has(cueKey)) {
                        spokenCues.add(cueKey);
                        speakFast(String(countNum));
                    }
                } else if (countNum === 1) {
                    const cueKey = `s${currentSetIndex}_d_1_anticipate`;
                    if (remDownMs <= 250 && !spokenCues.has(cueKey)) {
                        spokenCues.add(cueKey);
                        speakFast('1');
                    }
                }
            } else {
                // 撑起阶段
                const upElapsed = stageElapsed - downMs;
                const remUpMs = upMs - upElapsed;
                if (phaseEl) {
                    phaseEl.textContent = `撑起爆发 (${timerUpSec}s)`;
                    phaseEl.className = 'timer-phase phase-up';
                }
                if (clockEl) clockEl.textContent = `00:0${(remUpMs / 1000).toFixed(1)}`;
                if (progressEl) progressEl.style.width = `${(upElapsed / upMs) * 100}%`;

                const cueKey = `s${currentSetIndex}_u_anticipate`;
                if (remUpMs <= 250 && !spokenCues.has(cueKey)) {
                    spokenCues.add(cueKey);
                    speakFast('起');
                }
            }
            eccentricAnimationFrame = requestAnimationFrame(runEccentricLoop);
            return;
        } else {
            // 单组完成：判断是进入组间休息，还是全部完成
            if (currentSetIndex < timerTotalSets) {
                eccentricStage = 'rest';
                stageElapsedStart = now;
                speakFast(`第${currentSetIndex}组完成！休息${timerRestSec}秒，站起轻甩手臂排酸。`);
                if (skipBtn) skipBtn.classList.remove('hidden');
            } else {
                // 全部大功告成！
                finishEccentricWorkout();
                return;
            }
        }
    }

    // 3. 组间休息阶段
    if (eccentricStage === 'rest') {
        if (skipBtn) skipBtn.classList.remove('hidden');
        const restDurationMs = timerRestSec * 1000;
        const remRestMs = Math.max(0, restDurationMs - stageElapsed);
        const remSec = Math.ceil(remRestMs / 1000);

        if (phaseEl) {
            phaseEl.textContent = `组间休整 · 甩手排酸 (休${timerRestSec}s)`;
            phaseEl.className = 'timer-phase phase-prep';
        }
        if (clockEl) clockEl.textContent = `00:${String(remSec).padStart(2, '0')}`;
        if (setCounterEl) setCounterEl.textContent = `休息中 · 即将进入第 ${currentSetIndex + 1} 组`;
        if (progressEl) progressEl.style.width = `${((restDurationMs - remRestMs) / restDurationMs) * 100}%`;

        if (remSec === 10 && !spokenCues.has(`rest_warn_${currentSetIndex}`)) {
            spokenCues.add(`rest_warn_${currentSetIndex}`);
            speakFast("还有10秒，趴下就位！");
        } else if (remSec <= 3 && remSec > 0 && !spokenCues.has(`rest_count_${currentSetIndex}_${remSec}`)) {
            spokenCues.add(`rest_count_${currentSetIndex}_${remSec}`);
            speakFast(String(remSec));
        }

        if (remRestMs <= 0) {
            currentSetIndex++;
            eccentricStage = 'work';
            stageElapsedStart = now;
            if (skipBtn) skipBtn.classList.add('hidden');
            speakFast(`开始第${currentSetIndex}组！`);
        }

        eccentricAnimationFrame = requestAnimationFrame(runEccentricLoop);
    }
}

// 离心完成自动入册
function finishEccentricWorkout() {
    const totalWorkoutSec = Math.round(eccentricTotalElapsed / 1000);
    const durMin = Math.max(1, Math.round(totalWorkoutSec / 60));
    const totalTut = Math.round(timerTotalSets * (timerDownSec + timerUpSec));
    const duty = getDutyShiftInfo();
    const startTs = getFullTimestamp(new Date(Date.now() - totalWorkoutSec * 1000));
    const endTs = getFullTimestamp();

    stopEccentricTimer();

    const phaseEl = document.getElementById('phaseDisplay');
    const clockEl = document.getElementById('timerClock');
    const progressEl = document.getElementById('timerProgressFill');
    const setCounterEl = document.getElementById('timerSetCounter');

    if (phaseEl) {
        phaseEl.textContent = '周天圆满·已自动入册！';
        phaseEl.className = 'timer-phase phase-up';
    }
    if (clockEl) clockEl.textContent = '00:00';
    if (progressEl) progressEl.style.width = '100%';
    if (setCounterEl) setCounterEl.textContent = `全部 ${timerTotalSets} 组慢速离心收功`;

    const autoLog = {
        id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: duty.dutyDateStr,
        type: '慢速离心俯卧撑',
        sets: timerTotalSets,
        reps: Array(timerTotalSets).fill('1').join(','),
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
        note: `慢速离心完成 ${timerTotalSets} 组（慢下${timerDownSec}s/撑起${timerUpSec}s，组间休${timerRestSec}s），TUT做功 ${totalTut} 秒。`,
        createdAt: new Date().toISOString()
    };

    data.logs.push(autoLog);
    data.workoutQueue = data.workoutQueue.filter(x => !(x.actionId === 'act_pushup_ecc' || x.name.includes('离心')));

    saveData();
    renderAll();

    speakFast(`恭喜！全套${timerTotalSets}组慢速离心战阵收功，已自动封存入册！`);
    showToast(`🎉 慢速离心俯卧撑（${timerTotalSets}组·TUT ${totalTut}s）已自动记入今日战功！`);
}

function pauseEccentricTimer() {
    if (!eccentricRunning) return;
    eccentricPaused = true;
    cancelAnimationFrame(eccentricAnimationFrame);
    document.getElementById('timerStartBtn').textContent = '▶ 恢复运转';
    document.getElementById('timerPauseBtn').disabled = true;
    document.getElementById('timerStatus').textContent = '已驻留';
}

function stopEccentricTimer() {
    eccentricRunning = false;
    eccentricPaused = false;
    cancelAnimationFrame(eccentricAnimationFrame);
    document.getElementById('timerStartBtn').textContent = '▶ 开始离心慢放 (留10s)';
    document.getElementById('timerPauseBtn').disabled = true;
    document.getElementById('timerStatus').textContent = '就绪 (READY)';
    document.getElementById('timerSkipRestBtn')?.classList.add('hidden');
    const phaseEl = document.getElementById('phaseDisplay');
    if (phaseEl) {
        phaseEl.textContent = '战法就绪';
        phaseEl.className = 'timer-phase';
    }
    const clock = document.getElementById('timerClock');
    if (clock) clock.textContent = '00:00';
    const fill = document.getElementById('timerProgressFill');
    if (fill) fill.style.width = '0%';
    spokenCues.clear();
}