// ================================================================
//  quick-action.js: 慢跑巡航 + 靠墙静蹲 + 墙角扩胸
//  零嵌套反引号！彻底免疫脚手架正则吞噬！全部拼字符串！
//  首屏中置主战区：大时钟与开始按键正中直接可见，零滚动即可操作！
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
    var activeTab = currentActive ? currentActive.dataset.tab : 'action_quick';

    var tabs = [
        { id: 'action_quick', label: '🏃 慢跑', tip: '【慢跑巡航】：餐后平抑血糖，目标倒计时！' },
        { id: 'squat_deck', label: '🧱 靠墙静蹲', tip: '【靠墙静蹲】：背贴墙大腿90°，支持徒手/单物大米/双哑铃负重！' },
        { id: 'chest_deck', label: '👐 墙角扩胸', tip: '【墙角扩胸】：左/右交替墙角拉伸，改善圆肩驼背！' },
        { id: 'hang_timer', label: '🧗 极限悬挂', tip: '【极限悬挂】：默认静态单杠死磕，脱杠停表后自带10个延时补偿按钮！' },
        { id: 'timer', label: '🔥 离心慢放', tip: '【离心慢放】：盲听提前250ms报号，默认10次。' },
        { id: 'stretch_timer', label: '🧘 压腿', tip: '【压腿舒筋】：柔韧拉伸，全程读秒。' },
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
// 1. 慢跑控制面板（首屏中置主战区）
// ----------------------------------------------------------------
function renderActionQuickPanel() {
    var container = document.getElementById('actionQuickContainer');
    if (!container) return;
    if (!window.data || !Array.isArray(data.workoutQueue)) return;

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
            targetMinutes: 25,
            total: 25,
            status: 'idle',
            startTime: '',
            endTime: '',
            durationMin: 0
        };
        data.workoutQueue.push(item);
    }

    if (!item.targetMinutes) item.targetMinutes = 25;
    var isRunning = (item.status === 'running');

    var timerDisplay = String(item.targetMinutes).padStart(2, '0') + ':00';
    var phaseTitle = '🎯 设定目标 ' + item.targetMinutes + ' 分钟 (时间到自动封存)';

    if (isRunning && item.startTime) {
        var elapsed = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
        var remSec = Math.max(0, (item.targetMinutes * 60) - elapsed);
        var m = String(Math.floor(remSec / 60)).padStart(2, '0');
        var s = String(remSec % 60).padStart(2, '0');
        timerDisplay = m + ':' + s;
        phaseTitle = '⚡ 慢跑巡航中 · 骨骼肌GLUT4持续汲糖';
    }

    var presetMins = [15, 20, 25, 30, 40, 60];
    var chipsHtml = '';
    for (var i = 0; i < presetMins.length; i++) {
        var pm = presetMins[i];
        var actCls = (item.targetMinutes === pm) ? 'active' : '';
        chipsHtml += '<button type="button" class="preset-chip ' + actCls + '" onclick="setQuickJogMinutes(' + pm + ')">' + pm + '分</button>';
    }

    var mainActionBtnHtml = isRunning
        ? '<button class="btn btn-danger hero-main-action-btn" onclick="stopQuickJog(false)">⏹️ 提前收功并封存</button>'
        : '<button class="btn btn-success hero-main-action-btn" onclick="startQuickJog()">▶️ 开始慢跑倒计时</button>';

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
                '<div class="param-row" style="justify-content:center; margin-bottom:4px;">' +
                    '<span class="param-label">预设时长:</span>' +
                    '<div class="param-chips" style="justify-content:center;">' + chipsHtml + '</div>' +
                '</div>' +
            '</div>' +
        '</div>';

    if (quickTimerInterval) clearInterval(quickTimerInterval);
    if (isRunning) {
        quickTimerInterval = setInterval(function () {
            var el = document.getElementById('quickTimerDisplay');
            if (!el || !item.startTime) return;

            var elaps = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
            var totalSec = item.targetMinutes * 60;
            var rem = totalSec - elaps;

            if (rem <= 0) {
                clearInterval(quickTimerInterval);
                quickTimerInterval = null;
                el.textContent = "00:00";
                stopQuickJog(true);
                return;
            }

            var mm = String(Math.floor(rem / 60)).padStart(2, '0');
            var ss = String(rem % 60).padStart(2, '0');
            el.textContent = mm + ':' + ss;
        }, 1000);
    }
}

function setQuickJogMinutes(m) {
    var item = data.workoutQueue.find(function (x) {
        return x.actionId === 'act_jog_glyco' && x.status !== 'done';
    });
    if (item && item.status !== 'running') {
        item.targetMinutes = m;
        item.total = m;
        saveData();
        renderActionQuickPanel();
    }
}

function startQuickJog() {
    var item = data.workoutQueue.find(function (x) {
        return x.actionId === 'act_jog_glyco' && x.status !== 'done';
    });
    if (!item) return;

    item.status = 'running';
    item.startTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();
    item.endTime = '';
    item.durationMin = 0;

    saveData();
    renderActionQuickPanel();

    if (typeof speakFast === 'function') {
        speakFast('慢跑倒计时开始，设定' + item.targetMinutes + '分钟，保持平稳呼吸！');
    }
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
        item.durationMin = item.targetMinutes || 25;
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
// ★ 完美支持徒手自重、单物大米、双手置于左右大腿根部的双哑铃对称/非对称负重
// ----------------------------------------------------------------
function renderSquatDeckPanel() {
    var container = document.getElementById('squatDeckContainer');
    if (!container) return;
    if (!window.data || !Array.isArray(data.workoutQueue)) return;

    var s = data.settings;
    if (!s.squatDefaultMode) s.squatDefaultMode = 'bodyweight';
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
            sets: 3,
            targetSeconds: 60,
            targetSets: 3,
            total: 180,
            status: 'idle',
            startTime: '',
            endTime: '',
            durationMin: 0
        };
        data.workoutQueue.push(item);
    }

    var isRunning = (item.status === 'running');
    var targetSec = item.targetSeconds || 60;
    var targetSets = item.targetSets || 3;

    var loadBadgeDesc = '';
    if (s.squatDefaultMode === 'bodyweight') {
        loadBadgeDesc = '🟢 徒手自重 (0kg)';
    } else if (s.squatDefaultMode === 'single') {
        loadBadgeDesc = '🟠 单物负重: ' + (s.squatItemDesc || '重物') + ' ' + s.squatSingleWeight + 'kg';
    } else {
        var isSymm = (s.squatLeftWeight === s.squatRightWeight);
        var totalW = (parseFloat(s.squatLeftWeight) + parseFloat(s.squatRightWeight)).toFixed(1);
        if (isSymm) {
            loadBadgeDesc = '🔴 双物负重: 左右大腿根部各 ' + s.squatLeftWeight + 'kg ' + s.squatItemDesc + ' (共' + totalW + 'kg)';
        } else {
            loadBadgeDesc = '⚡ 非对称双重: 左大腿根部 ' + s.squatLeftWeight + 'kg / 右 ' + s.squatRightWeight + 'kg (共' + totalW + 'kg)';
        }
    }

    var timerDisplay = '01:00';
    var phaseTitle = '🎯 计划 ' + targetSets + ' 组 · 单组 ' + targetSec + 's (组间休60s)';

    if (isRunning && item.startTime) {
        var elapsed = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
        var info = getSquatSchedulePhase(targetSec, targetSets, elapsed);
        var mm = String(Math.floor(info.remInPhase / 60)).padStart(2, '0');
        var ss = String(info.remInPhase % 60).padStart(2, '0');
        timerDisplay = mm + ':' + ss;
        phaseTitle = info.isWork
            ? '🦵 第 ' + info.currentSet + ' / ' + info.targetSets + ' 组 · 大腿水平90°持续做功'
            : '☕ 组间休息中 · 慢走抖腿 (还剩 ' + info.remInPhase + 's)';
    }

    var mainActionBtnHtml = isRunning
        ? '<button class="btn btn-danger hero-main-action-btn" onclick="stopSquatWorkout(false)">⏹️ 提前收功并封存</button>'
        : '<button class="btn btn-success hero-main-action-btn" onclick="startSquatWorkout()">▶️ 开始靠墙静蹲</button>';

    var configPanelHtml = '';
    if (!isRunning) {
        var modeChips =
            '<div class="param-chips" style="margin-bottom:6px;">' +
                '<button type="button" class="preset-chip ' + (s.squatDefaultMode === 'bodyweight' ? 'active' : '') + '" onclick="setSquatMode(\'bodyweight\')">徒手自重</button>' +
                '<button type="button" class="preset-chip ' + (s.squatDefaultMode === 'single' ? 'active' : '') + '" onclick="setSquatMode(\'single\')">单物负重(大米/单壶铃)</button>' +
                '<button type="button" class="preset-chip ' + (s.squatDefaultMode === 'dual' ? 'active' : '') + '" onclick="setSquatMode(\'dual\')">双物负重(置于左右大腿根部)</button>' +
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
                            '<label>左侧大腿根(kg)</label>' +
                            '<input type="number" step="0.5" min="0.5" max="60" value="' + s.squatLeftWeight + '" onchange="updateSquatLeftWeight(this.value)">' +
                        '</div>' +
                        '<div class="flex-1 weight-field-box">' +
                            '<label>右侧大腿根(kg)</label>' +
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

        var secPresets = [30, 45, 60, 90].map(function (sec) {
            var c = (item.targetSeconds === sec) ? 'active' : '';
            return '<button type="button" class="preset-chip ' + c + '" onclick="setSquatSeconds(' + sec + ')">' + sec + 's</button>';
        }).join('');

        var setsPresets = [1, 2, 3, 4, 5].map(function (cnt) {
            var c = (item.targetSets === cnt) ? 'active' : '';
            return '<button type="button" class="preset-chip ' + c + '" onclick="setSquatSets(' + cnt + ')">' + cnt + '组</button>';
        }).join('');

        configPanelHtml =
            '<div class="squat-load-panel">' +
                '<div class="squat-load-header">' +
                    '<span class="squat-load-title">⚖️ 负重与姿态配置 (后背平贴, 大腿与小腿约90°)</span>' +
                    '<span style="font-size:10.5px; color:var(--text-muted);">' + loadBadgeDesc + '</span>' +
                '</div>' +
                modeChips +
                singleConfig +
                dualConfig +
                '<div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px; margin-top:6px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">' +
                    '<div style="display:flex; align-items:center; gap:4px;">' +
                        '<span style="font-size:11px; color:var(--text-muted);">单组:</span>' + secPresets +
                    '</div>' +
                    '<div style="display:flex; align-items:center; gap:4px;">' +
                        '<span style="font-size:11px; color:var(--amber-accent);">组数:</span>' + setsPresets +
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
            var inf = getSquatSchedulePhase(targetSec, targetSets, elaps);

            if (inf.isDone) {
                clearInterval(squatTimerInterval);
                squatTimerInterval = null;
                el.textContent = "00:00";
                stopSquatWorkout(true);
                return;
            }

            if (!quickActionSpokenCues.has(inf.phaseKey)) {
                quickActionSpokenCues.add(inf.phaseKey);
                if (inf.isWork) {
                    speakFast('第' + inf.currentSet + '组静蹲开始，背贴墙大腿水平90度，坚持' + targetSec + '秒！');
                } else {
                    speakFast('第' + inf.currentSet + '组完成！组间休息1分钟，慢走抖腿。');
                }
            }

            if (!inf.isWork && inf.remInPhase === 5 && !quickActionSpokenCues.has('warn_rest_' + inf.currentSet)) {
                quickActionSpokenCues.add('warn_rest_' + inf.currentSet);
                speakFast('还有5秒，靠墙就位，准备下一组！');
            }

            if (inf.isWork && inf.remInPhase <= 3 && inf.remInPhase > 0 && !quickActionSpokenCues.has('work_count_' + inf.currentSet + '_' + inf.remInPhase)) {
                quickActionSpokenCues.add('work_count_' + inf.currentSet + '_' + inf.remInPhase);
                speakFast(String(inf.remInPhase));
            }

            var mm = String(Math.floor(inf.remInPhase / 60)).padStart(2, '0');
            var ss = String(inf.remInPhase % 60).padStart(2, '0');
            el.textContent = mm + ':' + ss;

            if (subEl) {
                subEl.innerHTML = inf.isWork
                    ? '<span style="color:var(--green-accent); font-weight:bold;">🦵 第 ' + inf.currentSet + ' / ' + inf.targetSets + ' 组 · 等长收缩坚持中</span>'
                    : '<span style="color:var(--amber-accent); font-weight:bold;">☕ 组间休息中 · 1分钟休整 (还剩 ' + inf.remInPhase + 's)</span>';
            }
        }, 1000);
    }
}

function getSquatSchedulePhase(targetSec, targetSets, elapsedSec) {
    var restSec = 60;
    var totalScheduleSec = (targetSets - 1) * (targetSec + restSec) + targetSec;
    if (elapsedSec >= totalScheduleSec) return { isDone: true, totalScheduleSec: totalScheduleSec };

    var accum = 0;
    for (var k = 1; k <= targetSets; k++) {
        var workEnd = accum + targetSec;
        if (elapsedSec < workEnd) {
            return {
                isDone: false,
                isWork: true,
                currentSet: k,
                targetSets: targetSets,
                remInPhase: workEnd - elapsedSec,
                phaseDuration: targetSec,
                phaseKey: 'squat_work_' + k
            };
        }
        accum = workEnd;

        if (k < targetSets) {
            var restEnd = accum + restSec;
            if (elapsedSec < restEnd) {
                return {
                    isDone: false,
                    isWork: false,
                    currentSet: k,
                    targetSets: targetSets,
                    remInPhase: restEnd - elapsedSec,
                    phaseDuration: restSec,
                    phaseKey: 'squat_rest_' + k
                };
            }
            accum = restEnd;
        }
    }
    return { isDone: true, totalScheduleSec: totalScheduleSec };
}

window.setSquatMode = function (mode) {
    data.settings.squatDefaultMode = mode;
    saveData();
    renderSquatDeckPanel();
};

window.setSquatSeconds = function (sec) {
    var item = data.workoutQueue.find(function (x) {
        return x.actionId === 'act_squat_wall' && x.status !== 'done';
    });
    if (item && item.status !== 'running') {
        item.targetSeconds = parseInt(sec) || 60;
        item.reps = item.targetSeconds + 's';
        item.total = item.targetSeconds * (item.targetSets || 3);
        saveData();
        renderSquatDeckPanel();
    }
};

window.setSquatSets = function (sets) {
    var item = data.workoutQueue.find(function (x) {
        return x.actionId === 'act_squat_wall' && x.status !== 'done';
    });
    if (item && item.status !== 'running') {
        item.targetSets = parseInt(sets) || 3;
        item.sets = item.targetSets;
        item.total = (item.targetSeconds || 60) * item.targetSets;
        saveData();
        renderSquatDeckPanel();
    }
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

    var sec = item.targetSeconds || 60;
    var sets = item.targetSets || 3;
    speakFast('开始靠墙静蹲，共' + sets + '组，每组' + sec + '秒，组间休息1分钟。听令而动！');
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

    var sec = item.targetSeconds || 60;
    var sets = item.targetSets || 3;
    item.sets = sets;
    item.total = sec * sets;
    item.reps = Array(sets).fill(sec + 's').join(',');

    if (item.startTime) {
        var s = new Date(item.startTime).getTime();
        var e = new Date(item.endTime).getTime();
        item.durationMin = Math.max(1, Math.round((e - s) / (1000 * 60)));
    } else {
        item.durationMin = Math.max(1, Math.round(((sets - 1) * 60 + item.total) / 60));
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

    item.note = '靠墙静蹲做功' + loadNote + '：完成 ' + sets + ' 组 × ' + sec + ' 秒（组间休60s），等长收缩做功 ' + item.total + ' 秒。';

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
        speakFast('恭喜！靠墙静蹲' + sets + '组全部圆满收功，战功已自动封存入册！');
        showToast('🎉 靠墙静蹲（' + sets + '组·' + item.total + 's）已自动封存！');
    } else {
        speakFast('靠墙静蹲收功，已成功入册！');
        showToast('✅ 靠墙静蹲已入册！');
    }
}

// ----------------------------------------------------------------
// 3. 墙角扩胸控制面板 (左右交替等长拉伸)
// ----------------------------------------------------------------
function renderChestDeckPanel() {
    var container = document.getElementById('chestDeckContainer');
    if (!container) return;
    if (!window.data || !Array.isArray(data.workoutQueue)) return;

    var s = data.settings;
    if (s.chestDefaultSets === undefined) s.chestDefaultSets = 3;
    if (s.chestDefaultSec === undefined) s.chestDefaultSec = 30;
    if (s.chestRestSec === undefined) s.chestRestSec = 15;

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

    if (!item.targetSeconds) item.targetSeconds = 30;
    if (!item.targetSets) item.targetSets = 3;
    if (!item.restSeconds) item.restSeconds = 15;

    var isRunning = (item.status === 'running');
    var timerDisplay = '00:30';
    var phaseTitle = '🎯 计划 ' + item.sets + ' 组 (单侧 ' + item.targetSeconds + 's · 间歇 ' + item.restSeconds + 's)';

    if (isRunning && item.startTime) {
        var elapsed = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
        var info = getChestSchedulePhase(item.targetSeconds, item.sets, item.restSeconds, elapsed);
        var mm = String(Math.floor(info.remInPhase / 60)).padStart(2, '0');
        var ss = String(info.remInPhase % 60).padStart(2, '0');
        timerDisplay = mm + ':' + ss;
        phaseTitle = info.isWork
            ? '👐 第 ' + info.currentSet + ' / ' + info.targetSets + ' 组 · ' + info.side + '拉伸做功中'
            : '☕ 换边休整中 · 甩动手臂放松 (还剩 ' + info.remInPhase + 's)';
    } else {
        var initM = String(Math.floor(item.targetSeconds / 60)).padStart(2, '0');
        var initS = String(item.targetSeconds % 60).padStart(2, '0');
        timerDisplay = initM + ':' + initS;
    }

    var mainActionBtnHtml = isRunning
        ? '<button class="btn btn-danger hero-main-action-btn" onclick="stopChestWorkout(false)">⏹️ 提前收功并封存</button>'
        : '<button class="btn btn-success hero-main-action-btn" onclick="startChestWorkout()">▶️ 开始墙角扩胸</button>';

    var configPanelHtml = '';
    if (!isRunning) {
        var secPresets = [20, 30, 45, 60].map(function (sec) {
            var c = (item.targetSeconds === sec) ? 'active' : '';
            return '<button type="button" class="preset-chip ' + c + '" onclick="setChestSeconds(' + sec + ')">' + sec + 's</button>';
        }).join('');

        var setsPresets = [1, 2, 3, 4, 5].map(function (cnt) {
            var c = (item.sets === cnt) ? 'active' : '';
            return '<button type="button" class="preset-chip ' + c + '" onclick="setChestSets(' + cnt + ')">' + cnt + '组</button>';
        }).join('');

        configPanelHtml =
            '<div class="squat-load-panel">' +
                '<div class="squat-load-header">' +
                    '<span class="squat-load-title">⚖️ 扩胸参数配置 (左右交替)</span>' +
                '</div>' +
                '<div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px; margin-top:6px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">' +
                    '<div style="display:flex; align-items:center; gap:4px;">' +
                        '<span style="font-size:11px; color:var(--text-muted);">单侧:</span>' + secPresets +
                    '</div>' +
                    '<div style="display:flex; align-items:center; gap:4px;">' +
                        '<span style="font-size:11px; color:var(--amber-accent);">组数:</span>' + setsPresets +
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
            var inf = getChestSchedulePhase(item.targetSeconds, item.sets, item.restSeconds, elaps);

            if (inf.isDone) {
                clearInterval(chestTimerInterval);
                chestTimerInterval = null;
                el.textContent = "00:00";
                stopChestWorkout(true);
                return;
            }

            if (!quickActionSpokenCues.has(inf.phaseKey)) {
                quickActionSpokenCues.add(inf.phaseKey);
                if (inf.isWork) {
                    speakFast('第' + inf.currentSet + '组，' + inf.side + '墙角扩胸开始，拉伸胸大肌，坚持' + item.targetSeconds + '秒！');
                } else {
                    speakFast('完成！休息' + item.restSeconds + '秒，甩动手臂放松。');
                }
            }

            if (!inf.isWork && inf.remInPhase === 5 && !quickActionSpokenCues.has('chest_warn_rest_' + inf.phaseKey)) {
                quickActionSpokenCues.add('chest_warn_rest_' + inf.phaseKey);
                speakFast('还有5秒，准备换边就位！');
            }

            if (inf.isWork && inf.remInPhase <= 3 && inf.remInPhase > 0 && !quickActionSpokenCues.has('chest_count_' + inf.phaseKey + '_' + inf.remInPhase)) {
                quickActionSpokenCues.add('chest_count_' + inf.phaseKey + '_' + inf.remInPhase);
                speakFast(String(inf.remInPhase));
            }

            var mm = String(Math.floor(inf.remInPhase / 60)).padStart(2, '0');
            var ss = String(inf.remInPhase % 60).padStart(2, '0');
            el.textContent = mm + ':' + ss;

            if (subEl) {
                subEl.innerHTML = inf.isWork
                    ? '<span style="color:var(--purple-accent); font-weight:bold;">👐 第 ' + inf.currentSet + ' / ' + inf.targetSets + ' 组 · ' + inf.side + '拉伸做功中</span>'
                    : '<span style="color:var(--amber-accent); font-weight:bold;">☕ 换边休整中 · 甩动手臂放松 (还剩 ' + inf.remInPhase + 's)</span>';
            }
        }, 1000);
    }
}

function getChestSchedulePhase(targetSec, targetSets, restSec, elapsedSec) {
    var totalPhases = targetSets * 2;
    var accum = 0;
    for (var i = 1; i <= totalPhases; i++) {
        var isLeft = (i % 2 !== 0);
        var currentSet = Math.ceil(i / 2);
        var workEnd = accum + targetSec;
        if (elapsedSec < workEnd) {
            return {
                isDone: false, isWork: true, isLeft: isLeft, side: isLeft ? '左臂' : '右臂', currentSet: currentSet, targetSets: targetSets,
                remInPhase: workEnd - elapsedSec, phaseDuration: targetSec, phaseKey: 'chest_work_' + i
            };
        }
        accum = workEnd;
        if (i < totalPhases) {
            var restEnd = accum + restSec;
            if (elapsedSec < restEnd) {
                return {
                    isDone: false, isWork: false, isLeft: isLeft, side: '休整', currentSet: currentSet, targetSets: targetSets,
                    remInPhase: restEnd - elapsedSec, phaseDuration: restSec, phaseKey: 'chest_rest_' + i
                };
            }
            accum = restEnd;
        }
    }
    return { isDone: true, totalScheduleSec: accum };
}

window.setChestSeconds = function (sec) {
    var item = data.workoutQueue.find(function (x) {
        return x.actionId === 'act_chest_stretch' && x.status !== 'done';
    });
    if (item && item.status !== 'running') {
        item.targetSeconds = parseInt(sec) || 30;
        item.reps = item.targetSeconds + 's';
        item.total = item.targetSeconds * (item.sets || 3) * 2;
        data.settings.chestDefaultSec = item.targetSeconds;
        saveData();
        renderChestDeckPanel();
    }
};

window.setChestSets = function (sets) {
    var item = data.workoutQueue.find(function (x) {
        return x.actionId === 'act_chest_stretch' && x.status !== 'done';
    });
    if (item && item.status !== 'running') {
        item.sets = parseInt(sets) || 3;
        item.targetSets = item.sets;
        item.total = (item.targetSeconds || 30) * item.sets * 2;
        data.settings.chestDefaultSets = item.sets;
        saveData();
        renderChestDeckPanel();
    }
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

    var sec = item.targetSeconds || 30;
    var sets = item.sets || 3;
    speakFast('开始墙角扩胸，左右交替，共' + sets + '组，单侧' + sec + '秒，间歇15秒。听令而动！');
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

    var sec = item.targetSeconds || 30;
    var sets = item.sets || 3;
    item.total = sec * sets * 2;
    item.reps = Array(sets).fill(sec + 's').join(',');

    if (item.startTime) {
        var s = new Date(item.startTime).getTime();
        var e = new Date(item.endTime).getTime();
        item.durationMin = Math.max(1, Math.round((e - s) / (1000 * 60)));
    } else {
        item.durationMin = Math.max(1, Math.round((item.total + (sets * 2 - 1) * item.restSeconds) / 60));
    }

    item.note = '墙角扩胸：左右交替完成 ' + sets + ' 组，每侧 ' + sec + ' 秒，等长拉伸总时长 ' + item.total + ' 秒。';

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
        speakFast('恭喜！墙角扩胸全部圆满收功，战功已自动封存入册！');
        showToast('🎉 墙角扩胸（' + sets + '组·' + item.total + 's）已自动封存！');
    } else {
        speakFast('墙角扩胸收功，已成功入册！');
        showToast('✅ 墙角扩胸已入册！');
    }
}