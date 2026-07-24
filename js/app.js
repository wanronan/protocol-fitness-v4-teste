const data = window.TREINO_DATA;
const state = WorkoutStorage.load();

const totalExercises = day => day.exercicios.length;

const completedExercisesForDay = day => {
  const saved = state.workouts[day.id]?.sets || {};
  return day.exercicios.reduce((sum, ex) => {
    const item = saved[ex.id]?.["1"];
    return sum + (item?.done ? 1 : 0);
  }, 0);
};

const percentForDay = day => {
  const total = totalExercises(day);
  return total ? Math.round((completedExercisesForDay(day) / total) * 100) : 0;
};

const weekdays = { 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta' };
const today = new Date();
const dayId = weekdays[today.getDay()];
const todayWorkout = data.dias.find(day => day.id === dayId);

document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short', day: '2-digit', month: 'short'
}).format(today).replace('.', '');

const renderToday = () => {
  const target = document.getElementById('todayWorkout');
  if (!todayWorkout) {
    const next = data.dias[0];
    target.innerHTML = `
      <article class="rest-card">
        <span class="eyebrow">RECUPERAÇÃO</span>
        <h3>Hoje é dia de descanso.</h3>
        <p>Cardio leve é opcional. A próxima sessão é <strong>${next.nome}</strong>.</p>
        <a class="primary-button" href="treino.html?dia=${next.id}">Ver próxima sessão <span>→</span></a>
      </article>`;
    return;
  }

  const percent = percentForDay(todayWorkout);
  target.innerHTML = `
    <article class="today-card">
      <img class="cover-image" src="${todayWorkout.imagem}" alt="">
      <div class="today-content">
        <span class="eyebrow">${todayWorkout.abreviacao} • ${percent}% CONCLUÍDO</span>
        <h3>${todayWorkout.nome}</h3>
        <p>${todayWorkout.foco}</p>
        <div class="meta-row">
          <span class="meta-chip">${todayWorkout.exercicios.length} exercícios</span>
          <span class="meta-chip">~${todayWorkout.duracao} min</span>
          <span class="meta-chip">Peso editável</span>
        </div>
        <a class="primary-button" href="treino.html?dia=${todayWorkout.id}">
          ${percent ? 'Continuar treino' : 'Iniciar treino'} <span>→</span>
        </a>
      </div>
    </article>`;
};

const renderWeek = () => {
  document.getElementById('weekGrid').innerHTML = data.dias.map(day => {
    const percent = percentForDay(day);
    const done = percent === 100 || state.workouts[day.id]?.finished;
    return `
      <a class="week-card" href="treino.html?dia=${day.id}">
        <img src="${day.imagem}" alt="">
        <div class="week-card-body">
          <div class="week-card-day"><span>${day.abreviacao}</span><span>${day.exercicios.length} EX.</span></div>
          <h3 class="week-title">${day.nome}</h3>
          <p>${day.foco}</p>
          <div class="mini-progress"><span style="width:${percent}%"></span></div>
          <div class="week-card-status ${done ? 'done' : ''}">${done ? '✓ Concluído' : `${percent}% concluído`}</div>
        </div>
      </a>`;
  }).join('');
};

const weekTotal = data.dias.reduce((sum, day) => sum + totalExercises(day), 0);
const weekDone = data.dias.reduce((sum, day) => sum + completedExercisesForDay(day), 0);
document.getElementById('weekPercent').textContent = `${weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0}%`;

renderToday();
renderWeek();

let deferredPrompt;
const installButton = document.getElementById('installButton');
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredPrompt = event;
  installButton.hidden = false;
});
if (installButton) {
  installButton.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    deferredPrompt = null;
    installButton.hidden = true;
  });
}

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./service-worker.js').catch(() => {});
}
