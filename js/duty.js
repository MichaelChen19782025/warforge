function getDutyShiftInfo(now = new Date()) {
    const hour = now.getHours();
    const min = now.getMinutes();
    const isBefore0830 = (hour < 8) || (hour === 8 && min < 30);

    let dutyDate = new Date(now);
    if (isBefore0830) dutyDate.setDate(dutyDate.getDate() - 1);
    dutyDate.setHours(0, 0, 0, 0);

    const dutyDateStr = dutyDate.toISOString().slice(0, 10);

    // 1. 检查是否有手动覆盖
    const override = data.settings.shiftOverride;
    let overrideIndex = null;
    if (override && override.date === dutyDateStr && override.shiftIndex !== undefined) {
        overrideIndex = override.shiftIndex;
    }

    // 2. 无手动覆盖则走自动轮转计算
    let cycleIndex;
    if (overrideIndex !== null) {
        cycleIndex = overrideIndex;
    } else {
        const anchor = new Date(data.settings.shiftAnchorDate || '2026-09-01T00:00:00');
        anchor.setHours(0, 0, 0, 0);
        const diffDays = Math.round((dutyDate - anchor) / (1000 * 60 * 60 * 24));
        const offset = parseInt(data.settings.shiftAnchorType) || 0;
        cycleIndex = (((diffDays + offset) % 5) + 5) % 5;
    }

    const shift = SHIFT_CYCLE_TABLE[cycleIndex];

    return {
        dutyDate,
        dutyDateStr,
        isBefore0830,
        shift,
        cycleIndex,
        isOverridden: (overrideIndex !== null)
    };
}

function applyShiftOverride(value) {
    const sel = document.getElementById('shiftOverrideSelect');
    const val = value || sel.value;
    const duty = getDutyShiftInfo();

    if (val === '' || val === 'auto') {
        clearShiftOverride();
        return;
    }

    const idx = parseInt(val);
    if (isNaN(idx) || idx < 0 || idx > 4) return;

    data.settings.shiftOverride = {
        date: duty.dutyDateStr,
        shiftIndex: idx
    };
    saveData();
    renderDutyStatus();

    const overrideSel = document.getElementById('shiftOverrideSelect');
    if (overrideSel) overrideSel.value = String(idx);
    const overrideBadge = document.getElementById('overrideBadge');
    if (overrideBadge) overrideBadge.classList.remove('hidden');

    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderAll === 'function') renderAll();
}

function clearShiftOverride() {
    data.settings.shiftOverride = null;
    saveData();
    const overrideSel = document.getElementById('shiftOverrideSelect');
    if (overrideSel) overrideSel.value = '';
    const overrideBadge = document.getElementById('overrideBadge');
    if (overrideBadge) overrideBadge.classList.add('hidden');
    renderDutyStatus();
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderAll === 'function') renderAll();
}

function renderDutyStatus() {
    const duty = getDutyShiftInfo();
    const badge = document.getElementById('deckDutyBadge');
    const desc = document.getElementById('deckDutyDesc');
    const overrideBadge = document.getElementById('overrideBadge');

    if (!badge) return;

    const shiftName = duty.shift.name;
    const isOverridden = duty.isOverridden;

    badge.textContent = `${shiftName} [归属: ${duty.dutyDateStr.slice(5)}]`;
    if (isOverridden) {
        badge.innerHTML = `${shiftName} [归属: ${duty.dutyDateStr.slice(5)}] <span style="color:var(--amber-accent);">⚡手动</span>`;
        if (overrideBadge) overrideBadge.classList.remove('hidden');
    } else {
        if (overrideBadge) overrideBadge.classList.add('hidden');
    }

    const sel = document.getElementById('shiftOverrideSelect');
    if (sel) {
        if (isOverridden && data.settings.shiftOverride) {
            sel.value = String(data.settings.shiftOverride.shiftIndex);
        } else {
            sel.value = '';
        }
    }

    if (desc) {
        desc.innerHTML =
            `班次特性：${duty.shift.desc}<br>08:30 铁律：${duty.isBefore0830 ? '00:00~08:30 属昨日当班下半夜' : '08:30 后为新当班周期'}`;
    }

    const recTip = document.getElementById('deckRecommendedPlan');
    if (recTip) {
        const recIndex = duty.shift.isWork ? 1 : 2;
        recTip.innerHTML = `
            <span style="font-size:11px; color:var(--text-muted);">班次建议:</span>
            <span class="badge badge-${duty.shift.isWork ? 'pink' : 'green'}">${data.presetPlans[recIndex]?.name || '默认'}</span>
        `;
    }
}

function startPoliceRealtimeClock() {
    function tick() {
        const now = new Date();
        const ms = Math.floor(now.getMilliseconds() / 100);
        const clockEl = document.getElementById('liveTimeText');
        if (clockEl) {
            clockEl.textContent = now.toLocaleTimeString('zh-CN', { hour12: false }) + '.' + ms;
        }
        const duty = getDutyShiftInfo(now);
        const dutyBadge = document.getElementById('liveDutyDayBadge');
        if (dutyBadge) {
            dutyBadge.textContent = `当班: ${duty.dutyDateStr.slice(5)} (${duty.shift.name})`;
        }
        requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
}