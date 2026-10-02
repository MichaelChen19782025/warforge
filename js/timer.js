/**
 * 天罡洗髓 · 离心慢放 · 破糖战钟 (PRO)
 * 具备特性：
 * 1. 默认次数为 10 次/组，每一次手动更改后自动记忆为下一次的默认值；
 * 2. 读秒与语音指导完全参考《锻炼计划.html》：提前 250ms 盲听报“1”，撑起爆发提前报“起”；
 * 3. 完整支持 10 秒战前就位准备、多组间休整与一键跳过休息；
 * 4. 完成后自动入册并播放激励收功语音。
 */

(function () {
    const timerState = {
        status: 'idle', // 'idle' | 'prep' | 'work_down' | 'work_up' | 'rest' | 'paused'
        previousStatus: 'idle',
        currentSet: 1,
        totalSets: 2,
        currentRep: 1,
        repsPerSet: 10, // 默认 10 次
        downSec: 4.0,
        upSec: 1.0,
        restSec: 60,
        prepSec: 10,
        phaseTimeRemaining: 0,
        phaseDuration: 0,
        intervalId: null,
        lastTickTimestamp: 0,
        voiceEnabled: true,
        spokenCues: new Set()
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

    // 快速中文语音合成（对齐锻炼计划.html：1.4倍速，干脆利落）
    function speakFast(text) {
        if (!timerState.voiceEnabled) return;
        if (!('speechSynthesis' in window)) return;

        try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'zh-CN';
            u.rate = 1.4;
            u.pitch = 1.1;
            window.speechSynthesis.speak(u);
        } catch (e) {
            console.warn('TTS error:', e);
        }
    }

    // 初始化时从本地配置载入保存的默认次数与组数
    function syncTimerInputs() {
        if (window.data && data.settings) {
            if (data.settings.eccentricDefaultReps !== undefined) {
                timerState.repsPerSet = Math.max(1, parseInt(data.settings.eccentricDefaultReps) || 10);
            }
            if (data.settings.eccentricDefaultSets !== undefined) {
                timerState.totalSets = Math.max(1, parseInt(data.settings.eccentricDefaultSets) || 2);
            }
            if (data.settings.eccentricRestSec !== undefined) {
                timerState.restSec = Math.max(5, parseInt(data.settings.eccentricRestSec) || 60);
            }
        }

        const downInput = document.getElementById('timerDownInput');
        const upInput = document.getElementById('timerUpInput');
        const repsInput = document.getElementById('timerRepsInput');
        const setsInput = document.getElementById('timerSetsInput');
        const voiceSelect = document.getElementById('voiceEnabled');

        if (downInput) timerState.downSec = Math.max(1, parseFloat(downInput.value) || 4.0);
        if (upInput) timerState.upSec = Math.max(0.5, parseFloat(upInput.value) || 1.0);
        if (repsInput) repsInput.value = timerState.repsPerSet;
        if (setsInput) setsInput.value = timerState.totalSets;
        if (voiceSelect) timerState.voiceEnabled = (voiceSelect.value === 'true');

        updateRepsChips(timerState.repsPerSet);
        updateSetsChips(timerState.totalSets);
        updateCounterUI();
    }

    // 手动设定次数并持久化保存
    window.setEccentricQuickReps = function (reps) {
        const val = Math.max(1, parseInt(reps) || 10);
        timerState.repsPerSet = val;

        if (window.data && data.settings) {
            data.settings.eccentricDefaultReps = val;
            saveData();
        }

        const repsInput = document.getElementById('timerRepsInput');
        const repsDisplay = document.getElementById('eccRepsDisplay');
        if (repsInput) repsInput.value = val;
        if (repsDisplay) repsDisplay.textContent = val;

        updateRepsChips(val);
        updateCounterUI();
    };

    window.stepEccentricReps = function (delta) {
        window.setEccentricQuickReps(timerState.repsPerSet + delta);
    };

    function updateRepsChips(reps) {
        [6, 8, 10, 12, 15].forEach(n => {
            const chip = document.getElementById(`chipEccRep${n}`);
            if (chip) chip.classList.toggle('active', n === reps);
        });
    }

    // 手动设定组数并持久化保存
    window.setEccentricQuickSets = function (sets) {
        const val = Math.max(1, parseInt(sets) || 2);
        timerState.totalSets = val;

        if (window.data && data.settings) {
            data.settings.eccentricDefaultSets = val;
            saveData();
        }

        const setsInput = document.getElementById('timerSetsInput');
        const setsDisplay = document.getElementById('eccSetsDisplay');
        if (setsInput) setsInput.value = val;
        if (setsDisplay) setsDisplay.textContent = val;

        updateSetsChips(val);
        updateCounterUI();
    };

    window.stepEccentricSets = function (delta) {
        window.setEccentricQuickSets(timerState.totalSets + delta);
    };

    function updateSetsChips(sets) {
        [2, 3, 4, 5].forEach(n => {
            const chip = document.getElementById(`chipSet${n}`);
            if (chip) chip.classList.toggle('active', n === sets);
        });
    }

    function updateCounterUI() {
        const counterEl = document.getElementById('timerSetCounter');
        if (!counterEl) return;
        if (timerState.status === 'idle') {
            counterEl.textContent = `第 0 / ${timerState.totalSets} 组 (每组 ${timerState.repsPerSet} 次)`;
        } else {
            counterEl.textContent = `第 ${timerState.currentSet} / ${timerState.totalSets} 组 · 第 ${timerState.currentRep} / ${timerState.repsPerSet} 次`;
        }
    }

    function updateDisplay(phaseTitle, remainingSec, totalSec, statusBadgeText, phaseClass = '') {
        const phaseEl = document.getElementById('phaseDisplay');
        const clockEl = document.getElementById('timerClock');
        const progressFill = document.getElementById('timerProgressFill');
        const statusBadge = document.getElementById('timerStatus');

        if (phaseEl) {
            phaseEl.textContent = phaseTitle;
            phaseEl.className = `timer-phase ${phaseClass}`;
        }
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
        }
    }

    // 核心时钟高敏循环 (100ms 驱动)
    function onTimerTick() {
        const now = Date.now();
        const delta = (now - timerState.lastTickTimestamp) / 1000;
        timerState.lastTickTimestamp = now;

        const prevSecInt = Math.ceil(timerState.phaseTimeRemaining);
        timerState.phaseTimeRemaining -= delta;
        const currSecInt = Math.ceil(timerState.phaseTimeRemaining);

        // 1. 战前准备 10s (就位准备)
        if (timerState.status === 'prep') {
            updateDisplay(
                `第 ${timerState.currentSet} 组 · 战前就位 (趴下准备)`,
                timerState.phaseTimeRemaining,
                timerState.phaseDuration,
                '10s战前就位',
                'phase-prep'
            );

            // 倒数 3, 2, 1 逐秒念
            if (currSecInt <= 3 && currSecInt >= 1 && prevSecInt !== currSecInt) {
                const cue = `prep_${currSecInt}`;
                if (!timerState.spokenCues.has(cue)) {
                    timerState.spokenCues.add(cue);
                    playBeep(750, 0.08);
                    speakFast(String(currSecInt));
                }
            }

            if (timerState.phaseTimeRemaining <= 0) {
                playBeep(1200, 0.2);
                speakFast('开始，慢下！');
                transitionToWorkDown();
            }
            return;
        }

        // 2. 慢速离心下放 (Down)
        if (timerState.status === 'work_down') {
            updateDisplay(
                `第 ${timerState.currentSet}/${timerState.totalSets} 组 · 第 ${timerState.currentRep}/${timerState.repsPerSet} 次 [慢速下放]`,
                timerState.phaseTimeRemaining,
                timerState.phaseDuration,
                '慢下做功',
                'phase-down'
            );

            const countNum = Math.ceil(timerState.phaseTimeRemaining);
            if (countNum > 1 && prevSecInt !== currSecInt) {
                const cue = `s${timerState.currentSet}_r${timerState.currentRep}_d_${countNum}`;
                if (!timerState.spokenCues.has(cue)) {
                    timerState.spokenCues.add(cue);
                    playBeep(650, 0.04);
                    speakFast(String(countNum));
                }
            }
            // 最后一秒：提前 250ms 盲听报号 '1'
            else if (countNum === 1 && timerState.phaseTimeRemaining <= 0.25) {
                const cue = `s${timerState.currentSet}_r${timerState.currentRep}_d_1_anticipate`;
                if (!timerState.spokenCues.has(cue)) {
                    timerState.spokenCues.add(cue);
                    speakFast('1');
                }
            }

            if (timerState.phaseTimeRemaining <= 0) {
                transitionToWorkUp();
            }
            return;
        }

        // 3. 撑起爆发 (Up)
        if (timerState.status === 'work_up') {
            updateDisplay(
                `第 ${timerState.currentSet}/${timerState.totalSets} 组 · 第 ${timerState.currentRep}/${timerState.repsPerSet} 次 [撑起爆发]`,
                timerState.phaseTimeRemaining,
                timerState.phaseDuration,
                '向心爆发',
                'phase-up'
            );

            // 撑起瞬间提前 250ms 播报 '起'
            const cue = `s${timerState.currentSet}_r${timerState.currentRep}_u_anticipate`;
            if (timerState.phaseTimeRemaining <= 0.25 && !timerState.spokenCues.has(cue)) {
                timerState.spokenCues.add(cue);
                playBeep(1100, 0.15);
                speakFast('起');
            }

            if (timerState.phaseTimeRemaining <= 0) {
                if (timerState.currentRep < timerState.repsPerSet) {
                    timerState.currentRep++;
                    updateCounterUI();
                    speakFast(`第${timerState.currentRep}次，慢下`);
                    transitionToWorkDown();
                } else {
                    onSetCompleted();
                }
            }
            return;
        }

        // 4. 组间休息 (Rest)
        if (timerState.status === 'rest') {
            updateDisplay(
                `第 ${timerState.currentSet} 组完成 · 组间休整中 (休${timerState.restSec}s)`,
                timerState.phaseTimeRemaining,
                timerState.phaseDuration,
                '组间休整',
                'phase-prep'
            );

            if (prevSecInt !== currSecInt) {
                if (currSecInt === 30) {
                    speakFast('休息还剩30秒');
                } else if (currSecInt === 10) {
                    speakFast('准备，还剩10秒');
                } else if (currSecInt <= 3 && currSecInt >= 1) {
                    playBeep(700, 0.08);
                    speakFast(String(currSecInt));
                }
            }

            if (timerState.phaseTimeRemaining <= 0) {
                startNextSet();
            }
            return;
        }
    }

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
            speakFast(`第 ${timerState.currentSet} 组完成！休整 ${timerState.restSec} 秒`);
            timerState.status = 'rest';
            timerState.phaseTimeRemaining = timerState.restSec;
            timerState.phaseDuration = timerState.restSec;
            const skipBtn = document.getElementById('timerSkipRestBtn');
            if (skipBtn) skipBtn.classList.remove('hidden');
        } else {
            onAllSetsCompleted();
        }
    }

    function startNextSet() {
        const skipBtn = document.getElementById('timerSkipRestBtn');
        if (skipBtn) skipBtn.classList.add('hidden');

        timerState.currentSet++;
        timerState.currentRep = 1;
        updateCounterUI();
        speakFast(`第 ${timerState.currentSet} 组开始，慢下！`);
        transitionToWorkDown();
    }

    function onAllSetsCompleted() {
        stopTimerInterval();
        timerState.status = 'idle';

        speakFast(`恭喜！全套${timerState.totalSets}组慢速离心战阵收功，数据已自动封存入册！`);
        updateDisplay('周天圆满！已自动封存入册', 0, 1, '圆满完成', 'phase-up');
        const counterEl = document.getElementById('timerSetCounter');
        if (counterEl) counterEl.textContent = `全部 ${timerState.totalSets} 组 · 已破糖破阵`;

        resetButtonStates();

        // 自动入册
        if (window.data && data.logs) {
            const duty = (typeof getDutyShiftInfo === 'function') ? getDutyShiftInfo() : { dutyDateStr: new Date().toISOString().slice(0, 10), shift: { name: '日常' } };
            const totalReps = timerState.totalSets * timerState.repsPerSet;
            const tutSec = Math.round(totalReps * (timerState.downSec + timerState.upSec));
            const durMin = Math.max(1, Math.round((tutSec + (timerState.totalSets - 1) * timerState.restSec) / 60));

            const logEntry = {
                id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                date: duty.dutyDateStr,
                type: '慢速离心俯卧撑',
                sets: timerState.totalSets,
                reps: Array(timerState.totalSets).fill(String(timerState.repsPerSet)).join(','),
                total: totalReps,
                isAerobic: false,
                isIsometric: false,
                heart: '未知',
                duration: durMin,
                rpe: 8,
                dutyTag: `${duty.shift.name} (归属${duty.dutyDateStr.slice(5)})`,
                startTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp(new Date(Date.now() - durMin * 60000)) : new Date().toISOString(),
                endTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString(),
                downSec: timerDownSec,
                upSec: timerUpSec,
                tutSeconds: tutSec,
                note: `慢速离心战钟自动入册：完成 ${timerState.totalSets} 组 × ${timerState.repsPerSet} 次，有效TUT做功 ${tutSec} 秒。`,
                createdAt: new Date().toISOString()
            };

            data.logs.push(logEntry);

            // 清除队列中的离心项
            if (Array.isArray(data.workoutQueue)) {
                data.workoutQueue = data.workoutQueue.filter(x => !(x.actionId === 'act_pushup_ecc' || x.name.includes('离心')));
            }

            saveData();
            if (typeof renderAll === 'function') renderAll();
            if (typeof showToast === 'function') showToast(`🎉 离心俯卧撑（${timerState.totalSets}组·共${totalReps}次）已成功记入战功！`);
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
            startBtn.textContent = '▶ 开始运转 (留10s准备)';
        }
        if (pauseBtn) {
            pauseBtn.disabled = true;
            pauseBtn.textContent = '⏸ 暂停';
        }
        if (skipBtn) skipBtn.classList.add('hidden');
    }

    // 公开操作方法
    window.startEccentricTimer = function () {
        getAudioCtx();
        syncTimerInputs();

        stopTimerInterval();
        timerState.currentSet = 1;
        timerState.currentRep = 1;
        timerState.status = 'prep';
        timerState.phaseTimeRemaining = timerState.prepSec;
        timerState.phaseDuration = timerState.prepSec;
        timerState.lastTickTimestamp = Date.now();
        timerState.spokenCues.clear();

        updateCounterUI();
        updateDisplay(`第 1 组 · 战前就位 (趴下准备)`, timerState.prepSec, timerState.prepSec, '10s战前就位', 'phase-prep');

        const startBtn = document.getElementById('timerStartBtn');
        const pauseBtn = document.getElementById('timerPauseBtn');
        const skipBtn = document.getElementById('timerSkipRestBtn');
        if (startBtn) startBtn.disabled = true;
        if (pauseBtn) {
            pauseBtn.disabled = false;
            pauseBtn.textContent = '⏸ 暂停';
        }
        if (skipBtn) skipBtn.classList.add('hidden');

        speakFast('战前就位，10秒准备！');
        timerState.intervalId = setInterval(onTimerTick, 100);
    };

    window.pauseEccentricTimer = function () {
        const pauseBtn = document.getElementById('timerPauseBtn');
        if (timerState.status === 'paused') {
            timerState.status = timerState.previousStatus;
            timerState.lastTickTimestamp = Date.now();
            timerState.intervalId = setInterval(onTimerTick, 100);
            if (pauseBtn) pauseBtn.textContent = '⏸ 暂停';
            speakFast('战钟恢复');
        } else if (timerState.status !== 'idle') {
            timerState.previousStatus = timerState.status;
            timerState.status = 'paused';
            stopTimerInterval();
            if (pauseBtn) pauseBtn.textContent = '▶ 继续';
            speakFast('战钟驻留');
        }
    };

    window.stopEccentricTimer = function () {
        stopTimerInterval();
        timerState.status = 'idle';
        resetButtonStates();
        updateCounterUI();
        updateDisplay('战法就绪', 0, 1, '就绪 (READY)', '');
        const progressFill = document.getElementById('timerProgressFill');
        if (progressFill) progressFill.style.width = '0%';
        speakFast('训练终止复位');
    };

    window.skipTimerRest = function () {
        if (timerState.status === 'rest') {
            playBeep(1100, 0.15);
            speakFast('跳过休息，立刻开练！');
            startNextSet();
        }
    };

    window.syncTimerInputs = syncTimerInputs;

    document.addEventListener('DOMContentLoaded', () => {
        syncTimerInputs();
    });
})();