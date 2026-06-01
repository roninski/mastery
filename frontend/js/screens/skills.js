import { api } from '../api.js';
import { showAddSkillModal } from '../components/modal.js';
import { getActiveSession } from '../components/timer.js';
import { escapeHtml } from '../components/utils.js';

let _navigate, _refresh;

export function initSkillsScreen(navigate, refresh) {
    _navigate = navigate;
    _refresh = refresh;

    document.getElementById('btn-add-skill').addEventListener('click', () => {
        showAddSkillModal(async (name, emoji) => {
            const result = await api.add_skill(name, emoji);
            if (result?.error) {
                alert(result.error);
            } else {
                await _refresh();
            }
        });
    });
}

export function renderSkills(skills) {
    const grid = document.getElementById('skills-grid');
    const activeSession = getActiveSession();

    if (!skills || skills.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="empty-emoji">⚔️</div>
                <p>No skills yet</p>
                <p>Tap + to add your first skill</p>
            </div>`;
        return;
    }

    grid.innerHTML = '';
    skills.forEach(skill => {
        const isActive = activeSession?.skillId === skill.id;
        const card = _buildCard(skill, isActive);
        card.addEventListener('click', () => _navigate('detail', skill));
        grid.appendChild(card);
    });
}

function _buildCard(skill, isActive) {
    const div = document.createElement('div');
    div.className = 'skill-card' + (isActive ? ' skill-card--active' : '');
    div.dataset.skillId = skill.id;

    const xpPct = Math.max(0, Math.min(100, skill.progress_pct * 100));
    div.innerHTML = `
        <div class="skill-card-emoji">${skill.emoji}</div>
        <div class="skill-card-name">${escapeHtml(skill.name)}</div>
        <div class="skill-card-footer">
            <div class="xp-bar"><div class="xp-fill" style="width:${xpPct}%"></div></div>
            <div class="skill-card-level">${skill.level}<span class="level-denom">/100</span></div>
        </div>
        ${isActive ? '<div class="active-dot"></div>' : ''}
    `;
    return div;
}
