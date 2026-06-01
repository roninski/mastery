import { api } from './api.js';
import { initSkillsScreen, renderSkills } from './screens/skills.js';
import { initDetailScreen, showSkillDetail } from './screens/detail.js';
import { initStatsScreen } from './screens/stats.js';
import { initSettingsScreen } from './screens/settings.js';

let _skills = [];

export function navigate(screen, data = null) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    const el = document.getElementById(`screen-${screen}`);
    if (el) el.classList.add('active');

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.screen === screen);
    });

    if (screen === 'detail' && data) {
        showSkillDetail(data);
    }

    if (screen === 'skills') {
        refreshSkills();
    }
}

export async function refreshSkills() {
    _skills = await api.get_all_skills();
    renderSkills(_skills);
}

async function init() {
    initSkillsScreen(navigate, refreshSkills);
    initDetailScreen(navigate, refreshSkills);
    initStatsScreen();
    initSettingsScreen();

    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.addEventListener('click', () => navigate(btn.dataset.screen));
    });

    await refreshSkills();
    navigate('skills');
}

document.addEventListener('DOMContentLoaded', init);
