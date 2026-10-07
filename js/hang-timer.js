/**
天罡洗髓 · 引体全能舱 & 极限悬挂战钟 (PRO)
默认直接采用【极限悬挂】(静态单杠死磕)；
【首屏中置主战区】：大表盘与正中央巨型开始按钮直接可见，无需滚屏；
【10阶倒序脱杠延时校准补偿】：停表后自动弹出扣减延时的选择板
（以停表数先减 4 秒为最高值，如 40 秒停表产生：36, 35, 34, 33, 32, 31, 30, 29, 28, 27），
单手轻触即可核销脱杠落地与点击手机的时间差！
*/
(function () {
var hangState = {
variant: 'hang', // 默认极限悬挂
mode: 'stopwatch', // 默认正向秒表
status: 'idle', // 'idle' | 'prep' | 'running'
prepDuration: 10,
countdownTarget: 30,
elapsedSeconds: 0,
timeRemaining: 0,
intervalId: null,
repsCount: 8,
capturedRawSeconds: 0
};
var audioCtx = null;
function getAudioCtx() {
    if (!audioCtx) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) audioCtx = new AudioContextClass();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playBeep(freq, duration, type, volume) {
    freq = freq || 800;
    duration = duration || 0.05;
    type = type || 'sine';
    volume = volume || 0.12;
    try {
        var ctx = getAudioCtx();
        if (!ctx) return;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) { }
}

function speakVoice(text) {
    if (!('speechSynthesis' in window)) return;
    try {
        window.speechSynthesis.cancel();
        var utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'zh-CN';
        utter.rate = 1.35;
        utter.pitch = 1.05;
        window.speechSynthesis.speak(utter);
    } catch (e) { }
}

function loadPb() {
    if (window.data && data.settings) {
        if (data.settings.hangPrepDuration) hangState.prepDuration = data.settings.hangPrepDuration;
        if (data.settings.hangCountdownTarget) hangState.countdownTarget = data.settings.hangCountdownTarget;
    }
    var stored = localStorage.getItem('hang_pb_' + hangState.variant);
    var pb = stored ? parseInt(stored) : (data && data.settings && data.settings.hangBestRecord ? data.settings.hangBestRecord : 0);
    updatePbDisplay(pb);
}

function savePb(newScore) {
    var stored = localStorage.getItem('hang_pb_' + hangState.variant);
    var curBest = stored ? parseInt(stored) : 0;
    if (newScore > curBest) {
        localStorage.setItem('hang_pb_' + hangState.variant, newScore);
        if (window.data && data.settings) {
            data.settings.hangBestRecord = newScore;
            saveData();
        }
        updatePbDisplay(newScore);
        return true;
    }
    return false;
}

function updatePbDisplay(pb) {
    var pbEl = document.getElementById('hangPbDisplay');
    if (pbEl) {
        pbEl.textContent = '🏆 PB: ' + (pb || 0) + 's';
    }
}

window.switchHangVariant = function (variant) {
    hangState.variant = variant;
    var variants = ['standard', 'wide', 'hang'];
    for (var i = 0; i < variants.length; i++) {
        var v = variants[i];
        var chipId = 'chipVar' + v.charAt(0).toUpperCase() + v.slice(1);
        var chip = document.getElementById(chipId);
        if (chip) chip.classList.toggle('active', v === variant);
    }
    loadPb();
};

window.switchHangMode = function (mode) {
    hangState.mode = mode;
    var modes = ['reps', 'stopwatch', 'countdown'];
    for (var i = 0; i < modes.length; i++) {
        var m = modes[i];
        var btnId = 'hangMode' + m.charAt(0).toUpperCase() + m.slice(1);
        var btn = document.getElementById(btnId);
        if (btn) btn.classList.toggle('active', m === mode);
    }

    var repsContainer = document.getElementById('hangRepsContainer');
    var timerWrap = document.getElementById('hangTimerDialWrap');
    var presetContainer = document.getElementById('hangPresetContainer');

    if (mode === 'reps') {
        if (repsContainer) repsContainer.classList.remove('hidden');
        if (timerWrap) timerWrap.classList.add('hidden');
    } else {
        if (repsContainer) repsContainer.classList.add('hidden');
        if (timerWrap) timerWrap.classList.remove('hidden');
        if (presetContainer) {
            presetContainer.classList.toggle('hidden', mode !== 'countdown');
        }
    }
    resetHangAll();
};

window.setQuickHangReps = function (reps) {
    hangState.repsCount = parseInt(reps) || 8;
    var input = document.getElementById('hangRepsInput');
    if (input) input.value = hangState.repsCount;
    var presets = [3, 5, 8, 10, 12];
    for (var i = 0; i < presets.length; i++) {
        var r = presets[i];
        var chip = document.getElementById('chipRep' + r);
        if (chip) chip.classList.toggle('active', r === hangState.repsCount);
    }
};

window.stepHangReps = function (delta) {
    var next = Math.max(1, Math.min(100, hangState.repsCount + delta));
    window.setQuickHangReps(next);
};

window.commitHangReps = function () {
    getAudioCtx();
    var input = document.getElementById('hangRepsInput');
    var count = input ? (parseInt(input.value) || hangState.repsCount) : hangState.repsCount;
    playBeep(1200, 0.2);
    speakVoice('做功 ' + count + ' 次');

    if (window.data && data.logs) {
        var duty = (typeof getDutyShiftInfo === 'function') ? getDutyShiftInfo() : { dutyDateStr: new Date().toISOString().slice(0, 10), shift: { name: '日常' } };
        var typeName = hangState.variant === 'hang' ? '极限悬挂' : (hangState.variant === 'wide' ? '阔引体' : '标准引体');

        data.logs.push({
            id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: duty.dutyDateStr,
            type: typeName,
            sets: 1,
            reps: count + '次',
            total: count,
            isAerobic: false,
            isIsometric: (hangState.variant === 'hang'),
            heart: '未知',
            duration: 5,
            rpe: 8,
            dutyTag: duty.shift.name + ' (归属' + duty.dutyDateStr.slice(5) + ')',
            startTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString(),
            endTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString(),
            downSec: 0,
            upSec: 0,
            tutSeconds: count * 3,
            note: typeName + '直录：有效做功 ' + count + ' 次。',
            createdAt: new Date().toISOString()
        });

        if (Array.isArray(data.workoutQueue)) {
            data.workoutQueue = data.workoutQueue.filter(function (x) {
                return !(x.actionId === 'act_pullup' || x.actionId === 'act_pullup_wide' || x.actionId === 'act_hang');
            });
        }

        saveData();
        if (typeof renderAll === 'function') renderAll();
        if (typeof showToast === 'function') showToast('✅ ' + typeName + ' ' + count + ' 次已记录入册！');
    }
};

window.discardHangReps = function () {
    speakVoice('已放弃本次记录');
    if (typeof showToast === 'function') showToast('🗑️ 本次已放弃');
};

window.setHangCountdownTime = function (sec) {
    var val = parseInt(sec) || 30;
    hangState.countdownTarget = val;
    if (window.data && data.settings) {
        data.settings.hangCountdownTarget = val;
        saveData();
    }
    var chips = document.querySelectorAll('#hangPresetContainer .preset-chip');
    chips.forEach(function (c) {
        c.classList.toggle('active', c.textContent.indexOf(val + '秒') !== -1);
    });
    if (hangState.status === 'idle') {
        updateDialValue(hangState.countdownTarget, 'TARGET SEC');
    }
};

function updateDialValue(val, unit) {
    unit = unit || 'SECONDS';
    var valEl = document.getElementById('hangTimerValue');
    var unitEl = document.getElementById('hangTimerUnit');
    if (valEl) valEl.textContent = val;
    if (unitEl) unitEl.textContent = unit;
}

function setRingProgress(percent) {
    var circle = document.getElementById('hangProgressRing');
    if (!circle) return;
    var radius = circle.r.baseVal.value;
    var circumference = 2 * Math.PI * radius;
    var offset = circumference - (percent / 100) * circumference;
    circle.style.strokeDasharray = circumference + ' ' + circumference;
    circle.style.strokeDashoffset = offset;
}

function onHangTimerTick() {
    if (hangState.status === 'prep') {
        hangState.timeRemaining--;
        updateDialValue(Math.max(0, hangState.timeRemaining), 'PREPARING');
        var pctPrep = Math.max(0, (hangState.timeRemaining / hangState.prepDuration) * 100);
        setRingProgress(pctPrep);

        if (hangState.timeRemaining > 0) {
            playBeep(700, 0.08);
            speakVoice(String(hangState.timeRemaining));
        } else {
            playBeep(1200, 0.25);
            startActualHanging();
        }
        return;
    }

    if (hangState.status === 'running' && hangState.mode === 'stopwatch') {
        hangState.elapsedSeconds++;
        updateDialValue(hangState.elapsedSeconds, 'SECONDS');
        var ringTarget = Math.max(60, hangState.countdownTarget || 30);
        var pctSw = Math.min(100, (hangState.elapsedSeconds / ringTarget) * 100);
        setRingProgress(pctSw);
        speakVoice(String(hangState.elapsedSeconds));
        return;
    }

    if (hangState.status === 'running' && hangState.mode === 'countdown') {
        hangState.timeRemaining--;
        updateDialValue(Math.max(0, hangState.timeRemaining), 'REMAINING');
        var pctCd = Math.max(0, (hangState.timeRemaining / hangState.countdownTarget) * 100);
        setRingProgress(pctCd);

        if (hangState.timeRemaining > 0) {
            speakVoice(String(hangState.timeRemaining));
        } else {
            onCountdownCompleted();
        }
        return;
    }
}

function startActualHanging() {
    hangState.status = 'running';
    var hintEl = document.getElementById('hangStatusHint');
    var tapHint = document.getElementById('hangTapStopHint');
    if (hintEl) hintEl.textContent = 'HANGING NOW';
    if (tapHint) tapHint.textContent = '拍击圆盘立即结算';

    if (hangState.mode === 'stopwatch') {
        hangState.elapsedSeconds = 1;
        speakVoice('1');
        updateDialValue(1, 'SECONDS');
    } else {
        hangState.timeRemaining = hangState.countdownTarget;
        speakVoice(String(hangState.countdownTarget));
        updateDialValue(hangState.countdownTarget, 'REMAINING');
    }
}

function onCountdownCompleted() {
    stopHangInterval();
    hangState.status = 'idle';
    playBeep(1200, 0.4);
    speakVoice('目标达成！天罡筋膜，金刚不坏！');
    showResultModal(hangState.countdownTarget, true);
}

function stopHangInterval() {
    if (hangState.intervalId) {
        clearInterval(hangState.intervalId);
        hangState.intervalId = null;
    }
}

// ================================================================
// ★ 核心创新点：10阶倒序脱杠延时校准机制 (纯净字符串拼接，杜绝嵌套模板)
// ================================================================
function triggerStopAndCalibration() {
    stopHangInterval();
    hangState.capturedRawSeconds = hangState.mode === 'stopwatch'
        ? hangState.elapsedSeconds
        : Math.max(0, hangState.countdownTarget - hangState.timeRemaining);

    if (hangState.capturedRawSeconds < 5) {
        settleFinalScore(hangState.capturedRawSeconds);
        return;
    }

    var modal = document.getElementById('hangLatencyModal');
    var rawEl = document.getElementById('hangLatencyRawScore');
    var container = document.getElementById('hangLatencyButtonsContainer');
    var origBtn = document.getElementById('hangLatencyOriginalBtn');

    if (rawEl) rawEl.textContent = hangState.capturedRawSeconds + 's';
    if (origBtn) origBtn.textContent = '⏱️ 按停表原时 (' + hangState.capturedRawSeconds + 's) 记录';

    // 以停表数先减 4 秒为最高值，倒序生成 10 个按钮
    // 例如 40 秒停表产生：36, 35, 34, 33, 32, 31, 30, 29, 28, 27
    var startCalib = Math.max(1, hangState.capturedRawSeconds - 4);
    var htmlButtons = '';
    for (var i = 0; i < 10; i++) {
        var sec = startCalib - i;
        if (sec > 0) {
            htmlButtons += '<button type="button" class="latency-chip-btn" onclick="confirmHangLatency(' + sec + ')">' + sec + 's</button>';
        }
    }

    if (container) {
        container.innerHTML = htmlButtons;
    }

    if (modal) modal.classList.add('active');
    playBeep(900, 0.1);
}

window.confirmHangLatency = function (selectedSeconds) {
    var modal = document.getElementById('hangLatencyModal');
    if (modal) modal.classList.remove('active');

    var finalScore = selectedSeconds > 0 ? selectedSeconds : hangState.capturedRawSeconds;
    speakVoice('校准完成，确认为 ' + finalScore + ' 秒！');
    settleFinalScore(finalScore);
};

window.cancelHangLatencyModal = function () {
    var modal = document.getElementById('hangLatencyModal');
    if (modal) modal.classList.remove('active');
    resetHangAll();
    speakVoice('已放弃本次悬挂记录');
};

function settleFinalScore(score) {
    showResultModal(score, score >= hangState.countdownTarget);
    hangState.status = 'idle';
    var actionBtn = document.getElementById('hangMainActionBtn');
    if (actionBtn) actionBtn.textContent = '▶ 开始悬挂';
}

function showResultModal(scoreSec, isSuccess) {
    if (isSuccess === undefined) isSuccess = true;
    var modal = document.getElementById('hangResultModal');
    var scoreEl = document.getElementById('hangResultScore');
    var rankEl = document.getElementById('hangResultRank');
    var descEl = document.getElementById('hangResultDesc');

    if (!modal) return;
    modal.classList.add('active');

    if (scoreEl) scoreEl.innerHTML = scoreSec + '<span style="font-size: 1.6rem; color: #9aa0a6;">s</span>';

    var rank = '抓握初成';
    if (scoreSec >= 60) rank = '天罡武圣 · 极意抓握';
    else if (scoreSec >= 45) rank = '金刚神魔 · 筋膜如铁';
    else if (scoreSec >= 30) rank = '钢铁抓握力 · 破境';
    else if (scoreSec >= 15) rank = '坚毅淬体 · 精通';

    if (rankEl) rankEl.textContent = rank;
    if (descEl) {
        descEl.textContent = isSuccess
            ? '脱杠延时已自动核销！每一次实修都在重塑筋膜与小臂抓握力！'
            : '有效做功已深度刺激肌纤维，下次必破境！';
    }

    savePb(scoreSec);
}

window.handleHangDialClick = function () {
    if (hangState.status === 'running') {
        triggerStopAndCalibration();
    }
};

window.toggleHangStart = function () {
    getAudioCtx();
    var actionBtn = document.getElementById('hangMainActionBtn');
    var hintEl = document.getElementById('hangStatusHint');

    if (hangState.status === 'idle') {
        hangState.status = 'prep';
        hangState.timeRemaining = hangState.prepDuration;
        if (hintEl) hintEl.textContent = 'GET READY';
        if (actionBtn) actionBtn.textContent = '⏹ 结束悬挂';

        speakVoice('准备抓杠，' + hangState.prepDuration + '秒就位');
        stopHangInterval();
        hangState.intervalId = setInterval(onHangTimerTick, 1000);
    } else {
        triggerStopAndCalibration();
    }
};

window.resetHangAll = function () {
    stopHangInterval();
    hangState.status = 'idle';
    hangState.elapsedSeconds = 0;
    hangState.timeRemaining = 0;

    var actionBtn = document.getElementById('hangMainActionBtn');
    var hintEl = document.getElementById('hangStatusHint');
    var tapHint = document.getElementById('hangTapStopHint');
    if (actionBtn) actionBtn.textContent = '▶ 开始悬挂';
    if (hintEl) hintEl.textContent = 'READY';
    if (tapHint) tapHint.textContent = '拍击圆盘立即结算';

    setRingProgress(0);
    updateDialValue(hangState.mode === 'countdown' ? hangState.countdownTarget : 0, 'SECONDS');
};

window.closeHangResultModal = function (shouldSave) {
    var modal = document.getElementById('hangResultModal');
    if (modal) modal.classList.remove('active');

    if (shouldSave && window.data && data.logs) {
        var scoreEl = document.getElementById('hangResultScore');
        var scoreSec = parseInt(scoreEl ? scoreEl.textContent : 0) || 30;
        var duty = (typeof getDutyShiftInfo === 'function') ? getDutyShiftInfo() : { dutyDateStr: new Date().toISOString().slice(0, 10), shift: { name: '日常' } };

        data.logs.push({
            id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: duty.dutyDateStr,
            type: '极限悬挂',
            sets: 1,
            reps: scoreSec + 's',
            total: scoreSec,
            isAerobic: false,
            isIsometric: true,
            heart: '未知',
            duration: Math.max(1, Math.round(scoreSec / 60)),
            rpe: 8,
            dutyTag: duty.shift.name + ' (归属' + duty.dutyDateStr.slice(5) + ')',
            startTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString(),
            endTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString(),
            downSec: 0,
            upSec: 0,
            tutSeconds: scoreSec,
            note: '极限悬挂做功(已通过10阶延时补偿核销)：净做功 ' + scoreSec + ' 秒。',
            createdAt: new Date().toISOString()
        });

        saveData();
        if (typeof renderAll === 'function') renderAll();
        speakVoice('有效做功已封存入册！');
        if (typeof showToast === 'function') showToast('💾 悬挂战功已成功封存！');
    } else {
        speakVoice('本次战报已放弃');
    }
    resetHangAll();
};

document.addEventListener('DOMContentLoaded', function () {
    loadPb();
    setRingProgress(0);
    window.switchHangVariant('hang');
});
})();