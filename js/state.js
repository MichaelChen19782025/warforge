// ================================================================
//  state.js: 全局存储键、默认动作武器库、排班周期表与核心数据仓库
//  【首帧同步自愈引擎】：脚本加载首个微秒级瞬间立即同步反序列化，
//  集成万能倒计时 10 组预设与法门典籍（Movement Codex）底座！
// ================================================================

const STORAGE_KEY = 'cyber_marshal_warforge_v9_ultimate';
let currentFontSize = 15;

const DEFAULT_ARSENAL_TEMPLATE = [
    { id: 'act_squat_wall', name: '静蹲', type: 'isometric', defaultSets: 3, defaultReps: '60s',
        total: 180, downSec: 0, upSec: 0, icon: '🧱', tip: '就位提前量与做功每秒读秒，股四头肌强力汲糖，支持自重/单双负重' },
    { id: 'act_chest_stretch', name: '墙角扩胸', type: 'isometric', defaultSets: 3, defaultReps: '30s', total: 180,
        downSec: 0, upSec: 0, icon: '👐', tip: '就位提前量与左右做功每秒读秒，左右交替拉伸改善圆肩驼背' },
    { id: 'act_jog_glyco', name: '慢跑', type: 'aerobic', defaultSets: 1, defaultReps: '25min', total: 25,
        downSec: 0, upSec: 0, icon: '🏃', tip: '餐后巡航消糖，清空肌糖原与肝糖原，起跑提前量' },
    { id: 'act_hang', name: '极限悬挂', type: 'isometric', defaultSets: 1, defaultReps: '40s', total: 40,
        downSec: 0, upSec: 0, icon: '🧗', tip: '单杠死磕，极限抗阻握力与肩袖微循环(自带10阶延时校准补偿)' },
    { id: 'act_pushup_ecc', name: '离心俯卧', type: 'strength', defaultSets: 2, defaultReps: '10,10', total: 20,
        downSec: 4.0, upSec: 1.0, icon: '🔥', tip: '慢速离心下放/撑起爆发，TUT破糖主力，默认10次/组' },
    { id: 'act_pullup', name: '标准引体', type: 'strength', defaultSets: 2, defaultReps: '8次', total: 16,
        downSec: 0, upSec: 0, icon: '🦇', tip: '标准正握/对握引体向上，背阔肌中下部做功' },
    { id: 'act_pullup_wide', name: '阔引体', type: 'strength', defaultSets: 2, defaultReps: '6次', total: 12,
        downSec: 0, upSec: 0, icon: '🦅', tip: '宽握展开，重点强化大圆肌与背阔肌上外侧V字倒三角' },
    { id: 'act_pnf_stretch', name: '压腿', type: 'isometric', defaultSets: 2, defaultReps: '60s',
        total: 120, downSec: 0, upSec: 0, icon: '🧘', tip: '舒筋活络，做功与换边全程每秒读秒，改善下肢微循环' },
    { id: 'act_squat_free', name: '深蹲', type: 'strength', defaultSets: 3, defaultReps: '30,30,30', total: 90,
        downSec: 2.0, upSec: 1.0, icon: '🦵', tip: '大肌群做功泵血，刺激微循环' },
    { id: 'act_badminton', name: '羽毛球', type: 'aerobic', defaultSets: 1, defaultReps: '30min', total: 30,
        downSec: 0, upSec: 0, icon: '🏸', tip: '高频变向对抗，快速哈气调动无氧间歇' },
    { id: 'act_burpee_fast', name: '波比跳', type: 'strength', defaultSets: 3, defaultReps: '12,12,12', total: 36,
        downSec: 1.5, upSec: 1.0, icon: '⚡', tip: '超高强度爆发，快速消耗游离糖分子' }
];

const DEFAULT_EXERCISE_CODEX = [
    {
        id: 'codex_squat_wall',
        name: '靠墙静蹲',
        icon: '🧱',
        category: '等长抗阻',
        desc: '背部平整贴墙，下蹲至大腿与地面约90度水平夹角，双膝与肩同宽，膝盖不超脚尖。持续等长收缩强力动员股四头肌 GLUT4 汲糖。',
        safety: '严禁闭气憋气！必须保持平稳深吐气，以防胸腔内压升高传导至眼底微血管。',
        muscles: '股四头肌、臀大肌、核心肌群',
        createdAt: '2026-09-01T08:30:00.000Z'
    },
    {
        id: 'codex_chest_stretch',
        name: '墙角扩胸',
        icon: '👐',
        category: '拉伸舒展',
        desc: '双臂曲肘抵住垂直墙角两侧，躯干缓慢前倾拉伸胸大肌与肩前侧筋膜，左右侧交替进行，有效缓解伏案与持械疲劳。',
        safety: '动作轻缓下沉，勿暴力弹震，感到胸部前侧温热牵拉即可。',
        muscles: '胸大肌、胸小肌、三角肌前束',
        createdAt: '2026-09-01T08:30:00.000Z'
    },
    {
        id: 'codex_hang',
        name: '极限悬挂',
        icon: '🧗',
        category: '悬垂握力',
        desc: '双手正握或对握横杠，两臂自然悬垂，背部微收，肩胛骨微下沉避免耸肩挤压肩峰。',
        safety: '力竭前留有安全余量从容脱杠落地，膝关节弯曲缓冲，保护眼底与心血管。',
        muscles: '小臂屈肌腱群、背阔肌、肩袖肌群',
        createdAt: '2026-09-01T08:30:00.000Z'
    },
    {
        id: 'codex_plank',
        name: '战术平板支撑',
        icon: '🛡️',
        category: '核心静力',
        desc: '双肘弯曲支撑在地面，躯干挺直呈一条直线，腹横肌收紧，骨盆维持中立位。',
        safety: '严禁塌腰，感觉腹肌力竭震颤时应主动收功，避免代偿压迫腰椎。',
        muscles: '腹横肌、腹直肌、竖脊肌',
        createdAt: '2026-09-01T08:30:00.000Z'
    }
];

const DEFAULT_UNIVERSAL_PRESETS = [
    { id: 'u_p_0', name: '靠墙静蹲稳固', codexId: 'codex_squat_wall', workSec: 60, restSec: 60, sets: 3, prepSec: 10 },
    { id: 'u_p_1', name: '墙角扩胸拉伸', codexId: 'codex_chest_stretch', workSec: 30, restSec: 15, sets: 3, prepSec: 10 },
    { id: 'u_p_2', name: '单杠极限悬垂', codexId: 'codex_hang', workSec: 40, restSec: 90, sets: 2, prepSec: 10 },
    { id: 'u_p_3', name: '核心平板破阵', codexId: 'codex_plank', workSec: 45, restSec: 45, sets: 3, prepSec: 10 },
    { id: 'u_p_4', name: '极速Tabata短歇', codexId: '', workSec: 20, restSec: 10, sets: 8, prepSec: 10 },
    { id: 'u_p_5', name: '耐力抗阻长组', codexId: '', workSec: 90, restSec: 60, sets: 3, prepSec: 10 },
    { id: 'u_p_6', name: '小臂握力死磕', codexId: 'codex_hang', workSec: 30, restSec: 60, sets: 4, prepSec: 10 },
    { id: 'u_p_7', name: '深蹲离心等长', codexId: '', workSec: 45, restSec: 60, sets: 3, prepSec: 10 },
    { id: 'u_p_8', name: '肩袖弹力带抗阻', codexId: '', workSec: 30, restSec: 30, sets: 4, prepSec: 10 },
    { id: 'u_p_9', name: '自由调谐机动槽', codexId: '', workSec: 60, restSec: 30, sets: 3, prepSec: 10 }
];

const SHIFT_CYCLE_TABLE = [
    { name: '24h值班', isWork: true, desc: '当天 08:30 至 次日 08:30 跨夜驻所', dutyTag: '24h值班' },
    { name: '轮休 (休)', isWork: false, desc: '全天在家休息调养', dutyTag: '休假在家' },
    { name: '轮休 (休)', isWork: false, desc: '全天在家休息调养', dutyTag: '休假在家' },
    { name: '日班(至22:30)', isWork: true, desc: '当天 08:30 至 当晚 22:30 在岗', dutyTag: '晚10点半日班' },
    { name: '轮休 (休)', isWork: false, desc: '全天在家休息调养', dutyTag: '休假在家' }
];

var data = {
    settings: {
        birthday: '1978-04-19',
        weight: 63,
        height: 167.5,
        diabetesYears: 15,
        shiftAnchorDate: '2026-09-01',
        shiftAnchorType: 0,
        shiftOverride: null,

        // 慢跑巡航参数
        jogDefaultMinutes: 25,
        jogPrepSec: 10,

        // 靠墙静蹲参数
        squatDefaultSeconds: 60,
        squatDefaultSets: 3,
        squatRestSec: 60,
        squatPrepSec: 10,
        squatDefaultMode: 'bodyweight', 
        squatSingleWeight: 10.0,
        squatLeftWeight: 5.0,
        squatRightWeight: 5.0,
        squatItemDesc: '哑铃',
        squatLockSymmetric: true,

        // 墙角扩胸参数
        chestDefaultSets: 3,
        chestDefaultSec: 30,
        chestRestSec: 15,
        chestPrepSec: 10,

        // 极限悬挂参数
        hangDefaultVariant: 'hang',
        hangBestRecord: 0,
        hangPrepDuration: 10,
        hangCountdownTarget: 30,
        hangDefaultReps: 8,

        // 离心慢放参数
        eccentricDefaultSets: 2,
        eccentricDefaultReps: 10,
        eccentricDownSec: 4.0,
        eccentricUpSec: 1.0,
        eccentricRestSec: 60,
        eccentricPrepSec: 10,

        // 压腿舒筋参数
        stretchDefaultDuration: 60,
        stretchDefaultSets: 2,
        stretchSwapRestSec: 10,
        stretchSetRestSec: 20,
        stretchPrepDuration: 10,
        stretchDefaultMode: 'countdown',

        // 万能倒计时：记录最后一次使用的预设 ID（下次启动作为默认值）
        lastUniversalPresetId: 'u_p_0'
    },
    masterPlan: {
        pushupSetReps: 40,
        dailyPushupTarget: 60,
        sessionDurationMin: 15,
        eccentricDownSec: 4.0,
        concentricUpSec: 1.0,
        wallSquatTargetSec: 60,
        targetHeartRateMax: 155
    },
    customParamCache: {},
    presetPlans: [
        {
            id: 'plan_0',
            name: '⭐ 默认战术方案',
            desc: '标配流：静蹲 + 极限悬挂 + 离心俯卧',
            items: [
                { actionId: 'act_squat_wall', name: '靠墙静蹲', sets: 3, reps: '60s,60s,60s', total: 180, downSec: 0, upSec: 0, heart: 120 },
                { actionId: 'act_hang', name: '极限悬挂', sets: 2, reps: '40s,40s', total: 80, downSec: 0, upSec: 0, heart: 110 },
                { actionId: 'act_pushup_ecc', name: '慢速离心俯卧撑', sets: 2, reps: '10,10', total: 20, downSec: 4.0, upSec: 1.0, heart: 135 }
            ]
        },
        {
            id: 'plan_1',
            name: '⚡ 第二方案 (24h值班微动作流)',
            desc: '不流汗、不喘粗气、快速平抑血糖',
            items: [
                { actionId: 'act_squat_wall', name: '靠墙静蹲', sets: 2, reps: '60s,60s', total: 120, downSec: 0, upSec: 0, heart: 115 },
                { actionId: 'act_pushup_ecc', name: '慢速离心俯卧撑', sets: 2, reps: '10,10', total: 20, downSec: 4.0, upSec: 1.0, heart: 125 }
            ]
        },
        {
            id: 'plan_2',
            name: '🔥 第三方案 (轮休大强度破阵)',
            desc: '慢跑 + 极限悬挂 + 4组离心冲顶',
            items: [
                { actionId: 'act_jog_glyco', name: '慢跑', sets: 1, reps: '30min', total: 30, downSec: 0, upSec: 0, heart: 145 },
                { actionId: 'act_hang', name: '极限悬挂', sets: 3, reps: '45s,40s,35s', total: 120, downSec: 0, upSec: 0, heart: 130 },
                { actionId: 'act_pushup_ecc', name: '慢速离心俯卧撑', sets: 4, reps: '10,10,10,10', total: 40, downSec: 4.0, upSec: 1.0, heart: 142 }
            ]
        },
        {
            id: 'plan_3',
            name: '🧘 第四方案 (餐后极速5分钟降糖)',
            desc: '极速静蹲阻断血糖高潮',
            items: [
                { actionId: 'act_squat_wall', name: '靠墙静蹲', sets: 3, reps: '60s,60s,60s', total: 180, downSec: 0, upSec: 0, heart: 118 },
                { actionId: 'act_pushup_ecc', name: '慢速离心俯卧撑', sets: 2, reps: '10,10', total: 20, downSec: 4.0, upSec: 1.0, heart: 130 }
            ]
        },
        {
            id: 'plan_4',
            name: '🛡️ 第五方案 (筋膜养护与下肢微循环)',
            desc: '压腿舒筋 + 靠墙静蹲 + 墙角扩胸',
            items: [
                { actionId: 'act_pnf_stretch', name: '压腿', sets: 4, reps: '60s,60s,60s,60s', total: 240, downSec: 0, upSec: 0, heart: 90 },
                { actionId: 'act_squat_wall', name: '靠墙静蹲', sets: 2, reps: '60s,60s', total: 120, downSec: 0, upSec: 0, heart: 110 },
                { actionId: 'act_chest_stretch', name: '墙角扩胸', sets: 3, reps: '30s', total: 180, downSec: 0, upSec: 0, heart: 95 }
            ]
        }
    ],
    activePlanIndex: 0,
    workoutQueue: [],
    knowledge: [],
    logs: [],
    aiReports: [],
    diaries: [],

    // 万能倒计时 10 组专业预设插槽
    universalPresets: JSON.parse(JSON.stringify(DEFAULT_UNIVERSAL_PRESETS)),

    // 动作法门典籍（Codex 说明书矩阵）
    exerciseCodex: JSON.parse(JSON.stringify(DEFAULT_EXERCISE_CODEX))
};

// 首帧同步加载引擎
(function loadSyncBootstrap() {
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed && typeof parsed === 'object') {
                if (parsed.settings) Object.assign(data.settings, parsed.settings);
                if (parsed.masterPlan) Object.assign(data.masterPlan, parsed.masterPlan);
                if (parsed.customParamCache) data.customParamCache = parsed.customParamCache;
                if (parsed.presetPlans) data.presetPlans = parsed.presetPlans;
                if (parsed.activePlanIndex !== undefined) data.activePlanIndex = parsed.activePlanIndex;
                if (parsed.workoutQueue) data.workoutQueue = parsed.workoutQueue;
                if (parsed.knowledge) data.knowledge = parsed.knowledge;
                if (parsed.logs) data.logs = parsed.logs;
                if (parsed.aiReports) data.aiReports = parsed.aiReports;
                if (parsed.diaries) data.diaries = parsed.diaries;
                if (parsed.arsenal) data.arsenal = parsed.arsenal;
                if (Array.isArray(parsed.universalPresets) && parsed.universalPresets.length) {
                    data.universalPresets = parsed.universalPresets;
                }
                if (Array.isArray(parsed.exerciseCodex) && parsed.exerciseCodex.length) {
                    data.exerciseCodex = parsed.exerciseCodex;
                }
            }
        }
    } catch (e) {
        console.warn('首帧同步加载略过:', e);
    }
})();

function getArsenalList() {
    if (!data.arsenal || !Array.isArray(data.arsenal) || !data.arsenal.length) {
        data.arsenal = JSON.parse(JSON.stringify(DEFAULT_ARSENAL_TEMPLATE));
        return data.arsenal;
    }
    data.arsenal.forEach(localAct => {
        const latestAct = DEFAULT_ARSENAL_TEMPLATE.find(d => d.id === localAct.id);
        if (latestAct) {
            localAct.name = latestAct.name;
            localAct.icon = latestAct.icon;
            localAct.tip = latestAct.tip;
            localAct.type = latestAct.type;
        }
    });
    if (!data.arsenal.find(a => a.id === 'act_chest_stretch')) {
        const chestAct = DEFAULT_ARSENAL_TEMPLATE.find(a => a.id === 'act_chest_stretch');
        data.arsenal.push(JSON.parse(JSON.stringify(chestAct)));
    }
    return data.arsenal;
}

var MASTER_ARSENAL = DEFAULT_ARSENAL_TEMPLATE;

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('LocalStorage 写入失败', e);
        if (e && (e.name === 'QuotaExceededError' || e.code === 22)) {
            alert('⚠️ 手机存储配额告警：数据量过大导致无法保存最新参数！请导出备份后清理旧记录。');
        }
    }
}

function resetToPreset() {
    data.logs = [];
    data.aiReports = [];
    data.workoutQueue = [];
    data.customParamCache = {};
    data.diaries = [];
    data.settings.shiftOverride = null;
    data.universalPresets = JSON.parse(JSON.stringify(DEFAULT_UNIVERSAL_PRESETS));
    data.exerciseCodex = JSON.parse(JSON.stringify(DEFAULT_EXERCISE_CODEX));
    saveData();
}