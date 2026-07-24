const params = new URLSearchParams(location.search);
const dayId = params.get('dia') || 'segunda';
const day = window.TREINO_DATA.dias.find((item) => item.id === dayId) || window.TREINO_DATA.dias[0];
const preferences = WorkoutStorage.getPreferences();
let state = WorkoutStorage.startWorkout(day.id);
let activeSubstitutionId = null;
let lastSummaryText = '';

document.title = `${day.nome} • Protocol Fitness`;

const normalizeText = (value = '') => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const numberValue = (value) => value === '' || value === null || value === undefined ? 0 : Number(value);
const formatNumber = (value, digits = 1) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: digits });
const localDateKey = (value = new Date()) => {
  const date = new Date(value);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};
const formatDuration = (seconds) => {
  const total = Math.max(0, Math.floor(seconds || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  return hours > 0
    ? `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    : `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
};
const repRange = (label) => {
  const values = String(label).match(/\d+/g)?.map(Number) || [0];
  return { min: values[0] || 0, max: values[1] || values[0] || 0 };
};
const roundLoad = (value) => Math.round(Number(value || 0) * 2) / 2;
const formatSeries = (exercise) => `${exercise.series}×${exercise.repeticoes}`;

const muscleFamily = (group = '') => {
  const value = normalizeText(group);
  if (value.includes('panturr')) return 'panturrilhas';
  if (value.includes('adutor')) return 'adutores';
  if (value.includes('quadr')) return 'quadriceps';
  if (value.includes('posterior') && value.includes('glute')) return 'posterior-gluteos';
  if (value.includes('posterior')) return 'posterior';
  if (value.includes('glute')) return 'gluteos';
  if (value.includes('perna')) return 'pernas';
  if (value.includes('peito')) return 'peito';
  if (value.includes('ombro')) return 'ombros';
  if (value.includes('tricep')) return 'triceps';
  if (value.includes('costa')) return 'costas';
  if (value.includes('bicep')) return 'biceps';
  return value;
};

const allExercises = window.TREINO_DATA.dias.flatMap((workoutDay) => workoutDay.exercicios.map((exercise) => ({
  ...exercise,
  sourceDay: workoutDay.id,
})));

const alternativesFor = (exercise) => {
  const family = muscleFamily(exercise.grupo);
  const compatible = new Set([family]);
  if (family === 'pernas') ['quadriceps', 'posterior-gluteos', 'gluteos'].forEach((item) => compatible.add(item));
  if (family === 'posterior-gluteos') ['posterior', 'gluteos', 'pernas'].forEach((item) => compatible.add(item));
  if (family === 'posterior') compatible.add('posterior-gluteos');
  if (family === 'gluteos') compatible.add('posterior-gluteos');

  const unique = new Map();
  allExercises.forEach((candidate) => {
    if (candidate.id === exercise.id) return;
    if (!compatible.has(muscleFamily(candidate.grupo))) return;
    const key = normalizeText(candidate.nome);
    if (!unique.has(key)) unique.set(key, candidate);
  });
  return [...unique.values()].slice(0, 14);
};

const effectiveExercise = (original) => {
  const replacement = WorkoutStorage.getSubstitution(day.id, original.id);
  return replacement ? { ...original, ...replacement, originalId: original.id, isSubstitution: true } : { ...original, originalId: original.id, isSubstitution: false };
};

const getSaved = (originalId) => state.sets?.[originalId]?.['1'] || {};
const getLast = (exercise) => WorkoutStorage.getLastExerciseRecord(exercise.id, exercise.id);
const getBest = (exercise) => WorkoutStorage.getBestWeight(exercise.id, exercise.id);

const getSuggestion = (exercise) => {
  const last = getLast(exercise);
  if (!last || !numberValue(last.weight)) return null;
  const range = repRange(exercise.repeticoes);
  const reachedTop = numberValue(last.reps) >= range.max;
  const rirAllows = last.rir === null || last.rir === undefined || last.rir === '' || numberValue(last.rir) <= 2;
  const percent = Number(preferences.progressionPercent || 2.5);
  const suggested = reachedTop && rirAllows
    ? roundLoad(numberValue(last.weight) * (1 + percent / 100))
    : roundLoad(last.weight);
  return {
    value: suggested,
    mode: suggested > numberValue(last.weight) ? 'increase' : 'repeat',
    last,
  };
};

const totalExercises = day.exercicios.length;
const sessionRows = () => day.exercicios.map((original) => {
  const exercise = effectiveExercise(original);
  const saved = getSaved(original.id);
  const range = repRange(exercise.repeticoes);
  const reps = numberValue(saved.reps) || range.min;
  const weight = numberValue(saved.weight);
  const done = Boolean(saved.done);
  const volume = done ? weight * Number(exercise.series || 0) * reps : 0;
  const best = getBest(exercise);
  return { original, exercise, saved, reps, weight, done, volume, best };
});

const currentMetrics = () => {
  const rows = sessionRows();
  const done = rows.filter((row) => row.done).length;
  const volume = rows.reduce((sum, row) => sum + row.volume, 0);
  const prs = rows.filter((row) => row.done && row.weight > row.best && row.weight > 0).length;
  return { rows, done, volume, prs, percent: totalExercises ? Math.round(done / totalExercises * 100) : 0 };
};

const header = document.getElementById('workoutHeader');
header.innerHTML = `
  <article class="workout-cover v56-cover">
    <img src="${day.imagem}" alt="">
    <div class="workout-cover-copy">
      <span class="eyebrow">${day.dia.toUpperCase()} • ${day.duracao} MIN</span>
      <h1>${day.nome}</h1>
      <p>${day.foco}</p>
      <div class="cover-meta"><span>${day.exercicios.length} exercícios</span><span>Última carga automática</span><span>Reset semanal</span></div>
    </div>
  </article>`;

const exerciseCard = (original, index) => {
  const exercise = effectiveExercise(original);
  const saved = getSaved(original.id);
  const last = getLast(exercise);
  const best = getBest(exercise);
  const suggestion = getSuggestion(exercise);
  const range = repRange(exercise.repeticoes);
  const weight = saved.weight ?? '';
  const reps = saved.reps ?? '';
  const rir = saved.rir ?? '';
  const done = Boolean(saved.done);
  const isPr = done && numberValue(weight) > best && numberValue(weight) > 0;

  const historyLine = last
    ? `Último: <b>${formatNumber(last.weight)} kg</b> × <b>${last.reps || range.min} reps</b>${last.rir !== '' && last.rir !== null && last.rir !== undefined ? ` • RIR ${last.rir}` : ''}`
    : 'Primeiro registro deste exercício';

  const suggestionHtml = suggestion
    ? `<button class="progression-pill ${suggestion.mode}" data-action="use-suggestion" data-exercise="${original.id}" data-value="${suggestion.value}">
        ${suggestion.mode === 'increase' ? '↗ Sugestão' : '↺ Repetir'} <b>${formatNumber(suggestion.value)} kg</b>
      </button>`
    : '<span class="progression-pill neutral">Registre a primeira carga</span>';

  return `
    <article class="advanced-exercise-card ${done ? 'done' : ''}" data-card="${original.id}">
      <div class="advanced-ex-head">
        <div class="exercise-number">${String(index + 1).padStart(2, '0')}</div>
        <div class="advanced-ex-title">
          <div class="exercise-title-row">
            <div>
              <span class="exercise-group">${exercise.grupo}</span>
              <h2>${exercise.nome}</h2>
            </div>
            <button class="swap-button" data-action="swap" data-exercise="${original.id}">${exercise.isSubstitution ? 'Alterar troca' : 'Trocar'}</button>
          </div>
          <div class="target-row">
            <strong>${formatSeries(exercise)}</strong>
            <span>${exercise.descanso}s de descanso</span>
            ${exercise.isSubstitution ? '<span class="substitution-badge">SUBSTITUÍDO</span>' : ''}
          </div>
        </div>
      </div>

      <div class="exercise-history-row">
        <span>${historyLine}</span>
        ${suggestionHtml}
      </div>

      <div class="exercise-input-grid">
        <label><span>CARGA</span><div class="unit-input"><input inputmode="decimal" type="number" min="0" step="0.5" data-field="weight" data-exercise="${original.id}" value="${weight}" placeholder="0"><b>kg</b></div></label>
        <label><span>REPS FEITAS</span><div class="unit-input"><input inputmode="numeric" type="number" min="0" step="1" data-field="reps" data-exercise="${original.id}" value="${reps}" placeholder="${range.min}"><b>rep</b></div></label>
        <label><span>RIR</span><select data-field="rir" data-exercise="${original.id}">
          <option value="">—</option>
          ${[0, 1, 2, 3, 4].map((value) => `<option value="${value}" ${String(rir) === String(value) ? 'selected' : ''}>${value}</option>`).join('')}
        </select></label>
        <button class="advanced-check ${done ? 'done' : ''}" data-action="check" data-exercise="${original.id}" aria-label="Marcar ${exercise.nome} como feito">
          <span>${done ? '✓' : ''}</span><b>${done ? 'Feito' : 'Marcar feito'}</b>
        </button>
      </div>

      ${exercise.observacao ? `<div class="exercise-note"><b>Execução:</b> ${exercise.observacao}</div>` : ''}
      ${isPr ? '<div class="pr-banner">🏆 Novo recorde de carga neste exercício</div>' : ''}
    </article>`;
};

const renderExercises = () => {
  state = WorkoutStorage.getWorkout(day.id);
  document.getElementById('exerciseList').innerHTML = day.exercicios.map(exerciseCard).join('');
  updateProgress();
};

const updateProgress = () => {
  state = WorkoutStorage.getWorkout(day.id);
  const metrics = currentMetrics();
  document.getElementById('progressLabel').textContent = `${metrics.done} de ${totalExercises} exercícios`;
  document.getElementById('progressPercent').textContent = `${metrics.percent}%`;
  document.getElementById('progressBar').style.width = `${metrics.percent}%`;
  document.getElementById('sessionVolume').textContent = `${formatNumber(metrics.volume, 0)} kg`;
  document.getElementById('sessionPrs').textContent = String(metrics.prs);
  return metrics;
};

const saveField = (target) => {
  const originalId = target.dataset.exercise;
  const wasFinished = Boolean(state.finished);
  const existing = getSaved(originalId);
  const value = target.value === '' ? '' : Number(target.value);
  WorkoutStorage.saveExercise(day.id, originalId, {
    ...existing,
    [target.dataset.field]: value,
  });
  state = WorkoutStorage.getWorkout(day.id);
  if (wasFinished) sessionStartedAt = new Date(state.startedAt || new Date().toISOString());
  updateProgress();
};

document.getElementById('exerciseList').addEventListener('input', (event) => {
  const input = event.target.closest('[data-field]');
  if (!input) return;
  saveField(input);
});

document.getElementById('exerciseList').addEventListener('change', (event) => {
  const input = event.target.closest('select[data-field]');
  if (!input) return;
  saveField(input);
});

document.getElementById('exerciseList').addEventListener('click', (event) => {
  const action = event.target.closest('[data-action]');
  if (!action) return;
  const originalId = action.dataset.exercise;
  const original = day.exercicios.find((item) => item.id === originalId);
  if (!original) return;

  if (action.dataset.action === 'check') {
    const wasFinished = Boolean(state.finished);
    const existing = getSaved(originalId);
    const nowDone = !existing.done;
    const exercise = effectiveExercise(original);
    const range = repRange(exercise.repeticoes);
    WorkoutStorage.saveExercise(day.id, originalId, {
      ...existing,
      reps: existing.reps === '' || existing.reps === undefined ? range.min : existing.reps,
      done: nowDone,
      effectiveId: exercise.id,
      effectiveName: exercise.nome,
    });
    state = WorkoutStorage.getWorkout(day.id);
    if (wasFinished) sessionStartedAt = new Date(state.startedAt || new Date().toISOString());
    renderExercises();
    if (nowDone) startRestTimer(Number(exercise.descanso || 90), exercise.nome);
    return;
  }

  if (action.dataset.action === 'use-suggestion') {
    const input = document.querySelector(`[data-field="weight"][data-exercise="${originalId}"]`);
    if (input) {
      input.value = action.dataset.value;
      saveField(input);
      input.focus();
    }
    return;
  }

  if (action.dataset.action === 'swap') openSubstitution(original);
});

// Cronômetro fixo
const restDock = document.getElementById('restDock');
let restSeconds = 0;
let restTimer = null;
let restPaused = false;
let restLabel = '';

const renderRest = () => {
  document.getElementById('restTime').textContent = formatDuration(restSeconds);
  document.getElementById('restExercise').textContent = restLabel || 'Próxima série';
  document.getElementById('restPause').textContent = restPaused ? 'Continuar' : 'Pausar';
  restDock.classList.toggle('finished', restSeconds <= 0);
};

const beep = () => {
  if (!WorkoutStorage.getPreferences().timerSound) return;
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.18, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.45);
    oscillator.connect(gain); gain.connect(audio.destination);
    oscillator.start(); oscillator.stop(audio.currentTime + 0.45);
  } catch {}
};

const startRestTimer = (seconds, label) => {
  clearInterval(restTimer);
  restSeconds = Math.max(0, Number(seconds || 90));
  restLabel = label;
  restPaused = false;
  restDock.hidden = false;
  renderRest();
  restTimer = setInterval(() => {
    if (restPaused) return;
    restSeconds -= 1;
    renderRest();
    if (restSeconds <= 0) {
      clearInterval(restTimer);
      beep();
    }
  }, 1000);
};

document.getElementById('restMinus').onclick = () => { restSeconds = Math.max(0, restSeconds - 15); renderRest(); };
document.getElementById('restPlus').onclick = () => { restSeconds += 15; renderRest(); };
document.getElementById('restPause').onclick = () => { restPaused = !restPaused; renderRest(); };
document.getElementById('restClose').onclick = () => { clearInterval(restTimer); restDock.hidden = true; };

// Duração da sessão
let sessionStartedAt = new Date(state.startedAt || new Date().toISOString());
const sessionSeconds = () => state.finished
  ? Number(state.durationSeconds || 0)
  : Math.max(0, Math.floor((Date.now() - sessionStartedAt.getTime()) / 1000));
const updateSessionClock = () => { document.getElementById('sessionClock').textContent = formatDuration(sessionSeconds()); };
updateSessionClock();
const sessionClockInterval = setInterval(updateSessionClock, 1000);

// Modais
const openModal = (id) => { document.getElementById(id).hidden = false; document.body.classList.add('modal-open'); };
const closeModal = (id) => { document.getElementById(id).hidden = true; document.body.classList.remove('modal-open'); };
document.querySelectorAll('[data-close-modal]').forEach((button) => button.addEventListener('click', () => closeModal(button.dataset.closeModal)));

document.getElementById('sessionRpe').addEventListener('input', (event) => { document.getElementById('rpeValue').textContent = event.target.value; });

const openSubstitution = (original) => {
  activeSubstitutionId = original.id;
  const current = effectiveExercise(original);
  const alternatives = alternativesFor(original);
  document.getElementById('substitutionOriginal').innerHTML = `Atual: <b>${current.nome}</b><br><small>Original da ficha: ${original.nome}</small>`;
  const select = document.getElementById('substitutionSelect');
  select.innerHTML = alternatives.length
    ? alternatives.map((item) => `<option value="${item.id}">${item.nome} • ${item.series}×${item.repeticoes}</option>`).join('')
    : '<option value="">Nenhuma alternativa encontrada</option>';
  openModal('substitutionModal');
};

document.getElementById('saveSubstitution').onclick = () => {
  const original = day.exercicios.find((item) => item.id === activeSubstitutionId);
  const selectedId = document.getElementById('substitutionSelect').value;
  const replacement = allExercises.find((item) => item.id === selectedId);
  if (!original || !replacement) return;
  const scope = document.querySelector('input[name="subScope"]:checked')?.value || 'today';
  const payload = {
    id: replacement.id,
    nome: replacement.nome,
    grupo: replacement.grupo,
    series: replacement.series,
    repeticoes: replacement.repeticoes,
    descanso: replacement.descanso,
    observacao: replacement.observacao,
  };
  WorkoutStorage.setSubstitution(day.id, original.id, payload, scope);
  WorkoutStorage.saveExercise(day.id, original.id, { weight: '', reps: '', rir: '', done: false, effectiveId: replacement.id, effectiveName: replacement.nome });
  state = WorkoutStorage.getWorkout(day.id);
  closeModal('substitutionModal');
  renderExercises();
};

document.getElementById('restoreOriginal').onclick = () => {
  const original = day.exercicios.find((item) => item.id === activeSubstitutionId);
  if (!original) return;
  const scope = document.querySelector('input[name="subScope"]:checked')?.value || 'today';
  WorkoutStorage.setSubstitution(day.id, original.id, scope === 'today' ? { __original: true } : null, scope);
  WorkoutStorage.saveExercise(day.id, original.id, { weight: '', reps: '', rir: '', done: false, effectiveId: original.id, effectiveName: original.nome });
  state = WorkoutStorage.getWorkout(day.id);
  closeModal('substitutionModal');
  renderExercises();
};

// Finalização e resumo
const buildSession = () => {
  const metrics = currentMetrics();
  const exercises = metrics.rows.map(({ original, exercise, saved, reps, weight, done, volume, best }) => {
    const last = getLast(exercise);
    return {
      id: exercise.id,
      originalId: original.id,
      name: exercise.nome,
      originalName: original.nome,
      group: exercise.grupo,
      series: Number(exercise.series || 0),
      targetReps: exercise.repeticoes,
      weight,
      reps,
      rir: saved.rir === '' || saved.rir === undefined ? null : Number(saved.rir),
      done,
      volume,
      isSubstitution: exercise.isSubstitution,
      previousWeight: numberValue(last?.weight),
      isPr: done && weight > best && weight > 0,
      improved: done && numberValue(last?.weight) > 0 && weight > numberValue(last.weight),
    };
  });
  return {
    id: `${day.id}-${Date.now()}`,
    dayId: day.id,
    name: day.nome,
    focus: day.foco,
    date: new Date().toISOString(),
    dateKey: localDateKey(),
    weekKey: WorkoutStorage.weekKey(),
    percent: metrics.percent,
    completedExercises: metrics.done,
    totalExercises,
    totalSeries: exercises.filter((item) => item.done).reduce((sum, item) => sum + item.series, 0),
    totalVolume: exercises.reduce((sum, item) => sum + item.volume, 0),
    durationSeconds: sessionSeconds(),
    prs: exercises.filter((item) => item.isPr).length,
    improved: exercises.filter((item) => item.improved).length,
    sessionRpe: Number(document.getElementById('sessionRpe').value || 8),
    note: document.getElementById('sessionNote').value.trim(),
    exercises,
  };
};

document.getElementById('finishWorkout').onclick = () => {
  const metrics = updateProgress();
  document.getElementById('finishWarning').textContent = metrics.percent < 100
    ? `O treino está ${metrics.percent}% concluído. Você pode salvar assim mesmo ou continuar.`
    : 'Todos os exercícios foram marcados. Registre como foi a sessão e salve.';
  openModal('finishModal');
};

document.getElementById('saveFinishedWorkout').onclick = () => {
  const session = buildSession();
  WorkoutStorage.finishWorkout(session);
  clearInterval(sessionClockInterval);
  clearInterval(restTimer);
  restDock.hidden = true;
  closeModal('finishModal');

  document.getElementById('summarySubtitle').textContent = `${day.nome} • esforço ${session.sessionRpe}/10`;
  document.getElementById('summaryGrid').innerHTML = `
    <div><span>Duração</span><strong>${formatDuration(session.durationSeconds)}</strong></div>
    <div><span>Exercícios</span><strong>${session.completedExercises}/${session.totalExercises}</strong></div>
    <div><span>Séries</span><strong>${session.totalSeries}</strong></div>
    <div><span>Volume</span><strong>${formatNumber(session.totalVolume, 0)} kg</strong></div>`;

  const highlights = [];
  if (session.prs) highlights.push(`<span>🏆 ${session.prs} recorde${session.prs > 1 ? 's' : ''}</span>`);
  if (session.improved) highlights.push(`<span>↗ ${session.improved} carga${session.improved > 1 ? 's' : ''} aumentada${session.improved > 1 ? 's' : ''}</span>`);
  if (!highlights.length) highlights.push('<span>✓ Sessão registrada com sucesso</span>');
  document.getElementById('summaryHighlights').innerHTML = highlights.join('');

  lastSummaryText = `Protocol Fitness\n${day.nome}\n${session.completedExercises}/${session.totalExercises} exercícios\n${session.totalSeries} séries\nVolume: ${formatNumber(session.totalVolume, 0)} kg\nDuração: ${formatDuration(session.durationSeconds)}${session.prs ? `\nRecordes: ${session.prs}` : ''}`;
  openModal('summaryModal');
};

document.getElementById('shareSummary').onclick = async () => {
  try {
    if (navigator.share) await navigator.share({ title: 'Treino concluído', text: lastSummaryText });
    else {
      await navigator.clipboard.writeText(lastSummaryText);
      alert('Resumo copiado.');
    }
  } catch {}
};

renderExercises();
updateProgress();

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./service-worker.js?v=20260725-1').catch(() => {});
}
