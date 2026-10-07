// ================================================================
//  arsenal-queue.js: 动作装备库与出征队列 (无反引号破坏版)
// ================================================================

function renderArsenalPicker() {
    var container = document.getElementById('arsenalPickerGrid');
    if (!container) return;
    var list = getArsenalList();
    var html = '';
    for (var i = 0; i < list.length; i++) {
        var act = list[i];
        var mem = data.customParamCache[act.id];
        var displayReps = (mem && mem.reps) ? mem.reps : act.defaultReps;
        html += '<div class="arsenal-btn" onclick="addArsenalToQueue(\'' + act.id + '\')">' +
                    '<span>' + act.icon + ' ' + act.name + '</span>' +
                    '<span style="font-family:var(--font-mono); font-size:10px; color:var(--cyan-accent);">' + displayReps + '</span>' +
                '</div>';
    }
    container.innerHTML = html;
}

function renderPresetPlanBar() {
    var bar = document.getElementById('presetPlanBar');
    if (!bar) return;
    var duty = getDutyShiftInfo();
    var recIndex = duty.shift.isWork ? 1 : 2;

    var html = '';
    for (var i = 0; i < data.presetPlans.length; i++) {
        var plan = data.presetPlans[i];
        var isActive = (data.activePlanIndex === i);
        var isRec = (i === recIndex);
        var recHtml = isRec ? '<span style="color:var(--pink-accent); font-size:9px;">[推荐]</span>' : '';
        html += '<button class="plan-tab-btn ' + (isActive ? 'active' : '') + '" onclick="applyPresetPlan(' + i + ')">' +
                    '<span>' + plan.name + '</span>' + recHtml +
                '</button>';
    }
    bar.innerHTML = html;
}

function applyPresetPlan(planIndex) {
    data.activePlanIndex = planIndex;
    var plan = data.presetPlans[planIndex];
    data.workoutQueue = plan.items.map(function (item) {
        var baseAct = MASTER_ARSENAL.find(function (a) { return a.id === item.actionId; }) || {};
        var mem = data.customParamCache[item.actionId] || {};
        var defaultReps = (item.actionId === 'act_pushup_ecc' ? (data.settings && data.settings.eccentricDefaultReps ? data.settings.eccentricDefaultReps : 10) : (item.reps || baseAct.defaultReps || '10'));
        return {
            id: 'wq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            actionId: item.actionId,
            name: item.name || baseAct.name,
            icon: baseAct.icon || '⚡',
            type: baseAct.type || 'strength',
            sets: mem.sets !== undefined ? mem.sets : (item.sets || baseAct.defaultSets || 2),
            reps: mem.reps !== undefined ? mem.reps : defaultReps,
            total: mem.total !== undefined ? mem.total : (item.total || baseAct.total || 20),
            downSec: mem.downSec !== undefined ? mem.downSec : (item.downSec || baseAct.downSec || 0),
            upSec: mem.upSec !== undefined ? mem.upSec : (item.upSec || baseAct.upSec || 0),
            heart: mem.heart || item.heart || '未知',
            startTime: '',
            endTime: '',
            durationMin: 0
        };
    });

    saveData();
    renderPresetPlanBar();
    renderWorkoutQueue();
}

function addArsenalToQueue(actionId) {
    var list = getArsenalList();
    var baseAct = list.find(function (a) { return a.id === actionId; });
    if (!baseAct) return;

    var mem = data.customParamCache[actionId] || {};
    var isAerobic = baseAct.type === 'aerobic';
    var isEccentric = (actionId === 'act_pushup_ecc');
    var isStretch = (actionId === 'act_pnf_stretch');
    var isSquat = (actionId === 'act_squat_wall');
    var isChest = (actionId === 'act_chest_stretch');
    
    var defaultReps = isEccentric ? (data.settings && data.settings.eccentricDefaultReps ? data.settings.eccentricDefaultReps : 10) : (isStretch ? '60s' : (isSquat ? '60s' : (isChest ? '30s' : (baseAct.defaultReps || (isAerobic ? '25min' : '10')))));
    var totalTime = isStretch ? 120 : (isSquat ? 180 : (isChest ? 180 : (baseAct.total || 20)));

    var newItem = {
        id: 'wq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        actionId: baseAct.id,
        name: baseAct.name,
        icon: baseAct.icon || '⚡',
        type: baseAct.type || 'strength',
        sets: mem.sets !== undefined ? mem.sets : (isAerobic ? 1 : baseAct.defaultSets || 2),
        reps: mem.reps !== undefined ? mem.reps : defaultReps,
        total: mem.total !== undefined ? mem.total : totalTime,
        downSec: isAerobic ? 0 : (mem.downSec !== undefined ? mem.downSec : (baseAct.downSec || 0)),
        upSec: isAerobic ? 0 : (mem.upSec !== undefined ? mem.upSec : (baseAct.upSec || 0)),
        heart: mem.heart || '未知',
        startTime: '',
        endTime: '',
        durationMin: isAerobic ? (mem.total || baseAct.total || 25) : 0
    };

    data.workoutQueue.push(newItem);
    saveData();
    renderWorkoutQueue();
}

function startWorkoutItem(itemId) {
    var item = data.workoutQueue.find(function (x) { return x.id === itemId; });
    if (!item) return;

    if (item.actionId === 'act_pushup_ecc' || item.name.indexOf('离心') !== -1) {
        switchTab('timer');
        var defaultReps = parseInt(item.reps) || (data.settings && data.settings.eccentricDefaultReps ? data.settings.eccentricDefaultReps : 10);
        if (typeof setEccentricQuickSets === 'function') setEccentricQuickSets(item.sets || 2);
        if (typeof setEccentricQuickReps === 'function') setEccentricQuickReps(defaultReps);
        if (typeof startEccentricTimer === 'function') startEccentricTimer();
        return;
    }

    if (item.actionId === 'act_jog_glyco' || item.name.indexOf('跑') !== -1) {
        switchTab('action_quick');
        if (typeof setQuickJogMinutes === 'function') setQuickJogMinutes(parseInt(item.total) || 25);
        if (typeof startQuickJog === 'function') startQuickJog();
        return;
    }

    if (item.actionId === 'act_squat_wall' || item.name.indexOf('静蹲') !== -1) {
        switchTab('squat_deck');
        if (typeof renderSquatDeckPanel === 'function') renderSquatDeckPanel();
        return;
    }

    if (item.actionId === 'act_chest_stretch' || item.name.indexOf('扩胸') !== -1 || item.name.indexOf('墙角') !== -1) {
        switchTab('chest_deck');
        if (typeof renderChestDeckPanel === 'function') renderChestDeckPanel();
        return;
    }

    if (item.actionId === 'act_hang' || item.actionId === 'act_pullup' || item.actionId === 'act_pullup_wide' || item.name.indexOf('悬挂') !== -1 || item.name.indexOf('引体') !== -1) {
        switchTab('hang_timer');
        if (typeof switchHangVariant === 'function') {
            if (item.name.indexOf('阔') !== -1) switchHangVariant('wide');
            else if (item.name.indexOf('标准') !== -1 || item.name.indexOf('引体') !== -1) switchHangVariant('standard');
            else switchHangVariant('hang');
        }
        return;
    }

    if (item.actionId === 'act_pnf_stretch' || item.name.indexOf('压腿') !== -1 || item.name.indexOf('拉伸') !== -1) {
        switchTab('stretch_timer');
        return;
    }

    item.status = 'running';
    item.startTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();
    item.endTime = '';
    item.durationMin = 0;
    saveData();
    renderWorkoutQueue();
    if (typeof showToast === 'function') showToast('🚀 开始【' + item.name + '】！');
}

function endWorkoutItem(itemId) {
    var item = data.workoutQueue.find(function (x) { return x.id === itemId; });
    if (!item || item.status !== 'running') return;

    item.status = 'done';
    item.endTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();

    if (item.startTime) {
        var s = new Date(item.startTime).getTime();
        var e = new Date(item.endTime).getTime();
        item.durationMin = Math.max(1, Math.round((e - s) / (1000 * 60)));
    }

    var committed = autoCommitLogEntry(item);
    if (committed) {
        data.workoutQueue = data.workoutQueue.filter(function (x) { return x.id !== itemId; });
        saveData();
        renderWorkoutQueue();
        if (typeof renderAll === 'function') renderAll();
        if (typeof showToast === 'function') showToast('✅ 【' + item.name + '】已成功入册！');
    }
}

function autoCommitLogEntry(item) {
    try {
        var duty = (typeof getDutyShiftInfo === 'function')
            ? getDutyShiftInfo()
            : { dutyDateStr: new Date().toISOString().slice(0, 10), shift: { name: '日常' } };
        var cleanHeart = (!item.heart || item.heart === '未知') ? '未知' : item.heart;
        var isAerobic = item.type === 'aerobic' || item.name.indexOf('跑') !== -1 || item.name.indexOf('球') !== -1;
        var isSquat = item.name.indexOf('静蹲') !== -1;
        var isIsometric = item.type === 'isometric' || isSquat || item.name.indexOf('压腿') !== -1 || item.name.indexOf('悬挂') !== -1 || item.name.indexOf('扩胸') !== -1;

        var finalSets = item.sets || 1;
        var finalReps = item.reps || '';
        var finalTotal = item.total || 0;
        var finalDuration = item.durationMin || 1;
        var finalTut = 0;

        if (isAerobic) {
            finalSets = 1;
            finalDuration = item.durationMin || (parseInt(item.total) || 25);
            finalTotal = finalDuration;
            finalReps = finalDuration + 'min';
            finalTut = finalDuration * 60;
        } else if (isIsometric) {
            finalTut = finalTotal || (finalDuration * 60);
        } else {
            finalTut = Math.round((finalTotal || 0) * ((item.downSec || 0) + (item.upSec || 0) || 2.0));
        }

        var entry = {
            id: 'l_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            date: duty.dutyDateStr,
            type: item.name,
            sets: finalSets,
            reps: finalReps,
            total: finalTotal,
            isAerobic: isAerobic,
            isIsometric: isIsometric,
            heart: cleanHeart,
            duration: finalDuration,
            rpe: 8,
            dutyTag: duty.shift.name + ' (归属' + duty.dutyDateStr.slice(5) + ')',
            startTimeStamp: item.startTime || ((typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString()),
            endTimeStamp: item.endTime || ((typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString()),
            downSec: isAerobic ? 0 : (item.downSec || 0),
            upSec: isAerobic ? 0 : (item.upSec || 0),
            tutSeconds: finalTut,
            note: item.note || (item.name + '实修入册。做功量: ' + finalTotal),
            createdAt: new Date().toISOString()
        };

        if (window.data && Array.isArray(data.logs)) {
            data.logs.push(entry);
        }
        return true;
    } catch (e) {
        console.error('自动入册失败:', e);
        return false;
    }
}

function updateQueueItemParam(itemId, field, val) {
    var item = data.workoutQueue.find(function (x) { return x.id === itemId; });
    if (!item) return;

    if (field === 'sets' || field === 'total') {
        item[field] = parseInt(val) || 0;
    } else if (field === 'downSec' || field === 'upSec') {
        item[field] = parseFloat(val) || 0;
    } else if (field === 'heart') {
        var strVal = String(val).trim();
        if (!strVal || strVal === '未知' || strVal === '-' || isNaN(strVal)) {
            item.heart = '未知';
        } else {
            item.heart = parseInt(strVal);
        }
    } else {
        item[field] = val;
    }

    if (field === 'reps') {
        var parts = String(val).split(/[,，]/).map(function (s) { return parseInt(s.trim()); }).filter(function (n) { return !isNaN(n); });
        if (parts.length) {
            item.total = parts.reduce(function (a, b) { return a + b; }, 0) * (parseInt(item.sets) || 1);
            var totEl = document.getElementById('q_tot_' + itemId);
            if (totEl) totEl.value = item.total;
        }
    }

    if (!data.customParamCache[item.actionId]) data.customParamCache[item.actionId] = {};
    data.customParamCache[item.actionId][field] = item[field];
    if (item.total) data.customParamCache[item.actionId].total = item.total;

    saveData();
    renderWorkoutQueueStats();
}

function renderWorkoutQueueStats() {
    var sumReps = 0;
    var sumTut = 0;
    data.workoutQueue.forEach(function (item) {
        var isAerobic = item.type === 'aerobic' || item.name.indexOf('跑') !== -1 || item.name.indexOf('球') !== -1;
        var isIsometric = item.type === 'isometric' || item.name.indexOf('静蹲') !== -1 || item.name.indexOf('压腿') !== -1 || item.name.indexOf('悬挂') !== -1 || item.name.indexOf('扩胸') !== -1;
        if (isAerobic) {
            var mins = parseInt(item.total) || 25;
            sumTut += mins * 60;
        } else if (isIsometric) {
            sumTut += parseInt(item.total) || 60;
            sumReps += parseInt(item.total) || 0;
        } else {
            var r = parseInt(item.total) || 0;
            sumReps += r;
            sumTut += Math.round(r * ((parseFloat(item.downSec) || 0) + (parseFloat(item.upSec) || 0) || 2.0));
        }
    });

    var repsEl = document.getElementById('queueTotalReps');
    var tutEl = document.getElementById('queueTotalTut');
    if (repsEl) repsEl.textContent = sumReps;
    if (tutEl) tutEl.textContent = sumTut;
}

function renderWorkoutQueue() {
    var container = document.getElementById('workoutQueueContainer');
    var countBadge = document.getElementById('activeQueueCountBadge');
    if (!container) return;

    if (countBadge) countBadge.textContent = data.workoutQueue.length + ' 个法门就绪';

    if (!data.workoutQueue.length) {
        container.innerHTML = '<div style="text-align:center; padding:18px 0; color:var(--text-dim); font-size:12.5px;">出征台暂无项目。点击上方【动作法门装备库】添加！</div>';
        renderWorkoutQueueStats();
        return;
    }

    var html = '';
    for (var i = 0; i < data.workoutQueue.length; i++) {
        var item = data.workoutQueue[i];
        var isRunning = (item.status === 'running');
        var isAerobic = item.type === 'aerobic' || item.name.indexOf('跑') !== -1 || item.name.indexOf('球') !== -1;
        var isIsometric = item.type === 'isometric' || item.name.indexOf('静蹲') !== -1 || item.name.indexOf('压腿') !== -1 || item.name.indexOf('悬挂') !== -1 || item.name.indexOf('扩胸') !== -1;
        var heartDisplay = (!item.heart || item.heart === '未知') ? '未知' : item.heart;

        var badgeTitle = '';
        if (isAerobic) {
            badgeTitle = '<span style="font-family:var(--font-mono); font-size:11.5px; color:var(--cyan-accent); font-weight:bold;">' + (item.total || 25) + '分</span>';
        } else if (isIsometric) {
            badgeTitle = '<span style="font-family:var(--font-mono); font-size:11.5px; color:var(--green-accent); font-weight:bold;">' + item.sets + '组·' + (item.reps || item.total + 's') + '</span>';
        } else {
            badgeTitle = '<span style="font-family:var(--font-mono); font-size:11.5px; color:var(--orange-primary); font-weight:bold;">' + item.total + '次</span>';
        }

        var ctrlBtn = isRunning
            ? '<button class="btn btn-sm btn-danger" onclick="endWorkoutItem(\'' + item.id + '\')">⏹ 结束</button>'
            : '<button class="btn btn-sm btn-success" onclick="startWorkoutItem(\'' + item.id + '\')">▶ 开始</button>';

        var editInputsRow = '';
        if (isAerobic) {
            editInputsRow = '<div class="slot-input-group" style="grid-column: span 2;">' +
                                '<label>持续时长 (分钟)</label>' +
                                '<input type="number" value="' + (item.total || 25) + '" min="1" step="5" onchange="updateQueueItemParam(\'' + item.id + '\', \'total\', this.value); updateQueueItemParam(\'' + item.id + '\', \'durationMin\', this.value);">' +
                            '</div>';
        } else {
            editInputsRow = '<div class="slot-input-group">' +
                                '<label>组数</label>' +
                                '<input type="number" value="' + item.sets + '" min="1" onchange="updateQueueItemParam(\'' + item.id + '\', \'sets\', this.value)">' +
                            '</div>' +
                            '<div class="slot-input-group">' +
                                '<label>点数/时长</label>' +
                                '<input type="text" value="' + (item.reps || '') + '" oninput="updateQueueItemParam(\'' + item.id + '\', \'reps\', this.value)">' +
                            '</div>' +
                            '<div class="slot-input-group">' +
                                '<label>总量</label>' +
                                '<input type="number" id="q_tot_' + item.id + '" value="' + item.total + '" onchange="updateQueueItemParam(\'' + item.id + '\', \'total\', this.value)">' +
                            '</div>';
        }

        var timeInfo = item.startTime ? '始: ' + item.startTime.slice(11) : '未启动';
        var endTimeInfo = item.endTime ? ' 止: ' + item.endTime.slice(11) : '';
        var durationInfo = item.durationMin > 0 ? '<span style="color:var(--green-accent);">⏱️ ' + item.durationMin + '分</span>' : '';

        var runStyle = isRunning ? 'border-left-color: var(--green-accent); box-shadow: 0 0 10px rgba(5,255,161,0.2);' : '';

        html += '<div class="routine-slot-item" id="slot_' + item.id + '" style="' + runStyle + '">' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">' +
                        '<div>' +
                            '<span style="font-weight:bold; color:#fff; font-size:14px;">' + item.icon + ' ' + item.name + '</span> ' + badgeTitle +
                        '</div>' +
                        '<div style="display:flex; gap:4px;">' +
                            ctrlBtn +
                            '<button class="btn btn-sm btn-outline" onclick="removeQueueItem(\'' + item.id + '\')">✕</button>' +
                        '</div>' +
                    '</div>' +
                    '<div class="slot-inputs-row">' +
                        editInputsRow +
                        '<div class="slot-input-group">' +
                            '<label>心脉 (BPM)</label>' +
                            '<input type="text" id="q_heart_' + item.id + '" value="' + heartDisplay + '" style="font-size:11px; text-align:center;" onchange="updateQueueItemParam(\'' + item.id + '\', \'heart\', this.value)">' +
                        '</div>' +
                    '</div>' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:11px; color:var(--text-muted);">' +
                        '<span style="font-family:var(--font-mono); font-size:10.5px;">' + timeInfo + endTimeInfo + '</span>' + durationInfo +
                    '</div>' +
                '</div>';
    }
    container.innerHTML = html;
    renderWorkoutQueueStats();
}

function removeQueueItem(itemId) {
    data.workoutQueue = data.workoutQueue.filter(function (x) { return x.id !== itemId; });
    saveData();
    renderWorkoutQueue();
}

function clearWorkoutQueue() {
    if (!data.workoutQueue.length) return;
    if (!confirm('确定清空当前出征台的所有法门？')) return;
    data.workoutQueue = [];
    saveData();
    renderWorkoutQueue();
}

function saveActiveQueueToCurrentPlan() {
    var plan = data.presetPlans[data.activePlanIndex];
    if (!data.workoutQueue.length) return alert('当前出征台为空！');

    plan.items = data.workoutQueue.map(function (item) {
        return {
            actionId: item.actionId,
            name: item.name,
            sets: item.sets,
            reps: item.reps,
            total: item.total,
            downSec: item.downSec,
            upSec: item.upSec,
            heart: item.heart
        };
    });

    saveData();
    renderPresetPlanBar();
    alert('🎉 配置已成功封存并覆盖【' + plan.name + '】！');
}

function renameCurrentPlan() {
    var plan = data.presetPlans[data.activePlanIndex];
    var newName = prompt('输入该方案的新名称：', plan.name);
    if (!newName) return;
    plan.name = newName.trim();
    saveData();
    renderPresetPlanBar();
}

function saveAllQueueLogs() {
    if (!data.workoutQueue.length) return alert('出征台尚无动作！');
    data.workoutQueue.forEach(function (item) {
        autoCommitLogEntry(item);
    });
    data.workoutQueue = [];
    saveData();
    renderWorkoutQueue();
    if (typeof renderAll === 'function') renderAll();
    switchTab('log');
    alert('🚀 全套项目已封存入淬体实录！');
}

function openArsenalModal() {
    renderArsenalManageList();
    resetArsenalForm();
    var mod = document.getElementById('arsenalManageModal');
    if (mod) mod.classList.add('active');
}

function closeArsenalModal() {
    var mod = document.getElementById('arsenalManageModal');
    if (mod) mod.classList.remove('active');
}

function renderArsenalManageList() {
    var list = getArsenalList();
    var container = document.getElementById('arsenalManageList');
    if (!container) return;
    var html = '';
    for (var i = 0; i < list.length; i++) {
        var act = list[i];
        html += '<div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:12px;">' +
                    '<span>' + act.icon + ' <strong>' + act.name + '</strong> (' + act.defaultReps + ')</span>' +
                    '<div><button class="btn btn-sm btn-danger" onclick="deleteArsenalItem(\'' + act.id + '\')">🗑</button></div>' +
                '</div>';
    }
    container.innerHTML = html;
}

function resetArsenalForm() {
    document.getElementById('arsFormId').value = '';
    document.getElementById('arsFormIcon').value = '⚡';
    document.getElementById('arsFormName').value = '';
    document.getElementById('arsFormSets').value = '2';
    document.getElementById('arsFormReps').value = '10';
}

function saveArsenalItem() {
    var id = document.getElementById('arsFormId').value.trim();
    var name = document.getElementById('arsFormName').value.trim();
    var icon = document.getElementById('arsFormIcon').value.trim() || '⚡';
    var sets = parseInt(document.getElementById('arsFormSets').value) || 2;
    var reps = document.getElementById('arsFormReps').value.trim() || '10';

    if (!name) return alert('名称不能为空！');
    var list = getArsenalList();

    if (id) {
        var idx = list.findIndex(function (x) { return x.id === id; });
        if (idx !== -1) list[idx] = Object.assign({}, list[idx], { name: name, icon: icon, defaultSets: sets, defaultReps: reps });
    } else {
        list.push({ id: 'act_' + Date.now(), name: name, icon: icon, type: 'strength', defaultSets: sets, defaultReps: reps, downSec: 4.0, upSec: 1.0 });
    }

    data.arsenal = list;
    saveData();
    renderArsenalManageList();
    renderArsenalPicker();
    resetArsenalForm();
}

function deleteArsenalItem(id) {
    if (!confirm('确定除名该法门？')) return;
    data.arsenal = getArsenalList().filter(function (x) { return x.id !== id; });
    saveData();
    renderArsenalManageList();
    renderArsenalPicker();
}