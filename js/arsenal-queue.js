// ================================================================
//  arsenal-queue.js: 动作装备库与出征队列 (移动端空间极致压缩与负重静蹲联动)
// ================================================================

function renderArsenalPicker() {
    const container = document.getElementById('arsenalPickerGrid');
    if (!container) return;
    const list = getArsenalList();
    container.innerHTML = list.map(act => {
        const mem = data.customParamCache[act.id];
        const displayReps = mem?.reps || act.defaultReps;
        return `
            <div class="arsenal-btn" onclick="addArsenalToQueue('${act.id}')">
                <span>${act.icon} ${act.name}</span>
                <span style="font-family:var(--font-mono); font-size:10px; color:var(--cyan-accent);">${displayReps}</span>
            </div>
        `;
    }).join('');
}

function renderPresetPlanBar() {
    const bar = document.getElementById('presetPlanBar');
    if (!bar) return;
    const duty = getDutyShiftInfo();
    const recIndex = duty.shift.isWork ? 1 : 2;

    bar.innerHTML = data.presetPlans.map((plan, idx) => {
        const isActive = (data.activePlanIndex === idx);
        const isRec = (idx === recIndex);
        return `
            <button class="plan-tab-btn ${isActive ? 'active' : ''}" onclick="applyPresetPlan(${idx})">
                <span>${plan.name}</span>
                ${isRec ? '<span style="color:var(--pink-accent); font-size:9px;">[推荐]</span>' : ''}
            </button>
        `;
    }).join('');
}

function applyPresetPlan(planIndex) {
    data.activePlanIndex = planIndex;
    const plan = data.presetPlans[planIndex];
    data.workoutQueue = plan.items.map(item => {
        const baseAct = MASTER_ARSENAL.find(a => a.id === item.actionId) || {};
        const mem = data.customParamCache[item.actionId] || {};
        const defaultReps = (item.actionId === 'act_pushup_ecc' ? (data.settings?.eccentricDefaultReps || 10) : (item.reps || baseAct.defaultReps || '10'));
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
    const list = getArsenalList();
    const baseAct = list.find(a => a.id === actionId);
    if (!baseAct) return;

    const mem = data.customParamCache[actionId] || {};
    const isAerobic = baseAct.type === 'aerobic';
    const isEccentric = (actionId === 'act_pushup_ecc');
    const isStretch = (actionId === 'act_pnf_stretch');
    const isSquat = (actionId === 'act_squat_wall');
    const defaultReps = isEccentric ? (data.settings?.eccentricDefaultReps || 10) : (isStretch ? '60s' : (isSquat ? '60s' : (baseAct.defaultReps || (isAerobic ? '25min' : '10'))));

    const newItem = {
        id: 'wq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        actionId: baseAct.id,
        name: baseAct.name,
        icon: baseAct.icon || '⚡',
        type: baseAct.type || 'strength',
        sets: mem.sets !== undefined ? mem.sets : (isAerobic ? 1 : baseAct.defaultSets || 2),
        reps: mem.reps !== undefined ? mem.reps : defaultReps,
        total: mem.total !== undefined ? mem.total : (isStretch ? 120 : (isSquat ? 180 : (baseAct.total || 20))),
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
    const item = data.workoutQueue.find(x => x.id === itemId);
    if (!item) return;

    // 1. 离心慢放
    if (item.actionId === 'act_pushup_ecc' || item.name.includes('离心')) {
        switchTab('timer');
        const defaultReps = parseInt(item.reps) || data.settings?.eccentricDefaultReps || 10;
        if (typeof setEccentricQuickSets === 'function') setEccentricQuickSets(item.sets || 2);
        if (typeof setEccentricQuickReps === 'function') setEccentricQuickReps(defaultReps);
        if (typeof startEccentricTimer === 'function') startEccentricTimer();
        return;
    }

    // 2. 慢跑
    if (item.actionId === 'act_jog_glyco' || item.name.includes('跑')) {
        switchTab('action_quick');
        if (typeof setQuickJogMinutes === 'function') setQuickJogMinutes(parseInt(item.total) || 25);
        if (typeof startQuickJog === 'function') startQuickJog();
        return;
    }

    // 3. 靠墙静蹲 -> 切换到静蹲专属工作台
    if (item.actionId === 'act_squat_wall' || item.name.includes('静蹲')) {
        switchTab('squat_deck');
        if (typeof renderSquatDeckPanel === 'function') renderSquatDeckPanel();
        return;
    }

    // 4. 引体向上 / 极限悬挂 -> 切换到引体战阙 (默认极限悬挂)
    if (item.actionId === 'act_hang' || item.actionId === 'act_pullup' || item.actionId === 'act_pullup_wide' || item.name.includes('悬挂') || item.name.includes('引体')) {
        switchTab('hang_timer');
        if (typeof switchHangVariant === 'function') {
            if (item.name.includes('阔')) switchHangVariant('wide');
            else if (item.name.includes('标准') || item.name.includes('引体')) switchHangVariant('standard');
            else switchHangVariant('hang');
        }
        return;
    }

    // 5. 压腿
    if (item.actionId === 'act_pnf_stretch' || item.name.includes('压腿') || item.name.includes('拉伸')) {
        switchTab('stretch_timer');
        return;
    }

    // 通用打卡
    item.status = 'running';
    item.startTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();
    item.endTime = '';
    item.durationMin = 0;
    saveData();
    renderWorkoutQueue();
    if (typeof showToast === 'function') showToast(`🚀 开始【${item.name}】！`);
}

function endWorkoutItem(itemId) {
    const item = data.workoutQueue.find(x => x.id === itemId);
    if (!item || item.status !== 'running') return;

    item.status = 'done';
    item.endTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();

    if (item.startTime) {
        const s = new Date(item.startTime).getTime();
        const e = new Date(item.endTime).getTime();
        item.durationMin = Math.max(1, Math.round((e - s) / (1000 * 60)));
    }

    const committed = autoCommitLogEntry(item);
    if (committed) {
        data.workoutQueue = data.workoutQueue.filter(x => x.id !== itemId);
        saveData();
        renderWorkoutQueue();
        if (typeof renderAll === 'function') renderAll();
        if (typeof showToast === 'function') showToast(`✅ 【${item.name}】已成功入册！`);
    }
}

function autoCommitLogEntry(item) {
    try {
        const duty = (typeof getDutyShiftInfo === 'function')
            ? getDutyShiftInfo()
            : { dutyDateStr: new Date().toISOString().slice(0, 10), shift: { name: '日常' } };
        const cleanHeart = (!item.heart || item.heart === '未知') ? '未知' : item.heart;
        const isAerobic = item.type === 'aerobic' || item.name.includes('跑') || item.name.includes('球');
        const isSquat = item.name.includes('静蹲');
        const isIsometric = item.type === 'isometric' || isSquat || item.name.includes('压腿') || item.name.includes('悬挂');

        let finalSets = item.sets || 1;
        let finalReps = item.reps || '';
        let finalTotal = item.total || 0;
        let finalDuration = item.durationMin || 1;
        let finalTut = 0;

        if (isAerobic) {
            finalSets = 1;
            finalDuration = item.durationMin || (parseInt(item.total) || 25);
            finalTotal = finalDuration;
            finalReps = `${finalDuration}min`;
            finalTut = finalDuration * 60;
        } else if (isIsometric) {
            finalTut = finalTotal || (finalDuration * 60);
        } else {
            finalTut = Math.round((finalTotal || 0) * ((item.downSec || 0) + (item.upSec || 0) || 2.0));
        }

        const entry = {
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
            dutyTag: `${duty.shift.name} (归属${duty.dutyDateStr.slice(5)})`,
            startTimeStamp: item.startTime || (typeof getFullTimestamp === 'function' ? getFullTimestamp() : new Date().toISOString()),
            endTimeStamp: item.endTime || (typeof getFullTimestamp === 'function' ? getFullTimestamp() : new Date().toISOString()),
            downSec: isAerobic ? 0 : (item.downSec || 0),
            upSec: isAerobic ? 0 : (item.upSec || 0),
            tutSeconds: finalTut,
            note: item.note || `${item.name}实修入册。做功量: ${finalTotal}`,
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
    const item = data.workoutQueue.find(x => x.id === itemId);
    if (!item) return;

    if (field === 'sets' || field === 'total') {
        item[field] = parseInt(val) || 0;
    } else if (field === 'downSec' || field === 'upSec') {
        item[field] = parseFloat(val) || 0;
    } else if (field === 'heart') {
        const strVal = String(val).trim();
        if (!strVal || strVal === '未知' || strVal === '-' || isNaN(strVal)) {
            item.heart = '未知';
        } else {
            item.heart = parseInt(strVal);
        }
    } else {
        item[field] = val;
    }

    if (field === 'reps') {
        const parts = String(val).split(/[,，]/).map(s => parseInt(s.trim())).filter(n => !isNaN(n));
        if (parts.length) {
            item.total = parts.reduce((a, b) => a + b, 0) * (parseInt(item.sets) || 1);
            const totEl = document.getElementById(`q_tot_${itemId}`);
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
    let sumReps = 0;
    let sumTut = 0;
    data.workoutQueue.forEach(item => {
        const isAerobic = item.type === 'aerobic' || item.name.includes('跑') || item.name.includes('球');
        const isIsometric = item.type === 'isometric' || item.name.includes('静蹲') || item.name.includes('压腿') || item.name.includes('悬挂');
        if (isAerobic) {
            const mins = parseInt(item.total) || 25;
            sumTut += mins * 60;
        } else if (isIsometric) {
            sumTut += parseInt(item.total) || 60;
            sumReps += parseInt(item.total) || 0;
        } else {
            const r = parseInt(item.total) || 0;
            sumReps += r;
            sumTut += Math.round(r * ((parseFloat(item.downSec) || 0) + (parseFloat(item.upSec) || 0) || 2.0));
        }
    });

    const repsEl = document.getElementById('queueTotalReps');
    const tutEl = document.getElementById('queueTotalTut');
    if (repsEl) repsEl.textContent = sumReps;
    if (tutEl) tutEl.textContent = sumTut;
}

function renderWorkoutQueue() {
    const container = document.getElementById('workoutQueueContainer');
    const countBadge = document.getElementById('activeQueueCountBadge');
    if (!container) return;

    if (countBadge) countBadge.textContent = `${data.workoutQueue.length} 个法门就绪`;

    if (!data.workoutQueue.length) {
        container.innerHTML = `
            <div style="text-align:center; padding:18px 0; color:var(--text-dim); font-size:12.5px;">
                出征台暂无项目。点击上方【动作法门装备库】添加！
            </div>
        `;
        renderWorkoutQueueStats();
        return;
    }

    container.innerHTML = data.workoutQueue.map(item => {
        const isRunning = (item.status === 'running');
        const isAerobic = item.type === 'aerobic' || item.name.includes('跑') || item.name.includes('球');
        const isIsometric = item.type === 'isometric' || item.name.includes('静蹲') || item.name.includes('压腿') || item.name.includes('悬挂');
        const heartDisplay = (!item.heart || item.heart === '未知') ? '未知' : item.heart;

        let badgeTitle = '';
        if (isAerobic) {
            badgeTitle = `<span style="font-family:var(--font-mono); font-size:11.5px; color:var(--cyan-accent); font-weight:bold;">${item.total || 25}分</span>`;
        } else if (isIsometric) {
            badgeTitle = `<span style="font-family:var(--font-mono); font-size:11.5px; color:var(--green-accent); font-weight:bold;">${item.sets}组·${item.reps || item.total + 's'}</span>`;
        } else {
            badgeTitle = `<span style="font-family:var(--font-mono); font-size:11.5px; color:var(--orange-primary); font-weight:bold;">${item.total}次</span>`;
        }

        const ctrlBtn = isRunning
            ? `<button class="btn btn-sm btn-danger" onclick="endWorkoutItem('${item.id}')">⏹ 结束</button>`
            : `<button class="btn btn-sm btn-success" onclick="startWorkoutItem('${item.id}')">▶ 开始</button>`;

        let editInputsRow = '';
        if (isAerobic) {
            editInputsRow = `
                <div class="slot-input-group" style="grid-column: span 2;">
                    <label>持续时长 (分钟)</label>
                    <input type="number" value="${item.total || 25}" min="1" step="5"
                           onchange="updateQueueItemParam('${item.id}', 'total', this.value); updateQueueItemParam('${item.id}', 'durationMin', this.value);">
                </div>
            `;
        } else {
            editInputsRow = `
                <div class="slot-input-group">
                    <label>组数</label>
                    <input type="number" value="${item.sets}" min="1"
                           onchange="updateQueueItemParam('${item.id}', 'sets', this.value)">
                </div>
                <div class="slot-input-group">
                    <label>点数/时长</label>
                    <input type="text" value="${item.reps || ''}"
                           oninput="updateQueueItemParam('${item.id}', 'reps', this.value)">
                </div>
                <div class="slot-input-group">
                    <label>总量</label>
                    <input type="number" id="q_tot_${item.id}" value="${item.total}"
                           onchange="updateQueueItemParam('${item.id}', 'total', this.value)">
                </div>
            `;
        }

        const timeInfo = item.startTime ? `始: ${item.startTime.slice(11)}` : '未启动';
        const endTimeInfo = item.endTime ? ` 止: ${item.endTime.slice(11)}` : '';
        const durationInfo = item.durationMin > 0 ? `<span style="color:var(--green-accent);">⏱️ ${item.durationMin}分</span>` : '';

        return `
            <div class="routine-slot-item" id="slot_${item.id}" style="${isRunning ? 'border-left-color: var(--green-accent); box-shadow: 0 0 10px rgba(5,255,161,0.2);' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
                    <div>
                        <span style="font-weight:bold; color:#fff; font-size:14px;">${item.icon} ${item.name}</span>
                        ${badgeTitle}
                    </div>
                    <div style="display:flex; gap:4px;">
                        ${ctrlBtn}
                        <button class="btn btn-sm btn-outline" onclick="removeQueueItem('${item.id}')">✕</button>
                    </div>
                </div>
                <div class="slot-inputs-row">
                    ${editInputsRow}
                    <div class="slot-input-group">
                        <label>心脉 (BPM)</label>
                        <input type="text" id="q_heart_${item.id}" value="${heartDisplay}" style="font-size:11px; text-align:center;"
                               onchange="updateQueueItemParam('${item.id}', 'heart', this.value)">
                    </div>
                </div>
                <div style="display:flex; justify-content:space-between; align-items:center; margin-top:6px; font-size:11px; color:var(--text-muted);">
                    <span style="font-family:var(--font-mono);">${timeInfo}${endTimeInfo}</span>
                    ${durationInfo}
                </div>
            </div>
        `;
    }).join('');

    renderWorkoutQueueStats();
}

function removeQueueItem(itemId) {
    data.workoutQueue = data.workoutQueue.filter(x => x.id !== itemId);
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
    const plan = data.presetPlans[data.activePlanIndex];
    if (!data.workoutQueue.length) return alert('当前出征台为空！');

    plan.items = data.workoutQueue.map(item => ({
        actionId: item.actionId,
        name: item.name,
        sets: item.sets,
        reps: item.reps,
        total: item.total,
        downSec: item.downSec,
        upSec: item.upSec,
        heart: item.heart
    }));

    saveData();
    renderPresetPlanBar();
    alert(`🎉 配置已成功封存并覆盖【${plan.name}】！`);
}

function renameCurrentPlan() {
    const plan = data.presetPlans[data.activePlanIndex];
    const newName = prompt('输入该方案的新名称：', plan.name);
    if (!newName) return;
    plan.name = newName.trim();
    saveData();
    renderPresetPlanBar();
}

function saveAllQueueLogs() {
    if (!data.workoutQueue.length) return alert('出征台尚无动作！');
    data.workoutQueue.forEach(item => {
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
    document.getElementById('arsenalManageModal')?.classList.add('active');
}

function closeArsenalModal() {
    document.getElementById('arsenalManageModal')?.classList.remove('active');
}

function renderArsenalManageList() {
    const list = getArsenalList();
    const container = document.getElementById('arsenalManageList');
    if (!container) return;
    container.innerHTML = list.map(act => `
        <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.06); font-size:12px;">
            <span>${act.icon} <strong>${act.name}</strong> (${act.defaultReps})</span>
            <div>
                <button class="btn btn-sm btn-danger" onclick="deleteArsenalItem('${act.id}')">🗑</button>
            </div>
        </div>
    `).join('');
}

function resetArsenalForm() {
    document.getElementById('arsFormId').value = '';
    document.getElementById('arsFormIcon').value = '⚡';
    document.getElementById('arsFormName').value = '';
    document.getElementById('arsFormSets').value = '2';
    document.getElementById('arsFormReps').value = '10';
}

function saveArsenalItem() {
    const id = document.getElementById('arsFormId').value.trim();
    const name = document.getElementById('arsFormName').value.trim();
    const icon = document.getElementById('arsFormIcon').value.trim() || '⚡';
    const sets = parseInt(document.getElementById('arsFormSets').value) || 2;
    const reps = document.getElementById('arsFormReps').value.trim() || '10';

    if (!name) return alert('名称不能为空！');
    const list = getArsenalList();

    if (id) {
        const idx = list.findIndex(x => x.id === id);
        if (idx !== -1) list[idx] = Object.assign({}, list[idx], { name, icon, defaultSets: sets, defaultReps: reps });
    } else {
        list.push({ id: 'act_' + Date.now(), name, icon, type: 'strength', defaultSets: sets, defaultReps: reps, downSec: 4.0, upSec: 1.0 });
    }

    data.arsenal = list;
    saveData();
    renderArsenalManageList();
    renderArsenalPicker();
    resetArsenalForm();
}

function deleteArsenalItem(id) {
    if (!confirm('确定除名该法门？')) return;
    data.arsenal = getArsenalList().filter(x => x.id !== id);
    saveData();
    renderArsenalManageList();
    renderArsenalPicker();
}