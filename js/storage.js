(() => {
  const KEY = 'volumeWorkoutStateV1';
  const SCHEMA_VERSION = 6;

  const weekKey = (value = new Date()) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    const weekday = date.getDay() || 7;
    date.setDate(date.getDate() - weekday + 1);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const defaultWorkout = () => ({
    sets: {},
    substitutions: {},
    finished: false,
    startedAt: null,
    updatedAt: null,
  });

  const defaultState = () => ({
    schemaVersion: SCHEMA_VERSION,
    activeWeek: weekKey(),
    workouts: {},
    history: [],
    preferences: {
      permanentSubstitutions: {},
      timerSound: true,
      progressionPercent: 2.5,
    },
    lastWeeklyResetAt: null,
  });

  const save = (state) => {
    state.schemaVersion = SCHEMA_VERSION;
    state.activeWeek ||= weekKey();
    state.workouts ||= {};
    state.history ||= [];
    state.preferences ||= {};
    state.preferences.permanentSubstitutions ||= {};
    if (state.preferences.timerSound === undefined) state.preferences.timerSound = true;
    state.preferences.progressionPercent ||= 2.5;
    localStorage.setItem(KEY, JSON.stringify(state));
    return state;
  };

  const migrate = (state) => {
    state = state && typeof state === 'object' ? state : defaultState();
    state.workouts ||= {};
    state.history ||= [];
    state.preferences ||= {};
    state.preferences.permanentSubstitutions ||= {};
    if (state.preferences.timerSound === undefined) state.preferences.timerSound = true;
    state.preferences.progressionPercent ||= 2.5;

    Object.values(state.workouts).forEach((workout) => {
      workout.sets ||= {};
      workout.substitutions ||= {};
      workout.finished ||= false;
      workout.startedAt ||= null;
      workout.updatedAt ||= null;
    });

    state.history = state.history.map((item) => ({
      ...item,
      date: item.date || new Date().toISOString(),
      exercises: Array.isArray(item.exercises) ? item.exercises : [],
      totalVolume: Number(item.totalVolume || 0),
      completedExercises: Number(item.completedExercises || 0),
      totalExercises: Number(item.totalExercises || 0),
      prs: Number(item.prs || 0),
      improved: Number(item.improved || 0),
    }));

    state.schemaVersion = SCHEMA_VERSION;
    return state;
  };

  const normalizeWeek = (state) => {
    const currentWeek = weekKey();
    let changed = false;

    if (!state.activeWeek) {
      const updateDates = Object.values(state.workouts)
        .map((workout) => workout?.updatedAt)
        .filter(Boolean)
        .map((date) => new Date(date))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => b - a);
      state.activeWeek = updateDates.length ? weekKey(updateDates[0]) : currentWeek;
      changed = true;
    }

    if (state.activeWeek !== currentWeek) {
      state.workouts = {};
      state.activeWeek = currentWeek;
      state.lastWeeklyResetAt = new Date().toISOString();
      changed = true;
    }

    if (changed) save(state);
    return state;
  };

  const load = () => {
    try {
      const parsed = JSON.parse(localStorage.getItem(KEY));
      const state = normalizeWeek(migrate(parsed));
      save(state);
      return state;
    } catch {
      const state = defaultState();
      save(state);
      return state;
    }
  };

  const ensureWorkout = (state, dayId) => {
    state.workouts[dayId] ||= defaultWorkout();
    state.workouts[dayId].sets ||= {};
    state.workouts[dayId].substitutions ||= {};
    return state.workouts[dayId];
  };

  const getWorkout = (dayId) => {
    const state = load();
    return state.workouts[dayId] || defaultWorkout();
  };

  const startWorkout = (dayId) => {
    const state = load();
    const workout = ensureWorkout(state, dayId);
    if (!workout.startedAt) workout.startedAt = new Date().toISOString();
    workout.updatedAt = new Date().toISOString();
    save(state);
    return workout;
  };

  const saveExercise = (dayId, exerciseId, payload) => {
    const state = load();
    const workout = ensureWorkout(state, dayId);
    if (workout.finished) {
      workout.startedAt = new Date().toISOString();
      workout.finishedAt = null;
      workout.durationSeconds = 0;
    } else {
      workout.startedAt ||= new Date().toISOString();
    }
    workout.sets[exerciseId] ||= {};
    workout.sets[exerciseId]['1'] = {
      ...(workout.sets[exerciseId]['1'] || {}),
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    workout.updatedAt = new Date().toISOString();
    workout.finished = false;
    save(state);
    return workout.sets[exerciseId]['1'];
  };

  const saveSet = (dayId, exerciseId, setNumber, payload) => {
    if (String(setNumber) === '1') return saveExercise(dayId, exerciseId, payload);
    const state = load();
    const workout = ensureWorkout(state, dayId);
    workout.sets[exerciseId] ||= {};
    workout.sets[exerciseId][setNumber] = {
      ...(workout.sets[exerciseId][setNumber] || {}),
      ...payload,
      updatedAt: new Date().toISOString(),
    };
    workout.updatedAt = new Date().toISOString();
    save(state);
    return workout.sets[exerciseId][setNumber];
  };

  const getExercise = (dayId, exerciseId) => {
    const workout = getWorkout(dayId);
    return workout.sets?.[exerciseId]?.['1'] || {};
  };

  const setSubstitution = (dayId, originalId, exercise, scope = 'today') => {
    const state = load();
    if (scope === 'permanent') {
      state.preferences.permanentSubstitutions[dayId] ||= {};
      if (exercise) state.preferences.permanentSubstitutions[dayId][originalId] = exercise;
      else delete state.preferences.permanentSubstitutions[dayId][originalId];
      if (state.workouts?.[dayId]?.substitutions) delete state.workouts[dayId].substitutions[originalId];
    } else {
      const workout = ensureWorkout(state, dayId);
      if (exercise) workout.substitutions[originalId] = exercise;
      else delete workout.substitutions[originalId];
      workout.updatedAt = new Date().toISOString();
    }
    save(state);
  };

  const getSubstitution = (dayId, originalId) => {
    const state = load();
    const temporary = state.workouts?.[dayId]?.substitutions?.[originalId];
    if (temporary?.__original) return null;
    return temporary || state.preferences?.permanentSubstitutions?.[dayId]?.[originalId] || null;
  };

  const finishWorkout = (sessionOrDayId, dayName, percent) => {
    const state = load();
    let session;

    if (typeof sessionOrDayId === 'object') {
      session = { ...sessionOrDayId };
    } else {
      session = {
        id: `${sessionOrDayId}-${Date.now()}`,
        dayId: sessionOrDayId,
        name: dayName,
        percent,
        date: new Date().toISOString(),
        exercises: [],
      };
    }

    session.id ||= `${session.dayId}-${Date.now()}`;
    session.date ||= new Date().toISOString();
    session.weekKey ||= weekKey(session.date);
    session.exercises ||= [];

    const workout = ensureWorkout(state, session.dayId);
    workout.finished = true;
    workout.finishedAt = session.date;
    workout.durationSeconds = Number(session.durationSeconds || 0);
    workout.updatedAt = new Date().toISOString();

    if (!session.dateKey) {
      const localDate = new Date(session.date);
      session.dateKey = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`;
    }
    state.history = state.history.filter((item) => !(
      item.id === session.id
      || (item.dayId === session.dayId && (item.dateKey || String(item.date || '').slice(0, 10)) === session.dateKey)
    ));
    state.history.unshift(session);
    state.history = state.history.slice(0, 300);
    save(state);
    return session;
  };

  const historyForExercise = (exerciseId, originalId = exerciseId) => {
    const state = load();
    const rows = [];
    state.history.forEach((session) => {
      (session.exercises || []).forEach((exercise) => {
        const matches = exercise.id === exerciseId
          || (!exercise.id && exercise.originalId === exerciseId)
          || (originalId && originalId !== exerciseId && exercise.originalId === originalId);
        if (matches && exercise.done) {
          rows.push({ ...exercise, sessionDate: session.date, sessionId: session.id, dayId: session.dayId });
        }
      });
    });
    return rows.sort((a, b) => new Date(b.sessionDate) - new Date(a.sessionDate));
  };

  const getLastExerciseRecord = (exerciseId, originalId = exerciseId) => historyForExercise(exerciseId, originalId)[0] || null;

  const getBestWeight = (exerciseId, originalId = exerciseId) => {
    const weights = historyForExercise(exerciseId, originalId)
      .map((item) => Number(item.weight || 0))
      .filter((value) => value > 0);
    return weights.length ? Math.max(...weights) : 0;
  };

  const getPreferences = () => load().preferences;

  const savePreferences = (partial) => {
    const state = load();
    state.preferences = { ...state.preferences, ...partial };
    save(state);
    return state.preferences;
  };

  const resetWeek = () => {
    const state = load();
    state.workouts = {};
    state.activeWeek = weekKey();
    state.lastWeeklyResetAt = new Date().toISOString();
    save(state);
  };

  const reset = () => localStorage.removeItem(KEY);

  const exportState = () => ({
    exportedAt: new Date().toISOString(),
    app: 'Protocol Fitness',
    schemaVersion: SCHEMA_VERSION,
    state: load(),
  });

  const importState = (payload) => {
    const candidate = payload?.state || payload;
    if (!candidate || typeof candidate !== 'object' || !Array.isArray(candidate.history)) {
      throw new Error('Arquivo de backup inválido.');
    }
    const state = normalizeWeek(migrate(candidate));
    save(state);
    return state;
  };

  window.WorkoutStorage = {
    load,
    save,
    weekKey,
    getWorkout,
    startWorkout,
    saveExercise,
    saveSet,
    getExercise,
    setSubstitution,
    getSubstitution,
    finishWorkout,
    historyForExercise,
    getLastExerciseRecord,
    getBestWeight,
    getPreferences,
    savePreferences,
    resetWeek,
    reset,
    exportState,
    importState,
  };
})();
