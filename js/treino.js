const params = new URLSearchParams(location.search);
const dayId = params.get('dia') || 'segunda';
const data = window.TREINO_DATA;
const day = data.dias.find(item => item.id === dayId) || data.dias[0];
const profileId = WorkoutStorage.getActiveProfile();
const profile = data.perfis[profileId];
ProfileUI.render();

const prescription = (exercise) => exercise.prescricao?.[profileId];
const exercises = day.exercicios.filter(ex => {
  const p = prescription(ex);
  return p && p.series > 0 && String(p.texto).toUpperCase() !== 'DESCANSO';
});

document.title = `${day.nome} · ${profile.nome} · Protocol Fitness`;

const workoutState = () => WorkoutStorage.getWorkout(day.id, profileId);
const exerciseState = (exerciseId) => workoutState().exercises?.[exerciseId] || { weight: '', sets: {} };

const isExerciseDone = (exercise) => {
  const p = prescription(exercise);
  const sets = exerciseState(exercise.id).sets || {};
  return Array.from({ length: p.series }, (_, i) => sets[String(i + 1)]?.done).every(Boolean);
};

const rirText = (rir) => {
  if (!rir || rir === '—') return '';
  if (rir.toLowerCase().includes('técnica')) return 'Foque na execução, sem pressa.';
  if (rir.toLowerCase().includes('leve')) return 'Ritmo confortável, ainda conseguindo conversar.';
  return `Pare sentindo que ainda faria ${rir} repetição${rir === '1' ? '' : 'ões'} com boa técnica.`;
};

const displayPrescription = (text) => {
  const parts = String(text).split('×').map(s => s.trim());
  if (parts.length === 2) return `<strong>${parts[0]}</strong><span>×</span><b>${parts[1]}</b>`;
  return `<b class="single-prescription">${text}</b>`;
};

const getExerciseArt = (exercise) => {
  if (exercise.imagem) {
    return `<img src="${exercise.imagem}" alt="Referência visual de ${exercise.nome}" loading="lazy">`;
  }
  return `<div class="exercise-media-placeholder" aria-label="Demonstração visual ainda não adicionada">
    <span>▶</span><small>GUIA VISUAL<br>EM BREVE</small>
  </div>`;
};

const renderHeader = () => {
  document.getElementById('workoutHeader').innerHTML = `
    <article class="workout-cover">
      <img src="${day.imagem}" alt="">
      <div class="workout-cover-copy">
        <span class="eyebrow">${day.dia.toUpperCase()} · ${profile.nome.toUpperCase()} · ${day.duracaoTexto}</span>
        <h1>${exercises.length ? day.nome : 'Recuperação'}</h1>
        <p>${exercises.length ? day.foco : 'Sem sessão programada para este perfil.'}</p>
      </div>
    </article>`;
};

let timerRemaining = 0;
let timerInitial = 0;
let timerInterval = null;
const timerSheet = document.getElementById('timerSheet');
const timerValue = document.getElementById('timerValue');
const timerExercise = document.getElementById('timerExercise');

const formatTime = (seconds) => {
  const s = Math.max(0, seconds);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};

const paintTimer = () => {
  timerValue.textContent = formatTime(timerRemaining);
  if (timerRemaining <= 0) timerValue.classList.add('done');
  else timerValue.classList.remove('done');
};

const stopTimer = () => {
  clearInterval(timerInterval);
  timerInterval = null;
  timerSheet.classList.remove('open');
};

const startTimer = (seconds, exerciseName) => {
  if (!seconds) return;
  clearInterval(timerInterval);
  timerInitial = seconds;
  timerRemaining = seconds;
  timerExercise.textContent = exerciseName;
  paintTimer();
  timerSheet.classList.add('open');
  timerInterval = setInterval(() => {
    timerRemaining -= 1;
    paintTimer();
    if (timerRemaining <= 0) clearInterval(timerInterval);
  }, 1000);
};

document.getElementById('timerMinus').addEventListener('click', () => {
  timerRemaining = Math.max(0, timerRemaining - 15); paintTimer();
});
document.getElementById('timerReset').addEventListener('click', () => {
  timerRemaining = timerInitial; paintTimer();
});
document.getElementById('timerPlus').addEventListener('click', () => {
  timerRemaining += 15; paintTimer();
});
document.getElementById('timerSkip').addEventListener('click', stopTimer);

const renderRestDay = () => {
  document.getElementById('workoutProgress').hidden = true;
  document.getElementById('finishWorkout').hidden = true;
  document.getElementById('exerciseList').innerHTML = `
    <article class="rest-workout-card">
      <span class="rest-icon">☾</span>
      <span class="eyebrow">QUARTA-FEIRA · FERNANDA</span>
      <h2>Descanso programado</h2>
      <p>O treino revisado deixa quarta-feira livre para recuperação. O próximo treino é quinta: Pernas B · Posteriores + costas.</p>
      <a class="primary-button" href="treino.html?dia=quinta">Ver quinta-feira <span>→</span></a>
    </article>`;
};

const renderExercises = () => {
  if (!exercises.length) return renderRestDay();
  document.getElementById('exerciseList').innerHTML = exercises.map((exercise, index) => {
    const p = prescription(exercise);
    const saved = exerciseState(exercise.id);
    const done = isExerciseDone(exercise);
    const lastWeight = WorkoutStorage.findLastWeight(exercise.id, profileId);
    const setButtons = Array.from({ length: p.series }, (_, i) => {
      const number = i + 1;
      const setDone = saved.sets?.[String(number)]?.done;
      return `<button type="button" class="set-chip ${setDone ? 'done' : ''}"
        data-action="set" data-exercise="${exercise.id}" data-set="${number}">
        ${setDone ? '✓' : `S${number}`}
      </button>`;
    }).join('');

    return `
      <article class="premium-exercise-card ${done ? 'done' : ''}" data-card="${exercise.id}">
        <div class="exercise-art">${getExerciseArt(exercise)}</div>

        <div class="premium-ex-content">
          <div class="exercise-order">${String(index + 1).padStart(2, '0')}</div>
          <h2>${exercise.nome}</h2>
          <span class="series-label">PRESCRIÇÃO · ${profile.nome.toUpperCase()}</span>
          <div class="series-display">${displayPrescription(p.texto)}</div>
          <div class="exercise-meta">
            <span>⏱ ${exercise.descanso}</span>
            ${p.rir && p.rir !== '—' ? `<span class="rir-chip">RIR ${p.rir}</span>` : ''}
          </div>
          ${rirText(p.rir) ? `<p class="rir-help">${rirText(p.rir)}</p>` : ''}
        </div>

        <div class="premium-ex-actions">
          ${exercise.tipo === 'forca' ? `
            <label class="compact-weight-wrap">
              <span>Carga</span>
              <div class="compact-weight-field">
                <input inputmode="decimal" type="number" min="0" step="0.5"
                  aria-label="Carga de ${exercise.nome}"
                  data-field="weight" data-exercise="${exercise.id}"
                  value="${saved.weight ?? ''}" placeholder="0">
                <em>kg</em>
              </div>
              ${lastWeight !== null ? `<small class="last-load">Última: ${lastWeight} kg</small>` : ''}
            </label>` : `<div class="no-load-chip">${exercise.tipo === 'cardio' ? 'SEM CARGA' : 'CONTROLE'}</div>`}
        </div>

        <div class="exercise-bottom-row">
          <div class="set-chips" aria-label="Séries concluídas">${setButtons}</div>
          <button type="button" class="how-button" data-action="how" data-exercise="${exercise.id}">Como fazer</button>
        </div>
        <div class="exercise-guidance" id="guide-${exercise.id}" hidden>
          <strong>Execução</strong>
          <p>${exercise.observacao}</p>
          ${exercise.imagem ? '' : '<small>O guia animado deste exercício será adicionado na próxima etapa visual.</small>'}
        </div>
      </article>`;
  }).join('');
};

const updateProgress = () => {
  if (!exercises.length) return 0;
  const done = exercises.filter(isExerciseDone).length;
  const percent = Math.round((done / exercises.length) * 100);
  document.getElementById('progressLabel').textContent = `${done} de ${exercises.length} exercícios`;
  document.getElementById('progressPercent').textContent = `${percent}%`;
  document.getElementById('progressBar').style.width = `${percent}%`;
  return percent;
};

document.getElementById('exerciseList').addEventListener('input', event => {
  const input = event.target.closest('input[data-field="weight"]');
  if (!input) return;
  WorkoutStorage.saveWeight(day.id, input.dataset.exercise,
    input.value === '' ? '' : Number(input.value), profileId);
});

document.getElementById('exerciseList').addEventListener('click', event => {
  const setButton = event.target.closest('[data-action="set"]');
  if (setButton) {
    const exercise = exercises.find(ex => ex.id === setButton.dataset.exercise);
    const p = prescription(exercise);
    const setNumber = Number(setButton.dataset.set);
    const saved = exerciseState(exercise.id).sets?.[String(setNumber)];
    const nowDone = !saved?.done;
    WorkoutStorage.saveSet(day.id, exercise.id, setNumber, { done: nowDone }, profileId);
    setButton.classList.toggle('done', nowDone);
    setButton.textContent = nowDone ? '✓' : `S${setNumber}`;
    const card = document.querySelector(`[data-card="${exercise.id}"]`);
    card.classList.toggle('done', isExerciseDone(exercise));
    updateProgress();
    if (nowDone && setNumber < p.series && exercise.descansoSegundos > 0) {
      startTimer(exercise.descansoSegundos, `${exercise.nome} · próxima série`);
    }
    return;
  }

  const howButton = event.target.closest('[data-action="how"]');
  if (howButton) {
    const guide = document.getElementById(`guide-${howButton.dataset.exercise}`);
    const opening = guide.hidden;
    guide.hidden = !guide.hidden;
    howButton.textContent = opening ? 'Fechar guia' : 'Como fazer';
  }
});

document.getElementById('finishWorkout').addEventListener('click', () => {
  const percent = updateProgress();
  const confirmed = confirm(percent < 100
    ? `O treino está ${percent}% concluído. Finalizar mesmo assim?`
    : 'Finalizar e salvar este treino?');
  if (!confirmed) return;
  WorkoutStorage.finishWorkout(day.id, day.nome, percent, profileId);
  alert(`Treino de ${profile.nome} salvo.`);
  location.href = 'progresso.html';
});

renderHeader();
renderExercises();
updateProgress();
