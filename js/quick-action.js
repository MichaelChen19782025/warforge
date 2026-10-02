// ================================================================
//  quick-action.js: 顶栏标签排序控制 + 慢跑巡航
// ================================================================

let currentQuickActionId = 'act_jog_glyco';
let quickTimerInterval = null;

// 动态排布顶栏导航按钮
function renderTopTabs() {
    const bar = document.getElementById('topTabsBar');
    if (!bar) return;

    const currentActive = document.querySelector('.tab-btn.active');
    const activeTab = currentActive ? currentActive.dataset.tab : 'workout_deck';

    const tabs = [
        { id: 'action_quick', label: '🏃 慢跑', tip: '【慢跑巡航】：餐后平抑血糖，设定目标倒计时，时间到自动入册！' },
        { id: 'stretch_timer', label: '🧘 压腿', tip: '【压腿舒筋】：全程逐秒读秒，单侧时长与中间休整间隔自由调谐并自动记忆！' },
        { id: 'timer', label: '🔥 离心慢放', tip: '【离心慢放】：盲听提前200ms报号，默认10次，改动自动记忆。' },
        { id: 'hang_timer', label: '🦇 引体', tip: '【天罡引体】：全程每秒朗读报数，拍击大圆盘结算战报。' },
        { id: 'workout_deck', label: '⚔️ 即时出征台', tip: '【即时出征台】：管理 5 套战术预设与自选出征队列。' },
        { id: 'dashboard', label: '🧬 气血中枢', tip: '【气血中枢】：全局宏观做功与连续周天动态。' },
        { id: 'log', label: '🥋 淬体实录', tip: '【淬体实录】：历史明细矩阵与 CSV 导出。' },
        { id: 'analysis', label: '⚡ 易筋推演', tip: '【易筋推演】：AI 深度推演 Prompt 生成器。' },
        { id: 'diary', label: '📖 淬体日记', tip: '【淬体随笔】：AI 精修与意群成卡录。' },
        { id: 'knowledge', label: '📜 真武秘卷', tip: '【真武秘卷】：降糖心法与眼底微血管保护。' },
        { id: 'settings', label: '⚙️ 灵枢配置', tip: '【灵枢配置】：排班锚点与道体档案。' }
    ];

    bar.innerHTML = tabs.map(t => {
        const isActive = activeTab === t.id;
        return `<button class="tab-btn ${isActive ? 'active' : ''}" data-tab="${t.id}" data-hud-tip="${t.tip}">${t.label}</button>`;
    }).join('');

    bar.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchTab(this.dataset.tab);
        });
    });
}

// 渲染慢跑巡航面板
function renderActionQuickPanel() {
    const container = document.getElementById('actionQuickContainer');
    if (!container) return;

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
    const isRunning = item.status === 'running';

    let timerDisplay = `${String(item.targetMinutes).padStart(2, '0')}:00`;
    let phaseTitle = `🎯 设定目标 ${item.targetMinutes} 分钟 (时间到自动封存入册)`;

    if (isRunning && item.startTime) {
        const elapsed = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
        const remSec = Math.max(0, (item.targetMinutes * 60) - elapsed);
        const m = String(Math.floor(remSec / 60)).padStart(2, '0');
        const s = String(remSec % 60).padStart(2, '0');
        timerDisplay = `${m}:${s}`;
        phaseTitle = '⚡ 慢跑巡航中 · 骨骼肌GLUT4激活燃糖';
    }

    const presetMins = [15, 20, 25, 30, 40, 60];
    const presetsHtml = `
        <div style="display:flex; justify-content:center; gap:6px; flex-wrap:wrap; margin: 8px 0 12px 0;">
            ${presetMins.map(m => `
                <button type="button" class="preset-chip ${item.targetMinutes === m ? 'active' : ''}"
                        onclick="setQuickJogMinutes(`${m}`)">${m}分钟</button>
            `).join('')}
        </div>
    `;

    container.innerHTML = `
        <div class="cyber-card compact-tool-card" style="border-color:var(--cyan-accent);">
            <div class="tool-emblem-badge" style="color:var(--cyan-accent);">🏃</div>
            <h2 style="font-family:var(--font-tech); color:var(--orange-primary); font-size:1.6rem; letter-spacing:1px; margin-bottom:4px;">餐后慢跑巡航</h2>
            <p style="color:var(--text-muted); font-size:12.5px; margin-bottom:6px;">平抑餐后血糖尖峰，时间到自动封存入册</p>

            ${!isRunning ? presetsHtml : ''}

            <div id="quickTimerDisplay" class="mega-clock" style="color:var(--cyan-accent); margin:10px 0 8px 0;">
                ${timerDisplay}
            </div>

            <div id="quickTimerSubPhase" style="font-family:var(--font-mono); font-size:14px; color:var(--green-accent); min-height:22px; margin-bottom:12px;">
                ${phaseTitle}
            </div>

            <div class="compact-control-bar">
                ${isRunning ? `
                    <button class="btn btn-danger" style="font-size:16px; padding:12px 34px;" onclick="stopQuickJog(false)">
                        ⏹️ 提前收功并封存
                    </button>
                ` : `
                    <button class="btn btn-success" style="font-size:16px; padding:12px 38px;" onclick="startQuickJog()">
                        ▶️ 开始慢跑倒计时
                    </button>
                `}
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
    item.startTime = getFullTimestamp();
    item.endTime = '';
    item.durationMin = 0;

    saveData();
    renderActionQuickPanel();

    if (typeof speakFast === 'function') {
        speakFast(`慢跑倒计时开始，设定${item.targetMinutes}分钟，保持平稳呼吸！`);
    }
    showToast(`🚀 慢跑开始：${item.targetMinutes} 分钟倒计时`);
}

function stopQuickJog(isAuto = false) {
    if (quickTimerInterval) clearInterval(quickTimerInterval);

    let item = data.workoutQueue.find(x => x.actionId === 'act_jog_glyco' && x.status === 'running');
    if (!item) return;

    item.status = 'done';
    item.endTime = getFullTimestamp();

    if (item.startTime) {
        const s = new Date(item.startTime).getTime();
        const e = new Date(item.endTime).getTime();
        item.durationMin = Math.max(1, Math.round((e - s) / (1000 * 60)));
    } else {
        item.durationMin = item.targetMinutes || 25;
    }

    item.total = item.durationMin;
    item.reps = `${item.durationMin}min`;

    autoCommitLogEntry(item);
    data.workoutQueue = data.workoutQueue.filter(x => x.id !== item.id);
    saveData();
    renderActionQuickPanel();
    renderAll();

    if (isAuto) {
        if (typeof speakFast === 'function') speakFast(`恭喜！预定${item.durationMin}分钟慢跑圆满完成，已自动入册！`);
        showToast(`🎉 慢跑时间到！已自动封存入册（${item.durationMin}分钟）`);
    } else {
        if (typeof speakFast === 'function') speakFast("慢跑收功，已成功入册！");
        showToast(`✅ 慢跑提前收功已入册（${item.durationMin}分钟）`);
    }
}