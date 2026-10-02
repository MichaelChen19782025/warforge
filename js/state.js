// ================================================================
//  state.js: 全局存储键、默认动作武器库、排班周期表与核心数据仓库
// ================================================================

const STORAGE_KEY = 'cyber_marshal_warforge_v9_ultimate';
let currentFontSize = 16;

// 动作法门装备库模版
const DEFAULT_ARSENAL_TEMPLATE = [
    { id: 'act_jog_glyco', name: '慢跑', type: 'aerobic', defaultSets: 1, defaultReps: '25min', total: 25,
        downSec: 0, upSec: 0, icon: '🏃', tip: '餐后巡航消糖，清空肌糖原与肝糖原' },
    { id: 'act_pnf_stretch', name: '压腿', type: 'isometric', defaultSets: 2, defaultReps: '60s',
        total: 120, downSec: 0, upSec: 0, icon: '🧘', tip: '舒筋活络，全程每秒读秒，左右腿轮换加深' },
    { id: 'act_pushup_ecc', name: '离心俯卧', type: 'strength', defaultSets: 1, defaultReps: '10次', total: 10,
        downSec: 4.0, upSec: 1.0, icon: '🔥', tip: '4s慢速离心下放/1s起，TUT破糖主力，默认10次' },
    { id: 'act_pullup', name: '引体', type: 'strength', defaultSets: 2, defaultReps: '8次', total: 16,
        downSec: 0, upSec: 0, icon: '🦇', tip: '标准正握/对握引体向上，背阔肌中下部做功' },
    { id: 'act_pullup_wide', name: '阔引体', type: 'strength', defaultSets: 2, defaultReps: '6次', total: 12,
        downSec: 0, upSec: 0, icon: '🦅', tip: '宽握展开，重点强化大圆肌与背阔肌上外侧' },
    { id: 'act_hang', name: '极限悬挂', type: 'isometric', defaultSets: 1, defaultReps: '30s', total: 30,
        downSec: 0, upSec: 0, icon: '🧗', tip: '前臂与单杠死磕，全程每秒语音报数' },
    { id: 'act_squat_wall', name: '静蹲', type: 'isometric', defaultSets: 3, defaultReps: '60s,60s,60s',
        total: 180, downSec: 0, upSec: 0, icon: '🧱', tip: '股四头肌强效汲糖，膝关节0剪切力' },
    { id: 'act_split_practice', name: '一字马', type: 'isometric', defaultSets: 1, defaultReps: '0', total: 0,
        downSec: 0, upSec: 0, icon: '🤸', tip: '一字马拉伸练习，自动记录做功时长' },
    { id: 'act_squat_free', name: '深蹲', type: 'strength', defaultSets: 3, defaultReps: '30,30,30', total: 90,
        downSec: 2.0, upSec: 1.0, icon: '🦵', tip: '大肌群做功泵血，刺激微循环' }
];

const SHIFT_CYCLE_TABLE = [
    { name: '24h值班', isWork: true, desc: '当天 08:30 至 次日 08:30 跨夜驻所', dutyTag: '24h值班' },
    { name: '轮休 (休)', isWork: false, desc: '全天在家休息调养', dutyTag: '休假在家' },
    { name: '轮休 (休)', isWork: false, desc: '全天在家休息调养', dutyTag: '休假在家' },
    { name: '日班(至22:30)', isWork: true, desc: '当天 08:30 至 当晚 22:30 在岗', dutyTag: '晚10点半日班' },
    { name: '轮休 (休)', isWork: false, desc: '全天在家休息调养', dutyTag: '休假在家' }
];

let data = {
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

        // 核心参数：离心慢放默认次数（10次，支持手动修改后永久记忆为下一次默认值）
        eccentricDefaultSets: 10,
        eccentricDownSec: 4.0,
        eccentricUpSec: 1.0,

        // 核心参数：压腿默认单次时长（60s）与默认间隔休整时长（30s，修改后永久记忆）
        stretchDefaultDuration: 60,
        stretchRestDuration: 30,

        // 悬挂引体参数
        hangPrepDuration: 10,
        hangCountdownTarget: 30,
        hangBestRecord: 0
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
            desc: '日常标配流：10次慢速离心 + 60s压腿',
            items: [
                { actionId: 'act_pushup_ecc', name: '慢速离心俯卧撑', sets: 1, reps: '10次', total: 10, downSec: 4.0, upSec: 1.0, heart: 135 },
                { actionId: 'act_pnf_stretch', name: '压腿', sets: 2, reps: '60s,60s', total: 120, downSec: 0, upSec: 0, heart: 95 },
                { actionId: 'act_squat_wall', name: '静蹲', sets: 2, reps: '60s,60s', total: 120, downSec: 0, upSec: 0, heart: 120 }
            ]
        },
        {
            id: 'plan_1',
            name: '⚡ 第二方案 (24h值班微动作流)',
            desc: '不流汗、不喘粗气、快速平抑血糖',
            items: [
                { actionId: 'act_pushup_ecc', name: '慢速离心俯卧撑', sets: 1, reps: '8次', total: 8, downSec: 4.0, upSec: 1.0, heart: 125 },
                { actionId: 'act_squat_wall', name: '静蹲', sets: 2, reps: '60s,60s', total: 120, downSec: 0, upSec: 0, heart: 115 }
            ]
        },
        {
            id: 'plan_2',
            name: '🔥 第三方案 (轮休大强度破阵)',
            desc: '离心冲击 + 阔引体 + 慢跑',
            items: [
                { actionId: 'act_jog_glyco', name: '慢跑', sets: 1, reps: '30min', total: 30, downSec: 0, upSec: 0, heart: 145 },
                { actionId: 'act_pullup_wide', name: '阔引体', sets: 3, reps: '8,8,6', total: 22, downSec: 0, upSec: 0, heart: 140 },
                { actionId: 'act_pushup_ecc', name: '慢速离心俯卧撑', sets: 1, reps: '15次', total: 15, downSec: 4.0, upSec: 1.0, heart: 142 }
            ]
        },
        {
            id: 'plan_3',
            name: '🧘 第四方案 (餐后极速5分钟降糖)',
            desc: '极速静蹲阻断血糖高潮',
            items: [
                { actionId: 'act_squat_wall', name: '静蹲', sets: 3, reps: '60s,60s,60s', total: 180, downSec: 0, upSec: 0, heart: 118 },
                { actionId: 'act_pushup_ecc', name: '慢速离心俯卧撑', sets: 1, reps: '10次', total: 10, downSec: 4.0, upSec: 1.0, heart: 130 }
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
    data.settings.eccentricDefaultSets = 10;
    data.settings.stretchDefaultDuration = 60;
    data.settings.stretchRestDuration = 30;
    saveData();
}