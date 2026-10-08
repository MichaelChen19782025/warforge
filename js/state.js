// ================================================================
// state.js: 全局存储键、默认动作武器库、排班周期表与核心数据仓库
// 【首帧同步自愈引擎】：脚本加载首个微秒级瞬间立即同步反序列化，
// 确保所有战钟模块初始化时拿到 100% 真实持久化参数，杜绝还原！
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
// 1. 慢跑巡航参数
    jogDefaultMinutes: 25,
    jogPrepSec: 10,

    // 2. 靠墙静蹲参数
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

    // 3. 墙角扩胸参数
    chestDefaultSets: 3,
    chestDefaultSec: 30,
    chestRestSec: 15,
    chestPrepSec: 10,

    // 4. 极限悬挂参数
    hangDefaultVariant: 'hang',
    hangBestRecord: 0,
    hangPrepDuration: 10,
    hangCountdownTarget: 30,
    hangDefaultReps: 8,

    // 5. 离心慢放参数
    eccentricDefaultSets: 2,
    eccentricDefaultReps: 10,
    eccentricDownSec: 4.0,
    eccentricUpSec: 1.0,
    eccentricRestSec: 60,
    eccentricPrepSec: 10,

    // 6. 压腿舒筋参数
    stretchDefaultDuration: 60,
    stretchDefaultSets: 2,
    stretchSwapRestSec: 10,
    stretchSetRestSec: 20,
    stretchPrepDuration: 10,
    stretchDefaultMode: 'countdown'
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
diaries: []
};
// 【核心机制】：脚本刚被浏览器加载的这一微秒，立即同步反序列化 localStorage！
// 彻底消灭因 DOMContentLoaded 时序落后导致的“子模块读取写死默认值”现象！
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
saveData();
}