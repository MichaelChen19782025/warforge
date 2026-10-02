/**
 * 天罡洗髓 · 引体全能舱 & 极限悬挂战钟 (PRO)
 * 核心优化特性（参考《IRON GRIP 悬挂训练助手》）：
 * 1. 读秒功能：全程每一秒都进行语音朗读（秒表正数 1, 2, 3... 倒计时逐秒倒数 30, 29, 28...）；
 * 2. 战前就位准备：全程逐秒报数（10, 9, 8... 3, 2, 1），0 时“开始！”；
 * 3. 拍击大圆盘立即停止结算战报，刷新 PB 纪录；
 * 4. 支持次数直录快速打卡。
 */

(function () {
    const hangState = {
        variant: 'standard', // 'standard' | 'wide' | 'hang'
        mode: 'stopwatch',   // 'stopwatch' | 'countdown' | 'reps'
        status: 'idle',      // 'idle' | 'prep' | 'running'
        prepDuration: 10,
        countdownTarget: 30,
        currentTime: 0,
        intervalId: null,
        personalBest: 0,
        repsCount: 8
    };

    // 语音朗读引擎 (完全对齐 IRON GRIP)
    function speakVoice(text, rate = 1.25) {
        if (!('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text);
        utter.lang = 'zh-CN';
        utter.rate = rate;
        utter.pitch = 1.05;
        window.speechSynthesis.speak(utter);
    }

    // 本地 PB 加载与持久化
    function loadPb() {
        const stored = localStorage.getItem(`hang_pb_${hangState.variant}`) || (data?.settings?.hangBestRecord || 0);
        hangState.personalBest = parseInt(stored) || 0;
        updatePbDisplay();
    }

    function savePb(newScore) {
        if (newScore > hangState.personalBest) {
            hangState.personalBest = newScore;
            localStorage.setItem(`hang_pb_${hangState.variant}`, newScore);
            if (data && data.settings) {
                data.settings.hangBestRecord = newScore;
                saveData();
            }
            updatePbDisplay();
            return true;
        }
        return false;
    }

    function updatePbDisplay() {
        const pbEl = document.getElementById('hangPbDisplay');
        if (pbEl) {
            pbEl.textContent = `🏆 最佳悬挂: ${hangState.personalBest}s`;
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
        if (hangState.status !== 'idle') resetHangAll();
        hangState.mode = mode;

        ['stopwatch', 'countdown', 'reps'].forEach(m => {
            const btn = document.getElementById(`hangMode${m.charAt(0).toUpperCase() + m.slice(1)}`);
            if (btn) btn.classList.toggle('active', m === mode);
        });

        const repsContainer = document.getElementById('hangRepsContainer');
        const timerWrap = document.getElementById('hangTimerDialWrap');
        const presetContainer = document.getElementById('hangPresetContainer');

        if (mode === 'reps') {
            if (repsContainer) repsContainer.classList.remove('hidden');
            if (timerWrap) timerWrap.classList.add('hidden');
            if (presetContainer) presetContainer.classList.add('hidden');
        } else {
            if (repsContainer) repsContainer.classList.add('hidden');
            if (timerWrap) timerWrap.classList.remove('hidden');
            if (presetContainer) presetContainer.classList.toggle('hidden', mode !== 'countdown');

            hangState.currentTime = (mode === 'countdown') ? hangState.countdownTarget : 0;
            updateDialValue(hangState.currentTime, mode === 'countdown' ? 'REMAINING' : 'SECONDS');
            setRingProgress(100);
        }
    };

    // 次数模式打卡
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

    // 倒计时预设
    window.setHangCountdownTime = function (sec) {
        if (hangState.status !== 'idle') return;
        hangState.countdownTarget = parseInt(sec) || 30;
        hangState.currentTime = hangState.countdownTarget;
        updateDialValue(hangState.currentTime, 'REMAINING');

        const chips = document.querySelectorAll('#hangPresetContainer .preset-chip');
        chips.forEach(c => {
            c.classList.toggle('active', c.textContent.includes(`${sec}秒`));
        });
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
        const radius = 132;
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percent / 100) * circumference;
        circle.style.strokeDasharray = `${circumference} ${circumference}`;
        circle.style.strokeDashoffset = offset;
    }

    // 启动/停止主按钮
    window.toggleHangStart = function () {
        if (hangState.mode === 'reps') {
            commitHangReps();
            return;
        }

        if (hangState.status === 'idle') {
            startPreparation();
        } else {
            stopAndSettle();
        }
    };

    // 战前就位准备（逐秒朗读）
    function startPreparation() {
        hangState.status = 'prep';
        const actionBtn = document.getElementById('hangMainActionBtn');
        const hintEl = document.getElementById('hangStatusHint');
        const board = document.getElementById('hangDisplayBoard');

        if (actionBtn) {
            actionBtn.textContent = '⏹ 结束悬挂';
            actionBtn.className = 'btn btn-danger';
        }
        if (hintEl) hintEl.textContent = 'PREPARE';
        if (board) board.classList.add('in-prep');

        let prepRemain = hangState.prepDuration;
        updateDialValue(prepRemain, 'PREPARING');
        setRingProgress(100);

        speakVoice(`准备，${prepRemain}`, 1.2);

        clearInterval(hangState.intervalId);
        hangState.intervalId = setInterval(() => {
            prepRemain--;
            if (prepRemain > 0) {
                updateDialValue(prepRemain, 'PREPARING');
                setRingProgress((prepRemain / hangState.prepDuration) * 100);
                speakVoice(String(prepRemain), 1.25);
            } else {
                clearInterval(hangState.intervalId);
                speakVoice('开始！', 1.3);
                startActualTimer();
            }
        }, 1000);
    }

    // 正式计时主循环（关键优化：每一秒都朗读数字！）
    function startActualTimer() {
        hangState.status = 'running';
        const hintEl = document.getElementById('hangStatusHint');
        const board = document.getElementById('hangDisplayBoard');

        if (hintEl) hintEl.textContent = (hangState.mode === 'stopwatch') ? 'HANGING' : 'REMAINING';
        if (board) board.classList.remove('in-prep');

        // 秒表模式：每一秒都读 1, 2, 3, 4, 5...
        if (hangState.mode === 'stopwatch') {
            hangState.currentTime = 1;
            updateDialValue(hangState.currentTime, 'SECONDS');
            speakVoice('1');
            setRingProgress(100);

            clearInterval(hangState.intervalId);
            hangState.intervalId = setInterval(() => {
                hangState.currentTime++;
                updateDialValue(hangState.currentTime, 'SECONDS');
                speakVoice(String(hangState.currentTime)); // 核心：每秒朗读！
            }, 1000);
        }
        // 倒计时模式：每一秒都逐秒倒数 30, 29, 28...
        else {
            hangState.currentTime = hangState.countdownTarget;
            updateDialValue(hangState.currentTime, 'REMAINING');
            speakVoice(String(hangState.currentTime));
            setRingProgress(100);

            clearInterval(hangState.intervalId);
            hangState.intervalId = setInterval(() => {
                hangState.currentTime--;
                if (hangState.currentTime > 0) {
                    updateDialValue(hangState.currentTime, 'REMAINING');
                    speakVoice(String(hangState.currentTime)); // 核心：每秒朗读！
                    setRingProgress((hangState.currentTime / hangState.countdownTarget) * 100);
                } else {
                    stopAndSettle();
                }
            }, 1000);
        }
    }

    // 拍击圆盘结算交互
    window.handleHangDialClick = function () {
        if (hangState.status === 'running') {
            stopAndSettle();
        }
    };

    // 停止并生成战报
    function stopAndSettle() {
        clearInterval(hangState.intervalId);
        window.speechSynthesis.cancel();

        const score = (hangState.mode === 'stopwatch')
            ? hangState.currentTime
            : Math.max(0, hangState.countdownTarget - hangState.currentTime);

        hangState.status = 'idle';
        const isPB = savePb(score);

        showResultModal(score, isPB);
        resetButtonUI();
    }

    function showResultModal(score, isPB) {
        const modal = document.getElementById('hangResultModal');
        const scoreEl = document.getElementById('hangResultScore');
        const rankEl = document.getElementById('hangResultRank');
        const descEl = document.getElementById('hangResultDesc');

        if (!modal) return;
        modal.classList.add('active');

        if (scoreEl) scoreEl.innerHTML = `${score}<span style="font-size: 2rem; color: #9aa0a6;">s</span>`;

        let rank = '抓握初成';
        let desc = '每一次悬挂都在重塑筋膜与神经募集！';

        if (score >= 90) {
            rank = '⚡ 陆地攀岩神';
            desc = '恐怖的握力耐力！重力对你而言只是参考！';
        } else if (score >= 60) {
            rank = '🔥 钢筋铁骨';
            desc = '突破1分钟大关，前臂坚如磐石！';
        } else if (score >= 40) {
            rank = '💪 引力挑战者';
            desc = '核心与握力兼具，状态极佳！';
        } else if (score >= 20) {
            rank = '✨ 进阶行者';
            desc = '稳扎稳打，每一次做功都在刺激微循环！';
        }

        if (isPB) {
            rank = `🏆 新纪录! ` + rank;
            speakVoice(`悬挂结束，创造全新纪录 ${score} 秒！太霸气了！`, 1.15);
        } else {
            speakVoice(`悬挂完成，${score} 秒！干得漂亮！`, 1.2);
        }

        if (rankEl) rankEl.textContent = rank;
        if (descEl) descEl.textContent = desc;
    }

    window.closeHangResultModal = function (shouldSave) {
        const modal = document.getElementById('hangResultModal');
        if (modal) modal.classList.remove('active');

        if (shouldSave) {
            const duty = getDutyShiftInfo();
            const durSec = hangState.currentTime || 30;
            const logEntry = {
                id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
                date: duty.dutyDateStr,
                type: hangState.variant === 'hang' ? '极限悬挂' : '引体向上',
                sets: 1,
                reps: `${durSec}s`,
                total: durSec,
                isAerobic: false,
                isIsometric: true,
                heart: '未知',
                duration: Math.max(1, Math.round(durSec / 60)),
                rpe: 8,
                dutyTag: `${duty.shift.name} (归属${duty.dutyDateStr.slice(5)})`,
                startTimeStamp: getFullTimestamp(new Date(Date.now() - durSec * 1000)),
                endTimeStamp: getFullTimestamp(),
                downSec: 0,
                upSec: 0,
                tutSeconds: durSec,
                note: `悬挂战钟收功：完成 ${durSec} 秒抗阻。`,
                createdAt: new Date().toISOString()
            };

            data.logs.push(logEntry);
            data.workoutQueue = data.workoutQueue.filter(x => !(x.actionId === 'act_hang' || x.name.includes('悬挂')));
            saveData();
            renderAll();
            showToast('💾 悬挂战功已成功封存入实录！');
        }

        resetHangAll();
    };

    function commitHangReps() {
        const count = hangState.repsCount || 8;
        const duty = getDutyShiftInfo();
        const typeName = hangState.variant === 'wide' ? '阔引体' : '引体';

        const logEntry = {
            id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: duty.dutyDateStr,
            type: typeName,
            sets: 1,
            reps: `${count}次`,
            total: count,
            isAerobic: false,
            isIsometric: false,
            heart: '未知',
            duration: 1,
            rpe: 8,
            dutyTag: `${duty.shift.name} (归属${duty.dutyDateStr.slice(5)})`,
            startTimeStamp: getFullTimestamp(),
            endTimeStamp: getFullTimestamp(),
            downSec: 3.0,
            upSec: 1.0,
            tutSeconds: count * 4,
            note: `${typeName}有效做功 ${count} 次打卡入册。`,
            createdAt: new Date().toISOString()
        };

        data.logs.push(logEntry);
        data.workoutQueue = data.workoutQueue.filter(x => !(x.actionId === 'act_pullup' || x.actionId === 'act_pullup_wide'));
        saveData();
        renderAll();

        speakVoice(`记录入册！有效${typeName} ${count} 次`);
        showToast(`✅ ${typeName} ${count} 次已记录入册！`);
    }

    function resetButtonUI() {
        const actionBtn = document.getElementById('hangMainActionBtn');
        const hintEl = document.getElementById('hangStatusHint');
        if (actionBtn) {
            actionBtn.textContent = '开始计时 (全程报数)';
            actionBtn.className = 'btn btn-primary';
        }
        if (hintEl) hintEl.textContent = 'READY';
    }

    window.resetHangAll = function () {
        clearInterval(hangState.intervalId);
        window.speechSynthesis.cancel();
        hangState.status = 'idle';

        resetButtonUI();
        setRingProgress(100);

        hangState.currentTime = (hangState.mode === 'countdown') ? hangState.countdownTarget : 0;
        updateDialValue(hangState.currentTime, hangState.mode === 'countdown' ? 'REMAINING' : 'SECONDS');
    };

    document.addEventListener('DOMContentLoaded', () => {
        loadPb();
        setRingProgress(100);
    });
})();