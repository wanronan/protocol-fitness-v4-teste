const params = new URLSearchParams(location.search);
const dayId = params.get('dia') || 'segunda';
const day = window.TREINO_DATA.dias.find(item => item.id === dayId) || window.TREINO_DATA.dias[0];
let state = WorkoutStorage.getWorkout(day.id);

document.title = `${day.nome} • PUSH/PULL`;

const totalExercises = day.exercicios.length;
const countDone = () => day.exercicios.reduce((sum, ex) => {
  const item = state.sets?.[ex.id]?.["1"];
  return sum + (item?.done ? 1 : 0);
}, 0);

document.getElementById('workoutHeader').innerHTML = `
  <article class="workout-cover">
    <img src="${day.imagem}" alt="">
    <div class="workout-cover-copy">
      <span class="eyebrow">${day.dia.toUpperCase()} • ${day.duracao} MIN</span>
      <h1>${day.nome}</h1>
      <p>${day.foco}</p>
    </div>
  </article>`;

const getItem = (exerciseId) => state.sets?.[exerciseId]?.["1"] || {};

const formatSeries = ex => `${ex.series}x${ex.repeticoes}`;

const exerciseImages = {
  'leg-press-45': 'assets/exercises/leg-press-45.webp',
  'hack-squat-articulado': 'assets/exercises/hack-squat-articulado.webp',
  'cadeira-extensora': 'assets/exercises/cadeira-extensora.webp',
  'adutora': 'assets/exercises/adutora.webp',
  'panturrilha-leg': 'assets/exercises/panturrilha-leg.webp',
  'supino-inclinado': 'assets/exercises/supino-inclinado.webp',
  'peck-deck-superior': 'assets/exercises/peck-deck-superior.webp',
  'supino-reto': 'assets/exercises/supino-reto.webp',
  'crucifixo-crossover': 'assets/exercises/crucifixo-crossover.webp',
  'desenvolvimento-maquina': 'assets/exercises/desenvolvimento-maquina.webp',
  'elevacao-lateral': 'assets/exercises/elevacao-lateral.webp',
  'triceps-pulley-v': 'assets/exercises/triceps-pulley-v.webp',
  'triceps-frances': 'assets/exercises/triceps-frances.webp',
  'mesa-flexora': 'assets/exercises/mesa-flexora.webp',
  'flexora-sentada': 'assets/exercises/flexora-sentada.webp',
  'elevacao-pelvica': 'assets/exercises/elevacao-pelvica.webp',
  'leg-press-altos': 'assets/exercises/leg-press-altos.webp',
  'abdutora': 'assets/exercises/abdutora.webp',
  'panturrilha-sentada': 'assets/exercises/panturrilha-sentada.webp',
  'puxada-alta': 'assets/exercises/puxada-alta.webp',
  'remada-articulada': 'assets/exercises/remada-articulada.webp',
  'remada-unilateral-maquina': 'assets/exercises/remada-unilateral-maquina.webp',
  'pulldown': 'assets/exercises/pulldown.webp',
  'crucifixo-inverso': 'assets/exercises/crucifixo-inverso.webp',
  'rosca-direta': 'assets/exercises/rosca-direta.webp',
  'rosca-inclinada': 'assets/exercises/rosca-inclinada.webp',
  'rosca-martelo': 'assets/exercises/rosca-martelo.webp',
  'leg-press-medios': 'assets/exercises/leg-press-medios.webp',
  'cadeira-extensora-sexta': 'assets/exercises/cadeira-extensora-sexta.webp',
  'mesa-flexora-sexta': 'assets/exercises/mesa-flexora-sexta.webp',
  'elevacao-pelvica-sexta': 'assets/exercises/elevacao-pelvica-sexta.webp',
  'panturrilha-sexta': 'assets/exercises/panturrilha-sexta.webp'
};

const getExerciseImage = (exercise) => exerciseImages[exercise.id] || day.imagem;

const renderExercises = () => {
  document.getElementById('exerciseList').innerHTML = day.exercicios.map((exercise) => {
    const saved = getItem(exercise.id);
    return `
      <article class="premium-exercise-card ${saved.done ? 'done' : ''}">
        <div class="exercise-art">
          <img src="${getExerciseImage(exercise)}" alt="Ilustração de ${exercise.nome}" loading="lazy">
        </div>

        <div class="premium-ex-content">
          <h2>${exercise.nome}</h2>
          <span class="series-label">SÉRIES × REPETIÇÕES</span>
          <div class="series-display" aria-label="${exercise.series} séries de ${exercise.repeticoes} repetições">
            <strong>${exercise.series}</strong><span>×</span><b>${exercise.repeticoes}</b>
          </div>
        </div>

        <div class="premium-ex-actions">
          <button class="exercise-check ${saved.done ? 'done' : ''}"
            data-action="check" data-exercise="${exercise.id}"
            aria-label="Marcar ${exercise.nome} como feito">${saved.done ? '✓' : ''}</button>

          <label class="compact-weight-wrap">
            <span>Carga kg</span>
            <div class="compact-weight-field">
              <input inputmode="decimal" type="number" min="0" step="0.5"
                aria-label="Peso do exercício ${exercise.nome}"
                data-field="weight" data-exercise="${exercise.id}"
                value="${saved.weight ?? ''}" placeholder="0">
              <em>kg</em>
            </div>
          </label>
        </div>
      </article>`;
  }).join('');
};

const updateProgress = () => {
  state = WorkoutStorage.getWorkout(day.id);
  const done = countDone();
  const percent = Math.round((done / totalExercises) * 100);
  document.getElementById('progressLabel').textContent = `${done} de ${totalExercises} exercícios`;
  document.getElementById('progressPercent').textContent = `${percent}%`;
  document.getElementById('progressBar').style.width = `${percent}%`;
  return percent;
};

document.getElementById('exerciseList').addEventListener('change', event => {
  const input = event.target.closest('input[data-field]');
  if (!input) return;
  const exerciseId = input.dataset.exercise;
  const existing = getItem(exerciseId);
  WorkoutStorage.saveSet(day.id, exerciseId, 1, {
    ...existing,
    weight: input.value === '' ? '' : Number(input.value)
  });
  state = WorkoutStorage.getWorkout(day.id);
});

document.getElementById('exerciseList').addEventListener('click', event => {
  const button = event.target.closest('[data-action="check"]');
  if (!button) return;
  const exerciseId = button.dataset.exercise;
  const existing = getItem(exerciseId);
  const nowDone = !existing.done;

  WorkoutStorage.saveSet(day.id, exerciseId, 1, {
    ...existing,
    done: nowDone
  });
  state = WorkoutStorage.getWorkout(day.id);

  const card = button.closest('.premium-exercise-card');
  card.classList.toggle('done', nowDone);
  button.classList.toggle('done', nowDone);
  button.textContent = nowDone ? '✓' : '';
  updateProgress();
});

document.getElementById('finishWorkout').addEventListener('click', () => {
  const percent = updateProgress();
  const confirmed = confirm(percent < 100
    ? `O treino está ${percent}% concluído. Deseja finalizar mesmo assim?`
    : 'Finalizar e salvar este treino?');
  if (!confirmed) return;
  WorkoutStorage.finishWorkout(day.id, day.nome, percent);
  alert('Treino salvo.');
  location.href = 'progresso.html';
});

renderExercises();
updateProgress();
