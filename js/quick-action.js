// ================================================================
// quick-action.js: 慢跑巡航 + 靠墙静蹲 + 墙角扩胸
// 特性：
// 1. 参数设定以 data.settings 为绝对单一真理源，拒绝多头分裂；
// 2. 修正 saveData 调用顺序：先修改内存对象再落盘，100% 持久化；
// 3. 彻底消除不读秒：所有等长做功与准备倒计时每一秒都清晰读秒！
// ================================================================
var currentQuickActionId = 'act_jog_glyco';
var quickTimerInterval = null;
var squatTimerInterval = null;
var chestTimerInterval = null;
var quickActionSpokenCues = new Set();
function renderTopTabs() {
var bar = document.getElementById('topTabsBar');
if (!bar) return;
var currentActive = document.querySelector('.tab-btn.active');
var activeTab = currentActive ? currentActive.dataset.tab : 'squat_deck';

var tabs = [
    { id: 'squat_deck', label: '🧱 靠墙静蹲', tip: '【靠墙静蹲】：参数自动持久化！做功每秒读秒，支持自重/单双负重。' },
    { id: 'chest_deck', label: '👐 墙角扩胸', tip: '【墙角扩胸】：参数自动持久化！做功换边每秒读秒，改善圆肩驼背。' },
    { id: 'action_quick', label: '🏃 慢跑', tip: '【慢跑巡航】：时长自记为新默认！餐后平抑血糖。' },
    { id: 'hang_timer', label: '🧗 极限悬挂', tip: '【极限悬挂】：提前量与时长可改自记！带10阶延时校准补偿。' },
    { id: 'timer', label: '🔥 离心慢放', tip: '【离心慢放】：盲听提前250ms报号，组数、秒数修改自动记忆！' },
    { id: 'stretch_timer', label: '🧘 压腿', tip: '【压腿舒筋】：全程每秒读秒，时长组数间歇全可调节自记！' },
    { id: 'workout_deck', label: '⚔️ 即时出征台', tip: '【即时出征台】：管理 5 套战术预设方案。' },
    { id: 'dashboard', label: '🧬 气血中枢', tip: '【气血中枢】：做功大盘与宏观战令。' },
    { id: 'log', label: '🥋 淬体实录', tip: '【淬体实录】：历史明细矩阵与 CSV 导出。' },
    { id: 'analysis', label: '⚡ 易筋推演', tip: '【易筋推演】：AI 深度推演 Prompt 生成器。' },
    { id: 'diary', label: '📖 淬体日记', tip: '【淬体随笔】：AI 精修与战意随笔。' },
    { id: 'knowledge', label: '📜 真武秘卷', tip: '【真武秘卷】：降糖心法与眼底安全。' },
    { id: 'settings', label: '⚙️ 灵枢配置', tip: '【灵枢配置】：排班与本命道体。' }
];

var html = '';
for (var i = 0; i < tabs.length; i++) {
    var t = tabs[i];
    var isActive = (activeTab === t.id);
    html += '<button class="tab-btn ' + (isActive ? 'active' : '') + '" data-tab="' + t.id + '" data-hud-tip="' + t.tip + '">' + t.label + '</button>';
}
bar.innerHTML = html;

bar.querySelectorAll('.tab-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
        switchTab(this.dataset.tab);
    });
});
}
// ----------------------------------------------------------------
// 1. 慢跑控制面板（时长与就位提前量以 data.settings 为真理源）
// ----------------------------------------------------------------
function renderActionQuickPanel() {
var container = document.getElementById('actionQuickContainer');
if (!container) return;
if (!window.data || !Array.isArray(data.workoutQueue)) return;
var s = data.settings;
if (s.jogDefaultMinutes === undefined) s.jogDefaultMinutes = 25;
if (s.jogPrepSec === undefined) s.jogPrepSec = 10;

var item = data.workoutQueue.find(function (x) {
    return x.actionId === 'act_jog_glyco' && x.status !== 'done';
});
if (!item) {
    item = {
        id: 'wq_jog_' + Date.now(),
        actionId: 'act_jog_glyco',
        name: '慢跑',
        icon: '🏃',
        type: 'aerobic',
        sets: 1,
        targetMinutes: s.jogDefaultMinutes,
        total: s.jogDefaultMinutes,
        status: 'idle',
        startTime: '',
        endTime: '',
        durationMin: 0
    };
    data.workoutQueue.push(item);
}

// 未做功状态强制对齐全局设定真理源
if (item.status !== 'running') {
    item.targetMinutes = s.jogDefaultMinutes;
    item.total = s.jogDefaultMinutes;
}

var isRunning = (item.status === 'running');
var prepSec = s.jogPrepSec;

var timerDisplay = String(item.targetMinutes).padStart(2, '0') + ':00';
var phaseTitle = '🎯 设定目标 ' + item.targetMinutes + ' 分钟 (留' + prepSec + 's起跑准备)';

if (isRunning && item.startTime) {
    var elapsed = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
    if (elapsed < prepSec) {
        var remPrep = prepSec - elapsed;
        timerDisplay = '00:' + String(remPrep).padStart(2, '0');
        phaseTitle = '⏳ 战前起跑准备 · 还有 ' + remPrep + ' 秒';
    } else {
        var runElapsed = elapsed - prepSec;
        var totalRunSec = item.targetMinutes * 60;
        var remSec = Math.max(0, totalRunSec - runElapsed);
        var mm = String(Math.floor(remSec / 60)).padStart(2, '0');
        var ss = String(remSec % 60).padStart(2, '0');
        timerDisplay = mm + ':' + ss;
        phaseTitle = '⚡ 慢跑巡航中 · 骨骼肌GLUT4持续汲糖';
    }
}

var presetMins = [15, 20, 25, 30, 40, 60];
var chipsHtml = '';
for (var i = 0; i < presetMins.length; i++) {
    var pm = presetMins[i];
    var actCls = (item.targetMinutes === pm) ? 'active' : '';
    chipsHtml += '<button type="button" class="preset-chip ' + actCls + '" onclick="setQuickJogMinutes(' + pm + ')">' + pm + '分</button>';
}

var prepPresets = [5, 10, 15, 20];
var prepChipsHtml = '';
for (var j = 0; j < prepPresets.length; j++) {
    var pp = prepPresets[j];
    var prepActCls = (prepSec === pp) ? 'active' : '';
    prepChipsHtml += '<button type="button" class="preset-chip ' + prepActCls + '" onclick="setQuickJogPrepSec(' + pp + ')">' + pp + '秒</button>';
}

var mainActionBtnHtml = isRunning
    ? '<button class="btn btn-danger hero-main-action-btn" onclick="stopQuickJog(false)">⏹️ 提前收功并封存</button>'
    : '<button class="btn btn-success hero-main-action-btn" onclick="startQuickJog()">▶️ 开始慢跑 (留' + prepSec + 's起跑准备)</button>';

var configPanelHtml = '';
if (!isRunning) {
    configPanelHtml =
        '<div class="mobile-param-box">' +
            '<div class="param-row" style="justify-content:center; margin-bottom:4px;">' +
                '<span class="param-label">巡航时长(自动记忆):</span>' +
                '<div class="param-chips" style="justify-content:center;">' + chipsHtml + '</div>' +
                '<div class="stepper-mini">' +
                    '<input type="number" value="' + item.targetMinutes + '" min="1" max="180" style="width:65px; text-align:center; color:var(--cyan-accent); font-weight:bold;" onchange="setQuickJogMinutes(this.value)">' +
                    '<span style="font-size:11px; color:var(--text-dim); margin-left:2px;">分</span>' +
                '</div>' +
            '</div>' +
            '<div class="param-row" style="justify-content:center; border-top:1px dashed rgba(255,255,255,0.08); padding-top:4px;">' +
                '<span class="param-label" style="color:var(--amber-accent);">起跑提前量(自动记忆):</span>' +
                '<div class="param-chips" style="justify-content:center;">' + prepChipsHtml + '</div>' +
                '<div class="stepper-mini">' +
                    '<input type="number" value="' + prepSec + '" min="3" max="60" style="width:55px; text-align:center; color:var(--amber-accent); font-weight:bold;" onchange="setQuickJogPrepSec(this.value)">' +
                    '<span style="font-size:11px; color:var(--text-dim); margin-left:2px;">秒</span>' +
                '</div>' +
            '</div>' +
        '</div>';
}

container.innerHTML =
    '<div class="cyber-card" style="border-color:var(--cyan-accent); text-align:center;">' +
        '<div class="zero-scroll-hero">' +
            '<div style="font-size:1.8rem; line-height:1;">🏃</div>' +
            '<h2 style="font-family:var(--font-tech); color:var(--orange-primary); font-size:1.3rem; margin:2px 0;">餐后慢跑巡航</h2>' +
            '<div class="hero-sub-status" id="quickTimerSubPhase" style="color:var(--green-accent);">' + phaseTitle + '</div>' +
            '<div class="hero-clock-display" id="quickTimerDisplay" style="color:var(--cyan-accent); text-shadow:0 0 20px rgba(0,229,255,0.45);">' + timerDisplay + '</div>' +
            mainActionBtnHtml +
        '</div>' +
        '<div class="secondary-settings-scroll">' +
            configPanelHtml +
        '</div>' +
    '</div>';

if (quickTimerInterval) clearInterval(quickTimerInterval);
if (isRunning) {
    quickTimerInterval = setInterval(function () {
        var el = document.getElementById('quickTimerDisplay');
        var subEl = document.getElementById('quickTimerSubPhase');
        if (!el || !item.startTime) return;

        var elaps = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);

        if (elaps < prepSec) {
            var remP = prepSec - elaps;
            el.textContent = '00:' + String(remP).padStart(2, '0');
            if (subEl) subEl.textContent = '⏳ 战前起跑准备 · 还有 ' + remP + ' 秒';
            speakFast(String(remP));
            return;
        }

        if (elaps === prepSec && !quickActionSpokenCues.has('jog_started')) {
            quickActionSpokenCues.add('jog_started');
            speakFast('起跑，保持呼吸，开始巡航！');
        }

        var runElaps = elaps - prepSec;
        var totalSec = item.targetMinutes * 60;
        var rem = totalSec - runElaps;

        if (rem <= 0) {
            clearInterval(quickTimerInterval);
            quickTimerInterval = null;
            el.textContent = "00:00";
            stopQuickJog(true);
            return;
        }

        if (rem <= 10 && rem > 0) {
            speakFast(String(rem));
        } else if (rem % 300 === 0 && !quickActionSpokenCues.has('jog_rem_' + rem)) {
            quickActionSpokenCues.add('jog_rem_' + rem);
            speakFast('还剩' + Math.round(rem / 60) + '分钟');
        }

        var mm = String(Math.floor(rem / 60)).padStart(2, '0');
        var ss = String(rem % 60).padStart(2, '0');
        el.textContent = mm + ':' + ss;
        if (subEl) subEl.textContent = '⚡ 慢跑巡航中 · 骨骼肌GLUT4持续汲糖';
    }, 1000);
}
}
// 修改慢跑时长：原子化更新 settings 与队列项后再落盘
window.setQuickJogMinutes = function (m) {
var val = Math.max(1, parseInt(m) || 25);
data.settings.jogDefaultMinutes = val;
var item = data.workoutQueue.find(function (x) {
    return x.actionId === 'act_jog_glyco' && x.status !== 'done';
});
if (item && item.status !== 'running') {
    item.targetMinutes = val;
    item.total = val;
    item.reps = val + 'min';
}

if (!data.customParamCache['act_jog_glyco']) data.customParamCache['act_jog_glyco'] = {};
data.customParamCache['act_jog_glyco'].total = val;

saveData();
renderActionQuickPanel();
};
window.setQuickJogPrepSec = function (s) {
var val = Math.max(3, parseInt(s) || 10);
data.settings.jogPrepSec = val;
saveData();
renderActionQuickPanel();
};
function startQuickJog() {
var item = data.workoutQueue.find(function (x) {
return x.actionId === 'act_jog_glyco' && x.status !== 'done';
});
if (!item) return;
item.status = 'running';
item.startTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();
item.endTime = '';
item.durationMin = 0;

quickActionSpokenCues.clear();
saveData();
renderActionQuickPanel();

var prep = data.settings.jogPrepSec || 10;
speakFast('慢跑准备，' + prep + '秒就位准备起跑！');
}
function stopQuickJog(isAuto) {
if (quickTimerInterval) {
clearInterval(quickTimerInterval);
quickTimerInterval = null;
}
var item = data.workoutQueue.find(function (x) {
    return x.actionId === 'act_jog_glyco' && x.status !== 'done';
});
if (!item) return;

item.status = 'done';
item.endTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();

if (item.startTime) {
    var s = new Date(item.startTime).getTime();
    var e = new Date(item.endTime).getTime();
    item.durationMin = Math.max(1, Math.round((e - s) / (1000 * 60)));
} else {
    item.durationMin = item.targetMinutes || data.settings.jogDefaultMinutes || 25;
}

if (isAuto && item.targetMinutes) item.durationMin = item.targetMinutes;

item.total = item.durationMin;
item.reps = item.durationMin + 'min';

if (typeof autoCommitLogEntry === 'function') {
    autoCommitLogEntry(item);
}
data.workoutQueue = data.workoutQueue.filter(function (x) {
    return x.id !== item.id;
});
saveData();
renderActionQuickPanel();
if (typeof renderAll === 'function') renderAll();

if (isAuto) {
    speakFast('恭喜！预定' + item.durationMin + '分钟慢跑圆满完成，已自动入册！');
    showToast('🎉 慢跑时间到！已自动封存入册（' + item.durationMin + '分钟）');
} else {
    speakFast('慢跑收功，已成功入册！');
    showToast('✅ 慢跑提前收功已入册（' + item.durationMin + '分钟）');
}
}
// ----------------------------------------------------------------
// 2. 靠墙静蹲专属工作战位
// ★ 消除时序 bug：严格先修改对象，再触发落盘 saveData！
// ★ 未开练时始终向 data.settings 靠拢，彻底杜绝回弹还原！
// ----------------------------------------------------------------
function renderSquatDeckPanel() {
var container = document.getElementById('squatDeckContainer');
if (!container) return;
if (!window.data || !Array.isArray(data.workoutQueue)) return;
var s = data.settings;
if (s.squatDefaultMode === undefined) s.squatDefaultMode = 'bodyweight';
if (s.squatDefaultSeconds === undefined) s.squatDefaultSeconds = 60;
if (s.squatDefaultSets === undefined) s.squatDefaultSets = 3;
if (s.squatRestSec === undefined) s.squatRestSec = 60;
if (s.squatPrepSec === undefined) s.squatPrepSec = 10;
if (s.squatSingleWeight === undefined) s.squatSingleWeight = 10.0;
if (s.squatLeftWeight === undefined) s.squatLeftWeight = 5.0;
if (s.squatRightWeight === undefined) s.squatRightWeight = 5.0;
if (!s.squatItemDesc) s.squatItemDesc = '哑铃';
if (s.squatLockSymmetric === undefined) s.squatLockSymmetric = true;

var item = data.workoutQueue.find(function (x) {
    return x.actionId === 'act_squat_wall' && x.status !== 'done';
});
if (!item) {
    item = {
        id: 'wq_squat_' + Date.now(),
        actionId: 'act_squat_wall',
        name: '靠墙静蹲',
        icon: '🧱',
        type: 'isometric',
        sets: s.squatDefaultSets,
        targetSeconds: s.squatDefaultSeconds,
        targetSets: s.squatDefaultSets,
        total: s.squatDefaultSeconds * s.squatDefaultSets,
        status: 'idle',
        startTime: '',
        endTime: '',
        durationMin: 0
    };
    data.workoutQueue.push(item);
}

// 关键修正：未做功状态下，出征项必须始终对齐全局设定的最新默认值！
if (item.status !== 'running') {
    item.targetSeconds = s.squatDefaultSeconds;
    item.targetSets = s.squatDefaultSets;
    item.sets = s.squatDefaultSets;
    item.total = s.squatDefaultSeconds * s.squatDefaultSets;
    item.reps = s.squatDefaultSeconds + 's';
}

var isRunning = (item.status === 'running');
var targetSec = s.squatDefaultSeconds;
var targetSets = s.squatDefaultSets;
var restSec = s.squatRestSec;
var prepSec = s.squatPrepSec;

var loadBadgeDesc = '';
if (s.squatDefaultMode === 'bodyweight') {
    loadBadgeDesc = '🟢 徒手自重 (0kg)';
} else if (s.squatDefaultMode === 'single') {
    loadBadgeDesc = '🟠 单物负重: ' + (s.squatItemDesc || '重物') + ' ' + s.squatSingleWeight + 'kg';
} else {
    var isSymm = (s.squatLeftWeight === s.squatRightWeight);
    var totalW = (parseFloat(s.squatLeftWeight) + parseFloat(s.squatRightWeight)).toFixed(1);
    if (isSymm) {
        loadBadgeDesc = '🔴 双物负重: 左右大腿根部各 ' + s.squatLeftWeight + 'kg (共' + totalW + 'kg)';
    } else {
        loadBadgeDesc = '⚡ 非对称双重: 左 ' + s.squatLeftWeight + 'kg / 右 ' + s.squatRightWeight + 'kg (共' + totalW + 'kg)';
    }
}

var timerDisplay = '01:00';
var phaseTitle = '🎯 计划 ' + targetSets + ' 组 · 单组 ' + targetSec + 's (休' + restSec + 's · 备' + prepSec + 's)';

if (isRunning && item.startTime) {
    var elapsed = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
    var info = getSquatSchedulePhase(targetSec, targetSets, restSec, prepSec, elapsed);
    var mm = String(Math.floor(info.remInPhase / 60)).padStart(2, '0');
    var ss = String(info.remInPhase % 60).padStart(2, '0');
    timerDisplay = mm + ':' + ss;
    phaseTitle = info.phaseName;
} else {
    var initM = String(Math.floor(targetSec / 60)).padStart(2, '0');
    var initS = String(targetSec % 60).padStart(2, '0');
    timerDisplay = initM + ':' + initS;
}

var mainActionBtnHtml = isRunning
    ? '<button class="btn btn-danger hero-main-action-btn" onclick="stopSquatWorkout(false)">⏹️ 提前收功并封存</button>'
    : '<button class="btn btn-success hero-main-action-btn" onclick="startSquatWorkout()">▶️ 开始静蹲 (留' + prepSec + 's贴墙就位)</button>';

var configPanelHtml = '';
if (!isRunning) {
    var modeChips =
        '<div class="param-chips" style="margin-bottom:6px;">' +
            '<button type="button" class="preset-chip ' + (s.squatDefaultMode === 'bodyweight' ? 'active' : '') + '" onclick="setSquatMode(\'bodyweight\')">徒手自重</button>' +
            '<button type="button" class="preset-chip ' + (s.squatDefaultMode === 'single' ? 'active' : '') + '" onclick="setSquatMode(\'single\')">单物负重(大米/单壶铃)</button>' +
            '<button type="button" class="preset-chip ' + (s.squatDefaultMode === 'dual' ? 'active' : '') + '" onclick="setSquatMode(\'dual\')">双物负重(左右大腿根部)</button>' +
        '</div>';

    var singleConfig = '';
    if (s.squatDefaultMode === 'single') {
        var singlePresets = [5, 10, 15, 20].map(function (w) {
            var c = (s.squatSingleWeight == w) ? 'active' : '';
            return '<button type="button" class="preset-chip ' + c + '" onclick="updateSquatSingleWeight(' + w + ')">' + w + 'kg</button>';
        }).join('');

        singleConfig =
            '<div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:4px; padding:5px 8px; margin-top:4px;">' +
                '<div class="row">' +
                    '<div class="flex-2">' +
                        '<label>物品名称</label>' +
                        '<input type="text" value="' + (s.squatItemDesc || '大米') + '" placeholder="如: 大米袋 / 壶铃" onchange="updateSquatItemDesc(this.value)">' +
                    '</div>' +
                    '<div class="flex-1">' +
                        '<label>重量(kg)</label>' +
                        '<input type="number" step="0.5" min="1" max="100" value="' + s.squatSingleWeight + '" onchange="updateSquatSingleWeight(this.value)">' +
                    '</div>' +
                '</div>' +
                '<div class="weight-presets-chips">' +
                    '<span style="font-size:10px; color:var(--text-dim); align-self:center;">快捷:</span>' + singlePresets +
                '</div>' +
            '</div>';
    }

    var dualConfig = '';
    if (s.squatDefaultMode === 'dual') {
        var dualPresets = [2.5, 5.0, 7.5, 10.0, 15.0].map(function (w) {
            var c = (s.squatLeftWeight == w) ? 'active' : '';
            return '<button type="button" class="preset-chip ' + c + '" onclick="updateSquatDualPreset(' + w + ')">' + w + 'kg</button>';
        }).join('');

        dualConfig =
            '<div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:4px; padding:5px 8px; margin-top:4px;">' +
                '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">' +
                    '<span style="font-size:10.5px; color:var(--cyan-accent); font-weight:bold;">双手各持负重置于左右大腿根部</span>' +
                    '<label style="display:inline-flex; align-items:center; gap:3px; cursor:pointer; text-transform:none; font-size:10.5px; color:var(--amber-accent);">' +
                        '<input type="checkbox" style="width:13px; height:13px;" ' + (s.squatLockSymmetric ? 'checked' : '') + ' onchange="toggleSquatSymmetric(this.checked)">' +
                        '左右对称联动' +
                    '</label>' +
                '</div>' +
                '<div class="row">' +
                    '<div class="flex-1 weight-field-box">' +
                        '<label>左大腿根(kg)</label>' +
                        '<input type="number" step="0.5" min="0.5" max="60" value="' + s.squatLeftWeight + '" onchange="updateSquatLeftWeight(this.value)">' +
                    '</div>' +
                    '<div class="flex-1 weight-field-box">' +
                        '<label>右大腿根(kg)</label>' +
                        '<input type="number" step="0.5" min="0.5" max="60" value="' + s.squatRightWeight + '" ' + (s.squatLockSymmetric ? 'disabled style="opacity:0.6;"' : '') + ' onchange="updateSquatRightWeight(this.value)">' +
                    '</div>' +
                    '<div class="flex-1">' +
                        '<label>物品名</label>' +
                        '<input type="text" value="' + (s.squatItemDesc || '哑铃') + '" onchange="updateSquatItemDesc(this.value)">' +
                    '</div>' +
                '</div>' +
                '<div class="weight-presets-chips">' +
                    '<span style="font-size:10px; color:var(--text-dim); align-self:center;">单侧预设:</span>' + dualPresets +
                '</div>' +
            '</div>';
    }

    var secPresets = [30, 45, 60, 90, 120].map(function (sec) {
        var c = (targetSec === sec) ? 'active' : '';
        return '<button type="button" class="preset-chip ' + c + '" onclick="setSquatSeconds(' + sec + ')">' + sec + 's</button>';
    }).join('');

    var setsPresets = [1, 2, 3, 4, 5, 6].map(function (cnt) {
        var c = (targetSets === cnt) ? 'active' : '';
        return '<button type="button" class="preset-chip ' + c + '" onclick="setSquatSets(' + cnt + ')">' + cnt + '组</button>';
    }).join('');

    var restPresets = [30, 45, 60, 90, 120].map(function (r) {
        var c = (restSec === r) ? 'active' : '';
        return '<button type="button" class="preset-chip ' + c + '" onclick="setSquatRestSec(' + r + ')">' + r + 's</button>';
    }).join('');

    var prepPresets = [5, 10, 15, 20].map(function (p) {
        var c = (prepSec === p) ? 'active' : '';
        return '<button type="button" class="preset-chip ' + c + '" onclick="setSquatPrepSec(' + p + ')">' + p + 's</button>';
    }).join('');

    configPanelHtml =
        '<div class="squat-load-panel">' +
            '<div class="squat-load-header">' +
                '<span class="squat-load-title">⚖️ 静蹲姿态与负重配置 (修改即成为新默认)</span>' +
                '<span style="font-size:10.5px; color:var(--text-muted);">' + loadBadgeDesc + '</span>' +
            '</div>' +
            modeChips +
            singleConfig +
            dualConfig +
            '<div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px; margin-top:6px; display:flex; flex-direction:column; gap:6px;">' +
                '<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">' +
                    '<div style="display:flex; align-items:center; gap:4px;">' +
                        '<span style="font-size:11px; color:var(--cyan-accent);">单组时长:</span>' + secPresets +
                    '</div>' +
                    '<div class="stepper-mini">' +
                        '<input type="number" value="' + targetSec + '" min="10" max="600" step="5" style="width:65px; text-align:center; color:var(--cyan-accent); font-weight:bold;" onchange="setSquatSeconds(this.value)">' +
                        '<span style="font-size:11px; color:var(--text-dim); margin-left:2px;">秒</span>' +
                    '</div>' +
                '</div>' +
                '<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">' +
                    '<div style="display:flex; align-items:center; gap:4px;">' +
                        '<span style="font-size:11px; color:var(--orange-primary);">计划组数:</span>' + setsPresets +
                    '</div>' +
                    '<div class="stepper-mini">' +
                        '<input type="number" value="' + targetSets + '" min="1" max="20" step="1" style="width:55px; text-align:center; color:var(--orange-primary); font-weight:bold;" onchange="setSquatSets(this.value)">' +
                        '<span style="font-size:11px; color:var(--text-dim); margin-left:2px;">组</span>' +
                    '</div>' +
                '</div>' +
                '<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">' +
                    '<div style="display:flex; align-items:center; gap:4px;">' +
                        '<span style="font-size:11px; color:var(--green-accent);">组间休息:</span>' + restPresets +
                    '</div>' +
                    '<div class="stepper-mini">' +
                        '<input type="number" value="' + restSec + '" min="5" max="300" step="5" style="width:65px; text-align:center; color:var(--green-accent); font-weight:bold;" onchange="setSquatRestSec(this.value)">' +
                        '<span style="font-size:11px; color:var(--text-dim); margin-left:2px;">秒</span>' +
                    '</div>' +
                '</div>' +
                '<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">' +
                    '<div style="display:flex; align-items:center; gap:4px;">' +
                        '<span style="font-size:11px; color:var(--amber-accent);">就位提前量:</span>' + prepPresets +
                    '</div>' +
                    '<div class="stepper-mini">' +
                        '<input type="number" value="' + prepSec + '" min="3" max="60" step="1" style="width:55px; text-align:center; color:var(--amber-accent); font-weight:bold;" onchange="setSquatPrepSec(this.value)">' +
                        '<span style="font-size:11px; color:var(--text-dim); margin-left:2px;">秒</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
}

container.innerHTML =
    '<div class="cyber-card" style="border-color:var(--orange-primary); text-align:center;">' +
        '<div class="zero-scroll-hero">' +
            '<div style="font-size:1.8rem; line-height:1;">🧱</div>' +
            '<h2 style="font-family:var(--font-tech); color:var(--orange-primary); font-size:1.3rem; margin:2px 0;">靠墙静蹲 · 深度破糖</h2>' +
            '<div class="hero-sub-status" id="squatPhaseSubTitle" style="color:var(--cyan-accent);">' + phaseTitle + '</div>' +
            '<div class="hero-clock-display" id="squatTimerDisplay" style="color:var(--orange-primary); text-shadow:0 0 20px rgba(255,122,0,0.5);">' + timerDisplay + '</div>' +
            mainActionBtnHtml +
        '</div>' +
        '<div class="secondary-settings-scroll">' +
            configPanelHtml +
        '</div>' +
    '</div>';

if (squatTimerInterval) clearInterval(squatTimerInterval);
if (isRunning) {
    squatTimerInterval = setInterval(function () {
        var el = document.getElementById('squatTimerDisplay');
        var subEl = document.getElementById('squatPhaseSubTitle');
        if (!el || !item.startTime) return;

        var elaps = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
        var inf = getSquatSchedulePhase(targetSec, targetSets, restSec, prepSec, elaps);

        if (inf.isDone) {
            clearInterval(squatTimerInterval);
            squatTimerInterval = null;
            el.textContent = "00:00";
            stopSquatWorkout(true);
            return;
        }

        if (!quickActionSpokenCues.has(inf.phaseKey)) {
            quickActionSpokenCues.add(inf.phaseKey);
            if (inf.isPrep) {
                speakFast('战前就位，后背贴墙，大腿水平90度，' + prepSec + '秒准备！');
            } else if (inf.isWork) {
                speakFast('第' + inf.currentSet + '组静蹲开始，坚持' + targetSec + '秒！');
            } else {
                speakFast('第' + inf.currentSet + '组完成！组间休整' + restSec + '秒，站立抖腿。');
            }
        }

        // ★ 每一秒都清晰读秒报号
        if (inf.isPrep) {
            speakFast(String(inf.remInPhase));
        } else if (inf.isWork) {
            speakFast(String(inf.remInPhase));
        } else {
            if (inf.remInPhase <= 5 && inf.remInPhase > 0) {
                speakFast(String(inf.remInPhase));
            } else if (inf.remInPhase === 10 && !quickActionSpokenCues.has('squat_warn_rest_' + inf.currentSet)) {
                quickActionSpokenCues.add('squat_warn_rest_' + inf.currentSet);
                speakFast('还有10秒，靠墙就位！');
            }
        }

        var mm = String(Math.floor(inf.remInPhase / 60)).padStart(2, '0');
        var ss = String(inf.remInPhase % 60).padStart(2, '0');
        el.textContent = mm + ':' + ss;

        if (subEl) {
            subEl.innerHTML = inf.isPrep
                ? '<span style="color:var(--amber-accent); font-weight:bold;">⏳ 战前就位中 · 还有 ' + inf.remInPhase + 's 开练</span>'
                : (inf.isWork
                    ? '<span style="color:var(--green-accent); font-weight:bold;">🦵 第 ' + inf.currentSet + ' / ' + inf.targetSets + ' 组 · 大腿水平做功中</span>'
                    : '<span style="color:var(--amber-accent); font-weight:bold;">☕ 组间休整中 · 休息' + restSec + 's (剩余 ' + inf.remInPhase + 's)</span>');
        }
    }, 1000);
}
}
function getSquatSchedulePhase(targetSec, targetSets, restSec, prepSec, elapsedSec) {
prepSec = (prepSec !== undefined) ? prepSec : 10;
if (elapsedSec < prepSec) {
return {
isDone: false, isPrep: true, isWork: false, currentSet: 1, targetSets: targetSets,
remInPhase: prepSec - elapsedSec, phaseDuration: prepSec, phaseKey: 'squat_prep',
phaseName: '⏳ 战前就位准备 (后背贴墙，大腿水平90°)'
};
}
var afterPrep = elapsedSec - prepSec;
var accum = 0;
for (var k = 1; k <= targetSets; k++) {
    var wEnd = accum + targetSec;
    if (afterPrep < wEnd) {
        return {
            isDone: false, isPrep: false, isWork: true, currentSet: k, targetSets: targetSets,
            remInPhase: wEnd - afterPrep, phaseDuration: targetSec, phaseKey: 'squat_work_' + k,
            phaseName: '🦵 第 ' + k + ' / ' + targetSets + ' 组 · 等长收缩做功中'
        };
    }
    accum = wEnd;

    if (k < targetSets) {
        var rEnd = accum + restSec;
        if (afterPrep < rEnd) {
            return {
                isDone: false, isPrep: false, isWork: false, currentSet: k, targetSets: targetSets,
                remInPhase: rEnd - afterPrep, phaseDuration: restSec, phaseKey: 'squat_rest_' + k,
                phaseName: '☕ 组间休整中 · 慢走抖腿 (还剩 ' + (rEnd - afterPrep) + 's)'
            };
        }
        accum = rEnd;
    }
}
return { isDone: true, totalScheduleSec: accum + prepSec };
}
// 自动记忆静蹲单组时长：严格先更新对象再落盘 saveData
window.setSquatSeconds = function (sec) {
var val = Math.max(10, parseInt(sec) || 60);
data.settings.squatDefaultSeconds = val;
var item = data.workoutQueue.find(function (x) {
    return x.actionId === 'act_squat_wall' && x.status !== 'done';
});
if (item && item.status !== 'running') {
    item.targetSeconds = val;
    item.reps = val + 's';
    item.total = val * (data.settings.squatDefaultSets || 3);
}
if (!data.customParamCache['act_squat_wall']) data.customParamCache['act_squat_wall'] = {};
data.customParamCache['act_squat_wall'].reps = val + 's';

saveData();
renderSquatDeckPanel();
};
// 自动记忆静蹲组数：先更新对象再落盘 saveData
window.setSquatSets = function (sets) {
var val = Math.max(1, parseInt(sets) || 3);
data.settings.squatDefaultSets = val;
var item = data.workoutQueue.find(function (x) {
    return x.actionId === 'act_squat_wall' && x.status !== 'done';
});
if (item && item.status !== 'running') {
    item.targetSets = val;
    item.sets = val;
    item.total = (data.settings.squatDefaultSeconds || 60) * val;
}
if (!data.customParamCache['act_squat_wall']) data.customParamCache['act_squat_wall'] = {};
data.customParamCache['act_squat_wall'].sets = val;

saveData();
renderSquatDeckPanel();
};
window.setSquatRestSec = function (sec) {
var val = Math.max(5, parseInt(sec) || 60);
data.settings.squatRestSec = val;
saveData();
renderSquatDeckPanel();
};
window.setSquatPrepSec = function (sec) {
var val = Math.max(3, parseInt(sec) || 10);
data.settings.squatPrepSec = val;
saveData();
renderSquatDeckPanel();
};
window.setSquatMode = function (mode) {
data.settings.squatDefaultMode = mode;
saveData();
renderSquatDeckPanel();
};
window.updateSquatItemDesc = function (val) {
data.settings.squatItemDesc = val.trim();
saveData();
};
window.updateSquatSingleWeight = function (w) {
data.settings.squatSingleWeight = parseFloat(w) || 10.0;
saveData();
renderSquatDeckPanel();
};
window.toggleSquatSymmetric = function (checked) {
data.settings.squatLockSymmetric = checked;
if (checked) {
data.settings.squatRightWeight = data.settings.squatLeftWeight;
}
saveData();
renderSquatDeckPanel();
};
window.updateSquatLeftWeight = function (w) {
var val = parseFloat(w) || 5.0;
data.settings.squatLeftWeight = val;
if (data.settings.squatLockSymmetric) {
data.settings.squatRightWeight = val;
}
saveData();
renderSquatDeckPanel();
};
window.updateSquatRightWeight = function (w) {
data.settings.squatRightWeight = parseFloat(w) || 5.0;
saveData();
renderSquatDeckPanel();
};
window.updateSquatDualPreset = function (w) {
data.settings.squatLeftWeight = w;
data.settings.squatRightWeight = w;
saveData();
renderSquatDeckPanel();
};
function startSquatWorkout() {
var item = data.workoutQueue.find(function (x) {
return x.actionId === 'act_squat_wall' && x.status !== 'done';
});
if (!item) return;
item.status = 'running';
item.startTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();
item.endTime = '';
item.durationMin = 0;

quickActionSpokenCues.clear();
saveData();
renderSquatDeckPanel();

var sec = data.settings.squatDefaultSeconds || 60;
var sets = data.settings.squatDefaultSets || 3;
var prep = data.settings.squatPrepSec || 10;
speakFast('战前就位，共' + sets + '组，每组' + sec + '秒，' + prep + '秒就位准备！');
}
function stopSquatWorkout(isAuto) {
if (squatTimerInterval) {
clearInterval(squatTimerInterval);
squatTimerInterval = null;
}
var item = data.workoutQueue.find(function (x) {
    return x.actionId === 'act_squat_wall' && x.status !== 'done';
});
if (!item) return;

item.status = 'done';
item.endTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();

var sec = data.settings.squatDefaultSeconds || 60;
var sets = data.settings.squatDefaultSets || 3;
item.sets = sets;
item.total = sec * sets;
item.reps = Array(sets).fill(sec + 's').join(',');

if (item.startTime) {
    var s = new Date(item.startTime).getTime();
    var e = new Date(item.endTime).getTime();
    item.durationMin = Math.max(1, Math.round((e - s) / (1000 * 60)));
} else {
    item.durationMin = Math.max(1, Math.round(((sets - 1) * (data.settings.squatRestSec || 60) + item.total) / 60));
}

var st = data.settings;
var loadNote = '';
if (st.squatDefaultMode === 'bodyweight') {
    loadNote = '【徒手自重 0kg】';
} else if (st.squatDefaultMode === 'single') {
    loadNote = '【单物负重(' + (st.squatItemDesc || '重物') + '): ' + st.squatSingleWeight + 'kg】';
} else {
    var isSymm = (st.squatLeftWeight === st.squatRightWeight);
    var totalW = (parseFloat(st.squatLeftWeight) + parseFloat(st.squatRightWeight)).toFixed(1);
    if (isSymm) {
        loadNote = '【双哑铃负重(' + (st.squatItemDesc || '哑铃') + '): 左右大腿根部各' + st.squatLeftWeight + 'kg, 合计' + totalW + 'kg】';
    } else {
        loadNote = '【非对称双重(' + (st.squatItemDesc || '哑铃') + '): 左大腿根部' + st.squatLeftWeight + 'kg, 右大腿根部' + st.squatRightWeight + 'kg, 合计' + totalW + 'kg】';
    }
}

item.note = '靠墙静蹲做功' + loadNote + '：完成 ' + sets + ' 组 × ' + sec + ' 秒，等长收缩做功 ' + item.total + ' 秒。';

if (typeof autoCommitLogEntry === 'function') {
    autoCommitLogEntry(item);
}
data.workoutQueue = data.workoutQueue.filter(function (x) {
    return x.id !== item.id;
});
saveData();
renderSquatDeckPanel();
if (typeof renderAll === 'function') renderAll();

if (isAuto) {
    speakFast('恭喜！靠墙静蹲' + sets + '组圆满收功，战功已自动封存入册！');
    showToast('🎉 靠墙静蹲（' + sets + '组·' + item.total + 's）已自动封存！');
} else {
    speakFast('靠墙静蹲收功，已成功入册！');
    showToast('✅ 靠墙静蹲已入册！');
}
}
// ----------------------------------------------------------------
// 3. 墙角扩胸控制面板 (左右交替拉伸，先更新对象再落盘 saveData)
// ----------------------------------------------------------------
function renderChestDeckPanel() {
var container = document.getElementById('chestDeckContainer');
if (!container) return;
if (!window.data || !Array.isArray(data.workoutQueue)) return;
var s = data.settings;
if (s.chestDefaultSets === undefined) s.chestDefaultSets = 3;
if (s.chestDefaultSec === undefined) s.chestDefaultSec = 30;
if (s.chestRestSec === undefined) s.chestRestSec = 15;
if (s.chestPrepSec === undefined) s.chestPrepSec = 10;

var item = data.workoutQueue.find(function (x) {
    return x.actionId === 'act_chest_stretch' && x.status !== 'done';
});
if (!item) {
    item = {
        id: 'wq_chest_' + Date.now(),
        actionId: 'act_chest_stretch',
        name: '墙角扩胸',
        icon: '👐',
        type: 'isometric',
        sets: s.chestDefaultSets,
        targetSeconds: s.chestDefaultSec,
        restSeconds: s.chestRestSec,
        total: s.chestDefaultSets * 2 * s.chestDefaultSec,
        status: 'idle',
        startTime: '',
        endTime: '',
        durationMin: 0
    };
    data.workoutQueue.push(item);
}

if (item.status !== 'running') {
    item.targetSeconds = s.chestDefaultSec;
    item.sets = s.chestDefaultSets;
    item.total = s.chestDefaultSec * s.chestDefaultSets * 2;
    item.reps = s.chestDefaultSec + 's';
}

var isRunning = (item.status === 'running');
var targetSec = s.chestDefaultSec;
var targetSets = s.chestDefaultSets;
var restSec = s.chestRestSec;
var prepSec = s.chestPrepSec;

var timerDisplay = '00:30';
var phaseTitle = '🎯 计划 ' + targetSets + ' 组 (单侧 ' + targetSec + 's · 间歇 ' + restSec + 's · 留' + prepSec + 's准备)';

if (isRunning && item.startTime) {
    var elapsed = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
    var info = getChestSchedulePhase(targetSec, targetSets, restSec, prepSec, elapsed);
    var mm = String(Math.floor(info.remInPhase / 60)).padStart(2, '0');
    var ss = String(info.remInPhase % 60).padStart(2, '0');
    timerDisplay = mm + ':' + ss;
    phaseTitle = info.phaseName;
} else {
    var initM = String(Math.floor(targetSec / 60)).padStart(2, '0');
    var initS = String(targetSec % 60).padStart(2, '0');
    timerDisplay = initM + ':' + initS;
}

var mainActionBtnHtml = isRunning
    ? '<button class="btn btn-danger hero-main-action-btn" onclick="stopChestWorkout(false)">⏹️ 提前收功并封存</button>'
    : '<button class="btn btn-success hero-main-action-btn" onclick="startChestWorkout()">▶️ 开始墙角扩胸 (留' + prepSec + 's就绪)</button>';

var configPanelHtml = '';
if (!isRunning) {
    var secPresets = [20, 30, 45, 60, 90].map(function (sec) {
        var c = (targetSec === sec) ? 'active' : '';
        return '<button type="button" class="preset-chip ' + c + '" onclick="setChestSeconds(' + sec + ')">' + sec + 's</button>';
    }).join('');

    var setsPresets = [1, 2, 3, 4, 5, 6].map(function (cnt) {
        var c = (targetSets === cnt) ? 'active' : '';
        return '<button type="button" class="preset-chip ' + c + '" onclick="setChestSets(' + cnt + ')">' + cnt + '组</button>';
    }).join('');

    var restPresets = [10, 15, 20, 30].map(function (r) {
        var c = (restSec === r) ? 'active' : '';
        return '<button type="button" class="preset-chip ' + c + '" onclick="setChestRestSec(' + r + ')">' + r + 's</button>';
    }).join('');

    var prepPresets = [5, 10, 15, 20].map(function (p) {
        var c = (prepSec === p) ? 'active' : '';
        return '<button type="button" class="preset-chip ' + c + '" onclick="setChestPrepSec(' + p + ')">' + p + 's</button>';
    }).join('');

    configPanelHtml =
        '<div class="squat-load-panel">' +
            '<div class="squat-load-header">' +
                '<span class="squat-load-title">⚖️ 扩胸参数配置 (修改即成为新默认，全周期每秒读秒)</span>' +
            '</div>' +
            '<div style="display:flex; flex-direction:column; gap:6px; margin-top:4px;">' +
                '<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">' +
                    '<div style="display:flex; align-items:center; gap:4px;">' +
                        '<span style="font-size:11px; color:var(--purple-accent);">单侧拉伸:</span>' + secPresets +
                    '</div>' +
                    '<div class="stepper-mini">' +
                        '<input type="number" value="' + targetSec + '" min="10" max="300" step="5" style="width:65px; text-align:center; color:var(--purple-accent); font-weight:bold;" onchange="setChestSeconds(this.value)">' +
                        '<span style="font-size:11px; color:var(--text-dim); margin-left:2px;">秒</span>' +
                    '</div>' +
                '</div>' +
                '<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">' +
                    '<div style="display:flex; align-items:center; gap:4px;">' +
                        '<span style="font-size:11px; color:var(--orange-primary);">循环组数:</span>' + setsPresets +
                    '</div>' +
                    '<div class="stepper-mini">' +
                        '<input type="number" value="' + targetSets + '" min="1" max="20" step="1" style="width:55px; text-align:center; color:var(--orange-primary); font-weight:bold;" onchange="setChestSets(this.value)">' +
                        '<span style="font-size:11px; color:var(--text-dim); margin-left:2px;">组</span>' +
                    '</div>' +
                '</div>' +
                '<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">' +
                    '<div style="display:flex; align-items:center; gap:4px;">' +
                        '<span style="font-size:11px; color:var(--green-accent);">换边/组间休整:</span>' + restPresets +
                    '</div>' +
                    '<div class="stepper-mini">' +
                        '<input type="number" value="' + restSec + '" min="5" max="120" step="5" style="width:55px; text-align:center; color:var(--green-accent); font-weight:bold;" onchange="setChestRestSec(this.value)">' +
                        '<span style="font-size:11px; color:var(--text-dim); margin-left:2px;">秒</span>' +
                    '</div>' +
                '</div>' +
                '<div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:4px;">' +
                    '<div style="display:flex; align-items:center; gap:4px;">' +
                        '<span style="font-size:11px; color:var(--amber-accent);">战前准备提前量:</span>' + prepPresets +
                    '</div>' +
                    '<div class="stepper-mini">' +
                        '<input type="number" value="' + prepSec + '" min="3" max="60" step="1" style="width:55px; text-align:center; color:var(--amber-accent); font-weight:bold;" onchange="setChestPrepSec(this.value)">' +
                        '<span style="font-size:11px; color:var(--text-dim); margin-left:2px;">秒</span>' +
                    '</div>' +
                '</div>' +
            '</div>' +
        '</div>';
}

container.innerHTML =
    '<div class="cyber-card" style="border-color:var(--purple-accent); text-align:center;">' +
        '<div class="zero-scroll-hero">' +
            '<div style="font-size:1.8rem; line-height:1;">👐</div>' +
            '<h2 style="font-family:var(--font-tech); color:var(--purple-accent); font-size:1.3rem; margin:2px 0;">墙角扩胸 · 改善圆肩</h2>' +
            '<div class="hero-sub-status" id="chestPhaseSubTitle" style="color:var(--cyan-accent);">' + phaseTitle + '</div>' +
            '<div class="hero-clock-display" id="chestTimerDisplay" style="color:var(--purple-accent); text-shadow:0 0 20px rgba(181,95,230,0.45);">' + timerDisplay + '</div>' +
            mainActionBtnHtml +
        '</div>' +
        '<div class="secondary-settings-scroll">' +
            configPanelHtml +
        '</div>' +
    '</div>';

if (chestTimerInterval) clearInterval(chestTimerInterval);
if (isRunning) {
    chestTimerInterval = setInterval(function () {
        var el = document.getElementById('chestTimerDisplay');
        var subEl = document.getElementById('chestPhaseSubTitle');
        if (!el || !item.startTime) return;

        var elaps = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
        var inf = getChestSchedulePhase(targetSec, targetSets, restSec, prepSec, elaps);

        if (inf.isDone) {
            clearInterval(chestTimerInterval);
            chestTimerInterval = null;
            el.textContent = "00:00";
            stopChestWorkout(true);
            return;
        }

        if (!quickActionSpokenCues.has(inf.phaseKey)) {
            quickActionSpokenCues.add(inf.phaseKey);
            if (inf.isPrep) {
                speakFast('墙角就位，曲肘抵墙，' + prepSec + '秒就绪！');
            } else if (inf.isWork) {
                speakFast('第' + inf.currentSet + '组，' + inf.side + '扩胸开始，挺胸拉伸！');
            } else {
                speakFast('完成！' + inf.side + '，甩臂放松。');
            }
        }

        // ★ 每一秒都清晰读秒报号
        if (inf.isPrep) {
            speakFast(String(inf.remInPhase));
        } else if (inf.isWork) {
            speakFast(String(inf.remInPhase));
        } else {
            if (inf.remInPhase <= 5 && inf.remInPhase > 0) {
                speakFast(String(inf.remInPhase));
            } else if (inf.remInPhase > 5) {
                speakFast(String(inf.remInPhase));
            }
        }

        var mm = String(Math.floor(inf.remInPhase / 60)).padStart(2, '0');
        var ss = String(inf.remInPhase % 60).padStart(2, '0');
        el.textContent = mm + ':' + ss;

        if (subEl) {
            subEl.innerHTML = inf.isPrep
                ? '<span style="color:var(--amber-accent); font-weight:bold;">⏳ 站位就绪中 · 还有 ' + inf.remInPhase + 's 开练</span>'
                : (inf.isWork
                    ? '<span style="color:var(--purple-accent); font-weight:bold;">👐 第 ' + inf.currentSet + ' / ' + inf.targetSets + ' 组 · ' + inf.side + '做功中</span>'
                    : '<span style="color:var(--amber-accent); font-weight:bold;">☕ ' + inf.side + '中 · 甩臂放松 (剩余 ' + inf.remInPhase + 's)</span>');
        }
    }, 1000);
}
}
function getChestSchedulePhase(targetSec, targetSets, restSec, prepSec, elapsedSec) {
prepSec = (prepSec !== undefined) ? prepSec : 10;
if (elapsedSec < prepSec) {
return {
isDone: false, isPrep: true, isWork: false, phaseKey: 'chest_prep',
phaseName: '⏳ 战前就位准备 (曲肘抵墙，步入墙角)', remInPhase: prepSec - elapsedSec,
phaseDuration: prepSec, currentSet: 1, targetSets: targetSets, side: '就位'
};
}
var afterPrepElapsed = elapsedSec - prepSec;
var accum = 0;
for (var k = 1; k <= targetSets; k++) {
    var wlEnd = accum + targetSec;
    if (afterPrepElapsed < wlEnd) {
        return {
            isDone: false, isPrep: false, isWork: true, phaseKey: 'chest_wl_' + k,
            phaseName: '👐 第 ' + k + ' / ' + targetSets + ' 组 · 左臂做功中',
            remInPhase: wlEnd - afterPrepElapsed, phaseDuration: targetSec, currentSet: k, targetSets: targetSets, side: '左臂'
        };
    }
    accum = wlEnd;

    var rsEnd = accum + restSec;
    if (afterPrepElapsed < rsEnd) {
        return {
            isDone: false, isPrep: false, isWork: false, phaseKey: 'chest_rs_' + k,
            phaseName: '☕ 换右臂休整中 (还剩 ' + (rsEnd - afterPrepElapsed) + 's)',
            remInPhase: rsEnd - afterPrepElapsed, phaseDuration: restSec, currentSet: k, targetSets: targetSets, side: '换右臂休整'
        };
    }
    accum = rsEnd;

    var wrEnd = accum + targetSec;
    if (afterPrepElapsed < wrEnd) {
        return {
            isDone: false, isPrep: false, isWork: true, phaseKey: 'chest_wr_' + k,
            phaseName: '👐 第 ' + k + ' / ' + targetSets + ' 组 · 右臂做功中',
            remInPhase: wrEnd - afterPrepElapsed, phaseDuration: targetSec, currentSet: k, targetSets: targetSets, side: '右臂'
        };
    }
    accum = wrEnd;

    if (k < targetSets) {
        var rsetEnd = accum + restSec;
        if (afterPrepElapsed < rsetEnd) {
            return {
                isDone: false, isPrep: false, isWork: false, phaseKey: 'chest_rset_' + k,
                phaseName: '☕ 第 ' + k + ' 组完成 · 组间休整中 (还剩 ' + (rsetEnd - afterPrepElapsed) + 's)',
                remInPhase: rsetEnd - afterPrepElapsed, phaseDuration: restSec, currentSet: k, targetSets: targetSets, side: '组间休整'
            };
        }
        accum = rsetEnd;
    }
}
return { isDone: true, totalScheduleSec: accum + prepSec };
}
// 自动记忆扩胸单侧时长：严格先更新对象再落盘 saveData
window.setChestSeconds = function (sec) {
var val = Math.max(10, parseInt(sec) || 30);
data.settings.chestDefaultSec = val;
var item = data.workoutQueue.find(function (x) {
    return x.actionId === 'act_chest_stretch' && x.status !== 'done';
});
if (item && item.status !== 'running') {
    item.targetSeconds = val;
    item.reps = val + 's';
    item.total = val * (data.settings.chestDefaultSets || 3) * 2;
}
if (!data.customParamCache['act_chest_stretch']) data.customParamCache['act_chest_stretch'] = {};
data.customParamCache['act_chest_stretch'].reps = val + 's';

saveData();
renderChestDeckPanel();
};
// 自动记忆扩胸组数：严格先更新对象再落盘 saveData
window.setChestSets = function (sets) {
var val = Math.max(1, parseInt(sets) || 3);
data.settings.chestDefaultSets = val;
var item = data.workoutQueue.find(function (x) {
    return x.actionId === 'act_chest_stretch' && x.status !== 'done';
});
if (item && item.status !== 'running') {
    item.sets = val;
    item.total = (data.settings.chestDefaultSec || 30) * val * 2;
}
if (!data.customParamCache['act_chest_stretch']) data.customParamCache['act_chest_stretch'] = {};
data.customParamCache['act_chest_stretch'].sets = val;

saveData();
renderChestDeckPanel();
};
window.setChestRestSec = function (sec) {
var val = Math.max(5, parseInt(sec) || 15);
data.settings.chestRestSec = val;
saveData();
renderChestDeckPanel();
};
window.setChestPrepSec = function (sec) {
var val = Math.max(3, parseInt(sec) || 10);
data.settings.chestPrepSec = val;
saveData();
renderChestDeckPanel();
};
function startChestWorkout() {
var item = data.workoutQueue.find(function (x) {
return x.actionId === 'act_chest_stretch' && x.status !== 'done';
});
if (!item) return;
item.status = 'running';
item.startTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();
item.endTime = '';
item.durationMin = 0;

quickActionSpokenCues.clear();
saveData();
renderChestDeckPanel();

var sec = data.settings.chestDefaultSec || 30;
var sets = data.settings.chestDefaultSets || 3;
var prep = data.settings.chestPrepSec || 10;
speakFast('墙角扩胸，左右交替' + sets + '组，单侧' + sec + '秒，' + prep + '秒就位准备！');
}
function stopChestWorkout(isAuto) {
if (chestTimerInterval) {
clearInterval(chestTimerInterval);
chestTimerInterval = null;
}
var item = data.workoutQueue.find(function (x) {
    return x.actionId === 'act_chest_stretch' && x.status !== 'done';
});
if (!item) return;

item.status = 'done';
item.endTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();

var sec = data.settings.chestDefaultSec || 30;
var sets = data.settings.chestDefaultSets || 3;
item.total = sec * sets * 2;
item.reps = Array(sets).fill(sec + 's').join(',');

if (item.startTime) {
    var s = new Date(item.startTime).getTime();
    var e = new Date(item.endTime).getTime();
    item.durationMin = Math.max(1, Math.round((e - s) / (1000 * 60)));
} else {
    item.durationMin = Math.max(1, Math.round((item.total + (sets * 2 - 1) * (data.settings.chestRestSec || 15)) / 60));
}

item.note = '墙角扩胸：左右交替完成 ' + sets + ' 组，每侧 ' + sec + ' 秒，等长拉伸做功总时长 ' + item.total + ' 秒。';

if (typeof autoCommitLogEntry === 'function') {
    autoCommitLogEntry(item);
}
data.workoutQueue = data.workoutQueue.filter(function (x) {
    return x.id !== item.id;
});
saveData();
renderChestDeckPanel();
if (typeof renderAll === 'function') renderAll();

if (isAuto) {
    speakFast('恭喜！墙角扩胸圆满收功，战功已自动封存入册！');
    showToast('🎉 墙角扩胸（' + sets + '组·' + item.total + 's）已自动封存！');
} else {
    speakFast('墙角扩胸收功，已成功入册！');
    showToast('✅ 墙角扩胸已入册！');
}
}