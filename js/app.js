// ================================================================
//  app.js: 全局应用总调度入口
// ================================================================

function switchTab(tabId) {
    if (typeof hideHudTooltip === 'function') hideHudTooltip();

    // 更新按钮高亮
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabId);
    });

    // 切换内容区域
    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.remove('active');
    });

    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');

    // 日记标签页宽屏自适应
    document.body.classList.toggle('diary-wide', tabId === 'diary');

    // 页面特定刷新
    if (tabId === 'workout_deck' && typeof renderWorkoutQueue === 'function') renderWorkoutQueue();
    if (tabId === 'action_quick' && typeof renderActionQuickPanel === 'function') renderActionQuickPanel();
    if (tabId === 'analysis' && typeof refreshPromptData === 'function') refreshPromptData();
    if (tabId === 'stretch_timer' && typeof renderStretchSettings === 'function') renderStretchSettings();

    const deck = document.getElementById('leftDeckPane');
    if (deck) deck.scrollTop = 0;
}

function renderAll() {
    if (typeof renderArsenalPicker === 'function') renderArsenalPicker();
    if (typeof renderPresetPlanBar === 'function') renderPresetPlanBar();
    if (typeof renderWorkoutQueue === 'function') renderWorkoutQueue();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderLogs === 'function') renderLogs();
    if (typeof renderKnowledge === 'function') renderKnowledge();
    if (typeof renderSettings === 'function') renderSettings();
    if (typeof normalizeDiarySources === 'function') normalizeDiarySources();
    if (typeof renderDiaryList === 'function') renderDiaryList();
    if (typeof renderDutyStatus === 'function') renderDutyStatus();
}

async function init() {
    try {
        if (typeof initDexieStorage === 'function') initDexieStorage();

        // 载入 LocalStorage 数据并与状态模板合并
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

                // 确保核心默认值存在
                if (!data.settings.eccentricDefaultSets) data.settings.eccentricDefaultSets = 10;
                if (!data.settings.stretchDefaultDuration) data.settings.stretchDefaultDuration = 60;
                if (!data.settings.stretchRestDuration) data.settings.stretchRestDuration = 30;

            } catch (e) {
                console.error('配置载入异常，采用基线配置', e);
            }
        }

        if (typeof migrateBlankLinesInData === 'function') migrateBlankLinesInData();
        saveData();

        renderAll();
        if (typeof renderTopTabs === 'function') renderTopTabs();
        if (typeof applyReadingTypography === 'function') applyReadingTypography();

        // 应用用户字号偏好，默认使用 锻炼计划.html 的大字体视觉
        const savedDelta = localStorage.getItem('user_font_delta_pref');
        if (typeof applyFontDelta === 'function') {
            applyFontDelta(savedDelta !== null ? parseFloat(savedDelta) : 4);
        }

        if (typeof startPoliceRealtimeClock === 'function') startPoliceRealtimeClock();
        if (typeof initHeroViewer === 'function') await initHeroViewer();
        if (typeof initTacticalHudTooltips === 'function') initTacticalHudTooltips();
        if (typeof applyPresetRange === 'function') applyPresetRange(7);
        if (typeof renderAiReportList === 'function') renderAiReportList();
        if (typeof renderDutyStatus === 'function') renderDutyStatus();

    } catch (err) {
        console.error('初始化发生异常:', err);
    }
}

window.addEventListener('beforeunload', () => {
    try {
        if (typeof workbenchAutosaveNow === 'function') workbenchAutosaveNow();
    } catch (e) {}
});

document.addEventListener('DOMContentLoaded', init);