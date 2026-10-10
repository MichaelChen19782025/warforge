// ================================================================
//  universal-timer.js: 万能专业倒计时战钟 + 动作法门典籍（Codex）
//  特性：
//  1. 10 组独立预设插槽，参数自由配置且记忆最后一次使用的预设为开机默认！
//  2. 每一秒清晰读秒报号，做功/休息/就位无死角语音播报；
//  3. 严格关联法门典籍：未录入说明书动作严禁盲练，强引导创建；
//  4. 典籍创建完成后一键“↩️ 返回倒计时”无缝衔接继续出征！
// ================================================================

var universalTimerState = {
    status: 'idle', // 'idle' | 'prep' | 'work' | 'rest' | 'paused'
    previousStatus: 'idle',
    activePresetId: 'u_p_0',
    currentSet: 1,
    timeRemaining: 0,
    phaseTotal: 0,
    intervalId: null,
    audioCtx: null
};

// 状态回跳上下文缓存：从未收录引导去典籍时记录当前预设
var codexReturnContext = null;

function getUniversalAudioCtx() {
    if (!universalTimerState.audioCtx) {
        var AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) universalTimerState.audioCtx = new AudioContextClass();
    }
    if (universalTimerState.audioCtx && universalTimerState.audioCtx.state === 'suspended') {
        universalTimerState.audioCtx.resume();
    }
    return universalTimerState.audioCtx;
}

function playUniversalBeep(freq, duration, volume) {
    freq = freq || 800;
    duration = duration || 0.06;
    volume = volume || 0.15;
    try {
        var ctx = getUniversalAudioCtx();
        if (!ctx) return;
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + duration);
    } catch (e) {}
}

function getCurrentUniversalPreset() {
    var pid = data.settings.lastUniversalPresetId || 'u_p_0';
    var p = (data.universalPresets || []).find(function (x) { return x.id === pid; });
    if (!p) {
        p = data.universalPresets[0] || {
            id: 'u_p_0', name: '万能破糖战钟', codexId: '', workSec: 60, restSec: 30, sets: 3, prepSec: 10
        };
    }
    return p;
}

// ----------------------------------------------------------------
// 1. 万能倒计时面板渲染与预设插槽调度
// ----------------------------------------------------------------
function renderUniversalTimerPanel() {
    var container = document.getElementById('universalTimerContainer');
    if (!container) return;

    var curPreset = getCurrentUniversalPreset();
    var isRunning = (universalTimerState.status !== 'idle');
    var isPaused = (universalTimerState.status === 'paused');

    // 检查关联动作是否已在法门典籍中收录
    var linkedCodex = (data.exerciseCodex || []).find(function (c) { return c.id === curPreset.codexId; });

    // 预设槽切换条（10 组）
    var presetSlotsHtml = '';
    for (var i = 0; i < 10; i++) {
        var p = (data.universalPresets || [])[i];
        if (!p) continue;
        var isAct = (p.id === curPreset.id);
        presetSlotsHtml +=
            '<button type="button" class="plan-tab-btn ' + (isAct ? 'active' : '') + '" onclick="switchUniversalPreset(\'' + p.id + '\')">' +
                '<span>' + (i + 1) + '. ' + p.name + '</span>' +
            '</button>';
    }

    // 动作关联指示条与前置校验提示
    var codexStatusBanner = '';
    if (linkedCodex) {
        codexStatusBanner =
            '<div style="background:rgba(0,229,255,0.06); border:1px solid rgba(0,229,255,0.25); border-radius:6px; padding:6px 10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">' +
                '<span style="font-size:12px; color:#fff;">' + linkedCodex.icon + ' <strong>已关联典籍：' + linkedCodex.name + '</strong> <span class="badge badge-cyan">' + linkedCodex.category + '</span></span>' +
                '<button class="btn btn-sm btn-cyan" onclick="jumpToCodexDetail(\'' + linkedCodex.id + '\')">📖 查看动作要领与眼底安全规范 ➔</button>' +
            '</div>';
    } else {
        codexStatusBanner =
            '<div style="background:rgba(255,42,109,0.1); border:1px solid rgba(255,42,109,0.35); border-radius:6px; padding:8px 10px; margin-bottom:8px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">' +
                '<span style="font-size:12px; color:#ff94b8;">⚠️ <strong>未关联法门典籍！</strong>严禁盲目练功，必须先在典籍中收录动作要领与安全禁忌！</span>' +
                '<button class="btn btn-sm btn-danger" onclick="promptCreateCodexForPreset()">📝 立即录入此动作说明书 ➔</button>' +
            '</div>';
    }

    // 表盘读数与状态文本
    var displayTime = '00:00';
    var statusTitle = '战法就绪 · 等待启动';
    if (!isRunning) {
        var m = String(Math.floor(curPreset.workSec / 60)).padStart(2, '0');
        var s = String(curPreset.workSec % 60).padStart(2, '0');
        displayTime = m + ':' + s;
        statusTitle = '🎯 单组 ' + curPreset.workSec + 's · 间歇 ' + curPreset.restSec + 's · 共 ' + curPreset.sets + ' 组 (备' + curPreset.prepSec + 's)';
    } else {
        var rem = Math.max(0, universalTimerState.timeRemaining);
        var dm = String(Math.floor(rem / 60)).padStart(2, '0');
        var ds = String(rem % 60).padStart(2, '0');
        displayTime = dm + ':' + ds;
        if (universalTimerState.status === 'prep') {
            statusTitle = '⏳ 战前就位准备中 (还有 ' + rem + 's)';
        } else if (universalTimerState.status === 'work') {
            statusTitle = '🔥 第 ' + universalTimerState.currentSet + ' / ' + curPreset.sets + ' 组做功中 (每秒读秒)';
        } else if (universalTimerState.status === 'rest') {
            statusTitle = '☕ 组间休整中 · 调整呼吸 (剩余 ' + rem + 's)';
        } else if (isPaused) {
            statusTitle = '⏸️ 战钟已驻留暂停';
        }
    }

    var startBtnDisabled = (!linkedCodex && !isRunning) ? 'disabled style="opacity:0.5; cursor:not-allowed;"' : '';
    var mainBtnHtml = isRunning
        ? '<button class="btn btn-danger hero-main-action-btn" onclick="stopUniversalTimer(false)">⏹️ 提前收功并封存</button>'
        : '<button class="btn btn-success hero-main-action-btn" ' + startBtnDisabled + ' onclick="startUniversalTimer()">▶️ 开始万能倒计时 (留' + curPreset.prepSec + 's就位)</button>';

    var pauseBtnHtml = isRunning
        ? '<button class="btn btn-outline" onclick="pauseUniversalTimer()">' + (isPaused ? '▶ 恢复' : '⏸ 暂停') + '</button>'
        : '';
    var skipRestBtnHtml = (universalTimerState.status === 'rest')
        ? '<button class="btn btn-cyan" onclick="skipUniversalRest()">⏭️ 跳过休息立刻开练</button>'
        : '';

    // 参数编辑区（未运行时开放）
    var editAreaHtml = '';
    if (!isRunning) {
        editAreaHtml =
            '<div class="mobile-param-box" style="margin-top:10px;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px dashed rgba(255,255,255,0.1); padding-bottom:6px;">' +
                    '<span style="font-size:12px; color:var(--amber-accent); font-weight:bold;">⚙️ 调谐当前预设参数 (修改自动记忆，下次开机直接使用)</span>' +
                    '<button class="btn btn-sm btn-outline" onclick="renameUniversalPreset()">✏️ 重命名预设</button>' +
                '</div>' +
                '<div class="row">' +
                    '<div class="flex-1">' +
                        '<label>做功秒数</label>' +
                        '<input type="number" value="' + curPreset.workSec + '" min="5" max="600" step="5" onchange="updateUniversalParam(\'workSec\', this.value)">' +
                    '</div>' +
                    '<div class="flex-1">' +
                        '<label>休息秒数</label>' +
                        '<input type="number" value="' + curPreset.restSec + '" min="5" max="300" step="5" onchange="updateUniversalParam(\'restSec\', this.value)">' +
                    '</div>' +
                    '<div class="flex-1">' +
                        '<label>做功组数</label>' +
                        '<input type="number" value="' + curPreset.sets + '" min="1" max="20" step="1" onchange="updateUniversalParam(\'sets\', this.value)">' +
                    '</div>' +
                    '<div class="flex-1">' +
                        '<label>就位提前量</label>' +
                        '<input type="number" value="' + curPreset.prepSec + '" min="3" max="60" step="1" onchange="updateUniversalParam(\'prepSec\', this.value)">' +
                    '</div>' +
                '</div>' +
                '<div style="margin-top:8px; display:flex; align-items:center; gap:8px;">' +
                    '<label style="margin:0; white-space:nowrap;">选择绑定的法门典籍:</label>' +
                    '<select id="universalCodexSelect" onchange="updateUniversalParam(\'codexId\', this.value)" style="flex:1;">' +
                        '<option value="">-- 选择已录入的法门说明 --</option>' +
                        (data.exerciseCodex || []).map(function (c) {
                            var sel = (c.id === curPreset.codexId) ? 'selected' : '';
                            return '<option value="' + c.id + '" ' + sel + '>' + c.icon + ' ' + c.name + ' (' + c.category + ')</option>';
                        }).join('') +
                    '</select>' +
                    '<button class="btn btn-sm btn-primary" onclick="promptCreateCodexForPreset()">+ 新建法门说明</button>' +
                '</div>' +
            '</div>';
    }

    container.innerHTML =
        '<div class="cyber-card" style="border-color:var(--amber-accent); text-align:center;">' +
            '<div class="card-header" style="margin-bottom:6px;">' +
                '<span>⏱️ 万能专业倒计时战钟 (全项目通用 · 10组方案自记)</span>' +
                '<span class="badge badge-amber" id="universalPresetBadge">预设: ' + curPreset.name + '</span>' +
            '</div>' +
            '<div class="preset-plan-bar" style="margin-bottom:8px;">' +
                presetSlotsHtml +
            '</div>' +
            codexStatusBanner +
            '<div class="zero-scroll-hero">' +
                '<div class="hero-sub-status" id="universalSubStatus" style="color:var(--cyan-accent);">' + statusTitle + '</div>' +
                '<div class="hero-clock-display" id="universalClockDisplay" style="color:var(--amber-accent); text-shadow:0 0 22px rgba(255,184,0,0.5);">' + displayTime + '</div>' +
                '<div style="width:100%; max-width:340px; margin-bottom:8px;">' +
                    mainBtnHtml +
                '</div>' +
                '<div style="display:flex; justify-content:center; gap:8px;">' +
                    pauseBtnHtml +
                    skipRestBtnHtml +
                '</div>' +
            '</div>' +
            '<div class="secondary-settings-scroll">' +
                editAreaHtml +
            '</div>' +
        '</div>';
}

function switchUniversalPreset(presetId) {
    if (universalTimerState.status !== 'idle') {
        if (!confirm('倒计时正在运行中，确定要切换预设吗？')) return;
        stopUniversalTimer(false);
    }
    data.settings.lastUniversalPresetId = presetId;
    saveData();
    renderUniversalTimerPanel();
}

function updateUniversalParam(field, val) {
    var cur = getCurrentUniversalPreset();
    if (field === 'workSec' || field === 'restSec' || field === 'sets' || field === 'prepSec') {
        cur[field] = Math.max(1, parseInt(val) || 10);
    } else {
        cur[field] = val;
    }
    saveData();
    renderUniversalTimerPanel();
}

function renameUniversalPreset() {
    var cur = getCurrentUniversalPreset();
    var newName = prompt('为当前预设命名（例如：侧平举抗阻、哑铃推肩、波比跳）：', cur.name);
    if (!newName || !newName.trim()) return;
    cur.name = newName.trim();
    saveData();
    renderUniversalTimerPanel();
}

// ----------------------------------------------------------------
// 2. 倒计时引擎调度与逐秒语音播报 (每一秒都报号)
// ----------------------------------------------------------------
function startUniversalTimer() {
    var cur = getCurrentUniversalPreset();
    var linkedCodex = (data.exerciseCodex || []).find(function (c) { return c.id === cur.codexId; });
    if (!linkedCodex) {
        alert('⚠️ 无法开练：该项目尚未在【法门典籍】中建立动作要领与安全禁忌！请先点击上方按钮创建说明书。');
        return;
    }

    getUniversalAudioCtx();
    universalTimerState.status = 'prep';
    universalTimerState.currentSet = 1;
    universalTimerState.phaseTotal = universalTimerState.timeRemaining = cur.prepSec;
    universalTimerState.startTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();

    speakFast(cur.name + '，战前就位，' + cur.prepSec + '秒准备！');
    renderUniversalTimerPanel();

    if (universalTimerState.intervalId) clearInterval(universalTimerState.intervalId);
    universalTimerState.intervalId = setInterval(onUniversalTimerTick, 1000);
}

function onUniversalTimerTick() {
    var cur = getCurrentUniversalPreset();
    universalTimerState.timeRemaining--;

    // 每一秒都清晰读秒！
    if (universalTimerState.timeRemaining > 0) {
        speakFast(String(universalTimerState.timeRemaining));
    }

    var el = document.getElementById('universalClockDisplay');
    var subEl = document.getElementById('universalSubStatus');
    if (el) {
        var m = String(Math.floor(Math.max(0, universalTimerState.timeRemaining) / 60)).padStart(2, '0');
        var s = String(Math.max(0, universalTimerState.timeRemaining) % 60).padStart(2, '0');
        el.textContent = m + ':' + s;
    }

    if (universalTimerState.timeRemaining <= 0) {
        advanceUniversalTimerPhase();
    }
}

function advanceUniversalTimerPhase() {
    var cur = getCurrentUniversalPreset();
    if (universalTimerState.status === 'prep') {
        universalTimerState.status = 'work';
        universalTimerState.phaseTotal = universalTimerState.timeRemaining = cur.workSec;
        playUniversalBeep(1200, 0.2);
        speakFast('第' + universalTimerState.currentSet + '组开始，坚持做功！');
        renderUniversalTimerPanel();
    } else if (universalTimerState.status === 'work') {
        playUniversalBeep(900, 0.25);
        if (universalTimerState.currentSet < cur.sets) {
            universalTimerState.status = 'rest';
            universalTimerState.phaseTotal = universalTimerState.timeRemaining = cur.restSec;
            speakFast('第' + universalTimerState.currentSet + '组完成！休整' + cur.restSec + '秒。');
            renderUniversalTimerPanel();
        } else {
            stopUniversalTimer(true);
        }
    } else if (universalTimerState.status === 'rest') {
        universalTimerState.currentSet++;
        universalTimerState.status = 'work';
        universalTimerState.phaseTotal = universalTimerState.timeRemaining = cur.workSec;
        playUniversalBeep(1200, 0.2);
        speakFast('第' + universalTimerState.currentSet + '组开始，继续破阵！');
        renderUniversalTimerPanel();
    }
}

function pauseUniversalTimer() {
    if (universalTimerState.status === 'paused') {
        universalTimerState.status = universalTimerState.previousStatus;
        if (universalTimerState.intervalId) clearInterval(universalTimerState.intervalId);
        universalTimerState.intervalId = setInterval(onUniversalTimerTick, 1000);
        speakFast('战钟恢复');
    } else if (universalTimerState.status !== 'idle') {
        universalTimerState.previousStatus = universalTimerState.status;
        universalTimerState.status = 'paused';
        if (universalTimerState.intervalId) clearInterval(universalTimerState.intervalId);
        speakFast('战钟暂停');
    }
    renderUniversalTimerPanel();
}

function skipUniversalRest() {
    if (universalTimerState.status === 'rest') {
        speakFast('跳过休息，立刻开练！');
        advanceUniversalTimerPhase();
    }
}

function stopUniversalTimer(isAutoDone) {
    if (universalTimerState.intervalId) {
        clearInterval(universalTimerState.intervalId);
        universalTimerState.intervalId = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();

    var cur = getCurrentUniversalPreset();
    var linkedCodex = (data.exerciseCodex || []).find(function (c) { return c.id === cur.codexId; });
    var movementName = linkedCodex ? linkedCodex.name : cur.name;

    if (isAutoDone || universalTimerState.currentSet >= 1) {
        var duty = (typeof getDutyShiftInfo === 'function') ? getDutyShiftInfo() : { dutyDateStr: new Date().toISOString().slice(0, 10), shift: { name: '日常' } };
        var completedSets = isAutoDone ? cur.sets : universalTimerState.currentSet;
        var tutSec = completedSets * cur.workSec;
        var durMin = Math.max(1, Math.round((tutSec + (completedSets - 1) * cur.restSec) / 60));

        var logEntry = {
            id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: duty.dutyDateStr,
            type: movementName,
            sets: completedSets,
            reps: cur.workSec + 's',
            total: tutSec,
            isAerobic: false,
            isIsometric: true,
            heart: '未知',
            duration: durMin,
            rpe: 8,
            dutyTag: duty.shift.name + ' (归属' + duty.dutyDateStr.slice(5) + ')',
            startTimeStamp: universalTimerState.startTime || ((typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString()),
            endTimeStamp: (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString(),
            downSec: 0,
            upSec: 0,
            tutSeconds: tutSec,
            note: '万能倒计时战钟自动入册：【' + cur.name + '】完成 ' + completedSets + ' 组 × ' + cur.workSec + ' 秒（休息' + cur.restSec + 's），TUT有效时间 ' + tutSec + ' 秒。',
            createdAt: new Date().toISOString()
        };

        if (window.data && Array.isArray(data.logs)) {
            data.logs.push(logEntry);
            saveData();
            if (typeof renderAll === 'function') renderAll();
        }

        if (isAutoDone) {
            speakFast('恭喜！全套' + cur.sets + '组' + movementName + '圆满收功，战报已封存入册！');
            if (typeof showToast === 'function') showToast('🎉 【' + movementName + '】' + cur.sets + '组已自动记入战功！');
        } else {
            speakFast(movementName + '收功入册。');
            if (typeof showToast === 'function') showToast('✅ 已记录已完成的 ' + completedSets + ' 组做功！');
        }
    }

    universalTimerState.status = 'idle';
    universalTimerState.currentSet = 1;
    renderUniversalTimerPanel();
}

// ----------------------------------------------------------------
// 3. 动作法门典籍（Exercise Codex）与双向强联跳跃
// ----------------------------------------------------------------
function renderExerciseCodex() {
    var container = document.getElementById('exerciseCodexContainer');
    if (!container) return;

    var searchVal = (document.getElementById('codexSearchInput') ? document.getElementById('codexSearchInput').value : '').toLowerCase();
    var list = (data.exerciseCodex || []).filter(function (c) {
        return !searchVal || (c.name + c.category + c.desc + c.safety + (c.muscles || '')).toLowerCase().indexOf(searchVal) !== -1;
    });

    var returnBannerHtml = '';
    if (codexReturnContext) {
        returnBannerHtml =
            '<div style="background:linear-gradient(90deg, rgba(5,255,161,0.15), rgba(0,229,255,0.08)); border:1px solid var(--green-accent); border-radius:6px; padding:10px 14px; margin-bottom:12px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">' +
                '<div>' +
                    '<span style="font-size:13px; font-weight:bold; color:var(--green-accent);">🎯 正在为预设【' + codexReturnContext.presetName + '】收录法门说明！</span>' +
                    '<div style="font-size:11px; color:var(--text-muted); margin-top:2px;">填写下方说明书后点击「刊刻并返回倒计时」，系统将自动完成绑定！</div>' +
                '</div>' +
                '<button class="btn btn-sm btn-success" onclick="returnToUniversalTimer()">↩️ 返回倒计时战台</button>' +
            '</div>';
    }

    var cardsHtml = '';
    if (list.length) {
        cardsHtml = list.map(function (c) {
            return `
            <div class="cyber-card" id="codex_card_${c.id}" style="--card-accent: var(--cyan-accent); margin-bottom:10px;">
                <div class="card-header">
                    <div>
                        <span style="font-size:15px; font-weight:bold; color:#fff;">${c.icon || '⚡'} ${c.name}</span>
                        <span class="badge badge-cyan" style="margin-left:6px;">${c.category}</span>
                    </div>
                    <div style="display:flex; gap:6px;">
                        <button class="btn btn-sm btn-outline" onclick="openExerciseCodexForm('${c.id}')">✏️ 修订</button>
                        <button class="btn btn-sm btn-danger" onclick="deleteExerciseCodexItem('${c.id}')">🗑</button>
                    </div>
                </div>
                <div style="font-size:13px; color:#d2c6ba; line-height:1.6; margin:6px 0;">
                    <strong style="color:var(--orange-primary);">【动作要领】</strong>：${c.desc}
                </div>
                <div style="font-size:12px; color:#f6c9d6; background:rgba(255,42,109,0.08); border-left:3px solid var(--pink-accent); padding:6px 10px; border-radius:0 4px 4px 0; margin-top:6px;">
                    <strong>【安全规范与眼底禁忌】</strong>：${c.safety}
                </div>
                ${c.muscles ? `<div style="font-size:11px; color:var(--text-muted); margin-top:6px;">🎯 <strong>目标肌群</strong>：${c.muscles}</div>` : ''}
            </div>
            `;
        }).join('');
    } else {
        cardsHtml = '<div style="text-align:center; padding:30px; color:var(--text-dim);">典籍中尚无法门，点击上方「+ 收录新法门」开宗立卷！</div>';
    }

    container.innerHTML =
        returnBannerHtml +
        '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; flex-wrap:wrap; gap:8px;">' +
            '<input type="text" id="codexSearchInput" value="' + searchVal + '" placeholder="🔍 检索法门名称、肌群、禁忌、分类..." oninput="renderExerciseCodex()" style="flex:1; max-width:360px;">' +
            '<button class="btn btn-primary" onclick="openExerciseCodexForm(\'\')">+ 收录新法门说明</button>' +
        '</div>' +
        cardsHtml;
}

function promptCreateCodexForPreset() {
    var cur = getCurrentUniversalPreset();
    codexReturnContext = {
        presetId: cur.id,
        presetName: cur.name
    };
    switchTab('exercise_codex');
    openExerciseCodexForm('');
    var nameInput = document.getElementById('codexFormName');
    if (nameInput) nameInput.value = cur.name;
}

function jumpToCodexDetail(codexId) {
    switchTab('exercise_codex');
    setTimeout(function () {
        var el = document.getElementById('codex_card_' + codexId);
        if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.style.boxShadow = '0 0 25px var(--cyan-accent)';
            setTimeout(function () { el.style.boxShadow = ''; }, 2000);
        }
    }, 150);
}

function returnToUniversalTimer() {
    codexReturnContext = null;
    switchTab('universal_timer');
}

function openExerciseCodexForm(editId) {
    var modal = document.getElementById('exerciseCodexModal');
    if (!modal) return;

    var cur = editId ? (data.exerciseCodex || []).find(function (c) { return c.id === editId; }) : null;
    document.getElementById('codexEditId').value = editId || '';
    document.getElementById('codexFormIcon').value = cur ? cur.icon : '⚡';
    document.getElementById('codexFormName').value = cur ? cur.name : (codexReturnContext ? codexReturnContext.presetName : '');
    document.getElementById('codexFormCategory').value = cur ? cur.category : '等长抗阻';
    document.getElementById('codexFormDesc').value = cur ? cur.desc : '';
    document.getElementById('codexFormSafety').value = cur ? cur.safety : '严禁憋气！保持全程平稳呼吸，避免眼底微血管压力暴增。';
    document.getElementById('codexFormMuscles').value = cur ? cur.muscles : '';

    var returnBtn = document.getElementById('codexSaveAndReturnBtn');
    if (returnBtn) {
        returnBtn.style.display = codexReturnContext ? 'inline-flex' : 'none';
    }

    modal.classList.add('active');
}

function closeExerciseCodexForm() {
    var modal = document.getElementById('exerciseCodexModal');
    if (modal) modal.classList.remove('active');
}

function saveExerciseCodexItem(shouldReturn) {
    var id = document.getElementById('codexEditId').value;
    var name = document.getElementById('codexFormName').value.trim();
    var icon = document.getElementById('codexFormIcon').value.trim() || '⚡';
    var category = document.getElementById('codexFormCategory').value.trim() || '通用法门';
    var desc = document.getElementById('codexFormDesc').value.trim();
    var safety = document.getElementById('codexFormSafety').value.trim();
    var muscles = document.getElementById('codexFormMuscles').value.trim();

    if (!name || !desc) {
        alert('法门名称和动作要领不能为空！');
        return;
    }

    if (!data.exerciseCodex) data.exerciseCodex = [];

    var newCodexId = id || ('codex_' + Date.now());
    if (id) {
        var idx = data.exerciseCodex.findIndex(function (c) { return c.id === id; });
        if (idx !== -1) {
            data.exerciseCodex[idx] = {
                id: id, name: name, icon: icon, category: category, desc: desc, safety: safety, muscles: muscles,
                updatedAt: new Date().toISOString()
            };
        }
    } else {
        data.exerciseCodex.push({
            id: newCodexId, name: name, icon: icon, category: category, desc: desc, safety: safety, muscles: muscles,
            createdAt: new Date().toISOString()
        });
    }

    // 若从倒计时跳转而来，自动完成绑定
    if (codexReturnContext) {
        var p = (data.universalPresets || []).find(function (x) { return x.id === codexReturnContext.presetId; });
        if (p) {
            p.codexId = newCodexId;
        }
    }

    saveData();
    closeExerciseCodexForm();
    renderExerciseCodex();

    if (shouldReturn && codexReturnContext) {
        returnToUniversalTimer();
        showToast('🎉 动作已录入典籍，已绑定至倒计时！');
    } else {
        showToast('✅ 法门已刊刻入卷！');
    }
}

function deleteExerciseCodexItem(id) {
    if (!confirm('确定除名该法门典籍？此举将解除所有倒计时预设的关联！')) return;
    data.exerciseCodex = (data.exerciseCodex || []).filter(function (c) { return c.id !== id; });
    (data.universalPresets || []).forEach(function (p) {
        if (p.codexId === id) p.codexId = '';
    });
    saveData();
    renderExerciseCodex();
    renderUniversalTimerPanel();
}