const data = window.TREINO_DATA;
const state = WorkoutStorage.load();

const totalExercises = day => day.exercicios.length;
const completed = day => {
  const sets = state.workouts[day.id]?.sets || {};
  return day.exercicios.reduce((sum, ex) => sum + ((sets[ex.id]?.["1"]?.done) ? 1 : 0), 0);
};
const percent = day => Math.round((completed(day) / totalExercises(day)) * 100);

const totalDone = data.dias.reduce((sum, day) => sum + completed(day), 0);
const workoutsStarted = data.dias.filter(day => completed(day) > 0).length;
const workoutsFinished = state.history.length;

document.getElementById('metricGrid').innerHTML = `
  <article class="metric-card"><span>EXERCÍCIOS FEITOS</span><strong>${totalDone}</strong><small>neste navegador</small></article>
  <article class="metric-card"><span>TREINOS INICIADOS</span><strong>${workoutsStarted}</strong><small>na semana</small></article>
  <article class="metric-card"><span>SESSÕES SALVAS</span><strong>${workoutsFinished}</strong><small>no histórico</small></article>`;

document.getElementById('weekChart').innerHTML = data.dias.map(day => `
  <div class="chart-row">
    <span>${day.abreviacao} · ${day.nome.split(' ')[0]}</span>
    <div class="chart-bar"><i style="width:${percent(day)}%"></i></div>
    <strong>${percent(day)}%</strong>
  </div>`).join('');

const history = state.history || [];
document.getElementById('historyList').innerHTML = history.length
  ? history.map(item => `
      <article class="history-item">
        <div>
          <h3>${item.name}</h3>
          <p>${new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(item.date))}</p>
        </div>
        <strong>${item.percent}%</strong>
      </article>`).join('')
  : `<div class="empty-state">Finalize um treino para criar o primeiro registro.</div>`;

document.getElementById('resetData').addEventListener('click', () => {
  if (!confirm('Apagar todos os registros salvos neste navegador?')) return;
  WorkoutStorage.reset();
  location.reload();
});
