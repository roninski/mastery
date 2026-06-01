import { api } from '../api.js';
import { showAddSessionModal, showSessionDetailModal, showEditSessionModal, showConfirmModal, showRenameSkillModal, showDeleteSkillModal } from '../components/modal.js';
import {
    startTimer, stopTimer, pauseTimer, resumeTimer,
    getActiveSession, isRunning, isPaused,
    getElapsedSeconds, onTick, offTick, acquireWakeLock, releaseWakeLock
} from '../components/timer.js';
import { formatDuration, formatDateShort, formatHours, escapeHtml } from '../components/utils.js';

let _navigate, _refresh;
let _currentSkill = null;
let _tickCallback = null;
let _sessionStartPct = 0;

const RING_CIRC = 276.46; // 2π * r=44

export function initDetailScreen(navigate, refresh) {
    _navigate = navigate;
    _refresh = refresh;

    document.getElementById('btn-back').addEventListener('click', () => {
        _unregisterTick();
        _navigate('skills');
    });

    document.getElementById('btn-add-session-manual').addEventListener('click', () => {
        if (!_currentSkill) return;
        showAddSessionModal(async (startIso, endIso, note) => {
            const prevSkill = _currentSkill;
            const result = await api.add_session(_currentSkill.id, startIso, endIso, note);
            if (result?.error) {
                alert(result.error);
            } else {
                _currentSkill = result;
                await _animateXpGain(prevSkill, result);
                await _loadSessions();
                _refresh();
            }
        });
    });

    document.getElementById('btn-start-session').addEventListener('click', () => {
        if (!_currentSkill) return;
        startTimer(_currentSkill.id);
        acquireWakeLock();
        _showRunning();
        _showFullscreen();
        _updatePauseButtons();
        _registerTick();
        _refresh(); // update active dot on skills grid
    });

    document.getElementById('btn-stop-session').addEventListener('click', () => {
        showConfirmModal('End session?', 'End Session', () => _handleStop());
    });
    document.getElementById('btn-stop-fs').addEventListener('click', () => {
        showConfirmModal('End session?', 'End Session', () => _handleStop());
    });

    document.getElementById('btn-pause-session').addEventListener('click', () => _handlePause());
    document.getElementById('btn-pause-fs').addEventListener('click', () => _handlePause());

    document.getElementById('btn-skill-options').addEventListener('click', e => {
        if (!_currentSkill) return;
        _showOptionsMenu(e.currentTarget);
    });
}

export async function showSkillDetail(skill) {
    _unregisterTick();
    _currentSkill = skill;

    document.getElementById('detail-skill-name').textContent = skill.name;
    document.getElementById('detail-emoji').textContent = skill.emoji;
    _updateHero(skill);

    const active = getActiveSession();
    if (active && active.skillId === skill.id) {
        _showRunning();
        _showFullscreen();
        _updatePauseButtons();
        _registerTick();
    } else {
        _showStopped();
    }

    await _loadSessions();
}

function _updateHero(skill) {
    document.getElementById('detail-level-text').textContent = `Level ${skill.level} / 100`;
    document.getElementById('detail-tier').textContent = skill.tier_name;
    const pct = Math.max(0, Math.min(100, skill.progress_pct * 100));
    const fill = document.getElementById('detail-xp-fill');
    fill.style.transition = '';
    fill.style.width = `${pct}%`;
    document.getElementById('detail-hours').textContent = formatHours(skill.total_hours) + ' logged';
    const nextEl = document.getElementById('detail-next-level');
    if (skill.level < 100 && skill.hours_to_next_level > 0) {
        nextEl.textContent = formatHours(skill.hours_to_next_level) + ' to next level';
    } else if (skill.level >= 100) {
        nextEl.textContent = 'Max level reached';
    } else {
        nextEl.textContent = '';
    }
}

const _TIER_THRESHOLDS = [[1,'Novice'],[10,'Amateur'],[25,'Competent'],[50,'Expert'],[85,'Elite'],[100,'Master']];
function _getTierName(level) {
    let name = 'Novice';
    for (const [t, label] of _TIER_THRESHOLDS) { if (level >= t) name = label; }
    return name;
}

async function _animateXpGain(prev, next) {
    const fill  = document.getElementById('detail-xp-fill');
    const STEP  = 650; // ms per level fill

    function setBar(pct, animate) {
        fill.style.transition = animate ? `width ${STEP}ms ease-in-out` : 'none';
        fill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
        if (!animate) void fill.offsetWidth; // flush reflow so next transition fires
    }

    function setLevel(level) {
        document.getElementById('detail-level-text').textContent = `Level ${level} / 100`;
        document.getElementById('detail-tier').textContent = _getTierName(level);
    }

    function wait(ms) { return new Promise(r => setTimeout(r, ms)); }

    const startPct = prev.progress_pct * 100;
    const endPct   = next.progress_pct * 100;

    if (next.level === prev.level) {
        setBar(startPct, false);
        setBar(endPct, true);
        await wait(STEP + 50);
        _updateHero(next);
        return;
    }

    // Fill the remainder of the starting level
    setBar(startPct, false);
    setBar(100, true);
    await wait(STEP + 50);

    // Fill each intermediate level fully
    for (let lvl = prev.level + 1; lvl < next.level; lvl++) {
        setLevel(lvl);
        setBar(0, false);
        setBar(100, true);
        await wait(STEP + 50);
    }

    // Settle into the final level
    setLevel(next.level);
    setBar(0, false);
    setBar(endPct, true);
    await wait(STEP + 50);

    _updateHero(next);
}

async function _loadSessions() {
    const sessions = await api.get_sessions(_currentSkill.id);
    const list = document.getElementById('sessions-list');

    if (!sessions || sessions.length === 0) {
        list.innerHTML = '<p class="empty-sessions">No sessions yet — start one above!</p>';
        return;
    }

    list.innerHTML = '';
    sessions.forEach(session => {
        list.appendChild(_buildSessionRow(session));
    });
}

function _buildSessionRow(session) {
    const div = document.createElement('div');
    div.className = 'session-row';
    div.dataset.sessionId = session.id;

    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const dateStr = formatDateShort(start);
    const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dur = formatDuration(session.duration_seconds);

    div.innerHTML = `
        <div class="session-info">
            <span class="session-date-time">${escapeHtml(dateStr)} • ${escapeHtml(startTime)} – ${escapeHtml(endTime)}</span>
            ${session.note ? `<span class="session-note">${escapeHtml(session.note)}</span>` : ''}
        </div>
        <div class="session-meta">
            <span class="session-dur">${escapeHtml(dur)}</span>
        </div>
    `;

    div.addEventListener('click', () => {
        showSessionDetailModal(
            session,
            async () => {
                const updated = await api.delete_session(session.id);
                if (updated?.error) {
                    alert(updated.error);
                } else {
                    _currentSkill = updated;
                    _updateHero(updated);
                    await _loadSessions();
                    _refresh();
                }
            },
            (currentNote) => {
                showEditSessionModal(
                    { ...session, note: currentNote },
                    async (startIso, endIso, durationSeconds, note) => {
                        await _handleSessionUpdate(session, startIso, endIso, durationSeconds, note);
                    }
                );
            },
            async (note) => {
                await _handleSessionUpdate(session, session.start_time, session.end_time, session.duration_seconds, note);
            }
        );
    });

    return div;
}

async function _handleSessionUpdate(session, startIso, endIso, durationSeconds, note) {
    const prevSkill = _currentSkill;
    const updated = await api.update_session(session.id, startIso, endIso, durationSeconds, note);
    if (updated?.error) {
        alert(updated.error);
    } else {
        _currentSkill = updated;
        await _animateXpGain(prevSkill, updated);
        await _loadSessions();
        _refresh();
    }
}

function _showRunning() {
    document.getElementById('btn-start-session').classList.add('hidden');
    document.getElementById('timer-running').classList.remove('hidden');
}

function _showStopped() {
    document.getElementById('btn-start-session').classList.remove('hidden');
    document.getElementById('timer-running').classList.add('hidden');
    document.getElementById('timer-display').textContent = '00:00:00';
}

function _showFullscreen() {
    const skill = _currentSkill;
    _sessionStartPct = skill.progress_pct;
    document.getElementById('timer-fs-emoji').textContent = skill.emoji;
    document.getElementById('timer-fs-name').textContent = skill.name;
    document.getElementById('timer-fs-level').textContent = `Level ${skill.level} / 100`;
    _updateRing(0);
    _updateFsNext(0);
    document.getElementById('timer-fullscreen').classList.remove('hidden');
}

function _updateFsNext(elapsed) {
    const skill = _currentSkill;
    const nextEl = document.getElementById('timer-fs-next');
    if (skill.level >= 100) {
        nextEl.textContent = 'Max level reached';
        return;
    }
    const remaining = Math.max(0, skill.hours_to_next_level - elapsed / 3600);
    nextEl.textContent = formatHours(remaining) + ' to next level';
}

function _hideFullscreen() {
    document.getElementById('timer-fullscreen').classList.add('hidden');
}

function _updateRing(elapsed) {
    const skill = _currentSkill;
    if (!skill) return;

    const elapsedHours = elapsed / 3600;
    let livePct;

    if (skill.level >= 100 || skill.hours_to_next_level <= 0) {
        livePct = 1.0;
    } else {
        const basePct = _sessionStartPct;
        const remaining = skill.hours_to_next_level;
        const denominator = 1 - basePct;
        if (denominator <= 0) {
            livePct = 1.0;
        } else {
            const levelRange = remaining / denominator;
            livePct = Math.min(1.0, basePct + elapsedHours / levelRange);
        }
    }

    document.getElementById('timer-ring-fill').style.strokeDashoffset = RING_CIRC * (1 - livePct);
}

async function _handleStop() {
    const result = stopTimer();
    releaseWakeLock();
    _unregisterTick();
    _hideFullscreen();
    _showStopped();
    if (!result) return;
    const prevSkill = _currentSkill;
    const updated = await api.add_session(result.skillId, result.startIso, result.endIso, '', result.durationSeconds);
    if (updated?.error) {
        alert(updated.error);
    } else {
        _currentSkill = updated;
        await _animateXpGain(prevSkill, updated);
        await _loadSessions();
        _refresh();
    }
}

function _handlePause() {
    if (isPaused()) {
        resumeTimer();
        acquireWakeLock();
        _registerTick();
    } else {
        pauseTimer();
        releaseWakeLock();
        _unregisterTick();
    }
    _updatePauseButtons();
}

function _updatePauseButtons() {
    const paused = isPaused();
    for (const id of ['btn-pause-session', 'btn-pause-fs']) {
        const btn = document.getElementById(id);
        btn.textContent = paused ? '▶' : '⏸';
        btn.classList.toggle('btn-timer-pause',  !paused);
        btn.classList.toggle('btn-timer-resume',  paused);
    }
}

function _registerTick() {
    _unregisterTick();
    _tickCallback = elapsed => {
        const h = Math.floor(elapsed / 3600);
        const m = Math.floor((elapsed % 3600) / 60);
        const s = elapsed % 60;
        const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
        document.getElementById('timer-display').textContent = timeStr;
        document.getElementById('timer-fs-display').textContent = timeStr;
        _updateRing(elapsed);
        _updateFsNext(elapsed);
    };
    onTick(_tickCallback);
    _tickCallback(getElapsedSeconds());
}

function _unregisterTick() {
    if (_tickCallback) {
        offTick(_tickCallback);
        _tickCallback = null;
    }
}

function _showOptionsMenu(anchor) {
    const existing = document.getElementById('skill-options-menu');
    if (existing) { existing.remove(); return; }

    const menu = document.createElement('div');
    menu.id = 'skill-options-menu';
    menu.className = 'dropdown-menu';
    menu.innerHTML = `
        <button class="dropdown-item" id="opt-rename" type="button">Rename</button>
        <button class="dropdown-item dropdown-item--danger" id="opt-delete" type="button">Delete</button>
    `;

    document.body.appendChild(menu);

    const rect = anchor.getBoundingClientRect();
    menu.style.top = `${rect.bottom + 4}px`;
    menu.style.right = `${window.innerWidth - rect.right}px`;

    const dismiss = e => {
        if (!menu.contains(e.target) && e.target !== anchor) {
            menu.remove();
            document.removeEventListener('click', dismiss, true);
        }
    };
    setTimeout(() => document.addEventListener('click', dismiss, true), 0);

    document.getElementById('opt-rename').addEventListener('click', () => {
        menu.remove();
        document.removeEventListener('click', dismiss, true);
        showRenameSkillModal(_currentSkill, async (name, emoji) => {
            const result = await api.rename_skill(_currentSkill.id, name, emoji);
            if (result?.error) {
                alert(result.error);
            } else {
                _currentSkill = result;
                document.getElementById('detail-skill-name').textContent = result.name;
                document.getElementById('detail-emoji').textContent = result.emoji;
                _refresh();
            }
        });
    });

    document.getElementById('opt-delete').addEventListener('click', () => {
        menu.remove();
        document.removeEventListener('click', dismiss, true);
        showDeleteSkillModal(_currentSkill.name, async () => {
            const ok = await api.delete_skill(_currentSkill.id);
            if (ok) {
                _navigate('skills');
                _refresh();
            }
        });
    });
}
