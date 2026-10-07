/**
 * 天罡洗髓 · 引体全能舱 & 极限悬挂战钟 (PRO)
 * 具备特性：
 * 1. 默认直接采用【极限悬挂】(静态单杠死磕)；
 * 2. 【核心升级·脱杠延时校准补偿】：当点击结束正向读秒时，自动弹出包含 10 个时长的校准选择板，
 *    以当前停表数先减去 4 秒为最高值，依次递减 10 个按钮，精准扣除脱杠放下手机并点击的时间！
 * 3. 每一个秒表节点都由 Web Audio 与 TTS 语音清晰读秒，拒绝死寂。
 */

(function () {
    const hangState = {
        variant: 'hang',     // 默认变式锁定为极限悬挂: 'hang' | 'standard' | 'wide'
        mode: 'stopwatch',   // 'stopwatch' | 'countdown' | 'reps'
        status: 'idle',      // 'idle' | 'prep' | 'running'
        prepDuration: 10,
        countdownTarget: 30,
        elapsedSeconds: 0,
        timeRemaining: 0,
        intervalId: null,
        repsCount: 8,
        capturedRawSeconds: 0
    };

    let audioCtx = null;
    function getAudioCtx() {
        if (!audioCtx) {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) audioCtx = new AudioContextClass();
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
        return audioCtx;
    }

    function playBeep(freq = 800, duration = 0.05, type = 'sine', volume = 0.12) {
        try {
            const ctx = getAudioCtx();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
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
            const utter = new SpeechSynthesisUtterance(text);
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
        const stored = localStorage.getItem(`hang_pb_${hangState.variant}`);
        const pb = stored ? parseInt(stored) : (data?.settings?.hangBestRecord || 0);
        updatePbDisplay(pb);
    }

    function savePb(newScore) {
        const stored = localStorage.getItem(`hang_pb_${hangState.variant}`);
        const curBest = stored ? parseInt(stored) : 0;
        if (newScore > curBest) {
            localStorage.setItem(`hang_pb_${hangState.variant}`, newScore);
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
        const pbEl = document.getElementById('hangPbDisplay');
        if (pbEl) {
            pbEl.textContent = `🏆 PB: ${pb || 0}s`;
        }
    }

    // 变式切换
    window.switchHangVariant = function (variant) {
        hangState.variant = variant;
        ['standard', 'wide', 'hang'].forEach(v => {
            const chip = document.getElementById(`chipVar${v.charAt(0).toUpperCase() + v.slice(1)}`);
            if (chip) chip.classList.toggle('active', v === variant);
        });
        loadPb();
    };

    // 模式切换
    window.switchHangMode = function (mode) {
        hangState.mode = mode;
        ['reps', 'stopwatch', 'countdown'].forEach(m => {
            const btn = document.getElementById(`hangMode${m.charAt(0).toUpperCase() + m.slice(1)}`);
            if (btn) btn.classList.toggle('active', m === mode);
        });

        const repsContainer = document.getElementById('hangRepsContainer');
        const timerWrap = document.getElementById('hangTimerDialWrap');
        const presetContainer = document.getElementById('hangPresetContainer');

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

    // 次数直录
    window.setQuickHangReps = function (reps) {
        hangState.repsCount = parseInt(reps) || 8;
        const input = document.getElementById('hangRepsInput');
        if (input) input.value = hangState.repsCount;
        [3, 5, 8, 10, 12].forEach(r => {
            const chip = document.getElementById(`chipRep${r}`);
            if (chip) chip.classList.toggle('active', r === hangState.repsCount);
        });
    };

    window.stepHangReps = function (delta) {
        const next = Math.max(1, Math.min(100, hangState.repsCount + delta));
        window.setQuickHangReps(next);
    };

    window.commitHangReps = function () {
        getAudioCtx();
        const input = document.getElementById('hangRepsInput');
        const count = input ? (parseInt(input.value) || hangState.repsCount) : hangState.repsCount;
        playBeep(1200, 0.2);
        speakVoice(`做功 ${count} 次`);

        if (window.data && data.logs) {
            const duty = (typeof getDutyShiftInfo === 'function') ? getDutyShiftInfo() : { dutyDateStr: new Date().toISOString().slice(0, 10), shift: { name: '日常' } };
            const typeName = hangState.variant === 'hang' ? '极限悬挂' : (hangState.variant === 'wide' ? '阔引体' : '引体');

            data.logs.push({
                id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                date: duty.dutyDateStr,
                type: typeName,
                sets: 1,
                reps: `${count}次`,
                total: count,
                isAerobic: false,
                isIsometric: (hangState.variant === 'hang'),
                heart: '未知',
                duration: 5,
                rpe: 8,
                dutyTag: `${duty.shift.name} (归属${duty.dutyDateStr.slice(5)})`,
                startTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString(),
                endTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString(),
                downSec: 0,
                upSec: 0,
                tutSeconds: count * 3,
                note: `${typeName}完成：有效做功 ${count} 次。`,
                createdAt: new Date().toISOString()
            });

            if (Array.isArray(data.workoutQueue)) {
                data.workoutQueue = data.workoutQueue.filter(x => !(x.actionId === 'act_pullup' || x.actionId === 'act_pullup_wide' || x.actionId === 'act_hang'));
            }

            saveData();
            if (typeof renderAll === 'function') renderAll();
            if (typeof showToast === 'function') showToast(`✅ ${typeName} ${count} 次已记录入册！`);
        }
    };

    window.discardHangReps = function () {
        speakVoice('已放弃本次记录');
        if (typeof showToast === 'function') showToast('🗑️ 本次已放弃');
    };

    window.setHangCountdownTime = function (sec) {
        const val = parseInt(sec) || 30;
        hangState.countdownTarget = val;
        if (window.data && data.settings) {
            data.settings.hangCountdownTarget = val;
            saveData();
        }
        const chips = document.querySelectorAll('#hangPresetContainer .preset-chip');
        chips.forEach(c => {
            c.classList.toggle('active', c.textContent.includes(`${val}秒`));
        });
        if (hangState.status === 'idle') {
            updateDialValue(hangState.countdownTarget, 'TARGET SEC');
        }
    };

    function updateDialValue(val, unit = 'SECONDS') {
        const valEl = document.getElementById('hangTimerValue');
        const unitEl = document.getElementById('hangTimerUnit');
        if (valEl) valEl.textContent = val;
        if (unitEl) unitEl.textContent = unit;
    }

    function setRingProgress(percent) {
        const circle = document.getElementById('hangProgressRing');
        if (!circle) return;
        const radius = circle.r.baseVal.value;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = offset;
    }

    function onHangTimerTick() {
        if (hangState.status === 'prep') {
            hangState.timeRemaining--;
            updateDialValue(Math.max(0, hangState.timeRemaining), 'PREPARING');
            const pct = Math.max(0, (hangState.timeRemaining / hangState.prepDuration) * 100);
            setRingProgress(pct);

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
            const ringTarget = Math.max(60, hangState.countdownTarget || 30);
            const pct = Math.min(100, (hangState.elapsedSeconds / ringTarget) * 100);
            setRingProgress(pct);
            speakVoice(String(hangState.elapsedSeconds));
            return;
        }

        if (hangState.status === 'running' && hangState.mode === 'countdown') {
            hangState.timeRemaining--;
            updateDialValue(Math.max(0, hangState.timeRemaining), 'REMAINING');
            const pct = Math.max(0, (hangState.timeRemaining / hangState.countdownTarget) * 100);
            setRingProgress(pct);

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
        const hintEl = document.getElementById('hangStatusHint');
        const tapHint = document.getElementById('hangTapStopHint');
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
    // ★ 核心创新点：脱杠延时校准补偿机制 (Latency Compensation Picker)
    // ================================================================
    function triggerStopAndCalibration() {
        stopHangInterval();
        hangState.capturedRawSeconds = hangState.mode === 'stopwatch'
            ? hangState.elapsedSeconds
            : Math.max(0, hangState.countdownTarget - hangState.timeRemaining);

        // 如果时长非常短(<5s)，无需弹窗，直接结算
        if (hangState.capturedRawSeconds < 5) {
            settleFinalScore(hangState.capturedRawSeconds);
            return;
        }

        // 渲染 10 个时长校准按钮 (以 Raw - 4 秒为最高值，倒序排布 10 个)
        // 例如 40 秒停表：展示 36, 35, 34, 33, 32, 31, 30, 29, 28, 27
        const modal = document.getElementById('hangLatencyModal');
        const rawEl = document.getElementById('hangLatencyRawScore');
        const container = document.getElementById('hangLatencyButtonsContainer');
        const origBtn = document.getElementById('hangLatencyOriginalBtn');

        if (rawEl) rawEl.textContent = `${hangState.capturedRawSeconds}s`;
        if (origBtn) origBtn.textContent = `⏱️ 按停表原时 (${hangState.capturedRawSeconds}s) 记录`;

        const startCalib = Math.max(1, hangState.capturedRawSeconds - 4);
        const buttons = [];
        for (let i = 0; i < 10; i++) {
            const sec = startCalib - i;
            if (sec > 0) buttons.push(sec);
        }

        if (container) {
            container.innerHTML = buttons.map(s => `
                <button type="button" class="latency-chip-btn" onclick="confirmHangLatency(${s})">
                    ${s}s
                </button>
            `).join('');
        }

        if (modal) modal.classList.add('active');
        playBeep(900, 0.1);
    }

    window.confirmHangLatency = function (selectedSeconds) {
        const modal = document.getElementById('hangLatencyModal');
        if (modal) modal.classList.remove('active');

        const finalScore = selectedSeconds > 0 ? selectedSeconds : hangState.capturedRawSeconds;
        speakVoice(`校准完成，确认为 ${finalScore} 秒！`);
        settleFinalScore(finalScore);
    };

    window.cancelHangLatencyModal = function () {
        const modal = document.getElementById('hangLatencyModal');
        if (modal) modal.classList.remove('active');
        resetHangAll();
        speakVoice('已放弃本次悬挂记录');
    };

    function settleFinalScore(score) {
        showResultModal(score, score >= hangState.countdownTarget);
        hangState.status = 'idle';
        const actionBtn = document.getElementById('hangMainActionBtn');
        if (actionBtn) actionBtn.textContent = '开始悬挂';
    }

    // 结算弹窗
    function showResultModal(scoreSec, isSuccess = true) {
        const modal = document.getElementById('hangResultModal');
        const scoreEl = document.getElementById('hangResultScore');
        const rankEl = document.getElementById('hangResultRank');
        const descEl = document.getElementById('hangResultDesc');

        if (!modal) return;
        modal.classList.add('active');

        if (scoreEl) scoreEl.innerHTML = `${scoreSec}<span style="font-size: 1.6rem; color: #9aa0a6;">s</span>`;

        let rank = '抓握初成';
        if (scoreSec >= 60) rank = '天罡武圣 · 极意抓握';
        else if (scoreSec >= 45) rank = '金刚神魔 · 筋膜如铁';
        else if (scoreSec >= 30) rank = '钢铁抓握力 · 破境';
        else if (scoreSec >= 15) rank = '坚毅淬体 · 精通';

        if (rankEl) rankEl.textContent = rank;
        if (descEl) {
            descEl.textContent = isSuccess
                ? '脱杠延时已自动修正！每一次实修都在重塑筋膜与小臂抓握力！'
                : '有效做功已深度刺激肌纤维，下次必破境！';
        }

        savePb(scoreSec);
    }

    // 拍击圆盘
    window.handleHangDialClick = function () {
        if (hangState.status === 'running') {
            triggerStopAndCalibration();
        }
    };

    window.toggleHangStart = function () {
        getAudioCtx();
        const actionBtn = document.getElementById('hangMainActionBtn');
        const hintEl = document.getElementById('hangStatusHint');

        if (hangState.status === 'idle') {
            hangState.status = 'prep';
            hangState.timeRemaining = hangState.prepDuration;
            if (hintEl) hintEl.textContent = 'GET READY';
            if (actionBtn) actionBtn.textContent = '⏹ 结束悬挂';

            speakVoice(`准备抓杠，${hangState.prepDuration}秒就位`);
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

        const actionBtn = document.getElementById('hangMainActionBtn');
        const hintEl = document.getElementById('hangStatusHint');
        const tapHint = document.getElementById('hangTapStopHint');
        if (actionBtn) actionBtn.textContent = '开始悬挂';
        if (hintEl) hintEl.textContent = 'READY';
        if (tapHint) tapHint.textContent = '拍击圆盘立即结算';

        setRingProgress(0);
        updateDialValue(hangState.mode === 'countdown' ? hangState.countdownTarget : 0, 'SECONDS');
    };

    window.closeHangResultModal = function (shouldSave) {
        const modal = document.getElementById('hangResultModal');
        if (modal) modal.classList.remove('active');

        if (shouldSave && window.data && data.logs) {
            const scoreEl = document.getElementById('hangResultScore');
            const scoreSec = parseInt(scoreEl?.textContent) || 30;
            const duty = (typeof getDutyShiftInfo === 'function') ? getDutyShiftInfo() : { dutyDateStr: new Date().toISOString().slice(0, 10), shift: { name: '日常' } };

            data.logs.push({
                id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                date: duty.dutyDateStr,
                type: '极限悬挂',
                sets: 1,
                reps: `${scoreSec}s`,
                total: scoreSec,
                isAerobic: false,
                isIsometric: true,
                heart: '未知',
                duration: Math.max(1, Math.round(scoreSec / 60)),
                rpe: 8,
                dutyTag: `${duty.shift.name} (归属${duty.dutyDateStr.slice(5)})`,
                startTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString(),
                endTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString(),
                downSec: 0,
                upSec: 0,
                tutSeconds: scoreSec,
                note: `极限悬挂做功(已通过延时补偿核销)：净做功 ${scoreSec} 秒。`,
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

    document.addEventListener('DOMContentLoaded', () => {
        loadPb();
        setRingProgress(0);
        // 确保默认高亮静态极限悬挂
        window.switchHangVariant('hang');
    });
})();