import { toLocalDatetimeValue, formatDuration, formatDateShort, escapeHtml } from './utils.js';

let _onConfirm = null;

function getOverlay() {
    return document.getElementById('modal-overlay');
}

export function hideModal() {
    getOverlay().classList.add('hidden');
    _onConfirm = null;
}

export function showAddSkillModal(onConfirm) {
    _onConfirm = onConfirm;
    const overlay = getOverlay();

    overlay.innerHTML = `
        <div class="modal-card">
            <h2 class="modal-title">New Skill</h2>
            <input type="text" id="input-skill-name" class="modal-input"
                   placeholder="Skill name..." maxlength="40" autocomplete="off">
            <span class="modal-label">Emoji or icon (up to 2 characters)</span>
            <input type="text" id="input-skill-emoji" class="modal-input emoji-input"
                   placeholder="e.g. 🎸 or Az" maxlength="2" autocomplete="off" value="⭐">
            <div class="modal-actions">
                <button class="btn-secondary" id="btn-modal-cancel" type="button">Cancel</button>
                <button class="btn-primary" id="btn-modal-confirm" type="button">Create Skill</button>
            </div>
        </div>`;

    overlay.classList.remove('hidden');
    requestAnimationFrame(() => document.getElementById('input-skill-name')?.focus());
    _setupAddSkillListeners();
}

export function showAddSessionModal(onConfirm) {
    _onConfirm = onConfirm;
    const overlay = getOverlay();

    overlay.innerHTML = `
        <div class="modal-card">
            <h2 class="modal-title">Add Session</h2>
            <span class="modal-label">Start time</span>
            <input type="datetime-local" id="input-session-start" class="modal-input">
            <span class="modal-label">End time</span>
            <input type="datetime-local" id="input-session-end" class="modal-input">
            <span class="modal-label">Note (optional)</span>
            <textarea id="input-session-note" class="modal-input modal-input--textarea"
                      placeholder="e.g. group class, practice session..." maxlength="200" autocomplete="off"></textarea>
            <div class="modal-actions">
                <button class="btn-secondary" id="btn-modal-cancel" type="button">Cancel</button>
                <button class="btn-primary" id="btn-modal-confirm" type="button">Add Session</button>
            </div>
        </div>`;

    overlay.classList.remove('hidden');
    _prefillSessionTimes();
    _setupAddSessionListeners();
}

function _setupAddSkillListeners() {
    const overlay = getOverlay();

    document.getElementById('input-skill-name').addEventListener('keydown', e => {
        if (e.key === 'Enter') _confirmAddSkill();
    });
    document.getElementById('btn-modal-confirm').addEventListener('click', _confirmAddSkill);
    document.getElementById('btn-modal-cancel').addEventListener('click', hideModal);
}

function _confirmAddSkill() {
    const nameEl = document.getElementById('input-skill-name');
    const name = nameEl.value.trim();
    if (!name) {
        nameEl.classList.add('input-error');
        nameEl.focus();
        return;
    }
    const emoji = ([...document.getElementById('input-skill-emoji').value].slice(0, 2).join('')) || '⭐';
    const cb = _onConfirm;
    hideModal();
    cb?.(name, emoji);
}

function _setupAddSessionListeners() {
    const overlay = getOverlay();

    document.getElementById('btn-modal-confirm').addEventListener('click', () => {
        const startStr = document.getElementById('input-session-start').value;
        const endStr = document.getElementById('input-session-end').value;
        const note = document.getElementById('input-session-note').value.trim();

        if (!startStr || !endStr) {
            alert('Please fill in both start and end times.');
            return;
        }

        const startIso = new Date(startStr).toISOString();
        const endIso = new Date(endStr).toISOString();

        if (new Date(endIso) <= new Date(startIso)) {
            alert('End time must be after start time.');
            return;
        }

        const cb = _onConfirm;
        hideModal();
        cb?.(startIso, endIso, note);
    });

    document.getElementById('btn-modal-cancel').addEventListener('click', hideModal);
}

export function showSessionDetailModal(session, onDelete, onEdit, onSaveNote) {
    const overlay = getOverlay();
    const start = new Date(session.start_time);
    const end = new Date(session.end_time);
    const dateStr = formatDateShort(start);
    const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dur = formatDuration(session.duration_seconds);

    overlay.innerHTML = `
        <div class="modal-card">
            <div class="modal-title-row">
                <h2 class="modal-title">Session</h2>
                <button class="btn-modal-pencil" id="btn-session-edit" title="Edit session" type="button">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="width:16px;height:16px;display:block;">
                        <path d="M12 20h9"/>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
                    </svg>
                </button>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">Date</span>
                <span class="session-detail-value">${escapeHtml(dateStr)}</span>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">Time</span>
                <span class="session-detail-value">${escapeHtml(startTime)} → ${escapeHtml(endTime)}</span>
            </div>
            <div class="session-detail-row">
                <span class="session-detail-label">Duration</span>
                <span class="session-detail-value session-detail-dur">${escapeHtml(dur)}</span>
            </div>
            <span class="modal-label">Note</span>
            <textarea id="input-detail-note" class="modal-input modal-input--textarea"
                      placeholder="Add a note..." maxlength="200" autocomplete="off">${escapeHtml(session.note || '')}</textarea>
            <div class="modal-actions">
                <button class="btn-danger"    id="btn-session-delete" type="button">Delete</button>
                <button class="btn-secondary" id="btn-modal-cancel"   type="button">Close</button>
            </div>
        </div>`;

    overlay.classList.remove('hidden');

    document.getElementById('btn-modal-cancel').addEventListener('click', () => {
        const note = document.getElementById('input-detail-note').value.trim();
        hideModal();
        if (note !== (session.note || '')) onSaveNote?.(note);
    });
    document.getElementById('btn-session-delete').addEventListener('click', () => {
        hideModal();
        onDelete?.();
    });
    document.getElementById('btn-session-edit').addEventListener('click', () => {
        const currentNote = document.getElementById('input-detail-note').value.trim();
        hideModal();
        onEdit?.(currentNote);
    });
}

export function showEditSessionModal(session, onSave) {
    const overlay = getOverlay();
    const totalMin = Math.round(session.duration_seconds / 60);
    const durH = Math.floor(totalMin / 60);
    const durM = totalMin % 60;

    overlay.innerHTML = `
        <div class="modal-card">
            <h2 class="modal-title">Edit Session</h2>
            <span class="modal-label">Start time</span>
            <input type="datetime-local" id="input-edit-start" class="modal-input"
                   value="${toLocalDatetimeValue(new Date(session.start_time))}">
            <span class="modal-label">End time</span>
            <input type="datetime-local" id="input-edit-end" class="modal-input"
                   value="${toLocalDatetimeValue(new Date(session.end_time))}">
            <span class="modal-label">Duration</span>
            <div class="duration-inputs">
                <input type="number" id="input-edit-dur-h" class="modal-input modal-input--narrow"
                       min="0" max="9999" value="${durH}">
                <span class="duration-sep">h</span>
                <input type="number" id="input-edit-dur-m" class="modal-input modal-input--narrow"
                       min="0" max="59" value="${durM}">
                <span class="duration-sep">m</span>
            </div>
            <span class="modal-label">Note (optional)</span>
            <textarea id="input-edit-note" class="modal-input modal-input--textarea"
                      placeholder="e.g. group class, practice session..." maxlength="200" autocomplete="off">${escapeHtml(session.note || '')}</textarea>
            <div class="modal-actions">
                <button class="btn-secondary" id="btn-modal-cancel"  type="button">Cancel</button>
                <button class="btn-primary"   id="btn-modal-confirm" type="button">Save</button>
            </div>
        </div>`;

    overlay.classList.remove('hidden');

    document.getElementById('btn-modal-confirm').addEventListener('click', () => {
        const startStr = document.getElementById('input-edit-start').value;
        const endStr   = document.getElementById('input-edit-end').value;
        const h = parseInt(document.getElementById('input-edit-dur-h').value) || 0;
        const m = parseInt(document.getElementById('input-edit-dur-m').value) || 0;
        const note = document.getElementById('input-edit-note').value.trim();

        if (!startStr || !endStr) { alert('Please fill in both start and end times.'); return; }
        const startIso = new Date(startStr).toISOString();
        const endIso   = new Date(endStr).toISOString();
        if (new Date(endIso) <= new Date(startIso)) { alert('End time must be after start time.'); return; }
        const durationSeconds = h * 3600 + m * 60;
        if (durationSeconds <= 0) { alert('Duration must be greater than zero.'); return; }

        const cb = onSave;
        hideModal();
        cb?.(startIso, endIso, durationSeconds, note);
    });
    document.getElementById('btn-modal-cancel').addEventListener('click', hideModal);
}


export function showConfirmModal(message, confirmLabel, onConfirm) {
    const overlay = getOverlay();

    overlay.innerHTML = `
        <div class="modal-card">
            <p class="modal-confirm-text">${escapeHtml(message)}</p>
            <div class="modal-actions">
                <button class="btn-secondary" id="btn-modal-cancel" type="button">Cancel</button>
                <button class="btn-danger" id="btn-modal-confirm" type="button">${escapeHtml(confirmLabel)}</button>
            </div>
        </div>`;

    overlay.classList.remove('hidden');

    document.getElementById('btn-modal-confirm').addEventListener('click', () => {
        hideModal();
        onConfirm?.();
    });
    document.getElementById('btn-modal-cancel').addEventListener('click', hideModal);
}

export function showRenameSkillModal(skill, onConfirm) {
    _onConfirm = onConfirm;
    const overlay = getOverlay();

    overlay.innerHTML = `
        <div class="modal-card">
            <h2 class="modal-title">Rename Skill</h2>
            <input type="text" id="input-rename-name" class="modal-input"
                   placeholder="Skill name..." maxlength="40" autocomplete="off"
                   value="${escapeHtml(skill.name)}">
            <span class="modal-label">Emoji or icon (up to 2 characters)</span>
            <input type="text" id="input-rename-emoji" class="modal-input emoji-input"
                   placeholder="e.g. 🎸 or Az" maxlength="2" autocomplete="off"
                   value="${escapeHtml(skill.emoji)}">
            <div class="modal-actions">
                <button class="btn-secondary" id="btn-modal-cancel" type="button">Cancel</button>
                <button class="btn-primary" id="btn-modal-confirm" type="button">Save</button>
            </div>
        </div>`;

    overlay.classList.remove('hidden');
    const nameEl = document.getElementById('input-rename-name');
    requestAnimationFrame(() => { nameEl.focus(); nameEl.select(); });

    const confirm = () => {
        const name = document.getElementById('input-rename-name').value.trim();
        if (!name) {
            document.getElementById('input-rename-name').classList.add('input-error');
            document.getElementById('input-rename-name').focus();
            return;
        }
        const emoji = ([...document.getElementById('input-rename-emoji').value].slice(0, 2).join('')) || '⭐';
        const cb = _onConfirm;
        hideModal();
        cb?.(name, emoji);
    };

    document.getElementById('input-rename-name').addEventListener('keydown', e => {
        if (e.key === 'Enter') confirm();
    });
    document.getElementById('btn-modal-confirm').addEventListener('click', confirm);
    document.getElementById('btn-modal-cancel').addEventListener('click', hideModal);
}

export function showDeleteSkillModal(skillName, onConfirm) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const overlay = getOverlay();

    overlay.innerHTML = `
        <div class="modal-card">
            <h2 class="modal-title">Delete Skill</h2>
            <p class="modal-danger-text">This will permanently delete <strong>${escapeHtml(skillName)}</strong> and all its sessions. This cannot be undone.</p>
            <span class="modal-label">Type <strong class="modal-code">${escapeHtml(code)}</strong> to confirm</span>
            <input type="text" id="input-delete-code" class="modal-input modal-input--code"
                   placeholder="${escapeHtml(code)}" maxlength="4" autocomplete="off" inputmode="numeric">
            <div class="modal-actions">
                <button class="btn-secondary" id="btn-modal-cancel" type="button">Cancel</button>
                <button class="btn-danger" id="btn-modal-confirm" type="button" disabled>Delete</button>
            </div>
        </div>`;

    overlay.classList.remove('hidden');
    requestAnimationFrame(() => document.getElementById('input-delete-code')?.focus());

    const codeInput = document.getElementById('input-delete-code');
    const confirmBtn = document.getElementById('btn-modal-confirm');

    codeInput.addEventListener('input', () => {
        confirmBtn.disabled = codeInput.value !== code;
    });

    codeInput.addEventListener('keydown', e => {
        if (e.key === 'Enter' && codeInput.value === code) {
            hideModal();
            onConfirm?.();
        }
    });

    confirmBtn.addEventListener('click', () => {
        if (codeInput.value !== code) return;
        hideModal();
        onConfirm?.();
    });

    document.getElementById('btn-modal-cancel').addEventListener('click', hideModal);
}

function _prefillSessionTimes() {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 3600 * 1000);
    document.getElementById('input-session-start').value = toLocalDatetimeValue(oneHourAgo);
    document.getElementById('input-session-end').value = toLocalDatetimeValue(now);
}
