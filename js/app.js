// ================================================================
//  app.js: 全局启动总控、数据自愈、字号初始化与事件监听
// ================================================================

function setupTabs() {
    // 基础选项卡点击由 quick-action 动态渲染统一托管
}

function switchTab(t) {
    if (typeof hideHudTooltip === 'function') hideHudTooltip();

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    const targetBtn = document.querySelector(`.tab-btn[data-tab="${t}"]`);
    if (targetBtn) targetBtn.classList.add('active');

    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    const targetContent = document.getElementById(t);
    if (targetContent) targetContent.classList.add('active');

    document.body.classList.toggle('diary-wide', t === 'diary');

    try {
        if (t === 'analysis' && typeof refreshPromptData === 'function') refreshPromptData();
        if (t === 'workout_deck' && typeof renderWorkoutQueue === 'function') renderWorkoutQueue();
        if (t === 'action_quick' && typeof renderActionQuickPanel === 'function') renderActionQuickPanel();
        if (t === 'stretch_timer' && typeof resetStretchDisplayUI === 'function') resetStretchDisplayUI();
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
                data = {
                    settings: { ...data.settings, ...(parsed.settings || {}) },
                    masterPlan: { ...data.masterPlan, ...(parsed.masterPlan || {}) },
                    customParamCache: parsed.customParamCache || {},
                    presetPlans: parsed.presetPlans || data.presetPlans,
                    activePlanIndex: parsed.activePlanIndex || 0,
                    workoutQueue: parsed.workoutQueue || [],
                    knowledge: parsed.knowledge || [],
                    logs: parsed.logs || [],
                    aiReports: parsed.aiReports || [],
                    diaries: parsed.diaries || [],
                    arsenal: parsed.arsenal || null
                };

                // 数据自愈升级：平滑规范化离心与压腿参数
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
                // 旧的单一“换边间隔”键退役：左右脚间隔与组间间隔分开，默认 10s / 20s
                delete data.settings.stretchSwitchRestSec;
                if (data.settings.stretchSwapRestSec === undefined) {
                    data.settings.stretchSwapRestSec = 10;
                }
                if (data.settings.stretchSetRestSec === undefined) {
                    data.settings.stretchSetRestSec = 20;
                }

                if (Array.isArray(data.workoutQueue)) {
                    data.workoutQueue.forEach(item => {
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

        // 清理旧空行
        if (typeof migrateBlankLinesInData === 'function') migrateBlankLinesInData();

        saveData();
        renderAll();

        // 顶栏标签构建
        if (typeof renderTopTabs === 'function') renderTopTabs();

        // 字号初始化：默认注入大字号 (+4)，解决偏小问题
        const savedDelta = localStorage.getItem('user_font_delta_pref');
        if (typeof applyFontDelta === 'function') {
            applyFontDelta(savedDelta !== null ? parseFloat(savedDelta) : 4);
        }

        if (typeof startPoliceRealtimeClock === 'function') startPoliceRealtimeClock();
        if (typeof initTacticalHudTooltips === 'function') initTacticalHudTooltips();
        if (typeof renderAiReportList === 'function') renderAiReportList();
        if (typeof renderDutyStatus === 'function') renderDutyStatus();

        // 默认定位到慢跑巡航
        switchTab('action_quick');

        // 数据载入后再同步压腿参数（组数/左右脚间隔/组间间隔）
        if (typeof resetStretchDisplayUI === 'function') resetStretchDisplayUI();

    } catch (err) {
        console.error('App 初始化严重故障:', err);
    }
}

document.addEventListener('DOMContentLoaded', init);