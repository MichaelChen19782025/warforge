// ================================================================
//  quick-action.js: 顶栏标签排序控制 + 慢跑巡航（彻底消除嵌套反引号语法冲突）
// ================================================================

let currentQuickActionId = 'act_jog_glyco';
let quickTimerInterval = null;

// 严格按照要求的排兵布阵：慢跑(1) -> 压腿(2) -> 离心慢放(3) -> 引体(4) -> 其余
function renderTopTabs() {
    const bar = document.getElementById('topTabsBar');
    if (!bar) return;

    const currentActive = document.querySelector('.tab-btn.active');
    const activeTab = currentActive ? currentActive.dataset.tab : 'action_quick';

    const tabs = [
        { id: 'action_quick', label: '🏃 慢跑', tip: '【慢跑巡航】：餐后平抑血糖，设定目标倒计时！' },
        { id: 'stretch_timer', label: '🧘 压腿', tip: '【压腿舒筋】：柔韧拉伸，全程每秒读秒，支持倒计时/秒表正向读秒。' },
        { id: 'timer', label: '🔥 离心慢放', tip: '【离心慢放】：盲听提前250ms报号，默认10次，每次更改自动记忆。' },
        { id: 'hang_timer', label: '🦇 引体', tip: '【引体战阙】：标准/阔引体/极限悬挂，支持次数直录与全程每秒读秒。' },
        { id: 'workout_deck', label: '⚔️ 即时出征台', tip: '【即时出征台】：管理 5 套战术预设方案。' },
        { id: 'dashboard', label: '🧬 气血中枢', tip: '【气血中枢】：宏观做功与连续周天动态。' },
        { id: 'log', label: '🥋 淬体实录', tip: '【淬体实录】：历史明细矩阵与 CSV 导出。' },
        { id: 'analysis', label: '⚡ 易筋推演', tip: '【易筋推演】：AI 深度推演 Prompt 生成器。' },
        { id: 'diary', label: '📖 淬体日记', tip: '【淬体随笔】：AI 精修与图文战意录。' },
        { id: 'knowledge', label: '📜 真武秘卷', tip: '【真武秘卷】：降糖心法与眼底安全。' },
        { id: 'settings', label: '⚙️ 灵枢配置', tip: '【灵枢配置】：排班锚点与道体档案。' }
    ];

    bar.innerHTML = tabs.map(function (t) {
        const isActive = (activeTab === t.id);
        return '<button class="tab-btn ' + (isActive ? 'active' : '') + '" data-tab="' + t.id + '" data-hud-tip="' + t.tip + '">' + t.label + '</button>';
    }).join('');

    bar.querySelectorAll('.tab-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            switchTab(this.dataset.tab);
        });
    });
}

// 渲染慢跑操作面板（按键置顶靠上，普通字符串安全拼接，彻底消除语法解析错误）
function renderActionQuickPanel() {
    const container = document.getElementById('actionQuickContainer');
    if (!container) return;

    if (!window.data || !Array.isArray(data.workoutQueue)) {
        return;
    }

    let item = data.workoutQueue.find(function (x) {
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
    const isRunning = (item.status === 'running');

    let timerDisplay = String(item.targetMinutes).padStart(2, '0') + ':00';
    let phaseTitle = '🎯 设定目标 ' + item.targetMinutes + ' 分钟 (时间到自动入册)';

    if (isRunning && item.startTime) {
        const elapsed = Math.floor((Date.now() - new Date(item.startTime).getTime()) / 1000);
        const remSec = Math.max(0, (item.targetMinutes * 60) - elapsed);
        const m = String(Math.floor(remSec / 60)).padStart(2, '0');
        const s = String(remSec % 60).padStart(2, '0');
        timerDisplay = m + ':' + s;
        phaseTitle = '⚡ 慢跑巡航中 · 骨骼肌GLUT4激活';
    }

    const presetMins = [15, 20, 25, 30, 40, 60];
    let presetsHtml = '';
    if (!isRunning) {
        presetsHtml = '<div style="display:flex; justify-content:center; gap:8px; flex-wrap:wrap; margin: 8px 0 12px 0;">' +
            presetMins.map(function (m) {
                const activeClass = (item.targetMinutes === m) ? 'active' : '';
                return '<button type="button" class="preset-chip ' + activeClass + '" onclick="setQuickJogMinutes(' + m + ')">' + m + '分钟</button>';
            }).join('') +
            '</div>';
    }

    let ctrlBtnHtml = '';
    if (isRunning) {
        ctrlBtnHtml = '<button class="btn btn-danger" style="font-size:17px; padding:12px 34px;" onclick="stopQuickJog(false)">⏹️ 提前收功并封存</button>';
    } else {
        ctrlBtnHtml = '<button class="btn btn-success" style="font-size:18px; padding:12px 40px;" onclick="startQuickJog()">▶️ 开始慢跑倒计时</button>';
    }

    container.innerHTML =
        '<div class="cyber-card" style="border-color:var(--cyan-accent); text-align:center;">' +
            '<div style="font-size:3rem; margin-bottom:4px;">🏃</div>' +
            '<h2 style="font-family:var(--font-tech); color:var(--orange-primary); font-size:1.6rem;">餐后慢跑巡航</h2>' +
            '<p style="color:var(--text-muted); font-size:13px; margin-bottom:8px;">平抑餐后血糖尖峰，时间到自动封存入册</p>' +
            presetsHtml +
            '<div id="quickTimerDisplay" style="font-family:var(--font-mono); font-size:5rem; color:var(--cyan-accent); margin:6px 0 10px 0; line-height:1.1; text-shadow:0 0 25px rgba(0,229,255,0.5);">' +
                timerDisplay +
            '</div>' +
            '<div id="quickTimerSubPhase" style="font-family:var(--font-mono); font-size:14px; color:var(--green-accent); min-height:20px; margin-bottom:14px;">' +
                phaseTitle +
            '</div>' +
            '<div style="display:flex; justify-content:center; gap:12px;">' +
                ctrlBtnHtml +
            '</div>' +
        '</div>';

    if (quickTimerInterval) clearInterval(quickTimerInterval);
    if (isRunning) {
        quickTimerInterval = setInterval(function () {
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
            el.textContent = m + ':' + s;
        }, 1000);
    }
}

function setQuickJogMinutes(m) {
    let item = data.workoutQueue.find(function (x) {
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
    let item = data.workoutQueue.find(function (x) {
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

    item.status = 'running';
    item.startTime = (typeof getFullTimestamp === 'function') ? getFullTimestamp() : new Date().toISOString();
    item.endTime = '';
    item.durationMin = 0;

    saveData();
    renderActionQuickPanel();

    if (typeof speakFast === 'function') {
        speakFast('慢跑倒计时开始，设定' + item.targetMinutes + '分钟，保持平稳呼吸！');
    }
    if (typeof showToast === 'function') {
        showToast('🚀 慢跑开始：' + item.targetMinutes + ' 分钟倒计时');
    }
}

function stopQuickJog(isAuto) {
    if (quickTimerInterval) {
        clearInterval(quickTimerInterval);
        quickTimerInterval = null;
    }

    let item = data.workoutQueue.find(function (x) {
        return x.actionId === 'act_jog_glyco' && x.status === 'running';
    });
    if (!item) {
        item = data.workoutQueue.find(function (x) {
            return x.actionId === 'act_jog_glyco' && x.status !== 'done';
        });
    }
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

    if (isAuto && item.targetMinutes) {
        item.durationMin = item.targetMinutes;
    }

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
        if (typeof speakFast === 'function') {
            speakFast('恭喜！预定' + item.durationMin + '分钟慢跑圆满完成，已自动入册！');
        }
        if (typeof showToast === 'function') {
            showToast('🎉 慢跑时间到！已自动封存入册（' + item.durationMin + '分钟）');
        }
    } else {
        if (typeof speakFast === 'function') {
            speakFast('慢跑收功，已成功入册！');
        }
        if (typeof showToast === 'function') {
            showToast('✅ 慢跑提前收功已入册（' + item.durationMin + '分钟）');
        }
    }
}