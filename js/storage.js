(() => {
  const KEY = 'volumeWorkoutStateV1';

  const weekKey = (value = new Date()) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);

    // Segunda-feira é o primeiro dia do ciclo semanal.
    const weekday = date.getDay() || 7;
    date.setDate(date.getDate() - weekday + 1);

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const defaultState = () => ({
    activeWeek: weekKey(),
    workouts: {},
    history: [],
  });

  const save = (state) => {
    state.activeWeek ||= weekKey();
    state.workouts ||= {};
    state.history ||= [];
    localStorage.setItem(KEY, JSON.stringify(state));
  };

  const normalizeWeek = (state) => {
    const currentWeek = weekKey();
    let changed = false;

    state.workouts ||= {};
    state.history ||= [];

    // Migra quem já usava a versão antiga, que não guardava a semana.
    if (!state.activeWeek) {
      const updateDates = Object.values(state.workouts)
        .map((workout) => workout?.updatedAt)
        .filter(Boolean)
        .map((date) => new Date(date))
        .filter((date) => !Number.isNaN(date.getTime()))
        .sort((a, b) => b - a);

      state.activeWeek = updateDates.length
        ? weekKey(updateDates[0])
        : currentWeek;
      changed = true;
    }

    // Ao entrar em uma nova segunda-feira, limpa somente as marcações
    // da semana. O histórico de treinos finalizados continua salvo.
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
      const state = parsed && typeof parsed === 'object'
        ? parsed
        : defaultState();
      return normalizeWeek(state);
    } catch {
      const state = defaultState();
      save(state);
      return state;
    }
  };

  const getWorkout = (dayId) => {
    const state = load();
    return state.workouts[dayId] || {
      sets: {},
      finished: false,
      updatedAt: null,
    };
  };

  const saveSet = (dayId, exerciseId, setNumber, payload) => {
    const state = load();
    state.workouts[dayId] ||= {
      sets: {},
      finished: false,
      updatedAt: null,
    };
    state.workouts[dayId].sets[exerciseId] ||= {};
    state.workouts[dayId].sets[exerciseId][setNumber] = payload;
    state.workouts[dayId].updatedAt = new Date().toISOString();
    save(state);
    return state;
  };

  const finishWorkout = (dayId, dayName, percent) => {
    const state = load();
    state.workouts[dayId] ||= {
      sets: {},
      finished: false,
      updatedAt: null,
    };
    state.workouts[dayId].finished = true;
    state.workouts[dayId].updatedAt = new Date().toISOString();
    state.history.unshift({
      id: `${dayId}-${Date.now()}`,
      dayId,
      name: dayName,
      percent,
      date: new Date().toISOString(),
    });
    state.history = state.history.slice(0, 20);
    save(state);
  };

  const resetWeek = () => {
    const state = load();
    state.workouts = {};
    state.activeWeek = weekKey();
    state.lastWeeklyResetAt = new Date().toISOString();
    save(state);
  };

  const reset = () => localStorage.removeItem(KEY);

  window.WorkoutStorage = {
    load,
    save,
    getWorkout,
    saveSet,
    finishWorkout,
    resetWeek,
    reset,
  };
})();
