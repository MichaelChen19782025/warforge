/**
 * 天罡洗髓 · 引体全能舱 & 极限悬挂战钟 (PRO)
 * 具备：次数直录 / 极限界限秒表 / 目标倒计时
 * 优化特性：
 * 1. 悬挂做功全程每秒微频 Tick 音，告别死寂；
 * 2. 秒表模式每 5 秒（5s、10s、15s、20s...）精准语音报时与破境提示；
 * 3. 倒计时模式进入最后 10 秒开启全量逐秒（9、8、7、6...）盲听倒数；
 * 4. 完整的就位准备（5/10/15/20s）与战报结算。
 */

(function () {
    const hangState = {
        variant: 'standard', // 'standard' | 'wide' | 'hang'
        mode: 'reps',        // 'reps' | 'stopwatch' | 'countdown'
        status: 'ready',     // 'ready' | 'prep' | 'running' | 'paused'
        prepDuration: 10,
        countdownTarget: 30,
        elapsedSeconds: 0,
        timeRemaining: 0,
        intervalId: null,
        lastTickTimestamp: 0,
        personalBest: 0,
        repsCount: 8
    };

    // Web Audio 雷达音效
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
        if (typeof window.speak === 'function') {
            window.speak(text);
            return;
        }
        if ('speechSynthesis' in window) {
            try {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(text);
                utter.lang = 'zh-CN';
                utter.rate = 1.1;
                utter.pitch = 1.0;
                window.speechSynthesis.speak(utter);
            } catch (e) {
                console.warn('TTS error:', e);
            }
        }
    }

    // 本地 PB 加载与持久化
    function loadPb() {
        const stored = localStorage.getItem(`hang_pb_${hangState.variant}`);
        hangState.personalBest = stored ? parseInt(stored) : 0;
        updatePbDisplay();
    }

    function savePb(newScore) {
        if (newScore > hangState.personalBest) {
            hangState.personalBest = newScore;
            localStorage.setItem(`hang_pb_${hangState.variant}`, newScore);
            updatePbDisplay();
            return true;
        }
        return false;
    }

    function updatePbDisplay() {
        const pbEl = document.getElementById('hangPbDisplay');
        if (pbEl) {
            pbEl.textContent = `🏆 PB: ${hangState.personalBest}s`;
        }
    }

    // 动作变式切换
    window.switchHangVariant = function (variant) {
        hangState.variant = variant;
        ['standard', 'wide', 'hang'].forEach(v => {
            const chip = document.getElementById(`chipVar${v.charAt(0).toUpperCase() + v.slice(1)}`);
            if (chip) chip.classList.toggle('active', v === variant);
        });
        loadPb();
    };

    // 训练模式切换 (次数直录 / 秒表 / 倒计时)
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

    // 次数直录模式逻辑
    window.setQuickHangReps = function (reps) {
        hangState.repsCount = parseInt(reps) || 8;
        const input = document.getElementById('hangRepsInput');
        if (input) input.value = hangState.repsCount;
        [3, 5, 8, 10, 12, 15].forEach(r => {
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
        speakVoice(`记录入册！有效引体做功 ${count} 次`);

        if (typeof window.showToast === 'function') {
            window.showToast(`✅ 引体 ${count} 次已记录入册！`);
        }

        if (typeof window.recordWorkoutLog === 'function') {
            window.recordWorkoutLog({
                type: hangState.variant === 'hang' ? '悬挂支撑' : '引体向上',
                reps: count,
                variant: hangState.variant
            });
        }
    };

    window.discardHangReps = function () {
        speakVoice('已放弃本次记录');
        if (typeof window.showToast === 'function') {
            window.showToast('🗑️ 本次已放弃');
        }
    };

    // 倒计时预设选择
    window.setHangCountdownTime = function (sec) {
        hangState.countdownTarget = parseInt(sec) || 30;
        const chips = document.querySelectorAll('#hangPresetContainer .preset-chip');
        chips.forEach(c => {
            c.classList.toggle('active', c.textContent.includes(`${sec}秒`));
        });
        if (hangState.status === 'ready') {
            updateDialValue(hangState.countdownTarget, 'TARGET SEC');
        }
    };

    // 拨盘数字与环形进度条驱动
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

    // 时钟驱动逻辑
    function onHangTimerTick() {
        const now = Date.now();
        const delta = (now - hangState.lastTickTimestamp) / 1000;
        hangState.lastTickTimestamp = now;

        // 1. 抓杠就位准备倒计时
        if (hangState.status === 'prep') {
            const prevSec = Math.ceil(hangState.timeRemaining);
            hangState.timeRemaining -= delta;
            const currSec = Math.ceil(hangState.timeRemaining);

            updateDialValue(Math.max(0, currSec), 'PREPARING');
            const pct = Math.max(0, (hangState.timeRemaining / hangState.prepDuration) * 100);
            setRingProgress(pct);

            if (prevSec !== currSec && currSec >= 1 && currSec <= 3) {
                playBeep(700, 0.08);
                speakVoice(String(currSec));
            }

            if (hangState.timeRemaining <= 0) {
                playBeep(1200, 0.25);
                startActualHanging();
            }
            return;
        }

        // 2. 正向秒表 (极限界限)
        if (hangState.status === 'running' && hangState.mode === 'stopwatch') {
            const prevSec = Math.floor(hangState.elapsedSeconds);
            hangState.elapsedSeconds += delta;
            const currSec = Math.floor(hangState.elapsedSeconds);

            updateDialValue(currSec, 'SECONDS');
            const ringTarget = Math.max(60, hangState.personalBest || 30);
            const pct = Math.min(100, (hangState.elapsedSeconds / ringTarget) * 100);
            setRingProgress(pct);

            // 【核心优化】：每秒微频 Tick 音，不再死寂
            if (prevSec !== currSec && currSec > 0) {
                playBeep(850, 0.03, 'sine', 0.08);

                // 【核心优化】：每 5 秒精准语音播报，逢 30/60 秒进阶激励
                if (currSec % 5 === 0) {
                    if (currSec === 30) {
                        speakVoice('30秒！突破半分钟！');
                    } else if (currSec === 60) {
                        speakVoice('60秒！突破一分钟！');
                    } else if (currSec === 90) {
                        speakVoice('90秒！金刚神力！');
                    } else {
                        speakVoice(`${currSec}秒`);
                    }
                }
            }
            return;
        }

        // 3. 目标挑战 (倒计时)
        if (hangState.status === 'running' && hangState.mode === 'countdown') {
            const prevSec = Math.ceil(hangState.timeRemaining);
            hangState.timeRemaining -= delta;
            const currSec = Math.ceil(hangState.timeRemaining);

            updateDialValue(Math.max(0, currSec), 'REMAINING');
            const pct = Math.max(0, (hangState.timeRemaining / hangState.countdownTarget) * 100);
            setRingProgress(pct);

            // 【核心优化】：做功每秒节拍微音
            if (prevSec !== currSec && currSec > 0) {
                playBeep(850, 0.03, 'sine', 0.08);

                // 剩余 > 10 秒时：每 5 秒节点提醒
                if (currSec > 10 && currSec % 5 === 0) {
                    speakVoice(`还剩${currSec}秒`);
                }
                // 剩余 <= 10 秒时：逐秒盲听连续倒数！
                else if (currSec <= 10 && currSec >= 1) {
                    playBeep(900, 0.06);
                    speakVoice(String(currSec));
                }
            }

            if (hangState.timeRemaining <= 0) {
                // 目标达成！
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
            hangState.elapsedSeconds = 0;
            speakVoice('抓杠开始！极限界限');
            updateDialValue(0, 'SECONDS');
        } else {
            hangState.timeRemaining = hangState.countdownTarget;
            speakVoice(`抓杠开始！目标 ${hangState.countdownTarget} 秒`);
            updateDialValue(hangState.countdownTarget, 'REMAINING');
        }
    }

    function onCountdownCompleted() {
        stopHangInterval();
        hangState.status = 'ready';
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

    // 结算弹窗展示与段位评估
    function showResultModal(scoreSec, isSuccess = true) {
        const modal = document.getElementById('hangResultModal');
        const scoreEl = document.getElementById('hangResultScore');
        const rankEl = document.getElementById('hangResultRank');
        const descEl = document.getElementById('hangResultDesc');

        if (!modal) return;
        modal.classList.add('active');

        if (scoreEl) scoreEl.innerHTML = `${scoreSec}<span style="font-size: 2rem; color: #9aa0a6;">s</span>`;

        let rank = '抓握初成';
        if (scoreSec >= 60) rank = '天罡武圣 · 极意抓握';
        else if (scoreSec >= 45) rank = '金刚神魔 · 筋膜如铁';
        else if (scoreSec >= 30) rank = '钢铁抓握力 · 破境';
        else if (scoreSec >= 15) rank = '坚毅淬体 · 精通';

        if (rankEl) rankEl.textContent = rank;
        if (descEl) {
            descEl.textContent = isSuccess
                ? '每一次做功都在重塑筋膜与小臂抓握力！'
                : '虽未达标，但有效做功已刺激肌纤维！';
        }

        savePb(scoreSec);
    }

    // 拍击圆盘结算交互
    window.handleHangDialClick = function () {
        if (hangState.status === 'running') {
            stopHangInterval();
            const score = hangState.mode === 'stopwatch'
                ? Math.floor(hangState.elapsedSeconds)
                : Math.max(0, hangState.countdownTarget - Math.ceil(hangState.timeRemaining));

            playBeep(950, 0.15);
            speakVoice(`结算完成，本次悬挂 ${score} 秒`);
            showResultModal(score, score >= hangState.countdownTarget);
            hangState.status = 'ready';
            const actionBtn = document.getElementById('hangMainActionBtn');
            if (actionBtn) actionBtn.textContent = '开始计时';
        }
    };

    window.toggleHangStart = function () {
        getAudioCtx();
        const actionBtn = document.getElementById('hangMainActionBtn');
        const hintEl = document.getElementById('hangStatusHint');

        if (hangState.status === 'ready') {
            // 启动准备倒计时
            hangState.status = 'prep';
            hangState.timeRemaining = hangState.prepDuration;
            hangState.lastTickTimestamp = Date.now();
            if (hintEl) hintEl.textContent = 'GET READY';
            if (actionBtn) actionBtn.textContent = '⏹ 终止复位';

            speakVoice(`准备抓杠，留${hangState.prepDuration}秒就位`);
            stopHangInterval();
            hangState.intervalId = setInterval(onHangTimerTick, 100);
        } else {
            // 终止复位
            resetHangAll();
        }
    };

    window.resetHangAll = function () {
        stopHangInterval();
        hangState.status = 'ready';
        hangState.elapsedSeconds = 0;
        hangState.timeRemaining = 0;

        const actionBtn = document.getElementById('hangMainActionBtn');
        const hintEl = document.getElementById('hangStatusHint');
        const tapHint = document.getElementById('hangTapStopHint');
        if (actionBtn) actionBtn.textContent = '开始计时';
        if (hintEl) hintEl.textContent = 'READY';
        if (tapHint) tapHint.textContent = '拍击圆盘立即结算';

        setRingProgress(0);
        updateDialValue(hangState.mode === 'countdown' ? hangState.countdownTarget : 0, 'SECONDS');
    };

    window.closeHangResultModal = function (shouldSave) {
        const modal = document.getElementById('hangResultModal');
        if (modal) modal.classList.remove('active');

        if (shouldSave) {
            speakVoice('有效做功已封存入册！');
            if (typeof window.showToast === 'function') {
                window.showToast('💾 悬挂战功已成功封存！');
            }
        } else {
            speakVoice('本次战报已放弃');
        }
        resetHangAll();
    };

    // 偏好设置弹窗 (就位时间调谐)
    window.openHangSettings = function () {
        const modal = document.getElementById('hangSettingsModal');
        if (modal) modal.classList.add('active');
    };

    window.closeHangSettings = function () {
        const modal = document.getElementById('hangSettingsModal');
        if (modal) modal.classList.remove('active');
    };

    window.selectHangPrepChip = function (sec) {
        hangState.prepDuration = parseInt(sec) || 10;
        const valEl = document.getElementById('hangPrepValueDisplay');
        if (valEl) valEl.textContent = `${hangState.prepDuration}s`;

        const chips = document.querySelectorAll('#hangSettingsModal .prep-chip-btn');
        chips.forEach(c => {
            c.classList.toggle('active', c.textContent.includes(`${sec}秒`));
        });
    };

    window.stepHangPrepTime = function (delta) {
        const next = Math.max(3, Math.min(30, hangState.prepDuration + delta));
        window.selectHangPrepChip(next);
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadPb();
        setRingProgress(0);
    });
})();