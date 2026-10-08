// ================================================================
//  app.js: 全局启动总控、数据自愈、字号初始化与事件监听
// ================================================================

function setupTabs() {
    // 基础选项卡点击由 quick-action 动态渲染统一托管
}

function switchTab(t) {
    if (typeof hideHudTooltip === 'function') hideHudTooltip();

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const targetBtn = document.querySelector('.tab-btn[data-tab="' + t + '"]');
    if (targetBtn) targetBtn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const targetContent = document.getElementById(t);
    if (targetContent) targetContent.classList.add('active');

    document.body.classList.toggle('diary-wide', t === 'diary');

    try {
        if (t === 'analysis' && typeof refreshPromptData === 'function') refreshPromptData();
        if (t === 'workout_deck' && typeof renderWorkoutQueue === 'function') renderWorkoutQueue();
        if (t === 'action_quick' && typeof renderActionQuickPanel === 'function') renderActionQuickPanel();
        if (t === 'squat_deck' && typeof renderSquatDeckPanel === 'function') renderSquatDeckPanel();
        if (t === 'chest_deck' && typeof renderChestDeckPanel === 'function') renderChestDeckPanel();
        if (t === 'stretch_timer' && typeof resetStretchDisplayUI === 'function') resetStretchDisplayUI();
        if (t === 'hang_timer' && typeof switchHangVariant === 'function') switchHangVariant(data.settings.hangDefaultVariant || 'hang');
    } catch (e) {
        console.error('switchTab dispatch error:', e);
    }

    const d = document.getElementById('leftDeckPane');
    if (d) d.scrollTop = 0;
}

function renderAll() {
    try {
        if (typeof renderArsenalPicker === 'function') renderArsenalPicker();
        if (typeof renderPresetPlanBar === 'function') renderPresetPlanBar();
        if (typeof renderWorkoutQueue === 'function') renderWorkoutQueue();
        if (typeof renderActionQuickPanel === 'function') renderActionQuickPanel();
        if (typeof renderSquatDeckPanel === 'function') renderSquatDeckPanel();
        if (typeof renderChestDeckPanel === 'function') renderChestDeckPanel();
        if (typeof renderDashboard === 'function') renderDashboard();
        if (typeof renderLogs === 'function') renderLogs();
        if (typeof renderKnowledge === 'function') renderKnowledge();
        if (typeof renderSettings === 'function') renderSettings();
        if (typeof normalizeDiarySources === 'function') normalizeDiarySources();
        if (typeof renderDiaryList === 'function') renderDiaryList();
        if (typeof renderDutyStatus === 'function') renderDutyStatus();
    } catch (e) {
        console.error('renderAll error:', e);
    }
}

async function init() {
    try {
        if (typeof initDexieStorage === 'function') initDexieStorage();

        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                data.settings = Object.assign({}, data.settings, parsed.settings || {});
                data.masterPlan = Object.assign({}, data.masterPlan, parsed.masterPlan || {});
                data.customParamCache = parsed.customParamCache || {};
                data.presetPlans = parsed.presetPlans || data.presetPlans;
                data.activePlanIndex = parsed.activePlanIndex || 0;
                data.workoutQueue = parsed.workoutQueue || [];
                data.knowledge = parsed.knowledge || [];
                data.logs = parsed.logs || [];
                data.aiReports = parsed.aiReports || [];
                data.diaries = parsed.diaries || [];
                data.arsenal = parsed.arsenal || null;

                // 提前量默认值自愈
                if (data.settings.prepDefaultDuration === undefined) data.settings.prepDefaultDuration = 10;
                if (data.settings.jogPrepSec === undefined) data.settings.jogPrepSec = 10;
                if (data.settings.squatPrepSec === undefined) data.settings.squatPrepSec = 10;
                if (data.settings.chestPrepSec === undefined) data.settings.chestPrepSec = 10;
                if (data.settings.stretchPrepDuration === undefined) data.settings.stretchPrepDuration = 10;

                // 墙角扩胸自愈
                if (data.settings.chestDefaultSets === undefined) data.settings.chestDefaultSets = 3;
                if (data.settings.chestDefaultSec === undefined) data.settings.chestDefaultSec = 30;
                if (data.settings.chestRestSec === undefined) data.settings.chestRestSec = 15;

                // 规范化离心与压腿参数
                if (data.settings.eccentricDefaultReps === undefined || data.settings.eccentricDefaultReps === 8) {
                    data.settings.eccentricDefaultReps = 10;
                }
                if (!data.settings.eccentricDefaultSets) {
                    data.settings.eccentricDefaultSets = 2;
                }
                if (!data.settings.stretchDefaultSets) {
                    data.settings.stretchDefaultSets = 2;
                }
                if (!data.settings.stretchDefaultDuration) {
                    data.settings.stretchDefaultDuration = 60;
                }
                delete data.settings.stretchSwitchRestSec;
                if (data.settings.stretchSwapRestSec === undefined) {
                    data.settings.stretchSwapRestSec = 10;
                }
                if (data.settings.stretchSetRestSec === undefined) {
                    data.settings.stretchSetRestSec = 20;
                }

                // 悬挂自愈
                if (!data.settings.hangDefaultVariant) {
                    data.settings.hangDefaultVariant = 'hang';
                }

                // 靠墙静蹲自愈
                if (!data.settings.squatDefaultMode) data.settings.squatDefaultMode = 'bodyweight';
                if (data.settings.squatSingleWeight === undefined) data.settings.squatSingleWeight = 10.0;
                if (data.settings.squatLeftWeight === undefined) data.settings.squatLeftWeight = 5.0;
                if (data.settings.squatRightWeight === undefined) data.settings.squatRightWeight = 5.0;
                if (!data.settings.squatItemDesc) data.settings.squatItemDesc = '哑铃';
                if (data.settings.squatLockSymmetric === undefined) data.settings.squatLockSymmetric = true;

                // 清理队列中卡在 running 状态的僵尸项
                if (Array.isArray(data.workoutQueue)) {
                    data.workoutQueue.forEach(function (item) {
                        if (item.status === 'running') {
                            item.status = 'idle';
                            item.startTime = '';
                            item.endTime = '';
                        }
                    });
                }
            } catch (e) {
                console.error('配置恢复异常，使用基准方案', e);
            }
        }

        if (typeof migrateBlankLinesInData === 'function') migrateBlankLinesInData();

        saveData();
        renderAll();

        // 顶栏标签构建
        if (typeof renderTopTabs === 'function') renderTopTabs();

        // 移动端字号初始化：默认注入大字号 (+4)
        const savedDelta = localStorage.getItem('user_font_delta_pref');
        if (typeof applyFontDelta === 'function') {
            applyFontDelta(savedDelta !== null ? parseFloat(savedDelta) : 4);
        }

        // 启动战备授时与提示
        if (typeof startPoliceRealtimeClock === 'function') startPoliceRealtimeClock();
        if (typeof initTacticalHudTooltips === 'function') initTacticalHudTooltips();
        if (typeof renderAiReportList === 'function') renderAiReportList();
        if (typeof renderDutyStatus === 'function') renderDutyStatus();

        // 默认进入靠墙静蹲战位
        switchTab('squat_deck');

        if (typeof resetStretchDisplayUI === 'function') resetStretchDisplayUI();
        if (typeof switchHangVariant === 'function') switchHangVariant(data.settings.hangDefaultVariant || 'hang');

    } catch (err) {
        console.error('App 初始化故障:', err);
    }
}

document.addEventListener('DOMContentLoaded', init);