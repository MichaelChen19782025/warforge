// ================================================================
//  app.js: 全息壁纸座舱（超清大图智能自适应/拖拽缩放/双击复位）、
//          全域标签路由与应用初始化总参
// ================================================================

let heroScale = 1.0,
    heroX = 0,
    heroY = 0,
    isDraggingHero = false,
    dragStartX = 0,
    dragStartY = 0;

// 当前壁纸的原始尺寸（用于计算智能比例）
let heroImgNaturalWidth = 0;
let heroImgNaturalHeight = 0;
let heroHasImage = false;

async function initHeroViewer() {
    heroScale = data.settings.heroScale || 1.0;
    heroX = data.settings.heroX || 0;
    heroY = data.settings.heroY || 0;

    await renderHeroVisual();

    const viewport = document.getElementById('mechaViewport');
    const dock = document.getElementById('rightMechaDock');

    if (viewport) {
        // 鼠标按下：开始平移拖拽
        viewport.addEventListener('mousedown', (e) => {
            isDraggingHero = true;
            dragStartX = e.clientX - heroX;
            dragStartY = e.clientY - heroY;
        });

        // 鼠标滚轮：动态平滑缩放
        viewport.addEventListener('wheel', (e) => {
            e.preventDefault();
            const delta = e.deltaY < 0 ? 0.08 : -0.08;
            zoomHero(delta);
        }, { passive: false });
    }

    // 全局拖动更新
    window.addEventListener('mousemove', (e) => {
        if (!isDraggingHero) return;
        heroX = e.clientX - dragStartX;
        heroY = e.clientY - dragStartY;
        applyHeroTransform();
    });

    // 释放拖动并落盘记忆
    window.addEventListener('mouseup', () => {
        if (isDraggingHero) {
            isDraggingHero = false;
            saveHeroTransform();
        }
    });

    // 拖拽本地文件直接投入视窗
    if (dock) {
        ['dragenter', 'dragover'].forEach(n => dock.addEventListener(n, (e) => {
            e.preventDefault();
            dock.classList.add('drag-hover');
        }));
        ['dragleave', 'drop'].forEach(n => dock.addEventListener(n, (e) => {
            e.preventDefault();
            dock.classList.remove('drag-hover');
        }));
        dock.addEventListener('drop', (e) => {
            if (e.dataTransfer.files?.length) processHeroImageFile(e.dataTransfer.files[0]);
        });
    }

    // 窗口尺寸改变时若未做深度位移，维持舒适视距
    window.addEventListener('resize', () => {
        if (heroHasImage && heroX === 0 && heroY === 0) {
            fitHeroToViewport();
        }
    });
}

// 核心渲染：从 Dexie 读取大图，获取真实宽高并按需智能适配
async function renderHeroVisual() {
    const wrapper = document.getElementById('mechaWrapper');
    if (!wrapper) return;

    const heroData = await getHeroImageFromDexie();
    if (heroData) {
        heroHasImage = true;
        const img = new Image();
        img.onload = () => {
            heroImgNaturalWidth = img.naturalWidth || 1920;
            heroImgNaturalHeight = img.naturalHeight || 1080;

            // 注入真实像素尺寸，让变换矩阵精准掌控
            wrapper.innerHTML = `<img class="mecha-rendered-image" src="${heroData}" alt="Hero Unit" style="width:${heroImgNaturalWidth}px; height:${heroImgNaturalHeight}px;">`;

            // 如果此前未保存过缩放或比例不合理，首次载入自动执行全貌适配
            if (!data.settings.heroScale || data.settings.heroScale === 1.0 || (heroX === 0 && heroY === 0)) {
                fitHeroToViewport();
            } else {
                applyHeroTransform();
            }
        };
        img.src = heroData;
    } else {
        heroHasImage = false;
        wrapper.innerHTML = `
            <div class="hologram-shield-core">
                <div class="ring-outer"></div><div class="ring-middle"></div><div class="ring-inner"></div>
                <div class="core-symbol">天罡<br>真武</div>
            </div>
        `;
        heroScale = 1.0;
        heroX = 0;
        heroY = 0;
        applyHeroTransform();
    }
}

function applyHeroTransform() {
    const wrapper = document.getElementById('mechaWrapper');
    if (wrapper) {
        wrapper.style.transform = `translate(${heroX}px, ${heroY}px) scale(${heroScale})`;
    }
}

// 智能自适应全貌 (Auto-Fit)
function fitHeroToViewport() {
    if (!heroHasImage || !heroImgNaturalWidth || !heroImgNaturalHeight) {
        resetHeroTransform();
        return;
    }

    const vp = document.getElementById('mechaViewport');
    const vpW = vp ? vp.clientWidth : 600;
    const vpH = vp ? vp.clientHeight : 800;

    // 舒适展示区：占视窗宽高的 88%
    const scaleX = (vpW * 0.88) / heroImgNaturalWidth;
    const scaleY = (vpH * 0.88) / heroImgNaturalHeight;

    // 取更紧凑的缩放比，确保整张图片无论横纵均能100%尽收眼底
    heroScale = Math.min(scaleX, scaleY);
    heroScale = Math.max(0.02, Math.min(3.0, heroScale));
    heroX = 0;
    heroY = 0;

    applyHeroTransform();
    saveHeroTransform();
    showToast(`🎯 已智能自适应全貌 (${Math.round(heroScale * 100)}%)`);
}

// 1:1 像素原图
function setHeroScale100() {
    heroScale = 1.0;
    applyHeroTransform();
    saveHeroTransform();
    showToast('🔍 已恢复 100% 原始尺寸');
}

function zoomHero(d) {
    heroScale = Math.min(8.0, Math.max(0.05, heroScale + d));
    applyHeroTransform();
    saveHeroTransform();
}

function resetHeroTransform() {
    heroScale = 1.0;
    heroX = 0;
    heroY = 0;
    applyHeroTransform();
    saveHeroTransform();
    showToast('↺ 构图已居中复位');
}

function saveHeroTransform() {
    data.settings.heroScale = heroScale;
    data.settings.heroX = heroX;
    data.settings.heroY = heroY;
    saveData();
}

function handleHeroFileSelect(event) {
    if (event.target.files?.[0]) processHeroImageFile(event.target.files[0]);
    event.target.value = '';
}

async function processHeroImageFile(file) {
    if (!file.type.startsWith('image/')) return alert('请投入正规图像格式！');
    const reader = new FileReader();
    reader.onload = async (e) => {
        const ok = await saveHeroImageToDexie(e.target.result);
        if (ok) {
            heroX = 0;
            heroY = 0;
            data.settings.heroScale = null; // 重置比例触发重新适配
            await renderHeroVisual();
            showToast(`🎉 超清壁纸已存入 Dexie (${(file.size / 1024 / 1024).toFixed(2)} MB)`);
        }
    };
    reader.readAsDataURL(file);
}

async function clearHeroImage() {
    if (!confirm('恢复天罡真武默认力场？')) return;
    await saveHeroImageToDexie('');
    await renderHeroVisual();
    showToast('已恢复预设力场');
}

// 路由与标签页切换
function switchTab(t) {
    if (typeof hideHudTooltip === 'function') hideHudTooltip();

    document.querySelectorAll('.tab-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.tab === t);
    });

    document.querySelectorAll('.tab-content').forEach(c => {
        c.classList.toggle('active', c.id === t);
    });

    document.body.classList.toggle('diary-wide', t === 'diary');

    if (t === 'analysis' && typeof refreshPromptData === 'function') refreshPromptData();
    if (t === 'workout_deck' && typeof renderWorkoutQueue === 'function') renderWorkoutQueue();
    if (t === 'action_quick' && typeof renderActionQuickPanel === 'function') renderActionQuickPanel();
    if (t === 'stretch_timer' && typeof switchStretchMode === 'function') switchStretchMode(stretchMode);
    if (t === 'hang_timer' && typeof initHangTimer === 'function') initHangTimer();

    const d = document.getElementById('leftDeckPane');
    if (d) d.scrollTop = 0;
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
    if (typeof updateHangPBDisplay === 'function') updateHangPBDisplay();
}

async function init() {
    try {
        initDexieStorage();

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
            } catch (e) {
                console.error('数据解析失败，使用默认配置', e);
                resetToPreset();
            }
        } else {
            applyPresetPlan(0);
        }

        if (!data.knowledge || !data.knowledge.length) {
            data.knowledge = [
                { id: 'k_1', category: '内分泌·降糖', title: '慢速离心收缩如何通过激活 AMPK 调控 GLUT4 转运', content: '...' },
                { id: 'k_2', category: '心血管·眼底安全', title: '病程15年恪守的眼底微血管保护与呼吸准则', content: '...' }
            ];
        }

        saveData();
        renderTopTabs();
        renderAll();
        renderActionQuickPanel();
        initHangTimer();

        if (typeof applyReadingTypography === 'function') applyReadingTypography();

        startPoliceRealtimeClock();
        await initHeroViewer();
        if (typeof initTacticalHudTooltips === 'function') initTacticalHudTooltips();
        if (typeof applyPresetRange === 'function') applyPresetRange(7);

    } catch (globalError) {
        console.error('系统初始化严重错误:', globalError);
    }
}

window.addEventListener('beforeunload', () => {
    try {
        if (typeof workbenchAutosaveNow === 'function') workbenchAutosaveNow();
    } catch (e) {}
});

document.addEventListener('DOMContentLoaded', init);