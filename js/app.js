// ================================================================
//  app.js: 全局启动总控、数据自愈、字号初始化、暗号同步与强刷引擎
// ================================================================

const APP_BUILD_VERSION = '20261008_V3';

function forceUpdateApp() {
    if (typeof hideHudTooltip === 'function') hideHudTooltip();
    try {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(regs) {
                regs.forEach(function(r) { r.unregister(); });
            });
        }
        if ('caches' in window) {
            caches.keys().then(function(keys) {
                keys.forEach(function(k) { caches.delete(k); });
            });
        }
    } catch (e) {
        console.warn('缓存清理错误:', e);
    }

    localStorage.removeItem('app_installed_version');
    const cleanUrl = window.location.href.split('?')[0] + '?_nocache=' + Date.now();
    window.location.replace(cleanUrl);
}
window.forceUpdateApp = forceUpdateApp;

function setupTabs() {}

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
        // Tab 路由时全面唤醒各子模块根据最新状态刷新控件
        if (t === 'universal_timer' && typeof renderUniversalTimerPanel === 'function') renderUniversalTimerPanel();
        if (t === 'exercise_codex' && typeof renderExerciseCodex === 'function') renderExerciseCodex();
        if (t === 'analysis' && typeof refreshPromptData === 'function') refreshPromptData();
        if (t === 'workout_deck' && typeof renderWorkoutQueue === 'function') renderWorkoutQueue();
        if (t === 'action_quick' && typeof renderActionQuickPanel === 'function') renderActionQuickPanel();
        if (t === 'squat_deck' && typeof renderSquatDeckPanel === 'function') renderSquatDeckPanel();
        if (t === 'chest_deck' && typeof renderChestDeckPanel === 'function') renderChestDeckPanel();
        if (t === 'stretch_timer' && typeof resetStretchDisplayUI === 'function') resetStretchDisplayUI();
        if (t === 'hang_timer' && typeof switchHangVariant === 'function') switchHangVariant(data.settings.hangDefaultVariant || 'hang');
        if (t === 'timer' && typeof syncTimerInputs === 'function') syncTimerInputs();
    } catch (e) {
        console.error('switchTab dispatch error:', e);
    }

    const d = document.getElementById('leftDeckPane');
    if (d) d.scrollTop = 0;
}

function renderAll() {
    try {
        if (typeof renderUniversalTimerPanel === 'function') renderUniversalTimerPanel();
        if (typeof renderExerciseCodex === 'function') renderExerciseCodex();
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
        if (typeof syncTimerInputs === 'function') syncTimerInputs();
    } catch (e) {
        console.error('renderAll error:', e);
    }
}

async function init() {
    try {
        if (typeof initDexieStorage === 'function') initDexieStorage();

        // 统一自愈：只在完全未定义时才补充出厂默认值，绝不强制覆盖用户已设参数
        const s = data.settings;
        if (s.jogDefaultMinutes === undefined) s.jogDefaultMinutes = 25;
        if (s.jogPrepSec === undefined) s.jogPrepSec = 10;
        if (s.squatDefaultMode === undefined) s.squatDefaultMode = 'bodyweight';
        if (s.squatDefaultSeconds === undefined) s.squatDefaultSeconds = 60;
        if (s.squatDefaultSets === undefined) s.squatDefaultSets = 3;
        if (s.squatRestSec === undefined) s.squatRestSec = 60;
        if (s.squatPrepSec === undefined) s.squatPrepSec = 10;
        if (s.squatSingleWeight === undefined) s.squatSingleWeight = 10.0;
        if (s.squatLeftWeight === undefined) s.squatLeftWeight = 5.0;
        if (s.squatRightWeight === undefined) s.squatRightWeight = 5.0;
        if (!s.squatItemDesc) s.squatItemDesc = '哑铃';
        if (s.squatLockSymmetric === undefined) s.squatLockSymmetric = true;
        if (s.chestDefaultSets === undefined) s.chestDefaultSets = 3;
        if (s.chestDefaultSec === undefined) s.chestDefaultSec = 30;
        if (s.chestRestSec === undefined) s.chestRestSec = 15;
        if (s.chestPrepSec === undefined) s.chestPrepSec = 10;
        if (s.eccentricDefaultReps === undefined) s.eccentricDefaultReps = 10;
        if (s.eccentricDefaultSets === undefined) s.eccentricDefaultSets = 2;
        if (s.eccentricDownSec === undefined) s.eccentricDownSec = 4.0;
        if (s.eccentricUpSec === undefined) s.eccentricUpSec = 1.0;
        if (s.eccentricRestSec === undefined) s.eccentricRestSec = 60;
        if (s.eccentricPrepSec === undefined) s.eccentricPrepSec = 10;
        if (s.stretchDefaultSets === undefined) s.stretchDefaultSets = 2;
        if (s.stretchDefaultDuration === undefined) s.stretchDefaultDuration = 60;
        if (s.stretchSwapRestSec === undefined) s.stretchSwapRestSec = 10;
        if (s.stretchSetRestSec === undefined) s.stretchSetRestSec = 20;
        if (s.stretchPrepDuration === undefined) s.stretchPrepDuration = 10;
        if (!s.hangDefaultVariant) s.hangDefaultVariant = 'hang';
        if (s.hangPrepDuration === undefined) s.hangPrepDuration = 10;
        if (s.hangCountdownTarget === undefined) s.hangCountdownTarget = 30;
        if (s.hangDefaultReps === undefined) s.hangDefaultReps = 8;
        if (!s.lastUniversalPresetId) s.lastUniversalPresetId = 'u_p_0';

        if (Array.isArray(data.workoutQueue)) {
            data.workoutQueue.forEach(function (item) {
                if (item.status === 'running') {
                    item.status = 'idle';
                    item.startTime = '';
                    item.endTime = '';
                }
            });
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

        // 默认直接进入万能倒计时战位
        switchTab('universal_timer');

        if (typeof resetStretchDisplayUI === 'function') resetStretchDisplayUI();
        if (typeof switchHangVariant === 'function') switchHangVariant(data.settings.hangDefaultVariant || 'hang');

        // 暗号版本检测：发现新版本提示
        const installedVer = localStorage.getItem('app_installed_version');
        if (installedVer !== APP_BUILD_VERSION) {
            localStorage.setItem('app_installed_version', APP_BUILD_VERSION);
            if (typeof showToast === 'function') {
                showToast('🚀 战阙程序已同步最新战令 (版本: ' + APP_BUILD_VERSION + ')', 3500);
            }
        }

    } catch (err) {
        console.error('App 初始化故障:', err);
    }
}

document.addEventListener('DOMContentLoaded', init);