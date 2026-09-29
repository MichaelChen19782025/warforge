/**
 * 天罡洗髓 · 离心慢放 · 破糖战钟 (PRO)
 * 严格支持：就位准备 -> 离心慢下 -> 向心爆发 -> 组内循环 -> 组间休息 -> 下一组 -> 大功告成
 */

(function () {
    // 战钟核心状态机
    const timerState = {
        status: 'idle', // 'idle' | 'prep' | 'work_down' | 'work_up' | 'rest' | 'paused'
        previousStatus: 'idle',
        currentSet: 1,
        totalSets: 2,
        currentRep: 1,
        repsPerSet: 8,
        downSec: 4.0,
        upSec: 1.0,
        restSec: 60,
        prepSec: 10,
        phaseTimeRemaining: 0,
        phaseDuration: 0,
        intervalId: null,
        lastTickTimestamp: 0,
        voiceEnabled: true
    };

    // Web Audio 战术音效中枢
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

    function playBeep(freq = 880, duration = 0.08, type = 'sine', volume = 0.15) {
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

    // 语音播报工具
    function speakVoice(text) {
        if (!timerState.voiceEnabled) return;
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

    // 初始化与输入项同步
    function syncTimerInputs() {
        const downInput = document.getElementById('timerDownInput');
        const upInput = document.getElementById('timerUpInput');
        const restInput = document.getElementById('eccCustomRestInput');
        const voiceSelect = document.getElementById('voiceEnabled');
        const repsInput = document.getElementById('timerRepsInput');

        if (downInput) timerState.downSec = Math.max(1, parseFloat(downInput.value) || 4.0);
        if (upInput) timerState.upSec = Math.max(0.5, parseFloat(upInput.value) || 1.0);
        if (restInput) timerState.restSec = Math.max(5, parseInt(restInput.value) || 60);
        if (voiceSelect) timerState.voiceEnabled = (voiceSelect.value === 'true');
        if (repsInput) {
            timerState.repsPerSet = Math.max(1, parseInt(repsInput.value) || 8);
            updateRepsChips(timerState.repsPerSet);
        }
    }

    // 快捷设定总组数
    function setEccentricQuickSets(sets) {
        sets = Math.max(1, parseInt(sets) || 2);
        timerState.totalSets = sets;
        const setsInput = document.getElementById('timerSetsInput');
        const setsDisplay = document.getElementById('eccSetsDisplay');
        if (setsInput) setsInput.value = sets;
        if (setsDisplay) setsDisplay.textContent = sets;

        [2, 3, 4, 5].forEach(n => {
            const chip = document.getElementById(`chipSet${n}`);
            if (chip) chip.classList.toggle('active', n === sets);
        });

        if (timerState.status === 'idle') {
            updateCounterUI();
        }
    }

    function stepEccentricSets(delta) {
        setEccentricQuickSets(timerState.totalSets + delta);
    }

    // 快捷设定单组动作次数
    function setEccentricQuickReps(reps) {
        reps = Math.max(1, parseInt(reps) || 8);
        timerState.repsPerSet = reps;
        const repsInput = document.getElementById('timerRepsInput');
        const repsDisplay = document.getElementById('eccRepsDisplay');
        if (repsInput) repsInput.value = reps;
        if (repsDisplay) repsDisplay.textContent = reps;

        updateRepsChips(reps);

        if (timerState.status === 'idle') {
            updateCounterUI();
        }
    }

    function stepEccentricReps(delta) {
        setEccentricQuickReps(timerState.repsPerSet + delta);
    }

    function updateRepsChips(reps) {
        [6, 8, 10, 12].forEach(n => {
            const chip = document.getElementById(`chipEccRep${n}`);
            if (chip) chip.classList.toggle('active', n === reps);
        });
    }

    // 快捷设定休息秒数
    function setEccentricRestSec(sec) {
        sec = Math.max(5, parseInt(sec) || 60);
        timerState.restSec = sec;
        const customInput = document.getElementById('eccCustomRestInput');
        if (customInput) customInput.value = sec;

        [30, 45, 60, 90].forEach(n => {
            const chip = document.getElementById(`chipRest${n}`);
            if (chip) chip.classList.toggle('active', n === sec);
        });
    }

    // UI 刷新辅助
    function updateCounterUI() {
        const counterEl = document.getElementById('timerSetCounter');
        if (!counterEl) return;
        if (timerState.status === 'idle') {
            counterEl.textContent = `第 0 / ${timerState.totalSets} 组 (每组 ${timerState.repsPerSet} 次)`;
        } else {
            counterEl.textContent = `第 ${timerState.currentSet} / ${timerState.totalSets} 组 · 第 ${timerState.currentRep} / ${timerState.repsPerSet} 次`;
        }
    }

    function updateDisplay(phaseTitle, remainingSec, totalSec, statusBadgeText, badgeClass = 'badge-green') {
        const phaseEl = document.getElementById('phaseDisplay');
        const clockEl = document.getElementById('timerClock');
        const progressFill = document.getElementById('timerProgressFill');
        const statusBadge = document.getElementById('timerStatus');

        if (phaseEl) phaseEl.textContent = phaseTitle;
        if (clockEl) {
            const displaySec = Math.max(0, remainingSec);
            const m = Math.floor(displaySec / 60);
            const s = Math.floor(displaySec % 60);
            const ms = Math.floor((displaySec % 1) * 10);
            if (displaySec < 10 && (timerState.status === 'work_down' || timerState.status === 'work_up')) {
                clockEl.textContent = `${String(s).padStart(2, '0')}.${ms}`;
            } else {
                clockEl.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
            }
        }
        if (progressFill && totalSec > 0) {
            const pct = Math.max(0, Math.min(100, (1 - remainingSec / totalSec) * 100));
            progressFill.style.width = `${pct}%`;
        }
        if (statusBadge && statusBadgeText) {
            statusBadge.textContent = statusBadgeText;
            statusBadge.className = `badge ${badgeClass}`;
        }
    }

    // 核心时钟驱动 (100ms 高敏平滑)
    function onTimerTick() {
        const now = Date.now();
        const delta = (now - timerState.lastTickTimestamp) / 1000;
        timerState.lastTickTimestamp = now;

        const prevSecInt = Math.ceil(timerState.phaseTimeRemaining);
        timerState.phaseTimeRemaining -= delta;
        const currSecInt = Math.ceil(timerState.phaseTimeRemaining);

        // 1. 准备阶段 (10秒就位)
        if (timerState.status === 'prep') {
            updateDisplay(
                `第 ${timerState.currentSet} 组 · 就位准备中`,
                timerState.phaseTimeRemaining,
                timerState.phaseDuration,
                '就位准备',
                'badge-police'
            );

            // 倒数 3, 2, 1 滴答
            if (prevSecInt !== currSecInt && currSecInt >= 1 && currSecInt <= 3) {
                playBeep(750, 0.08);
                speakVoice(String(currSecInt));
            }

            if (timerState.phaseTimeRemaining <= 0) {
                // 准备完成 -> 切入离心慢放 (绝不在同一帧穿透)
                playBeep(1200, 0.2);
                speakVoice('开始，慢下！');
                transitionToWorkDown();
                return;
            }
            return;
        }

        // 2. 离心慢降阶段 (Down)
        if (timerState.status === 'work_down') {
            updateDisplay(
                `第 ${timerState.currentSet}/${timerState.totalSets} 组 · 第 ${timerState.currentRep}/${timerState.repsPerSet} 次 [慢降下潜]`,
                timerState.phaseTimeRemaining,
                timerState.phaseDuration,
                '离心做功',
                'badge-green'
            );

            // 每整秒提示
            if (prevSecInt !== currSecInt && currSecInt >= 1) {
                playBeep(600, 0.05);
                speakVoice(String(currSecInt));
            }

            if (timerState.phaseTimeRemaining <= 0) {
                // 慢降触底 -> 切入撑起爆发
                playBeep(1100, 0.15);
                speakVoice('起！');
                transitionToWorkUp();
                return;
            }
            return;
        }

        // 3. 向心撑起爆发阶段 (Up)
        if (timerState.status === 'work_up') {
            updateDisplay(
                `第 ${timerState.currentSet}/${timerState.totalSets} 组 · 第 ${timerState.currentRep}/${timerState.repsPerSet} 次 [撑起爆发]`,
                timerState.phaseTimeRemaining,
                timerState.phaseDuration,
                '向心爆发',
                'badge-orange'
            );

            if (timerState.phaseTimeRemaining <= 0) {
                // 当前动作完成，判断是否继续本组后续次数
                if (timerState.currentRep < timerState.repsPerSet) {
                    timerState.currentRep++;
                    updateCounterUI();
                    speakVoice(`第${timerState.currentRep}次，慢下`);
                    transitionToWorkDown();
                } else {
                    // 本组全部次数完成！
                    onSetCompleted();
                }
                return;
            }
            return;
        }

        // 4. 组间休息阶段 (Rest)
        if (timerState.status === 'rest') {
            updateDisplay(
                `第 ${timerState.currentSet} 组完成 · 组间休整中`,
                timerState.phaseTimeRemaining,
                timerState.phaseDuration,
                '组间休整',
                'badge-police'
            );

            // 休息阶段重要节点盲听提示
            if (prevSecInt !== currSecInt) {
                if (currSecInt === 30) {
                    speakVoice('休息还剩30秒');
                } else if (currSecInt === 10) {
                    speakVoice('准备，还剩10秒');
                } else if (currSecInt <= 3 && currSecInt >= 1) {
                    playBeep(700, 0.08);
                    speakVoice(String(currSecInt));
                }
            }

            if (timerState.phaseTimeRemaining <= 0) {
                // 休息结束 -> 开启下一组
                startNextSet();
                return;
            }
            return;
        }
    }

    // 状态切换处理
    function transitionToWorkDown() {
        timerState.status = 'work_down';
        timerState.phaseTimeRemaining = timerState.downSec;
        timerState.phaseDuration = timerState.downSec;
        updateCounterUI();
    }

    function transitionToWorkUp() {
        timerState.status = 'work_up';
        timerState.phaseTimeRemaining = timerState.upSec;
        timerState.phaseDuration = timerState.upSec;
    }

    function onSetCompleted() {
        playBeep(1000, 0.3);
        if (timerState.currentSet < timerState.totalSets) {
            // 还有下一组 -> 进入组间休息
            speakVoice(`第 ${timerState.currentSet} 组完成！休整 ${timerState.restSec} 秒`);
            timerState.status = 'rest';
            timerState.phaseTimeRemaining = timerState.restSec;
            timerState.phaseDuration = timerState.restSec;
            const skipBtn = document.getElementById('timerSkipRestBtn');
            if (skipBtn) skipBtn.classList.remove('hidden');
        } else {
            // 全部组数完成！
            onAllSetsCompleted();
        }
    }

    function startNextSet() {
        const skipBtn = document.getElementById('timerSkipRestBtn');
        if (skipBtn) skipBtn.classList.add('hidden');

        timerState.currentSet++;
        timerState.currentRep = 1;
        updateCounterUI();
        speakVoice(`第 ${timerState.currentSet} 组开始，慢下！`);
        transitionToWorkDown();
    }

    function onAllSetsCompleted() {
        stopTimerInterval();
        timerState.status = 'idle';
        speakVoice('天罡离心慢放全功告成，战意圆满！');
        updateDisplay('大功告成！全量淬体已封存', 0, 1, '圆满完成', 'badge-green');
        const counterEl = document.getElementById('timerSetCounter');
        if (counterEl) counterEl.textContent = `全部 ${timerState.totalSets} 组 · 已破糖破阵`;

        resetButtonStates();

        // 触发外部记录归档（若有）
        if (typeof window.recordWorkoutLog === 'function') {
            window.recordWorkoutLog({
                type: '离心俯卧撑',
                sets: timerState.totalSets,
                reps: timerState.repsPerSet,
                tut: Math.round(timerState.totalSets * timerState.repsPerSet * (timerState.downSec + timerState.upSec))
            });
        }
    }

    function stopTimerInterval() {
        if (timerState.intervalId) {
            clearInterval(timerState.intervalId);
            timerState.intervalId = null;
        }
    }

    function resetButtonStates() {
        const startBtn = document.getElementById('timerStartBtn');
        const pauseBtn = document.getElementById('timerPauseBtn');
        const skipBtn = document.getElementById('timerSkipRestBtn');
        if (startBtn) {
            startBtn.disabled = false;
            startBtn.textContent = '▶ 开始离心慢放 (留10s)';
        }
        if (pauseBtn) {
            pauseBtn.disabled = true;
            pauseBtn.textContent = '⏸ 暂停';
        }
        if (skipBtn) skipBtn.classList.add('hidden');
    }

    // 核心公开接口
    window.startEccentricTimer = function () {
        getAudioCtx();
        syncTimerInputs();

        // 彻底复位与初始化
        stopTimerInterval();
        timerState.currentSet = 1;
        timerState.currentRep = 1;
        timerState.status = 'prep';
        timerState.phaseTimeRemaining = timerState.prepSec;
        timerState.phaseDuration = timerState.prepSec;
        timerState.lastTickTimestamp = Date.now();

        updateCounterUI();
        updateDisplay(`第 1 组 · 就位准备中`, timerState.prepSec, timerState.prepSec, '就位准备', 'badge-police');

        const startBtn = document.getElementById('timerStartBtn');
        const pauseBtn = document.getElementById('timerPauseBtn');
        const skipBtn = document.getElementById('timerSkipRestBtn');
        if (startBtn) startBtn.disabled = true;
        if (pauseBtn) {
            pauseBtn.disabled = false;
            pauseBtn.textContent = '⏸ 暂停';
        }
        if (skipBtn) skipBtn.classList.add('hidden');

        speakVoice(`离心慢放第1组，就位准备`);
        timerState.intervalId = setInterval(onTimerTick, 100);
    };

    window.pauseEccentricTimer = function () {
        const pauseBtn = document.getElementById('timerPauseBtn');
        if (timerState.status === 'paused') {
            // 恢复
            timerState.status = timerState.previousStatus;
            timerState.lastTickTimestamp = Date.now();
            timerState.intervalId = setInterval(onTimerTick, 100);
            if (pauseBtn) pauseBtn.textContent = '⏸ 暂停';
            speakVoice('战钟恢复');
        } else if (timerState.status !== 'idle') {
            // 暂停
            timerState.previousStatus = timerState.status;
            timerState.status = 'paused';
            stopTimerInterval();
            if (pauseBtn) pauseBtn.textContent = '▶ 继续';
            speakVoice('战钟驻留');
        }
    };

    window.stopEccentricTimer = function () {
        stopTimerInterval();
        timerState.status = 'idle';
        resetButtonStates();
        updateCounterUI();
        updateDisplay('战法就绪', 0, 1, '就绪 (READY)', 'badge-green');
        const progressFill = document.getElementById('timerProgressFill');
        if (progressFill) progressFill.style.width = '0%';
        speakVoice('训练终止复位');
    };

    window.skipTimerRest = function () {
        if (timerState.status === 'rest') {
            playBeep(1100, 0.15);
            speakVoice('跳过休息，立刻开练！');
            startNextSet();
        }
    };

    window.setEccentricQuickSets = setEccentricQuickSets;
    window.stepEccentricSets = stepEccentricSets;
    window.setEccentricQuickReps = setEccentricQuickReps;
    window.stepEccentricReps = stepEccentricReps;
    window.setEccentricRestSec = setEccentricRestSec;
    window.syncTimerInputs = syncTimerInputs;

    // DOM 加载后挂载监听
    document.addEventListener('DOMContentLoaded', () => {
        syncTimerInputs();
        updateCounterUI();
    });
})();