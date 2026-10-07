// ================================================================
// quick-action.js: 慢跑巡航 + 靠墙静蹲(自重/单重/双手置于大腿根部对称与非对称负重)
// 首屏中置主战区：大时钟与开始按键正中直接可见，零滚动即可操作！
// ================================================================
let currentQuickActionId = 'act_jog_glyco';
let quickTimerInterval = null;
let squatTimerInterval = null;
let quickActionSpokenCues = new Set();
function renderTopTabs() {
const bar = document.getElementById('topTabsBar');
if (!bar) return;
const currentActive = document.querySelector('.tab-btn.active');
const activeTab = currentActive ? currentActive.dataset.tab : 'action_quick';

const tabs = [
    { id: 'action_quick', label: '🏃 慢跑', tip: '【慢跑巡航】：餐后平抑血糖，目标倒计时！' },
    { id: 'squat_deck', label: '🧱 靠墙静蹲', tip: '【靠墙静蹲】：背贴墙大腿90°，支持徒手/单物大米/双哑铃对称与非对称负重！' },
    { id: 'hang_timer', label: '🦇 极限悬挂', tip: '【极限悬挂】：默认静态单杠死磕，脱杠停表后自带10个延时补偿按钮！' },
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

bar.innerHTML = tabs.map(t => {
    const isActive = (activeTab === t.id);
    return `<button class="tab-btn ${isActive ? 'active' : ''}" data-tab="${t.id}" data-hud-tip="${t.tip}">${t.label}</button>`;
}).join('');

bar.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () {
        switchTab(this.dataset.tab);
    });
});
}
// ----------------------------------------------------------------
// 1. 慢跑控制面板（首屏中置主战区）
// ----------------------------------------------------------------
function renderActionQuickPanel() {
const container = document.getElementById('actionQuickContainer');
if (!container) return;
if (!window.data || !Array.isArray(data.workoutQueue)) return;

let item = data.workoutQueue.find(x => x.actionId === 'act_jog_glyco' && x.status !== 'done');
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
const isRunning = (item.status === 'running');

let timerDisplay = String(item.targetMinutes).padStart(2, '0') + ':00';
let phaseTitle = `🎯 设定目标 ${item.targetMinutes} 分钟 (时间到自动封存)`;

if (isRunning && item.startTime) {
    const elapsed = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
    const remSec = Math.max(0, (item.targetMinutes * 60) - elapsed);
    const m = String(Math.floor(remSec / 60)).padStart(2, '0');
    const s = String(remSec % 60).padStart(2, '0');
    timerDisplay = `${m}:${s}`;
    phaseTitle = '⚡ 慢跑巡航中 · 骨骼肌GLUT4持续汲糖';
}

const presetMins = [15, 20, 25, 30, 40, 60];

// 主操作按钮：运行中显示收功，停止中显示居中巨型“开始慢跑”
let mainActionBtnHtml = isRunning
    ? `<button class="btn btn-danger hero-main-action-btn" onclick="stopQuickJog(false)">⏹️ 提前收功并封存</button>`
    : `<button class="btn btn-success hero-main-action-btn" onclick="startQuickJog()">▶️ 开始慢跑倒计时</button>`;

container.innerHTML = `
    <div class="cyber-card" style="border-color:var(--cyan-accent); text-align:center;">
        <!-- 首屏中置主战区：大表盘与按键零滚动直接可见 -->
        <div class="zero-scroll-hero">
            <div style="font-size:1.8rem; line-height:1;">🏃</div>
            <h2 style="font-family:var(--font-tech); color:var(--orange-primary); font-size:1.3rem; margin:2px 0;">餐后慢跑巡航</h2>
            <div class="hero-sub-status" id="quickTimerSubPhase">${phaseTitle}</div>
            <div class="hero-clock-display" id="quickTimerDisplay">${timerDisplay}</div>
            ${mainActionBtnHtml}
        </div>

        <!-- 次级参数调节（首屏下方，久久才需改动一次） -->
        <div class="secondary-settings-scroll">
            <div class="param-row" style="justify-content:center; margin-bottom:4px;">
                <span class="param-label">预设时长:</span>
                <div class="param-chips" style="justify-content:center;">
                    ${presetMins.map(m => `
                        <button type="button" class="preset-chip ${item.targetMinutes === m ? 'active' : ''}" onclick="setQuickJogMinutes(`${m}`)">${m}分</button>
                    `).join('')}
                </div>
            </div>
        </div>
    </div>
`;

if (quickTimerInterval) clearInterval(quickTimerInterval);
if (isRunning) {
    quickTimerInterval = setInterval(() => {
        const el = document.getElementById('quickTimerDisplay');
        if (!el || !item.startTime) return;

        const elapsed = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
        const totalSec = item.targetMinutes * 60;
        const remSec = totalSec - elapsed;

        if (remSec <= 0) {
            clearInterval(quickTimerInterval);
            quickTimerInterval = null;
            el.textContent = "00:00";
            stopQuickJog(true);
            return;
        }

        const m = String(Math.floor(remSec / 60)).padStart(2, '0');
        const s = String(remSec % 60).padStart(2, '0');
        el.textContent = `${m}:${s}`;
    }, 1000);
}
}
function setQuickJogMinutes(m) {
let item = data.workoutQueue.find(x => x.actionId === 'act_jog_glyco' && x.status !== 'done');
if (item && item.status !== 'running') {
item.targetMinutes = m;
item.total = m;
saveData();
renderActionQuickPanel();
}
}
function startQuickJog() {
let item = data.workoutQueue.find(x => x.actionId === 'act_jog_glyco' && x.status !== 'done');
if (!item) return;
item.status = 'running';
item.startTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();
item.endTime = '';
item.durationMin = 0;

saveData();
renderActionQuickPanel();

if (typeof speakFast === 'function') {
    speakFast(`慢跑倒计时开始，设定${item.targetMinutes}分钟，保持平稳呼吸！`);
}
}
function stopQuickJog(isAuto) {
if (quickTimerInterval) {
clearInterval(quickTimerInterval);
quickTimerInterval = null;
}
let item = data.workoutQueue.find(x => x.actionId === 'act_jog_glyco' && x.status !== 'done');
if (!item) return;

item.status = 'done';
item.endTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();

if (item.startTime) {
    const s = new Date(item.startTime).getTime();
    const e = new Date(item.endTime).getTime();
    item.durationMin = Math.max(1, Math.round((e - s) / (1000 * 60)));
} else {
    item.durationMin = item.targetMinutes || 25;
}

if (isAuto && item.targetMinutes) item.durationMin = item.targetMinutes;

item.total = item.durationMin;
item.reps = `${item.durationMin}min`;

if (typeof autoCommitLogEntry === 'function') {
    autoCommitLogEntry(item);
}
data.workoutQueue = data.workoutQueue.filter(x => x.id !== item.id);
saveData();
renderActionQuickPanel();
if (typeof renderAll === 'function') renderAll();

if (isAuto) {
    speakFast(`恭喜！预定${item.durationMin}分钟慢跑圆满完成，已自动入册！`);
    showToast(`🎉 慢跑时间到！已自动封存入册（${item.durationMin}分钟）`);
} else {
    speakFast('慢跑收功，已成功入册！');
    showToast(`✅ 慢跑提前收功已入册（${item.durationMin}分钟）`);
}
}
// ----------------------------------------------------------------
// 2. 靠墙静蹲专属工作战位
// ★ 开始按键首屏中置直接可见，参数选择可上下滚动
// ★ 完美支持徒手自重、单物大米、双哑铃双手置于左右大腿根部的对称/非对称负重
// ----------------------------------------------------------------
function renderSquatDeckPanel() {
const container = document.getElementById('squatDeckContainer');
if (!container) return;
if (!window.data || !Array.isArray(data.workoutQueue)) return;

const s = data.settings;
if (!s.squatDefaultMode) s.squatDefaultMode = 'bodyweight';
if (s.squatSingleWeight === undefined) s.squatSingleWeight = 10.0;
if (s.squatLeftWeight === undefined) s.squatLeftWeight = 5.0;
if (s.squatRightWeight === undefined) s.squatRightWeight = 5.0;
if (!s.squatItemDesc) s.squatItemDesc = '哑铃';
if (s.squatLockSymmetric === undefined) s.squatLockSymmetric = true;

let item = data.workoutQueue.find(x => x.actionId === 'act_squat_wall' && x.status !== 'done');
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

const isRunning = (item.status === 'running');
const targetSec = item.targetSeconds || 60;
const targetSets = item.targetSets || 3;

// 负重文字徽章描述
let loadBadgeDesc = '';
if (s.squatDefaultMode === 'bodyweight') {
    loadBadgeDesc = '🟢 徒手自重 (0kg)';
} else if (s.squatDefaultMode === 'single') {
    loadBadgeDesc = `🟠 单物负重: ${s.squatItemDesc || '重物'} ${s.squatSingleWeight}kg`;
} else {
    const isSymm = (s.squatLeftWeight === s.squatRightWeight);
    const totalW = (parseFloat(s.squatLeftWeight) + parseFloat(s.squatRightWeight)).toFixed(1);
    if (isSymm) {
        loadBadgeDesc = `🔴 双物负重: 左右大腿各 ${s.squatLeftWeight}kg ${s.squatItemDesc} (共${totalW}kg)`;
    } else {
        loadBadgeDesc = `⚡ 非对称双负重: 左 ${s.squatLeftWeight}kg / 右 ${s.squatRightWeight}kg (共${totalW}kg)`;
    }
}

let timerDisplay = '01:00';
let phaseTitle = `🎯 计划 ${targetSets} 组 · 单组 ${targetSec}s (组间休60s)`;

if (isRunning && item.startTime) {
    const elapsed = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
    const info = getSquatSchedulePhase(targetSec, targetSets, elapsed);
    const m = String(Math.floor(info.remInPhase / 60)).padStart(2, '0');
    const sSec = String(info.remInPhase % 60).padStart(2, '0');
    timerDisplay = `${m}:${sSec}`;
    phaseTitle = info.isWork
        ? `🦵 第 ${info.currentSet} / ${info.targetSets} 组 · 大腿水平90°持续做功`
        : `☕ 组间休息中 · 慢走抖腿 (还剩 ${info.remInPhase}s)`;
}

// 主操作按钮：首屏正中央
let mainActionBtnHtml = isRunning
    ? `<button class="btn btn-danger hero-main-action-btn" onclick="stopSquatWorkout(false)">⏹️ 提前收功并封存</button>`
    : `<button class="btn btn-success hero-main-action-btn" onclick="startSquatWorkout()">▶️ 开始靠墙静蹲</button>`;

// 下方可滚动参数配置区
let configPanelHtml = '';
if (!isRunning) {
    configPanelHtml = `
        <div class="squat-load-panel">
            <div class="squat-load-header">
                <span class="squat-load-title">⚖️ 负重与姿态配置 (后背平贴, 大腿与小腿约90°)</span>
                <span style="font-size:10.5px; color:var(--text-muted);">${loadBadgeDesc}</span>
            </div>

            <div class="param-chips" style="margin-bottom:6px;">
                <button type="button" class="preset-chip ${s.squatDefaultMode === 'bodyweight' ? 'active' : ''}" onclick="setSquatMode('bodyweight')">徒手自重</button>
                <button type="button" class="preset-chip ${s.squatDefaultMode === 'single' ? 'active' : ''}" onclick="setSquatMode('single')">单物负重(大米/单壶铃)</button>
                <button type="button" class="preset-chip ${s.squatDefaultMode === 'dual' ? 'active' : ''}" onclick="setSquatMode('dual')">双物负重(左右大腿根部各哑铃)</button>
            </div>

            ${s.squatDefaultMode === 'single' ? `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:4px; padding:5px 8px; margin-top:4px;">
                    <div class="row">
                        <div class="flex-2">
                            <label>物品名称</label>
                            <input type="text" value="${s.squatItemDesc || '大米'}" placeholder="例如: 大米袋 / 壶铃" onchange="updateSquatItemDesc(this.value)">
                        </div>
                        <div class="flex-1">
                            <label>重量 (kg)</label>
                            <input type="number" step="0.5" min="1" max="100" value="${s.squatSingleWeight}" onchange="updateSquatSingleWeight(this.value)">
                        </div>
                    </div>
                    <div class="weight-presets-chips">
                        <span style="font-size:10px; color:var(--text-dim); align-self:center;">快捷:</span>
                        ${[5, 10, 15, 20].map(w => `
                            <button type="button" class="preset-chip ${s.squatSingleWeight == w ? 'active' : ''}" onclick="updateSquatSingleWeight(${w})">${w}kg</button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            ${s.squatDefaultMode === 'dual' ? `
                <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.08); border-radius:4px; padding:5px 8px; margin-top:4px;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-size:10.5px; color:var(--cyan-accent); font-weight:bold;">双手各持负重置于左右大腿根部</span>
                        <label style="display:inline-flex; align-items:center; gap:3px; cursor:pointer; text-transform:none; font-size:10.5px; color:var(--amber-accent);">
                            <input type="checkbox" style="width:13px; height:13px;" ${s.squatLockSymmetric ? 'checked' : ''} onchange="toggleSquatSymmetric(this.checked)">
                            左右对称联动
                        </label>
                    </div>
                    <div class="row">
                        <div class="flex-1 weight-field-box">
                            <label>左大腿根部(kg)</label>
                            <input type="number" step="0.5" min="0.5" max="60" value="${s.squatLeftWeight}" onchange="updateSquatLeftWeight(this.value)">
                        </div>
                        <div class="flex-1 weight-field-box">
                            <label>右大腿根部(kg)</label>
                            <input type="number" step="0.5" min="0.5" max="60" value="${s.squatRightWeight}" ${s.squatLockSymmetric ? 'disabled style="opacity:0.6;"' : ''} onchange="updateSquatRightWeight(this.value)">
                        </div>
                        <div class="flex-1">
                            <label>物品名</label>
                            <input type="text" value="${s.squatItemDesc || '哑铃'}" onchange="updateSquatItemDesc(this.value)">
                        </div>
                    </div>
                    <div class="weight-presets-chips">
                        <span style="font-size:10px; color:var(--text-dim); align-self:center;">单侧预设:</span>
                        ${[2.5, 5.0, 7.5, 10.0, 15.0].map(w => `
                            <button type="button" class="preset-chip ${s.squatLeftWeight == w ? 'active' : ''}" onclick="updateSquatDualPreset(${w})">${w}kg</button>
                        `).join('')}
                    </div>
                </div>
            ` : ''}

            <!-- 时长与组数调整 -->
            <div style="border-top:1px dashed rgba(255,255,255,0.1); padding-top:6px; margin-top:6px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:6px;">
                <div style="display:flex; align-items:center; gap:4px;">
                    <span style="font-size:11px; color:var(--text-muted);">单组:</span>
                    ${[30, 45, 60, 90].map(sec => `
                        <button type="button" class="preset-chip ${item.targetSeconds === sec ? 'active' : ''}" onclick="setSquatSeconds(`${sec}`)">${sec}s</button>
                    `).join('')}
                </div>
                <div style="display:flex; align-items:center; gap:4px;">
                    <span style="font-size:11px; color:var(--amber-accent);">组数:</span>
                    ${[1, 2, 3, 4, 5].map(cnt => `
                        <button type="button" class="preset-chip ${item.targetSets === cnt ? 'active' : ''}" onclick="setSquatSets(`${cnt}`)">${cnt}组</button>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

container.innerHTML = `
    <div class="cyber-card" style="border-color:var(--orange-primary); text-align:center;">
        <!-- 首屏中置主战区：无需下滑即可直接看到并点击开始 -->
        <div class="zero-scroll-hero">
            <div style="font-size:1.8rem; line-height:1;">🧱</div>
            <h2 style="font-family:var(--font-tech); color:var(--orange-primary); font-size:1.3rem; margin:2px 0;">靠墙静蹲 · 深度破糖</h2>
            <div class="hero-sub-status" id="squatPhaseSubTitle" style="color:var(--cyan-accent);">${phaseTitle}</div>
            <div class="hero-clock-display" id="squatTimerDisplay" style="color:var(--orange-primary); text-shadow:0 0 20px rgba(255,122,0,0.5);">${timerDisplay}</div>
            ${mainActionBtnHtml}
        </div>

        <!-- 次级参数与负重设置（首屏下方，上下滚动修改） -->
        <div class="secondary-settings-scroll">
            ${configPanelHtml}
        </div>
    </div>
`;

if (squatTimerInterval) clearInterval(squatTimerInterval);
if (isRunning) {
    squatTimerInterval = setInterval(() => {
        const el = document.getElementById('squatTimerDisplay');
        const subEl = document.getElementById('squatPhaseSubTitle');
        if (!el || !item.startTime) return;

        const elapsed = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
        const info = getSquatSchedulePhase(targetSec, targetSets, elapsed);

        if (info.isDone) {
            clearInterval(squatTimerInterval);
            squatTimerInterval = null;
            el.textContent = "00:00";
            stopSquatWorkout(true);
            return;
        }

        // 语音播报阶段切换
        if (!quickActionSpokenCues.has(info.phaseKey)) {
            quickActionSpokenCues.add(info.phaseKey);
            if (info.isWork) {
                speakFast(`第${info.currentSet}组静蹲开始，背贴墙大腿水平90度，坚持${targetSec}秒！`);
            } else {
                speakFast(`第${info.currentSet}组完成！组间休息1分钟，慢走抖腿。`);
            }
        }

        if (!info.isWork && info.remInPhase === 5 && !quickActionSpokenCues.has(`warn_rest_${info.currentSet}`)) {
            quickActionSpokenCues.add(`warn_rest_${info.currentSet}`);
            speakFast('还有5秒，靠墙就位，准备下一组！');
        }

        if (info.isWork && info.remInPhase <= 3 && info.remInPhase > 0 && !quickActionSpokenCues.has(`work_count_${info.currentSet}_${info.remInPhase}`)) {
            quickActionSpokenCues.add(`work_count_${info.currentSet}_${info.remInPhase}`);
            speakFast(String(info.remInPhase));
        }

        const m = String(Math.floor(info.remInPhase / 60)).padStart(2, '0');
        const sSec = String(info.remInPhase % 60).padStart(2, '0');
        el.textContent = `${m}:${sSec}`;

        if (subEl) {
            subEl.innerHTML = info.isWork
                ? `<span style="color:var(--green-accent); font-weight:bold;">🦵 第 ${info.currentSet} / ${info.targetSets} 组 · 等长收缩坚持中</span>`
                : `<span style="color:var(--amber-accent); font-weight:bold;">☕ 组间休息中 · 1分钟休整 (还剩 ${info.remInPhase}s)</span>`;
        }
    }, 1000);
}
}
// 调度计算函数
function getSquatSchedulePhase(targetSec, targetSets, elapsedSec) {
const restSec = 60;
const totalScheduleSec = (targetSets - 1) * (targetSec + restSec) + targetSec;
if (elapsedSec >= totalScheduleSec) return { isDone: true, totalScheduleSec };
let accum = 0;
for (let k = 1; k <= targetSets; k++) {
    const workEnd = accum + targetSec;
    if (elapsedSec < workEnd) {
        return {
            isDone: false,
            isWork: true,
            currentSet: k,
            targetSets: targetSets,
            remInPhase: workEnd - elapsedSec,
            phaseDuration: targetSec,
            phaseKey: `squat_work_${k}`
        };
    }
    accum = workEnd;

    if (k < targetSets) {
        const restEnd = accum + restSec;
        if (elapsedSec < restEnd) {
            return {
                isDone: false,
                isWork: false,
                currentSet: k,
                targetSets: targetSets,
                remInPhase: restEnd - elapsedSec,
                phaseDuration: restSec,
                phaseKey: `squat_rest_${k}`
            };
        }
        accum = restEnd;
    }
}
return { isDone: true, totalScheduleSec };
}
// 静蹲参数调节 API
window.setSquatMode = function(mode) {
data.settings.squatDefaultMode = mode;
saveData();
renderSquatDeckPanel();
};
window.setSquatSeconds = function(sec) {
let item = data.workoutQueue.find(x => x.actionId === 'act_squat_wall' && x.status !== 'done');
if (item && item.status !== 'running') {
item.targetSeconds = parseInt(sec) || 60;
item.reps = `${item.targetSeconds}s`;
item.total = item.targetSeconds * (item.targetSets || 3);
saveData();
renderSquatDeckPanel();
}
};
window.setSquatSets = function(sets) {
let item = data.workoutQueue.find(x => x.actionId === 'act_squat_wall' && x.status !== 'done');
if (item && item.status !== 'running') {
item.targetSets = parseInt(sets) || 3;
item.sets = item.targetSets;
item.total = (item.targetSeconds || 60) * item.targetSets;
saveData();
renderSquatDeckPanel();
}
};
window.updateSquatItemDesc = function(val) {
data.settings.squatItemDesc = val.trim();
saveData();
};
window.updateSquatSingleWeight = function(w) {
data.settings.squatSingleWeight = parseFloat(w) || 10.0;
saveData();
renderSquatDeckPanel();
};
window.toggleSquatSymmetric = function(checked) {
data.settings.squatLockSymmetric = checked;
if (checked) {
data.settings.squatRightWeight = data.settings.squatLeftWeight;
}
saveData();
renderSquatDeckPanel();
};
window.updateSquatLeftWeight = function(w) {
const val = parseFloat(w) || 5.0;
data.settings.squatLeftWeight = val;
if (data.settings.squatLockSymmetric) {
data.settings.squatRightWeight = val;
}
saveData();
renderSquatDeckPanel();
};
window.updateSquatRightWeight = function(w) {
data.settings.squatRightWeight = parseFloat(w) || 5.0;
saveData();
renderSquatDeckPanel();
};
window.updateSquatDualPreset = function(w) {
data.settings.squatLeftWeight = w;
data.settings.squatRightWeight = w;
saveData();
renderSquatDeckPanel();
};
function startSquatWorkout() {
let item = data.workoutQueue.find(x => x.actionId === 'act_squat_wall' && x.status !== 'done');
if (!item) return;
item.status = 'running';
item.startTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();
item.endTime = '';
item.durationMin = 0;

quickActionSpokenCues.clear();
saveData();
renderSquatDeckPanel();

const sec = item.targetSeconds || 60;
const sets = item.targetSets || 3;
speakFast(`开始靠墙静蹲，共${sets}组，每组${sec}秒，组间休息1分钟。听令而动！`);
showToast(`🚀 靠墙静蹲开始：${sets} 组 × ${sec} 秒`);
}
function stopSquatWorkout(isAuto) {
if (squatTimerInterval) {
clearInterval(squatTimerInterval);
squatTimerInterval = null;
}
let item = data.workoutQueue.find(x => x.actionId === 'act_squat_wall' && x.status !== 'done');
if (!item) return;

item.status = 'done';
item.endTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();

const sec = item.targetSeconds || 60;
const sets = item.targetSets || 3;
item.sets = sets;
item.total = sec * sets;
item.reps = Array(sets).fill(`${sec}s`).join(',');

if (item.startTime) {
    const s = new Date(item.startTime).getTime();
    const e = new Date(item.endTime).getTime();
    item.durationMin = Math.max(1, Math.round((e - s) / (1000 * 60)));
} else {
    item.durationMin = Math.max(1, Math.round(((sets - 1) * 60 + item.total) / 60));
}

// ★ 关键：在保存记录时清晰标注每一种模式与负重细节
const s = data.settings;
let loadNote = '';
if (s.squatDefaultMode === 'bodyweight') {
    loadNote = '【徒手自重 0kg】';
} else if (s.squatDefaultMode === 'single') {
    loadNote = `【单物负重(${s.squatItemDesc || '重物'}): ${s.squatSingleWeight}kg】`;
} else {
    const isSymm = (s.squatLeftWeight === s.squatRightWeight);
    const totalW = (parseFloat(s.squatLeftWeight) + parseFloat(s.squatRightWeight)).toFixed(1);
    if (isSymm) {
        loadNote = `【双哑铃负重(${s.squatItemDesc || '哑铃'}): 左右大腿根部各${s.squatLeftWeight}kg, 合计${totalW}kg】`;
    } else {
        loadNote = `【双物非对称(${s.squatItemDesc || '哑铃'}): 左大腿根部${s.squatLeftWeight}kg, 右大腿根部${s.squatRightWeight}kg, 合计${totalW}kg】`;
    }
}

item.note = `靠墙静蹲做功${loadNote}：完成 ${sets} 组 × ${sec} 秒（组间休60s），等长收缩做功 ${item.total} 秒。`;

if (typeof autoCommitLogEntry === 'function') {
    autoCommitLogEntry(item);
}
data.workoutQueue = data.workoutQueue.filter(x => x.id !== item.id);
saveData();
renderSquatDeckPanel();
if (typeof renderAll === 'function') renderAll();

if (isAuto) {
    speakFast(`恭喜！靠墙静蹲${sets}组全部圆满收功，战功已自动封存入册！`);
    showToast(`🎉 靠墙静蹲（${sets}组·${item.total}s）已自动封存！`);
} else {
    speakFast('靠墙静蹲收功，已成功入册！');
    showToast('✅ 靠墙静蹲已入册！');
}
}