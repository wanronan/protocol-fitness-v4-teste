(() => {
  const KEY = 'protocolFitnessV6State';
  const LEGACY_KEY = 'volumeWorkoutStateV1';
  const PLAN_VERSION = 'casal-dez-2026-v1';

  const weekKey = (value = new Date()) => {
    const date = new Date(value);
    date.setHours(0, 0, 0, 0);
    const weekday = date.getDay() || 7;
    date.setDate(date.getDate() - weekday + 1);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const profileState = () => ({
    planVersion: PLAN_VERSION,
    activeWeek: weekKey(),
    workouts: {},
    history: [],
    measures: []
  });

  const defaultState = () => ({
    version: 6,
    activeProfile: 'wanderson',
    profiles: {
      wanderson: profileState(),
      fernanda: profileState()
    }
  });

  const persist = (state) => localStorage.setItem(KEY, JSON.stringify(state));

  const migrateLegacy = () => {
    const fresh = defaultState();
    try {
      const legacy = JSON.parse(localStorage.getItem(LEGACY_KEY));
      if (legacy && typeof legacy === 'object') {
        fresh.profiles.wanderson.history = (legacy.history || []).map(item => ({
          ...item,
          legacy: true,
          program: 'Protocol Fitness V4'
        }));
      }
    } catch (_) {}
    persist(fresh);
    return fresh;
  };

  const normalizeProfile = (p) => {
    p ||= profileState();
    p.workouts ||= {};
    p.history ||= [];
    p.measures ||= [];
    p.activeWeek ||= weekKey();

    if (p.planVersion !== PLAN_VERSION) {
      p.workouts = {};
      p.planVersion = PLAN_VERSION;
      p.lastPlanChangeAt = new Date().toISOString();
    }

    const currentWeek = weekKey();
    if (p.activeWeek !== currentWeek) {
      p.workouts = {};
      p.activeWeek = currentWeek;
      p.lastWeeklyResetAt = new Date().toISOString();
    }
    return p;
  };

  const load = () => {
    let state;
    try {
      state = JSON.parse(localStorage.getItem(KEY));
    } catch (_) {}
    if (!state || typeof state !== 'object') state = migrateLegacy();

    state.activeProfile = ['wanderson', 'fernanda'].includes(state.activeProfile)
      ? state.activeProfile : 'wanderson';
    state.profiles ||= {};
    state.profiles.wanderson = normalizeProfile(state.profiles.wanderson);
    state.profiles.fernanda = normalizeProfile(state.profiles.fernanda);
    persist(state);
    return state;
  };

  const getActiveProfile = () => load().activeProfile;

  const setActiveProfile = (profileId) => {
    if (!['wanderson', 'fernanda'].includes(profileId)) return;
    const state = load();
    state.activeProfile = profileId;
    persist(state);
  };

  const getProfile = (profileId = getActiveProfile()) => load().profiles[profileId];

  const getWorkout = (dayId, profileId = getActiveProfile()) => {
    const p = getProfile(profileId);
    return p.workouts[dayId] || {
      exercises: {},
      finished: false,
      updatedAt: null
    };
  };

  const ensureExercise = (state, profileId, dayId, exerciseId) => {
    const p = state.profiles[profileId];
    p.workouts[dayId] ||= { exercises: {}, finished: false, updatedAt: null };
    p.workouts[dayId].exercises ||= {};
    p.workouts[dayId].exercises[exerciseId] ||= { weight: '', sets: {} };
    p.workouts[dayId].exercises[exerciseId].sets ||= {};
    return p.workouts[dayId].exercises[exerciseId];
  };

  const saveWeight = (dayId, exerciseId, weight, profileId = getActiveProfile()) => {
    const state = load();
    const ex = ensureExercise(state, profileId, dayId, exerciseId);
    ex.weight = weight;
    state.profiles[profileId].workouts[dayId].updatedAt = new Date().toISOString();
    persist(state);
  };

  const saveSet = (dayId, exerciseId, setNumber, payload, profileId = getActiveProfile()) => {
    const state = load();
    const ex = ensureExercise(state, profileId, dayId, exerciseId);
    ex.sets[String(setNumber)] = { ...(ex.sets[String(setNumber)] || {}), ...payload };
    state.profiles[profileId].workouts[dayId].updatedAt = new Date().toISOString();
    persist(state);
    return state.profiles[profileId].workouts[dayId];
  };

  const findLastWeight = (exerciseId, profileId = getActiveProfile()) => {
    const p = getProfile(profileId);
    for (const item of p.history || []) {
      const value = item.exercises?.[exerciseId]?.weight;
      if (value !== '' && value !== undefined && value !== null) return value;
    }
    return null;
  };

  const finishWorkout = (dayId, dayName, percent, profileId = getActiveProfile()) => {
    const state = load();
    const p = state.profiles[profileId];
    p.workouts[dayId] ||= { exercises: {}, finished: false, updatedAt: null };
    const workout = p.workouts[dayId];
    workout.finished = true;
    workout.updatedAt = new Date().toISOString();
    p.history.unshift({
      id: `${profileId}-${dayId}-${Date.now()}`,
      dayId,
      name: dayName,
      percent,
      date: new Date().toISOString(),
      program: 'Protocol Fitness V6',
      exercises: JSON.parse(JSON.stringify(workout.exercises || {}))
    });
    p.history = p.history.slice(0, 50);
    persist(state);
  };

  const saveMeasure = (measure, profileId = getActiveProfile()) => {
    const state = load();
    const p = state.profiles[profileId];
    p.measures ||= [];
    p.measures.unshift({
      id: `${profileId}-measure-${Date.now()}`,
      ...measure,
      savedAt: new Date().toISOString()
    });
    p.measures = p.measures.slice(0, 30);
    persist(state);
  };

  const resetWeek = (profileId = getActiveProfile()) => {
    const state = load();
    state.profiles[profileId].workouts = {};
    state.profiles[profileId].activeWeek = weekKey();
    state.profiles[profileId].lastWeeklyResetAt = new Date().toISOString();
    persist(state);
  };

  const resetProfile = (profileId = getActiveProfile()) => {
    const state = load();
    state.profiles[profileId] = profileState();
    persist(state);
  };

  window.WorkoutStorage = {
    load,
    getActiveProfile,
    setActiveProfile,
    getProfile,
    getWorkout,
    saveWeight,
    saveSet,
    findLastWeight,
    finishWorkout,
    saveMeasure,
    resetWeek,
    resetProfile
  };
})();
