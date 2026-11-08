const data = window.TREINO_DATA;
const profileId = WorkoutStorage.getActiveProfile();
const profile = data.perfis[profileId];
ProfileUI.render();

const prescription = (exercise) => exercise.prescricao?.[profileId];
const exercisesFor = (day) => day.exercicios.filter(ex => {
  const p = prescription(ex);
  return p && p.series > 0 && String(p.texto).toUpperCase() !== 'DESCANSO';
});

const exerciseDone = (dayId, exercise) => {
  const p = prescription(exercise);
  if (!p || !p.series) return false;
  const saved = WorkoutStorage.getWorkout(dayId, profileId).exercises?.[exercise.id]?.sets || {};
  return Array.from({ length: p.series }, (_, i) => saved[String(i + 1)]?.done).every(Boolean);
};

const completedExercisesForDay = (day) => exercisesFor(day).filter(ex => exerciseDone(day.id, ex)).length;
const percentForDay = (day) => {
  const total = exercisesFor(day).length;
  return total ? Math.round((completedExercisesForDay(day) / total) * 100) : 0;
};

const weekdays = { 1: 'segunda', 2: 'terca', 3: 'quarta', 4: 'quinta', 5: 'sexta' };
const today = new Date();
const todayDay = data.dias.find(day => day.id === weekdays[today.getDay()]);

document.getElementById('todayDate').textContent = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'short', day: '2-digit', month: 'short'
}).format(today).replace('.', '');

document.getElementById('profileNameHero').textContent = profile.nome;

document.getElementById('programValidity').textContent = 'Plano 09/11 → 31/12 · revisão 30/11';

const renderToday = () => {
  const target = document.getElementById('todayWorkout');

  if (!todayDay) {
    target.innerHTML = `
      <article class="rest-card">
        <span class="eyebrow">RECUPERAÇÃO</span>
        <h3>Hoje não há sessão programada.</h3>
        <p>Use o dia para recuperação e retome o plano na segunda-feira.</p>
        <a class="primary-button" href="treino.html?dia=segunda">Ver segunda-feira <span>→</span></a>
      </article>`;
    return;
  }

  const list = exercisesFor(todayDay);
  if (!list.length) {
    target.innerHTML = `
      <article class="rest-card rest-profile">
        <span class="eyebrow">${todayDay.abreviacao} · ${profile.nome.toUpperCase()}</span>
        <h3>Dia de recuperação.</h3>
        <p>Na planilha revisada, quarta-feira é descanso para Fernanda. Wanderson faz condicionamento + core.</p>
        <a class="primary-button" href="orientacoes.html">Ver orientações <span>→</span></a>
      </article>`;
    return;
  }

  const percent = percentForDay(todayDay);
  target.innerHTML = `
    <article class="today-card">
      <img class="cover-image" src="${todayDay.imagem}" alt="">
      <div class="today-content">
        <span class="eyebrow">${todayDay.abreviacao} · ${profile.nome.toUpperCase()} · ${percent}%</span>
        <h3>${todayDay.nome}</h3>
        <p>${todayDay.foco}</p>
        <div class="meta-row">
          <span class="meta-chip">${list.length} exercícios</span>
          <span class="meta-chip">${todayDay.duracaoTexto}</span>
          <span class="meta-chip">RIR guiado</span>
        </div>
        <a class="primary-button" href="treino.html?dia=${todayDay.id}">
          ${percent ? 'Continuar treino' : 'Começar treino'} <span>→</span>
        </a>
      </div>
    </article>`;
};

const renderWeek = () => {
  document.getElementById('weekGrid').innerHTML = data.dias.map(day => {
    const list = exercisesFor(day);
    const rest = list.length === 0;
    const percent = percentForDay(day);
    const done = !rest && percent === 100;
    return `
      <a class="week-card ${rest ? 'rest-week-card' : ''}" href="treino.html?dia=${day.id}">
        <img src="${day.imagem}" alt="">
        <div class="week-card-body">
          <div class="week-card-day"><span>${day.abreviacao}</span><span>${rest ? 'DESCANSO' : `${list.length} EX.`}</span></div>
          <h3 class="week-title">${rest ? 'Recuperação' : day.nome}</h3>
          <p>${rest ? 'Sem treino para este perfil.' : day.foco}</p>
          <div class="mini-progress"><span style="width:${rest ? 0 : percent}%"></span></div>
          <div class="week-card-status ${done ? 'done' : ''}">${rest ? 'Descanso' : done ? '✓ Concluído' : `${percent}% concluído`}</div>
        </div>
      </a>`;
  }).join('');
};

const trainableDays = data.dias.filter(day => exercisesFor(day).length > 0);
const weekTotal = trainableDays.reduce((sum, day) => sum + exercisesFor(day).length, 0);
const weekDone = trainableDays.reduce((sum, day) => sum + completedExercisesForDay(day), 0);
document.getElementById('weekPercent').textContent = `${weekTotal ? Math.round((weekDone / weekTotal) * 100) : 0}%`;

renderToday();
renderWeek();

let deferredPrompt;
const installButton = document.getElementById('installButton');
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  deferredPrompt = event;
  if (installButton) installButton.hidden = false;
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
