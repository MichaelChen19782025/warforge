let dexieDB = null;

function initDexieStorage() {
    try {
        if (window.Dexie) {
            dexieDB = new Dexie('CyberWushuWarforgeDB_V9');
            dexieDB.version(1).stores({ heroMedia: 'id' });
        }
    } catch (e) {
        console.error('Dexie Init Fail', e);
    }
}

async function saveHeroImageToDexie(base64Data) {
    if (dexieDB) {
        try {
            await dexieDB.heroMedia.put({ id: 'activeHero', data: base64Data });
            return true;
        } catch (e) {
            console.error(e);
        }
    }
    return false;
}

async function getHeroImageFromDexie() {
    if (dexieDB) {
        try {
            const rec = await dexieDB.heroMedia.get('activeHero');
            if (rec && rec.data) return rec.data;
        } catch (e) {
            console.error(e);
        }
    }
    return null;
}

// 生成实录指纹用于去重
function generateLogFingerprint(l) {
    if (!l) return '';
    const start = l.startTimeStamp || '';
    const end = l.endTimeStamp || '';
    const reps = l.reps || '';
    const total = l.total || 0;
    return `${l.date}_${l.type}_${start}_${end}_${total}_${reps}`.replace(/\s+/g, '');
}

// 工作台（AI 聊天精修流水线）快照：原文 + 已生成的意群卡，随备份一起走
function snapshotWorkbench() {
    try { if (typeof composerSyncAll === 'function') composerSyncAll(); } catch (e) {}
    const rawEl = document.getElementById('chatRawInput');
    const blocks = (typeof composerBlocks !== 'undefined' && Array.isArray(composerBlocks)) ? composerBlocks : [];
    return {
        raw: rawEl ? rawEl.value : '',
        blocks: blocks.map(b => ({
            id: b.id,
            kind: b.kind,
            heading: b.heading || '',
            text: b.text || '',
            collapsed: b.collapsed !== false
        }))
    };
}

// 导出全量 JSON 备份
function exportBackup() {
    const payload = {
        version: 'cyber_warforge_v9_ultimate',
        exportedAt: new Date().toISOString(),
        devicePlatform: navigator.userAgent.includes('Mobile') ? 'Mobile' : 'PC',
        workbench: snapshotWorkbench(),
        data: data
    };

    const jsonStr = JSON.stringify(payload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    const timestamp = getFullTimestamp().replace(/[:\s]/g, '-');
    a.download = `战阙全息同步卷_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
}

// 还原备份中的工作台内容
function restoreWorkbenchFromBackup(wb) {
    if (!wb || typeof wb !== 'object') return 'none';
    const raw = typeof wb.raw === 'string' ? wb.raw : '';
    const blocks = Array.isArray(wb.blocks)
        ? wb.blocks.filter(b => b && typeof b.text === 'string' && b.text.trim() !== '')
        : [];
    if (!blocks.length && !raw.trim()) return 'empty';

    const rawEl = document.getElementById('chatRawInput');
    const localRaw = rawEl ? rawEl.value.trim() : '';
    const hasComposer = typeof composerBlocks !== 'undefined' && Array.isArray(composerBlocks);
    const localHas = (hasComposer && composerBlocks.some(b => (b.text || '').trim() !== '')) || localRaw !== '';
    if (localHas) return 'skip';

    if (rawEl) rawEl.value = raw;
    if (typeof onRawInput === 'function') onRawInput();

    if (hasComposer) {
        composerBlocks = blocks.map((b, i) => ({
            id: typeof b.id === 'number' ? b.id : i + 1,
            kind: b.kind === 'card' ? 'card' : 'open',
            heading: b.heading || '',
            text: b.text,
            collapsed: b.collapsed !== false
        }));
        composerNextId = 1 + composerBlocks.reduce((m, b) => Math.max(m, b.id || 0), 0);
    }

    const wbCard = document.getElementById('chatWorkbenchCard');
    if (wbCard) wbCard.classList.remove('hidden');

    if (blocks.length && typeof composerShow === 'function') {
        composerShow();
    } else {
        if (typeof setAiImmersive === 'function') setAiImmersive(true);
        if (wbCard) wbCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    return 'ok:' + blocks.length;
}

// 导入备份文件
function importBackup(e) {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onload = function(ev) {
        try {
            const parsed = JSON.parse(ev.target.result);
            const incomingData = parsed.data ? parsed.data : parsed;
            if (!incomingData || typeof incomingData !== 'object') {
                throw new Error('无效的战阙卷宗格式');
            }

            const report = mergeIncomingData(incomingData);
            saveData();
            if (typeof renderAll === 'function') renderAll();
            if (typeof renderPresetPlanBar === 'function') renderPresetPlanBar();
            if (typeof renderWorkoutQueue === 'function') renderWorkoutQueue();

            const wbResult = restoreWorkbenchFromBackup(parsed.workbench);
            let wbLine = '';
            if (wbResult === 'ok:0' || wbResult === 'empty') wbLine = '【AI聊天工作台】：备份里没有未封存的原文 / 意群卡\n';
            else if (wbResult.indexOf('ok:') === 0) wbLine = `【AI聊天工作台】：原文与 ${wbResult.slice(3)} 张意群卡已还原（可直接继续编辑）\n`;
            else if (wbResult === 'skip') wbLine = '【AI聊天工作台】：本地已有未完成的原文 / 意群卡，已保留本地内容未覆盖\n';

            alert(
                `🎉 跨端战阙增量融合圆满收功！\n\n` +
                `【淬体实录】：新增 ${report.logsAdded} 条，更新 ${report.logsUpdated} 条，跳过重复 ${report.logsSkipped} 条\n` +
                `【AI 参谋训令】：新增 ${report.aiAdded} 篇，跳过重复 ${report.aiSkipped} 篇\n` +
                `【真武秘卷】：新增 ${report.knowledgeAdded} 篇\n` +
                `【淬体随笔】：新增 ${report.diaryAdded || 0} 篇\n` +
                wbLine +
                `【动作参数记忆】：已成功融合两端最新习惯\n\n` +
                `提示：两端数据已完美并轨，无需担心覆盖丢失！`
            );
        } catch (err) {
            alert('⚠️ 导入融合中断: ' + err.message);
        }
    };

    reader.readAsText(file);
    e.target.value = '';
}

// 增量融合去重合并引擎
function mergeIncomingData(incoming) {
    const report = {
        logsAdded: 0,
        logsUpdated: 0,
        logsSkipped: 0,
        aiAdded: 0,
        aiSkipped: 0,
        knowledgeAdded: 0,
        diaryAdded: 0
    };

    // A. 淬体实录
    if (Array.isArray(incoming.logs)) {
        const localIdMap = new Map();
        const localFingerprintMap = new Map();

        data.logs.forEach((item, idx) => {
            if (item.id) localIdMap.set(item.id, idx);
            const fp = generateLogFingerprint(item);
            if (fp) localFingerprintMap.set(fp, idx);
        });

        incoming.logs.forEach(inLog => {
            const inFp = generateLogFingerprint(inLog);
            let matchedIndex = -1;

            if (inLog.id && localIdMap.has(inLog.id)) {
                matchedIndex = localIdMap.get(inLog.id);
            } else if (inFp && localFingerprintMap.has(inFp)) {
                matchedIndex = localFingerprintMap.get(inFp);
            }

            if (matchedIndex !== -1) {
                const localItem = data.logs[matchedIndex];
                const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
                const inTime = new Date(inLog.updatedAt || inLog.createdAt || 0).getTime();

                if (inTime > localTime) {
                    data.logs[matchedIndex] = { ...localItem, ...inLog };
                    report.logsUpdated++;
                } else {
                    report.logsSkipped++;
                }
            } else {
                data.logs.push(inLog);
                const newIdx = data.logs.length - 1;
                if (inLog.id) localIdMap.set(inLog.id, newIdx);
                if (inFp) localFingerprintMap.set(inFp, newIdx);
                report.logsAdded++;
            }
        });

        data.logs.sort((a, b) => {
            const dComp = b.date.localeCompare(a.date);
            if (dComp !== 0) return dComp;
            return (b.startTimeStamp || '').localeCompare(a.startTimeStamp || '');
        });
    }

    // B. AI 研判卷宗
    if (Array.isArray(incoming.aiReports)) {
        const existingAiKeys = new Set(data.aiReports.map(r => `${r.title}_${r.period}`));
        const existingAiIds = new Set(data.aiReports.map(r => r.id));

        incoming.aiReports.forEach(inRep => {
            const repKey = `${inRep.title}_${inRep.period}`;
            if (!existingAiIds.has(inRep.id) && !existingAiKeys.has(repKey)) {
                data.aiReports.push(inRep);
                existingAiIds.add(inRep.id);
                existingAiKeys.add(repKey);
                report.aiAdded++;
            } else {
                report.aiSkipped++;
            }
        });
        data.aiReports.sort((a, b) => (b.savedAt || '').localeCompare(a.savedAt || ''));
    }

    // C. 真武秘卷
    if (Array.isArray(incoming.knowledge)) {
        const existingKMap = new Map(data.knowledge.map(k => [`${k.category}_${k.title}`, k]));

        incoming.knowledge.forEach(inK => {
            const kKey = `${inK.category}_${inK.title}`;
            if (!existingKMap.has(kKey)) {
                data.knowledge.push(inK);
                existingKMap.set(kKey, inK);
                report.knowledgeAdded++;
            }
        });
    }

    // D. 淬体随笔
    if (Array.isArray(incoming.diaries)) {
        if (!data.diaries) data.diaries = [];
        const existingDiaryIds = new Set(data.diaries.map(d => d.id));
        const existingDiaryKeys = new Set(data.diaries.map(d => `${d.date}_${d.title}`));

        incoming.diaries.forEach(inD => {
            const key = `${inD.date}_${inD.title}`;
            if (!existingDiaryIds.has(inD.id) && !existingDiaryKeys.has(key)) {
                data.diaries.push(inD);
                existingDiaryIds.add(inD.id);
                existingDiaryKeys.add(key);
                report.diaryAdded++;
            }
        });
        data.diaries.sort((a, b) => b.date.localeCompare(a.date));
    }

    // E. 动作装备库
    if (Array.isArray(incoming.arsenal)) {
        const curList = getArsenalList();
        const existingActIds = new Set(curList.map(a => a.id));
        incoming.arsenal.forEach(inA => {
            if (!existingActIds.has(inA.id)) {
                curList.push(inA);
                existingActIds.add(inA.id);
            }
        });
        data.arsenal = curList;
    }

    // F. 参数记忆融合
    if (incoming.customParamCache && typeof incoming.customParamCache === 'object') {
        data.customParamCache = {
            ...(incoming.customParamCache || {}),
            ...(data.customParamCache || {})
        };
    }

    // G. 基础设置与排班锚点
    if (incoming.settings) {
        Object.keys(incoming.settings).forEach(key => {
            if (data.settings[key] === undefined || data.settings[key] === '' || data.settings[key] === 0) {
                data.settings[key] = incoming.settings[key];
            }
        });
        if (incoming.settings.shiftOverride && incoming.settings.shiftOverride.date) {
            const localOverride = data.settings.shiftOverride;
            if (!localOverride || localOverride.date !== incoming.settings.shiftOverride.date) {
                data.settings.shiftOverride = incoming.settings.shiftOverride;
            }
        }
    }

    return report;
}

// 导出 CSV 表格
function exportCSV() {
    if (!data.logs.length) return alert('暂无实修记录');
    const h = ['日期', '门类', '组数', '点数', '总计', '心率', '持续分钟', '起始时间', '结束时间', 'TUT秒数', '勤务状态', '备注'];
    const r = data.logs.map(l => [
        l.date, l.type, l.sets, l.reps, l.total, l.heart, l.duration,
        l.startTimeStamp || '', l.endTimeStamp || '', l.tutSeconds || '', l.dutyTag, l.note
    ].map(v => `"${v||''}"`).join(','));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['\uFEFF' + [h.join(','), ...r].join('\n')], { type: 'text/csv;charset=utf-8;' }));
    a.download = '淬体实录_' + new Date().toISOString().slice(0, 10) + '.csv';
    a.click();
}