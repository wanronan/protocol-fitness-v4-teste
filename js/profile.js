(() => {
  const render = (containerId = 'profileSwitcher') => {
    const target = document.getElementById(containerId);
    if (!target) return;
    const active = WorkoutStorage.getActiveProfile();
    const profiles = window.TREINO_DATA.perfis;
    target.innerHTML = `
      <div class="profile-switcher-inner" role="group" aria-label="Escolher perfil">
        ${Object.values(profiles).map(profile => `
          <button class="profile-option ${active === profile.id ? 'active' : ''}"
            type="button" data-profile="${profile.id}" aria-pressed="${active === profile.id}">
            <span>${profile.iniciais}</span>
            <strong>${profile.nome}</strong>
          </button>`).join('')}
      </div>`;

    target.addEventListener('click', (event) => {
      const button = event.target.closest('[data-profile]');
      if (!button || button.dataset.profile === active) return;
      WorkoutStorage.setActiveProfile(button.dataset.profile);
      location.reload();
    });
  };

  const name = () => window.TREINO_DATA.perfis[WorkoutStorage.getActiveProfile()].nome;
  window.ProfileUI = { render, name };
})();
