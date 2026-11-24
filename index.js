(() => {
  'use strict';
  const HOURS_PER_DAY = 7;
  const state = { requirement: 75, presentUnits: { day: 0, four: 0, one: 0 }, leaveUnits: { day: 0, four: 0, one: 0 }, units: { present: 'days', total: 'days' } };
  const $ = id => document.getElementById(id);
  const inputs = { present: $('present-value'), total: $('total-value') };
  const fmt = n => new Intl.NumberFormat(undefined, { maximumFractionDigits: 2 }).format(n);

  function convertToHours(value, unit) { return unit === 'days' ? value * HOURS_PER_DAY : value; }
  function attendancePercentage(present, total) { return total > 0 ? present / total * 100 : null; }
  function maximumLeave(present, total, required) { return present / required - total; }
  function requiredAttendance(present, total, required) { return (required * total - present) / (1 - required); }
  function read(input) {
    if (input.value.trim() === '') return 0;
    const value = Number(input.value);
    return Number.isFinite(value) && value >= 0 ? value : null;
  }
  function hoursAndDays(value, floor = false) {
    if (!Number.isFinite(value) || value <= 0) return '0 hours';
    const quantity = floor ? Math.floor(value * 100) / 100 : value;
    const days = Math.floor((quantity + 1e-10) / HOURS_PER_DAY);
    const hours = Math.abs(quantity - days * HOURS_PER_DAY) < 1e-9 ? 0 : quantity - days * HOURS_PER_DAY;
    const parts = [];
    if (days) parts.push(`${fmt(days)} ${days === 1 ? 'day' : 'days'}`);
    if (hours > 0) parts.push(`${fmt(hours)} ${hours === 1 ? 'hour' : 'hours'}`);
    return parts.join(' and ') || '0 hours';
  }
  function calculate(present, total) {
    const percent = attendancePercentage(present, total), required = state.requirement / 100;
    let status = 'exact';
    if (percent !== null && percent > state.requirement + 1e-9) status = 'above';
    else if (percent !== null && percent < state.requirement - 1e-9) status = 'below';
    return { present, total, absent: Math.max(0, total - present), percent, status,
      leave: status === 'above' ? Math.max(0, maximumLeave(present, total, required)) : 0,
      needed: status === 'below' && required < 1 ? Math.max(0, requiredAttendance(present, total, required)) : 0 };
  }
  function updateProgress(prefix, percent) {
    const bar = $(prefix === 'main' ? 'main-progress' : 'sim-progress-bar');
    bar.style.width = `${Math.min(100, Math.max(0, percent || 0))}%`;
    if (prefix === 'main') {
      $('main-marker').style.left = `${Math.min(99, Math.max(1, state.requirement))}%`;
      $('marker-label').textContent = `${state.requirement}%`;
    }
  }
  function updateStatus(prefix, result) {
    const root = $(prefix === 'main' ? 'main-results' : 'sim-results');
    root.dataset.status = result.status;
    if (prefix === 'main') $('main-status').textContent = result.percent === null ? 'Add total hours to see your status' : ({ above: 'You’re above your goal', exact: 'You’re right on your goal', below: 'You’re below your goal' })[result.status];
    else $('sim-status').textContent = result.percent === null ? 'Add total hours' : ({ above: 'Above your goal', exact: 'On your goal', below: 'Below your goal' })[result.status];
  }
  function updateAction(prefix, result) {
    if (prefix === 'main') {
      let label, message;
      if (result.percent === null) { label = 'CHECK YOUR INPUTS'; message = 'Enter valid values, with present hours no greater than total hours.'; }
      else if (result.status === 'above') {
        const safeLeave = Math.floor(result.leave * 100) / 100;
        label = 'A LITTLE ROOM TO BREATHE'; message = `You can miss <strong>${fmt(safeLeave)} ${safeLeave === 1 ? 'hour' : 'hours'}</strong> and stay on track. <span class="action-detail">(${hoursAndDays(safeLeave, true)})</span>`;
      } else if (result.status === 'exact') { label = 'RIGHT ON THE LINE'; message = 'No extra leave available without dipping below your goal.'; }
      else { label = 'YOUR NEXT STEP'; message = `Attend <strong>${fmt(result.needed)} more hours</strong> in a row to reach your goal. <span class="action-detail">(${hoursAndDays(result.needed)})</span>`; }
      $('main-action-label').textContent = label; $('main-action-text').innerHTML = message;
    } else {
      let message;
      if (result.percent === null) message = 'Add total hours to see your new outlook.';
      else if (result.status === 'above') { const leave = Math.floor(result.leave * 100) / 100; message = `There’s room for <strong>${fmt(leave)} more hours off</strong> (${hoursAndDays(leave, true)}).`; }
      else if (result.status === 'exact') message = 'Your plan is sitting right on your goal.';
      else message = `You’ll need <strong>${fmt(result.needed)} more hours in class</strong> (${hoursAndDays(result.needed)}).`;
      $('sim-action-text').innerHTML = message;
    }
  }
  function setMetric(id, value) { $(id).innerHTML = `${fmt(value)} <small>hrs</small>`; }
  function updateHint(key, value) {
    const ids = { present: 'present-hint', total: 'total-hint' };
    const words = { present: 'in class', total: 'in total' };
    $(ids[key]).textContent = `${fmt(convertToHours(value, state.units[key]))} hours ${words[key]}`;
  }
  function updateSimulation(original) {
    const extraPresent = state.presentUnits.day * 7 + state.presentUnits.four * 4 + state.presentUnits.one;
    const extraAbsent = state.leaveUnits.day * 7 + state.leaveUnits.four * 4 + state.leaveUnits.one;
    $('present-day-count').textContent = state.presentUnits.day;
    $('present-four-count').textContent = state.presentUnits.four;
    $('present-one-count').textContent = state.presentUnits.one;
    $('leave-day-count').textContent = state.leaveUnits.day;
    $('leave-four-count').textContent = state.leaveUnits.four;
    $('leave-one-count').textContent = state.leaveUnits.one;
    $('add-present-hint').innerHTML = `<strong>${fmt(extraPresent)} ${extraPresent === 1 ? 'hour' : 'hours'}</strong> added to attendance`;
    $('add-absent-hint').innerHTML = `<strong>${fmt(extraAbsent)} ${extraAbsent === 1 ? 'hour' : 'hours'}</strong> away from class`;
    const result = original.invalid ? { present: 0, total: 0, absent: 0, percent: null, status: 'exact' } : calculate(original.present + extraPresent, original.total + extraPresent + extraAbsent);
    $('sim-percentage').textContent = result.percent === null ? '—%' : `${fmt(result.percent)}%`;
    setMetric('sim-present', result.present); setMetric('sim-total', result.total); setMetric('sim-absent', result.absent);
    $('sim-requirement').innerHTML = `${state.requirement}<small>%</small>`;
    $('sim-present-label').textContent = `${fmt(result.present)} hrs present`;
    $('sim-total-label').textContent = `${fmt(result.total)} hrs total`;
    updateProgress('sim', result.percent); updateStatus('sim', result); updateAction('sim', result);
  }
  function updateMain() {
    const pv = read(inputs.present), tv = read(inputs.total);
    $('present-error').textContent = pv === null ? 'Use a number that is zero or greater.' : '';
    $('total-error').textContent = tv === null ? 'Use a number that is zero or greater.' : '';
    updateHint('present', pv || 0); updateHint('total', tv || 0);
    let present = pv === null ? 0 : convertToHours(pv, state.units.present);
    let total = tv === null ? 0 : convertToHours(tv, state.units.total);
    const invalid = pv === null || tv === null || present > total + 1e-9;
    let validation = '';
    if (pv !== null && tv !== null && present > total + 1e-9) {
      validation = 'Present hours can’t be greater than total working hours. Update either value to continue.';
      $('present-error').textContent = 'Cannot exceed total working hours.';
    } else if (total === 0) validation = 'Enter total working days or hours to calculate your attendance.';
    $('main-validation').textContent = validation;
    if (invalid) present = Math.min(present, total);
    const result = invalid ? { present, total, absent: Math.max(0, total - present), percent: null, status: 'exact' } : calculate(present, total);
    $('main-percentage').textContent = result.percent === null ? '—%' : `${fmt(result.percent)}%`;
    setMetric('main-present', result.present); setMetric('main-total', result.total); setMetric('main-absent', result.absent);
    $('goal-scale').textContent = `${state.requirement}%`; $('goal-chip').textContent = `${state.requirement}%`;
    updateProgress('main', result.percent); updateStatus('main', result); updateAction('main', result);
    updateSimulation({ ...result, invalid });
  }
  function setUnit(key, unit) {
    state.units[key] = unit;
    document.querySelectorAll(`[data-unit-for="${key}"]`).forEach(button => {
      const active = button.dataset.unit === unit;
      button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active));
    });
  }
  function resetSimulation() {
    state.presentUnits = { day: 0, four: 0, one: 0 };
    state.leaveUnits = { day: 0, four: 0, one: 0 };
    updateMain();
  }
  Object.values(inputs).forEach(input => input.addEventListener('input', updateMain));
  document.querySelectorAll('.switch button').forEach(button => button.addEventListener('click', () => {
    setUnit(button.dataset.unitFor, button.dataset.unit); updateMain();
  }));
  document.querySelectorAll('.requirements button').forEach(button => button.addEventListener('click', () => {
    state.requirement = Number(button.dataset.requirement);
    document.querySelectorAll('.requirements button').forEach(option => {
      const selected = option === button; option.classList.toggle('selected', selected); option.setAttribute('aria-pressed', String(selected));
    });
    updateMain();
  }));
  document.querySelectorAll('[data-leave-unit]').forEach(button => button.addEventListener('click', () => {
    const unit = button.dataset.leaveUnit;
    state.leaveUnits[unit] = Math.max(0, state.leaveUnits[unit] + Number(button.dataset.step));
    updateMain();
  }));
  document.querySelectorAll('[data-present-unit]').forEach(button => button.addEventListener('click', () => {
    const unit = button.dataset.presentUnit;
    state.presentUnits[unit] = Math.max(0, state.presentUnits[unit] + Number(button.dataset.step));
    updateMain();
  }));
  $('reset-simulation').addEventListener('click', resetSimulation);
  updateMain();
})();
