const data = window.TREINO_DATA;
const profileId = WorkoutStorage.getActiveProfile();
const profile = data.perfis[profileId];
ProfileUI.render();

const profileState = () => WorkoutStorage.getProfile(profileId);
const prescription = (exercise) => exercise.prescricao?.[profileId];
const exercisesFor = (day) => day.exercicios.filter(ex => {
  const p = prescription(ex);
  return p && p.series > 0 && String(p.texto).toUpperCase() !== 'DESCANSO';
});

const completed = (day) => {
  const workout = WorkoutStorage.getWorkout(day.id, profileId);
  return exercisesFor(day).filter(ex => {
    const p = prescription(ex);
    const sets = workout.exercises?.[ex.id]?.sets || {};
    return Array.from({ length: p.series }, (_, i) => sets[String(i + 1)]?.done).every(Boolean);
  }).length;
};

const percent = (day) => {
  const total = exercisesFor(day).length;
  return total ? Math.round((completed(day) / total) * 100) : 0;
};

const renderAll = () => {
  const pState = profileState();
  const activeDays = data.dias.filter(day => exercisesFor(day).length);
  const totalDone = activeDays.reduce((sum, day) => sum + completed(day), 0);
  const workoutsStarted = activeDays.filter(day => completed(day) > 0).length;
  const workoutsFinished = pState.history.length;

  document.getElementById('progressProfileName').textContent = profile.nome;
  document.getElementById('metricGrid').innerHTML = `
    <article class="metric-card"><span>EXERCÍCIOS FEITOS</span><strong>${totalDone}</strong><small>nesta semana</small></article>
    <article class="metric-card"><span>TREINOS INICIADOS</span><strong>${workoutsStarted}</strong><small>de ${activeDays.length} programados</small></article>
    <article class="metric-card"><span>SESSÕES SALVAS</span><strong>${workoutsFinished}</strong><small>histórico de ${profile.nome}</small></article>`;

  document.getElementById('weekChart').innerHTML = data.dias.map(day => {
    const total = exercisesFor(day).length;
    if (!total) return `
      <div class="chart-row rest-chart-row">
        <span>${day.abreviacao}</span><div class="chart-rest">Descanso</div><strong>—</strong>
      </div>`;
    return `
      <div class="chart-row">
        <span>${day.abreviacao}</span>
        <div class="chart-bar"><i style="width:${percent(day)}%"></i></div>
        <strong>${percent(day)}%</strong>
      </div>`;
  }).join('');

  const history = pState.history || [];
  document.getElementById('historyList').innerHTML = history.length
    ? history.map(item => `
        <article class="history-item">
          <div>
            <h3>${item.name}</h3>
            <p>${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.date))}${item.legacy ? ' · V4' : ''}</p>
          </div>
          <strong>${item.percent}%</strong>
        </article>`).join('')
    : `<div class="empty-state">Finalize um treino para criar o primeiro registro de ${profile.nome}.</div>`;

  renderBodyProgress();
};

const fieldLabels = {
  peso: ['Peso', 'kg'], gordura: ['Gordura', '%'], massaMuscular: ['Massa muscular', 'kg'],
  cintura: ['Cintura', 'cm'], abdomen: ['Abdômen', 'cm'], quadril: ['Quadril', 'cm'], visceral: ['Gordura visceral', 'índice']
};

const renderBodyProgress = () => {
  const baseline = data.baseline[profileId] || {};
  const measures = profileState().measures || [];
  const latest = measures[0];
  const cards = [];

  Object.entries(fieldLabels).forEach(([key, [label, unit]]) => {
    const base = baseline[key];
    const current = latest?.[key];
    if (base === undefined && current === undefined) return;
    let delta = '';
    if (base !== undefined && current !== undefined && current !== '') {
      const diff = Number(current) - Number(base);
      delta = `<small>${diff > 0 ? '+' : ''}${diff.toFixed(1)} ${unit} desde o Dia Zero</small>`;
    } else if (base !== undefined) {
      delta = `<small>Dia Zero: ${base} ${unit}</small>`;
    }
    cards.push(`<article class="body-metric-card"><span>${label}</span><strong>${current ?? base} <em>${unit}</em></strong>${delta}</article>`);
  });

  document.getElementById('bodyMetrics').innerHTML = cards.length
    ? cards.join('')
    : `<div class="empty-state">A planilha revisada não traz Dia Zero de ${profile.nome}. Você pode registrar a primeira avaliação abaixo.</div>`;
};

document.getElementById('measureForm').addEventListener('submit', event => {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const record = { date: form.get('date') || new Date().toISOString().slice(0, 10) };
  ['peso','gordura','massaMuscular','cintura','abdomen','quadril','visceral'].forEach(key => {
    const value = form.get(key);
    if (value !== '') record[key] = Number(value);
  });
  WorkoutStorage.saveMeasure(record, profileId);
  event.currentTarget.reset();
  document.getElementById('measureDate').value = new Date().toISOString().slice(0,10);
  renderAll();
});

document.getElementById('measureDate').value = new Date().toISOString().slice(0,10);

document.getElementById('resetData').addEventListener('click', () => {
  if (!confirm(`Apagar histórico, cargas e medições de ${profile.nome} neste aparelho?`)) return;
  WorkoutStorage.resetProfile(profileId);
  location.reload();
});

renderAll();
