const data = window.TREINO_DATA;
let state = WorkoutStorage.load();
let calendarDate = new Date();
let showAllHistory = false;

const formatNumber = (value, digits = 0) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: digits });
const formatDuration = (seconds) => {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  return hours ? `${hours}h ${String(minutes).padStart(2, '0')}min` : `${minutes}min`;
};
const localDateKey = (value) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const downloadFile = (filename, content, type) => {
  const blob = new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};
const totalExercises = (day) => day.exercicios.length;
const completed = (day) => {
  const sets = state.workouts[day.id]?.sets || {};
  return day.exercicios.reduce((sum, exercise) => sum + (sets[exercise.id]?.['1']?.done ? 1 : 0), 0);
};
const percent = (day) => totalExercises(day) ? Math.round(completed(day) / totalExercises(day) * 100) : 0;
const history = () => state.history || [];
const currentWeekHistory = () => history().filter((session) => (session.weekKey || WorkoutStorage.weekKey(session.date)) === state.activeWeek);

const completedDateSet = () => new Set(history().filter((item) => Number(item.percent || 0) > 0).map((item) => localDateKey(item.date)));

const adherence30 = () => {
  const completedDates = completedDateSet();
  let planned = 0;
  let done = 0;
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - 29);
  for (let date = new Date(start); date <= today; date.setDate(date.getDate() + 1)) {
    const weekday = date.getDay();
    if (weekday >= 1 && weekday <= 5) {
      planned += 1;
      if (completedDates.has(localDateKey(date))) done += 1;
    }
  }
  return planned ? Math.round(done / planned * 100) : 0;
};

const renderMetrics = () => {
  const sessions = history();
  const weekSessions = currentWeekHistory().length;
  const totalVolume = sessions.reduce((sum, item) => sum + Number(item.totalVolume || 0), 0);
  const totalPrs = sessions.reduce((sum, item) => sum + Number(item.prs || 0), 0);
  document.getElementById('metricGrid').innerHTML = `
    <article class="metric-card"><span>TREINOS NA SEMANA</span><strong>${weekSessions}/5</strong><small>${Math.round(weekSessions / 5 * 100)}% de adesão</small></article>
    <article class="metric-card"><span>VOLUME ACUMULADO</span><strong>${formatNumber(totalVolume)} kg</strong><small>histórico completo</small></article>
    <article class="metric-card"><span>RECORDES DE CARGA</span><strong>${totalPrs}</strong><small>melhores marcas</small></article>
    <article class="metric-card"><span>ADESÃO 30 DIAS</span><strong>${adherence30()}%</strong><small>dias planejados</small></article>`;
};

const renderWeekChart = () => {
  document.getElementById('weekChart').innerHTML = data.dias.map((day) => `
    <div class="chart-row">
      <span>${day.abreviacao} · ${day.nome.split(' ')[0]}</span>
      <div class="chart-bar"><i style="width:${percent(day)}%"></i></div>
      <strong>${percent(day)}%</strong>
    </div>`).join('');
};

const renderCalendar = () => {
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startOffset = first.getDay();
  const completedDates = completedDateSet();
  const todayKey = localDateKey(new Date());
  document.getElementById('calendarLabel').textContent = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric' }).format(first);

  const cells = [];
  for (let i = 0; i < startOffset; i += 1) cells.push('<span class="calendar-day empty"></span>');
  for (let dayNumber = 1; dayNumber <= last.getDate(); dayNumber += 1) {
    const date = new Date(year, month, dayNumber);
    const key = localDateKey(date);
    const isDone = completedDates.has(key);
    const isToday = key === todayKey;
    cells.push(`<span class="calendar-day ${isDone ? 'done' : ''} ${isToday ? 'today' : ''}"><b>${dayNumber}</b>${isDone ? '<i>✓</i>' : ''}</span>`);
  }
  document.getElementById('trainingCalendar').innerHTML = cells.join('');
};

document.getElementById('prevMonth').onclick = () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1); renderCalendar(); };
document.getElementById('nextMonth').onclick = () => { calendarDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1); renderCalendar(); };

const allExerciseOptions = () => {
  const map = new Map();
  data.dias.forEach((day) => day.exercicios.forEach((exercise) => map.set(exercise.id, { id: exercise.id, name: exercise.nome })));
  history().forEach((session) => (session.exercises || []).forEach((exercise) => {
    if (exercise.id && exercise.name) map.set(exercise.id, { id: exercise.id, name: exercise.name });
  }));
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
};

const renderExerciseSelect = () => {
  const select = document.getElementById('exerciseSelect');
  const previous = select.value;
  const options = allExerciseOptions();
  select.innerHTML = options.map((item) => `<option value="${item.id}">${item.name}</option>`).join('');
  if (options.some((item) => item.id === previous)) select.value = previous;
  renderExerciseChart();
};

const renderExerciseChart = () => {
  const id = document.getElementById('exerciseSelect').value;
  const records = WorkoutStorage.historyForExercise(id, id).filter((item) => Number(item.weight || 0) > 0).slice(0, 12).reverse();
  const chart = document.getElementById('exerciseChart');
  const summary = document.getElementById('exerciseSummary');
  if (!records.length) {
    chart.innerHTML = '<div class="empty-state">Finalize um treino com carga registrada para criar este gráfico.</div>';
    summary.innerHTML = '';
    return;
  }

  const values = records.map((item) => Number(item.weight || 0));
  const positive = values.filter((value) => value > 0);
  if (!positive.length) {
    chart.innerHTML = '<div class="empty-state">Ainda não há cargas registradas para este exercício.</div>';
    summary.innerHTML = '';
    return;
  }

  const width = 760;
  const height = 250;
  const padX = 42;
  const padY = 28;
  const min = Math.min(...positive);
  const max = Math.max(...positive);
  const range = Math.max(1, max - min);
  const points = records.map((item, index) => {
    const x = records.length === 1 ? width / 2 : padX + index / (records.length - 1) * (width - padX * 2);
    const y = padY + (max - Number(item.weight || 0)) / range * (height - padY * 2);
    return { x, y, value: Number(item.weight || 0), date: item.sessionDate };
  });
  const line = points.map((point) => `${point.x},${point.y}`).join(' ');
  const area = `${points[0].x},${height - padY} ${line} ${points.at(-1).x},${height - padY}`;

  chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Evolução de carga">
      <defs><linearGradient id="loadArea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ff7a00" stop-opacity=".32"/><stop offset="1" stop-color="#ff7a00" stop-opacity="0"/></linearGradient></defs>
      <line x1="${padX}" y1="${padY}" x2="${padX}" y2="${height - padY}" stroke="rgba(255,255,255,.08)"/>
      <line x1="${padX}" y1="${height - padY}" x2="${width - padX}" y2="${height - padY}" stroke="rgba(255,255,255,.08)"/>
      <polyline points="${area}" fill="url(#loadArea)" stroke="none"></polyline>
      <polyline points="${line}" fill="none" stroke="#ff8a1f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></polyline>
      ${points.map((point) => `<circle cx="${point.x}" cy="${point.y}" r="6" fill="#0a1119" stroke="#ffb25f" stroke-width="3"><title>${formatNumber(point.value, 1)} kg • ${new Date(point.date).toLocaleDateString('pt-BR')}</title></circle>`).join('')}
      <text x="${padX}" y="${height - 6}" fill="#8494a6" font-size="11">${new Date(records[0].sessionDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</text>
      <text x="${width - padX}" y="${height - 6}" fill="#8494a6" font-size="11" text-anchor="end">${new Date(records.at(-1).sessionDate).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</text>
    </svg>`;

  const first = positive[0];
  const latest = positive.at(-1);
  const best = Math.max(...positive);
  const change = first ? (latest - first) / first * 100 : 0;
  summary.innerHTML = `
    <div><span>Primeira carga</span><strong>${formatNumber(first, 1)} kg</strong></div>
    <div><span>Carga atual</span><strong>${formatNumber(latest, 1)} kg</strong></div>
    <div><span>Recorde</span><strong>${formatNumber(best, 1)} kg</strong></div>
    <div><span>Evolução</span><strong class="${change >= 0 ? 'positive' : 'negative'}">${change >= 0 ? '+' : ''}${formatNumber(change, 1)}%</strong></div>`;
};

document.getElementById('exerciseSelect').addEventListener('change', renderExerciseChart);

const groupLabel = (group = '') => {
  const value = group.toLowerCase();
  if (value.includes('quadr')) return 'Quadríceps';
  if (value.includes('posterior')) return 'Posterior';
  if (value.includes('glúte') || value.includes('glute')) return 'Glúteos';
  if (value.includes('panturr')) return 'Panturrilhas';
  if (value.includes('peito')) return 'Peito';
  if (value.includes('ombro')) return 'Ombros';
  if (value.includes('tríce') || value.includes('trice')) return 'Tríceps';
  if (value.includes('costa')) return 'Costas';
  if (value.includes('bíce') || value.includes('bice')) return 'Bíceps';
  if (value.includes('adutor')) return 'Adutores';
  if (value.includes('perna')) return 'Pernas';
  return group || 'Outros';
};

const renderMuscleVolume = () => {
  const groups = {};
  currentWeekHistory().forEach((session) => (session.exercises || []).forEach((exercise) => {
    if (!exercise.done) return;
    const label = groupLabel(exercise.group);
    groups[label] = (groups[label] || 0) + Number(exercise.volume || 0);
  }));
  const rows = Object.entries(groups).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rows.map((item) => item[1]));
  document.getElementById('volumeWeekLabel').textContent = `Semana de ${new Date(`${state.activeWeek}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '')}`;
  document.getElementById('muscleVolumeChart').innerHTML = rows.length
    ? rows.map(([label, value]) => `<div class="muscle-row"><span>${label}</span><div><i style="width:${Math.round(value / max * 100)}%"></i></div><strong>${formatNumber(value)} kg</strong></div>`).join('')
    : '<div class="empty-state">Finalize os treinos da semana para visualizar o volume por grupo muscular.</div>';
};

const renderHistory = () => {
  const items = showAllHistory ? history() : history().slice(0, 8);
  document.getElementById('toggleHistory').textContent = showAllHistory ? 'Mostrar menos' : 'Ver todas';
  document.getElementById('historyList').innerHTML = items.length
    ? items.map((item) => `
      <article class="history-item v56-history-item">
        <div class="history-date"><strong>${new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit' })}</strong><span>${new Date(item.date).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')}</span></div>
        <div class="history-main"><h3>${item.name}</h3><p>${item.completedExercises || 0}/${item.totalExercises || 0} exercícios • ${item.totalSeries || 0} séries • esforço ${item.sessionRpe || '—'}/10</p>${item.note ? `<small>${item.note}</small>` : ''}</div>
        <div class="history-values"><strong>${formatNumber(item.totalVolume)} kg</strong><span>${formatDuration(item.durationSeconds)}</span>${item.prs ? `<em>🏆 ${item.prs} PR</em>` : ''}</div>
      </article>`).join('')
    : '<div class="empty-state">Finalize um treino para criar o primeiro registro.</div>';
};

document.getElementById('toggleHistory').onclick = () => { showAllHistory = !showAllHistory; renderHistory(); };

const csvEscape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const exportCsv = () => {
  const headers = ['Data', 'Treino', 'Exercício', 'Grupo', 'Séries', 'Repetições', 'Carga kg', 'RIR', 'Volume kg', 'Feito', 'Substituído', 'Duração min', 'RPE da sessão'];
  const rows = [headers.map(csvEscape).join(';')];
  history().slice().reverse().forEach((session) => {
    const exercises = session.exercises?.length ? session.exercises : [{ name: '', group: '' }];
    exercises.forEach((exercise) => rows.push([
      new Date(session.date).toLocaleString('pt-BR'), session.name, exercise.name, exercise.group,
      exercise.series, exercise.reps, exercise.weight, exercise.rir, exercise.volume,
      exercise.done ? 'Sim' : 'Não', exercise.isSubstitution ? 'Sim' : 'Não',
      Math.round(Number(session.durationSeconds || 0) / 60), session.sessionRpe,
    ].map(csvEscape).join(';')));
  });
  downloadFile(`protocol-fitness-historico-${localDateKey(new Date())}.csv`, `\uFEFF${rows.join('\n')}`, 'text/csv;charset=utf-8');
};

document.getElementById('exportBackup').onclick = () => {
  downloadFile(`protocol-fitness-backup-${localDateKey(new Date())}.json`, JSON.stringify(WorkoutStorage.exportState(), null, 2), 'application/json');
};
document.getElementById('exportCsv').onclick = exportCsv;
document.getElementById('importBackup').onclick = () => document.getElementById('backupFile').click();
document.getElementById('backupFile').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const payload = JSON.parse(await file.text());
    if (!confirm('Restaurar este backup? Os dados atuais serão substituídos.')) return;
    WorkoutStorage.importState(payload);
    alert('Backup restaurado com sucesso.');
    location.reload();
  } catch (error) {
    alert(error.message || 'Não foi possível importar o backup.');
  } finally {
    event.target.value = '';
  }
});

document.getElementById('resetData').onclick = () => {
  if (!confirm('Apagar todos os registros deste navegador? Esta ação não pode ser desfeita.')) return;
  WorkoutStorage.reset();
  location.reload();
};
document.getElementById('refreshPage').onclick = () => location.reload();

const preferences = WorkoutStorage.getPreferences();
document.getElementById('progressionPercent').value = preferences.progressionPercent || 2.5;
document.getElementById('timerSound').checked = preferences.timerSound !== false;
document.getElementById('settingsForm').onsubmit = (event) => {
  event.preventDefault();
  WorkoutStorage.savePreferences({
    progressionPercent: Number(document.getElementById('progressionPercent').value || 2.5),
    timerSound: document.getElementById('timerSound').checked,
  });
  alert('Ajustes salvos.');
};

renderMetrics();
renderWeekChart();
renderCalendar();
renderExerciseSelect();
renderMuscleVolume();
renderHistory();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./service-worker.js?v=20260725-1').catch(() => {});
}
