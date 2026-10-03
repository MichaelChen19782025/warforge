// ================================================================
//  state.js: 全局存储键、默认动作武器库、排班周期表与核心数据仓库
// ================================================================

const STORAGE_KEY = 'cyber_marshal_warforge_v9_ultimate';
let currentFontSize = 16;

// 动作法门武器库全面收录
const DEFAULT_ARSENAL_TEMPLATE = [
    { id: 'act_jog_glyco', name: '慢跑', type: 'aerobic', defaultSets: 1, defaultReps: '25min', total: 25,
        downSec: 0, upSec: 0, icon: '🏃', tip: '餐后巡航消糖，清空肌糖原与肝糖原' },
    { id: 'act_pnf_stretch', name: '压腿', type: 'isometric', defaultSets: 2, defaultReps: '60s',
        total: 120, downSec: 0, upSec: 0, icon: '🧘', tip: '舒筋活络，全程每秒读秒，改善下肢微循环' },
    { id: 'act_pushup_ecc', name: '离心俯卧', type: 'strength', defaultSets: 2, defaultReps: '10,10', total: 20,
        downSec: 4.0, upSec: 1.0, icon: '🔥', tip: '4s慢速离心下放/1s起，TUT破糖主力，默认10次/组' },
    { id: 'act_pullup', name: '引体', type: 'strength', defaultSets: 2, defaultReps: '8次', total: 16,
        downSec: 0, upSec: 0, icon: '🦇', tip: '标准正握/对握引体向上，背阔肌中下部做功' },
    { id: 'act_pullup_wide', name: '阔引体', type: 'strength', defaultSets: 2, defaultReps: '6次', total: 12,
        downSec: 0, upSec: 0, icon: '🦅', tip: '宽握展开，重点强化大圆肌与背阔肌上外侧V字倒三角' },
    { id: 'act_hang', name: '极限悬挂', type: 'isometric', defaultSets: 1, defaultReps: '40s', total: 40,
        downSec: 0, upSec: 0, icon: '🧗', tip: '前臂与单杠死磕，极限抗阻握力与肩袖微循环' },
    { id: 'act_squat_wall', name: '静蹲', type: 'isometric', defaultSets: 3, defaultReps: '60s,60s,60s',
        total: 180, downSec: 0, upSec: 0, icon: '🧱', tip: '股四头肌强效汲糖，膝关节0剪切力' },
    { id: 'act_split_practice', name: '一字马', type: 'isometric', defaultSets: 1, defaultReps: '0', total: 0,
        downSec: 0, upSec: 0, icon: '🤸', tip: '一字马拉伸练习，点击开始/结束自动入册' },
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

// 顶层 var：即 window.data，供各模块的 window.data 守卫与外部读取
var data = {
    settings: {
        birthday: '1978-04-19',
        weight: 63,
        height: 167.5,
        diabetesYears: 15,
        shiftAnchorDate: '2026-09-01',
        shiftAnchorType: 0,
        heroScale: 1.0,
        heroX: 0,
        heroY: 0,
        shiftOverride: null,
        chatDelimiter: '本回答由 AI 生成，内容仅供参考，请仔细甄别',
        chatDelimiterPresets: [],
        readLineHeight: 1.85,
        readParaGapLines: 1,
        hangBestRecord: 0,
        hangPrepDuration: 10,
        hangCountdownTarget: 30,
        // 核心修正：离心慢放默认10次/组，默认2组
        eccentricDefaultSets: 2,
        eccentricDefaultReps: 10,
        eccentricRestSec: 60,
        // 压腿：左右脚各压一次算一组；单侧默认60秒，默认2组
        stretchDefaultDuration: 60,
        stretchDefaultSets: 2,
        // 左右脚之间的间隔默认10秒；每组之间的间隔默认20秒（均可自由修改并持久化）
        stretchSwapRestSec: 10,
        stretchSetRestSec: 20
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
            desc: '日常标配流：2组慢速离心(各10次) + 60s压腿',
            items: [
                { actionId: 'act_pushup_ecc', name: '慢速离心俯卧撑', sets: 2, reps: '10,10', total: 20, downSec: 4.0, upSec: 1.0, heart: 135 },
                { actionId: 'act_pnf_stretch', name: '压腿', sets: 2, reps: '60s,60s', total: 120, downSec: 0, upSec: 0, heart: 95 },
                { actionId: 'act_squat_wall', name: '静蹲', sets: 2, reps: '60s,60s', total: 120, downSec: 0, upSec: 0, heart: 120 }
            ]
        },
        {
            id: 'plan_1',
            name: '⚡ 第二方案 (24h值班微动作流)',
            desc: '不流汗、不喘粗气、快速平抑血糖',
            items: [
                { actionId: 'act_pushup_ecc', name: '慢速离心俯卧撑', sets: 2, reps: '10,10', total: 20, downSec: 4.0, upSec: 1.0, heart: 125 },
                { actionId: 'act_squat_wall', name: '静蹲', sets: 2, reps: '60s,60s', total: 120, downSec: 0, upSec: 0, heart: 115 }
            ]
        },
        {
            id: 'plan_2',
            name: '🔥 第三方案 (轮休大强度破阵)',
            desc: '4组离心冲顶 + 阔引体 + 慢跑',
            items: [
                { actionId: 'act_jog_glyco', name: '慢跑', sets: 1, reps: '30min', total: 30, downSec: 0, upSec: 0, heart: 145 },
                { actionId: 'act_pullup_wide', name: '阔引体', sets: 3, reps: '8,8,6', total: 22, downSec: 0, upSec: 0, heart: 140 },
                { actionId: 'act_pushup_ecc', name: '慢速离心俯卧撑', sets: 4, reps: '10,10,10,10', total: 40, downSec: 4.0, upSec: 1.0, heart: 142 }
            ]
        },
        {
            id: 'plan_3',
            name: '🧘 第四方案 (餐后极速5分钟降糖)',
            desc: '极速静蹲阻断血糖高潮',
            items: [
                { actionId: 'act_squat_wall', name: '静蹲', sets: 3, reps: '60s,60s,60s', total: 180, downSec: 0, upSec: 0, heart: 118 },
                { actionId: 'act_pushup_ecc', name: '慢速离心俯卧撑', sets: 2, reps: '10,10', total: 20, downSec: 4.0, upSec: 1.0, heart: 130 }
            ]
        },
        {
            id: 'plan_4',
            name: '🛡️ 第五方案 (筋膜养护与下肢微循环)',
            desc: '充分压腿舒筋活络',
            items: [
                { actionId: 'act_pnf_stretch', name: '压腿', sets: 4, reps: '60s,60s,60s,60s', total: 240, downSec: 0, upSec: 0, heart: 90 },
                { actionId: 'act_squat_free', name: '深蹲', sets: 2, reps: '20,20', total: 40, downSec: 2.0, upSec: 1.0, heart: 110 }
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
    return data.arsenal;
}

var MASTER_ARSENAL = DEFAULT_ARSENAL_TEMPLATE;

function saveData() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('LocalStorage 写入失败', e);
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