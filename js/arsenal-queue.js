// ================================================================
//  arsenal-queue.js: 动作装备库与出征队列（智能联动启动专有战钟与自动销项）
// ================================================================

function renderArsenalPicker() {
    const container = document.getElementById('arsenalPickerGrid');
    if (!container) return;
    const list = getArsenalList();
    container.innerHTML = list.map(act => {
        const mem = data.customParamCache[act.id];
        const displayReps = mem?.reps || act.defaultReps;
        return `
            <div class="arsenal-btn" onclick="addArsenalToQueue('${act.id}')" data-hud-tip="【${act.name}】：${act.tip}。点击立即加入出征台！">
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
            <button class="plan-tab-btn ${isActive ? 'active' : ''}" onclick="applyPresetPlan(${idx})"
                    data-hud-tip="【${plan.name}】：${plan.desc}。包含 ${plan.items.length} 个法门配置。">
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
        return {
            id: 'wq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            actionId: item.actionId,
            name: item.name || baseAct.name,
            icon: baseAct.icon || '⚡',
            sets: mem.sets !== undefined ? mem.sets : (item.sets || baseAct.defaultSets || 2),
            reps: mem.reps !== undefined ? mem.reps : (item.reps || baseAct.defaultReps || '10'),
            total: mem.total !== undefined ? mem.total : (item.total || baseAct.total || 20),
            downSec: mem.downSec !== undefined ? mem.downSec : (item.downSec || baseAct.downSec || 0),
            upSec: mem.upSec !== undefined ? mem.upSec : (item.upSec || baseAct.upSec || 0),
            heart: mem.heart || item.heart || 130,
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

    const newItem = {
        id: 'wq_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        actionId: baseAct.id,
        name: baseAct.name,
        icon: baseAct.icon || '⚡',
        type: baseAct.type || 'strength',
        sets: mem.sets !== undefined ? mem.sets : (isAerobic ? 1 : baseAct.defaultSets || 2),
        reps: mem.reps !== undefined ? mem.reps : (baseAct.defaultReps || (isAerobic ? '25min' : '10')),
        total: mem.total !== undefined ? mem.total : (baseAct.total || 20),
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

// 核心系统联动：出征台启动时自动联动调用专有倒计时与语音战钟！
function startWorkoutItem(itemId) {
    const item = data.workoutQueue.find(x => x.id === itemId);
    if (!item) return;

    // 1. 如果是离心慢放 -> 跳转到离心战钟并同步参数启动
    if (item.actionId === 'act_pushup_ecc' || item.name.includes('离心')) {
        switchTab('timer');
        const downInput = document.getElementById('timerDownInput');
        const upInput = document.getElementById('timerUpInput');
        if (downInput) downInput.value = item.downSec || 4.0;
        if (upInput) upInput.value = item.upSec || 1.0;
        setEccentricQuickSets(item.sets || 2);
        syncTimerInputs();
        startEccentricTimer();
        return;
    }

    // 2. 如果是慢跑 -> 跳转到慢跑巡航面板
    if (item.actionId === 'act_jog_glyco' || item.name.includes('跑')) {
        switchTab('action_quick');
        setQuickJogMinutes(parseInt(item.total) || 25);
        startQuickJog();
        return;
    }

    // 3. 如果是压腿 -> 跳转到压腿舒筋战钟
    if (item.actionId === 'act_pnf_stretch' || item.name.includes('压腿') || item.name.includes('拉伸')) {
        switchTab('stretch_timer');
        switchStretchMode('countdown');
        setStretchCountdownSec(parseInt(item.total) || 60);
        startStretchTimer();
        return;
    }

    // 4. 如果是引体向上 / 阔引体 / 悬挂 -> 跳转到引体全能战钟
    if (item.actionId === 'act_pullup' || item.actionId === 'act_pullup_wide' || item.actionId === 'act_hang' || item.name.includes('引体') || item.name.includes('悬挂')) {
        switchTab('hang_timer');
        if (item.name.includes('阔')) {
            switchHangVariant('wide');
        } else if (item.name.includes('悬挂')) {
            switchHangVariant('hang');
        } else {
            switchHangVariant('standard');
        }
        return;
    }

    // 5. 其余常规通用动作，原地打卡
    item.status = 'running';
    item.startTime = getFullTimestamp();
    item.endTime = '';
    item.durationMin = 0;

    saveData();
    renderWorkoutQueue();
    showToast(`🚀 开始【${item.name}】！`);
}

function endWorkoutItem(itemId) {
    const item = data.workoutQueue.find(x => x.id === itemId);
    if (!item || item.status !== 'running') return;

    item.status = 'done';
    item.endTime = getFullTimestamp();

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
        renderAll();
        showToast(`✅ 【${item.name}】已成功入册！`);
    }
}

function autoCommitLogEntry(item) {
    try {
        const duty = getDutyShiftInfo();
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
            startTimeStamp: item.startTime || getFullTimestamp(),
            endTimeStamp: item.endTime || getFullTimestamp(),
            downSec: isAerobic ? 0 : (item.downSec || 0),
            upSec: isAerobic ? 0 : (item.upSec || 0),
            tutSeconds: finalTut,
            note: `${item.name}实修入册。做功量: ${finalTotal}`,
            createdAt: new Date().toISOString()
        };

        data.logs.push(entry);
        return true;
    } catch (e) {
        console.error('自动入册失败:', e);
        return false;
    }
}

function renderWorkoutQueue() {
    const container = document.getElementById('workoutQueueContainer');
    const countBadge = document.getElementById('activeQueueCountBadge');
    if (!container) return;

    if (countBadge) countBadge.textContent = `${data.workoutQueue.length} 个法门就绪`;

    if (!data.workoutQueue.length) {
        container.innerHTML = `
            <div style="text-align:center; padding:20px 0; color:var(--text-dim); font-size:12px;">
                出征台暂无项目。点击上方【动作法门库】添加，或直接切换方案！
            </div>
        `;
        document.getElementById('queueTotalReps').textContent = '0';
        document.getElementById('queueTotalTut').textContent = '0';
        return;
    }

    container.innerHTML = data.workoutQueue.map(item => {
        const isRunning = item.status === 'running';

        return `
            <div class="routine-slot-item" style="${isRunning ? 'border-left-color: var(--green-accent);' : ''}">
                <div style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <span style="font-weight:bold; color:#fff;">${item.icon} ${item.name}</span>
                        <span style="font-size:11px; color:var(--cyan-accent); font-family:var(--font-mono); margin-left:6px;">${item.reps || item.total}</span>
                    </div>
                    <div style="display:flex; gap:6px;">
                        ${isRunning ? `
                            <button class="btn btn-sm btn-danger" onclick="endWorkoutItem('${item.id}')">⏹ 结束</button>
                        ` : `
                            <button class="btn btn-sm btn-success" onclick="startWorkoutItem('${item.id}')">▶ 开始</button>
                        `}
                        <button class="btn btn-sm btn-outline" onclick="removeQueueItem('${item.id}')">✕</button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function removeQueueItem(itemId) {
    data.workoutQueue = data.workoutQueue.filter(x => x.id !== itemId);
    saveData();
    renderWorkoutQueue();
}

function clearWorkoutQueue() {
    if (!data.workoutQueue.length) return;
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
    alert(`🎉 配置已封存并覆盖【${plan.name}】！`);
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
    renderAll();
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
        <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:11px;">
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
        if (idx !== -1) list[idx] = { ...list[idx], name, icon, defaultSets: sets, defaultReps: reps };
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