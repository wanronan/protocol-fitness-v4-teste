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

const renderExercises = () => {
  document.getElementById('exerciseList').innerHTML = day.exercicios.map((exercise) => {
    const saved = getItem(exercise.id);
    return `
      <article class="simple-exercise-card ${saved.done ? 'done' : ''}">
        <div class="simple-ex-top">
          <div>
            <h2>${exercise.nome}</h2>
            <p>${formatSeries(exercise)}</p>
          </div>
          <button class="exercise-check ${saved.done ? 'done' : ''}"
            data-action="check" data-exercise="${exercise.id}"
            aria-label="Marcar ${exercise.nome} como feito">${saved.done ? '✓' : ''}</button>
        </div>

        <div class="simple-ex-bottom">
          <label class="simple-weight-wrap">
            <input inputmode="decimal" type="number" min="0" step="0.5"
              aria-label="Peso do exercício ${exercise.nome}"
              data-field="weight" data-exercise="${exercise.id}"
              value="${saved.weight ?? ''}" placeholder="Carga em kg">
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

  const card = button.closest('.simple-exercise-card');
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
