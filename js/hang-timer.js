// ================================================================
//  hang-timer.js: 引体全能战阙（标准/阔引体/悬挂 + 次数直录/秒表 + 出征台联动）
// ================================================================

let hangMode = 'reps'; // 'reps' (次数直录) | 'stopwatch' | 'countdown'
let hangVariant = 'standard'; // 'standard' (标准引体) | 'wide' (阔引体) | 'hang' (极限悬挂)
let hangState = 'idle'; // 'idle' | 'preparing' | 'running'
let hangCurrentTime = 0;
let hangTicker = null;
let hangWakeLock = null;

function initHangTimer() {
    const ring = document.getElementById('hangProgressRing');
    if (ring) {
        const circum = 2 * Math.PI * 115;
        ring.style.strokeDasharray = `${circum} ${circum}`;
    }
    updateHangPBDisplay();
}

function updateHangPBDisplay() {
    const el = document.getElementById('hangPbDisplay');
    if (el) {
        el.innerText = `🏆 PB: ${data.settings.hangBestRecord || 0}s`;
    }
}

function setHangProgress(fraction) {
    const ring = document.getElementById('hangProgressRing');
    if (!ring) return;
    const circum = 2 * Math.PI * 115;
    const offset = circum - (fraction * circum);
    ring.style.strokeDashoffset = offset;
}

// 动作变体切换
function switchHangVariant(variant) {
    hangVariant = variant;
    document.getElementById('chipVarStandard')?.classList.toggle('active', variant === 'standard');
    document.getElementById('chipVarWide')?.classList.toggle('active', variant === 'wide');
    document.getElementById('chipVarHang')?.classList.toggle('active', variant === 'hang');

    const desc = {
        standard: '标准引体向上：正握/对握，重点雕刻背阔肌中下部与手臂屈肌',
        wide: '阔引体向上：宽握展开，重点轰炸大圆肌与背阔肌上外侧打造倒三角',
        hang: '极限重力悬挂：闭锁前臂屈肌群，死磕握力耐力与肩袖微循环'
    };
    showToast(desc[variant] || '模式已切换');
}

// 训练模式切换
function switchHangMode(mode) {
    if (hangState !== 'idle') resetHangAll();
    hangMode = mode;

    document.getElementById('hangModeReps')?.classList.toggle('active', mode === 'reps');
    document.getElementById('hangModeStopwatch')?.classList.toggle('active', mode === 'stopwatch');
    document.getElementById('hangModeCountdown')?.classList.toggle('active', mode === 'countdown');

    const repsContainer = document.getElementById('hangRepsContainer');
    const dialWrap = document.getElementById('hangTimerDialWrap');
    const presets = document.getElementById('hangPresetContainer');

    if (mode === 'reps') {
        repsContainer?.classList.remove('hidden');
        dialWrap?.classList.add('hidden');
    } else {
        repsContainer?.classList.add('hidden');
        dialWrap?.classList.remove('hidden');
        presets?.classList.toggle('hidden', mode !== 'countdown');

        const tv = document.getElementById('hangTimerValue');
        if (mode === 'countdown') {
            hangCurrentTime = data.settings.hangTargetCountdown || 30;
            if (tv) tv.innerText = hangCurrentTime;
        } else {
            hangCurrentTime = 0;
            if (tv) tv.innerText = "0";
        }
    }
}

// 次数直录模式逻辑
function setQuickHangReps(n) {
    const input = document.getElementById('hangRepsInput');
    if (input) input.value = n;
    document.querySelectorAll('.reps-preset-row .rep-chip').forEach(c => {
        c.classList.toggle('active', parseInt(c.innerText) === n);
    });
}

function stepHangReps(delta) {
    const input = document.getElementById('hangRepsInput');
    if (!input) return;
    let val = (parseInt(input.value) || 8) + delta;
    if (val < 1) val = 1;
    input.value = val;
    setQuickHangReps(val);
}

// 次数记录入册
function commitHangReps() {
    const input = document.getElementById('hangRepsInput');
    const reps = parseInt(input?.value) || 8;
    const duty = getDutyShiftInfo();
    const typeMap = {
        standard: '引体向上',
        wide: '阔引体',
        hang: '极限悬挂'
    };
    const actName = typeMap[hangVariant] || '引体';

    const autoLog = {
        id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        date: duty.dutyDateStr,
        type: actName,
        sets: 1,
        reps: `${reps}个`,
        total: reps,
        isAerobic: false,
        isIsometric: false,
        heart: '未知',
        duration: Math.max(1, Math.round(reps * 3 / 60)),
        rpe: 8,
        dutyTag: `${duty.shift.name} (归属${duty.dutyDateStr.slice(5)})`,
        startTimeStamp: getFullTimestamp(),
        endTimeStamp: getFullTimestamp(),
        downSec: 0,
        upSec: 0,
        tutSeconds: reps * 3,
        note: `【${actName}】成功做功 ${reps} 个。`,
        createdAt: new Date().toISOString()
    };

    data.logs.push(autoLog);

    // 联动销项：移除出征台中对应的引体动作
    data.workoutQueue = data.workoutQueue.filter(x => !(x.actionId === 'act_pullup' || x.actionId === 'act_pullup_wide' || x.name.includes('引体')));

    saveData();
    renderAll();

    speakFast(`恭喜！${actName} ${reps}个已成功记入战功！`);
    showToast(`✅ 【${actName}】${reps}个 封存入册！`);
}

// 放弃此次打卡
function discardHangReps() {
    showToast("🗑️ 已放弃本次做功，未记入实录。");
}

// 秒表/倒计时挂杠模式
function setHangCountdownTime(sec) {
    if (hangState !== 'idle') return;
    data.settings.hangTargetCountdown = sec;
    saveData();
    hangCurrentTime = sec;
    const tv = document.getElementById('hangTimerValue');
    if (tv) tv.innerText = sec;
    document.querySelectorAll('#hangPresetContainer .preset-chip').forEach(c => {
        c.classList.toggle('active', c.innerText.includes(sec.toString()));
    });
}

function handleHangDialClick() {
    if (hangState === 'running') {
        stopHangAndPrompt();
    }
}

function toggleHangStart() {
    if (hangState === 'idle') {
        startHangPreparation();
    } else {
        stopHangAndPrompt();
    }
}

function startHangPreparation() {
    hangState = 'preparing';
    updateHangButtonUI(true);

    const board = document.getElementById('hangDisplayBoard');
    if (board) board.classList.add('in-prep');
    const hint = document.getElementById('hangStatusHint');
    if (hint) hint.innerText = "PREPARE";

    const prepDuration = data.settings.hangPrepDuration || 10;
    let prepRemain = prepDuration;
    const tv = document.getElementById('hangTimerValue');
    if (tv) tv.innerText = prepRemain;
    setHangProgress(1);

    speakFast(`准备就位，${prepRemain}秒缓冲`);

    hangTicker = setInterval(() => {
        prepRemain--;
        if (prepRemain > 0) {
            if (tv) tv.innerText = prepRemain;
            setHangProgress(prepRemain / prepDuration);
            if (prepRemain <= 3) speakFast(prepRemain.toString());
        } else {
            clearInterval(hangTicker);
            speakFast("开始，发力！");
            startActualHang();
        }
    }, 1000);
}

function startActualHang() {
    hangState = 'running';
    const board = document.getElementById('hangDisplayBoard');
    if (board) {
        board.classList.remove('in-prep');
        board.classList.add('is-running');
    }
    const hint = document.getElementById('hangStatusHint');
    if (hint) hint.innerText = hangMode === 'stopwatch' ? "HANGING" : "REMAINING";
    const tv = document.getElementById('hangTimerValue');

    if (hangMode === 'stopwatch') {
        hangCurrentTime = 1;
        if (tv) tv.innerText = hangCurrentTime;
        speakFast("1");
        setHangProgress(1);

        hangTicker = setInterval(() => {
            hangCurrentTime++;
            if (tv) tv.innerText = hangCurrentTime;
            if (hangCurrentTime % 10 === 0 || hangCurrentTime <= 5) {
                speakFast(hangCurrentTime.toString());
            }
        }, 1000);
    } else {
        const total = data.settings.hangTargetCountdown || 30;
        hangCurrentTime = total;
        if (tv) tv.innerText = hangCurrentTime;
        setHangProgress(1);

        hangTicker = setInterval(() => {
            hangCurrentTime--;
            if (hangCurrentTime > 0) {
                if (tv) tv.innerText = hangCurrentTime;
                if (hangCurrentTime <= 5 || hangCurrentTime % 10 === 0) {
                    speakFast(hangCurrentTime.toString());
                }
                setHangProgress(hangCurrentTime / total);
            } else {
                stopHangAndPrompt();
            }
        }, 1000);
    }
}

function stopHangAndPrompt() {
    clearInterval(hangTicker);
    const score = hangCurrentTime;
    const board = document.getElementById('hangDisplayBoard');
    if (board) board.classList.remove('is-running', 'in-prep');
    updateHangButtonUI(false);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    hangState = 'idle';

    const modal = document.getElementById('hangResultModal');
    const scoreEl = document.getElementById('hangResultScore');
    const rankEl = document.getElementById('hangResultRank');
    const descEl = document.getElementById('hangResultDesc');

    if (scoreEl) scoreEl.innerHTML = `${score}<span style="font-size: 2rem; color: #9aa0a6;">s</span>`;

    let rank = "进阶挑战者";
    let desc = "坚韧不拔，每一次做功都在重塑筋膜！";
    if (score >= 60) {
        rank = "🔥 钢筋铁骨 (1分钟+破障)";
        desc = "恐怖的握力耐力！小臂坚如磐石！";
    } else if (score >= 40) {
        rank = "💪 强力引力克星";
        desc = "核心与上肢锁死，表现非常亮眼！";
    }

    if (rankEl) rankEl.innerText = rank;
    if (descEl) descEl.innerText = desc;
    if (modal) modal.classList.add('active');

    speakFast(`用时 ${score} 秒！请确认是否记录`);
}

function closeHangResultModal(confirmCommit = false) {
    const modal = document.getElementById('hangResultModal');
    if (modal) modal.classList.remove('active');

    const score = hangCurrentTime;
    if (confirmCommit && score > 0) {
        if (hangMode === 'stopwatch' && score > (data.settings.hangBestRecord || 0)) {
            data.settings.hangBestRecord = score;
            saveData();
            updateHangPBDisplay();
        }

        const duty = getDutyShiftInfo();
        const startTs = getFullTimestamp(new Date(Date.now() - score * 1000));
        const endTs = getFullTimestamp();
        const typeMap = {
            standard: '引体向上',
            wide: '阔引体',
            hang: '极限悬挂'
        };
        const actName = typeMap[hangVariant] || '引体';

        const autoLog = {
            id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: duty.dutyDateStr,
            type: actName,
            sets: 1,
            reps: `${score}s`,
            total: score,
            isAerobic: false,
            isIsometric: true,
            heart: '未知',
            duration: Math.max(1, Math.round(score / 60)),
            rpe: 8,
            dutyTag: `${duty.shift.name} (归属${duty.dutyDateStr.slice(5)})`,
            startTimeStamp: startTs,
            endTimeStamp: endTs,
            downSec: 0,
            upSec: 0,
            tutSeconds: score,
            note: `【${actName}】计时对抗 ${score} 秒。`,
            createdAt: new Date().toISOString()
        };

        data.logs.push(autoLog);

        // 联动销项
        data.workoutQueue = data.workoutQueue.filter(x => !(x.actionId === 'act_pullup' || x.actionId === 'act_pullup_wide' || x.name.includes('引体')));

        saveData();
        renderAll();

        showToast(`✅ 【${actName}】${score}秒 已正式入册！`);
        speakFast("战绩已成功封存入册！");
    } else {
        showToast("🗑️ 此次训练已放弃，未记入实录。");
    }

    resetHangAll();
}

function resetHangAll() {
    clearInterval(hangTicker);
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    hangState = 'idle';
    const board = document.getElementById('hangDisplayBoard');
    if (board) board.classList.remove('is-running', 'in-prep');
    updateHangButtonUI(false);

    const hint = document.getElementById('hangStatusHint');
    if (hint) hint.innerText = "READY";
    const tv = document.getElementById('hangTimerValue');

    if (hangMode === 'countdown') {
        hangCurrentTime = data.settings.hangTargetCountdown || 30;
        if (tv) tv.innerText = hangCurrentTime;
    } else {
        hangCurrentTime = 0;
        if (tv) tv.innerText = "0";
    }
    setHangProgress(1);
}

function updateHangButtonUI(isRunning) {
    const btn = document.getElementById('hangMainActionBtn');
    if (!btn) return;
    if (isRunning) {
        btn.innerText = "结束 / 结算";
        btn.className = "btn btn-danger";
    } else {
        btn.innerText = "开始计时";
        btn.className = "btn btn-primary";
    }
}

function openHangSettings() {
    const modal = document.getElementById('hangSettingsModal');
    if (modal) {
        updateHangSettingsUI();
        modal.classList.add('active');
    }
}

function closeHangSettings() {
    const modal = document.getElementById('hangSettingsModal');
    if (modal) modal.classList.remove('active');
}

function stepHangPrepTime(delta) {
    let cur = (data.settings.hangPrepDuration || 10) + delta;
    if (cur < 3) cur = 3;
    if (cur > 30) cur = 30;
    data.settings.hangPrepDuration = cur;
    saveData();
    updateHangSettingsUI();
}

function selectHangPrepChip(sec) {
    data.settings.hangPrepDuration = sec;
    saveData();
    updateHangSettingsUI();
}

function updateHangSettingsUI() {
    const disp = document.getElementById('hangPrepValueDisplay');
    const cur = data.settings.hangPrepDuration || 10;
    if (disp) disp.innerText = `${cur}s`;
    document.querySelectorAll('#hangSettingsModal .prep-chip-btn').forEach(btn => {
        btn.classList.toggle('active', parseInt(btn.innerText) === cur);
    });
}