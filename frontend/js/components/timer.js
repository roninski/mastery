const STORAGE_KEY = 'mastery_active_session';
let _intervalId = null;
let _tickCallbacks = [];
let _wakeLock = null;

export function getActiveSession() {
    try {
        const data = localStorage.getItem(STORAGE_KEY);
        return data ? JSON.parse(data) : null;
    } catch {
        return null;
    }
}

export function isRunning() {
    return getActiveSession() !== null;
}

export function isPaused() {
    const session = getActiveSession();
    return session !== null && session.runSince === null;
}

export function getElapsedSeconds() {
    const session = getActiveSession();
    if (!session) return 0;
    if (session.runSince === null) {
        return session.accumulatedSeconds;
    }
    return session.accumulatedSeconds + Math.floor((Date.now() - session.runSince) / 1000);
}

export function startTimer(skillId) {
    const startIso = new Date().toISOString();
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        skillId,
        startIso,
        accumulatedSeconds: 0,
        runSince: Date.now(),
    }));
    _startInterval();
}

export function pauseTimer() {
    const session = getActiveSession();
    if (!session || session.runSince === null) return;
    session.accumulatedSeconds = getElapsedSeconds();
    session.runSince = null;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    _clearInterval();
}

export function resumeTimer() {
    const session = getActiveSession();
    if (!session || session.runSince !== null) return;
    session.runSince = Date.now();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    _startInterval();
}

export function stopTimer() {
    const session = getActiveSession();
    if (!session) return null;
    const durationSeconds = getElapsedSeconds();
    _clearInterval();
    localStorage.removeItem(STORAGE_KEY);
    return { ...session, endIso: new Date().toISOString(), durationSeconds };
}

export function onTick(callback) {
    _tickCallbacks.push(callback);
}

export function offTick(callback) {
    _tickCallbacks = _tickCallbacks.filter(cb => cb !== callback);
}

export async function acquireWakeLock() {
    if ('wakeLock' in navigator) {
        try {
            _wakeLock = await navigator.wakeLock.request('screen');
            document.addEventListener('visibilitychange', _handleVisibilityChange);
        } catch (err) {
            console.warn('WakeLock unavailable:', err.message);
        }
    }
}

export async function releaseWakeLock() {
    document.removeEventListener('visibilitychange', _handleVisibilityChange);
    if (_wakeLock) {
        try { await _wakeLock.release(); } catch {}
        _wakeLock = null;
    }
}

async function _handleVisibilityChange() {
    if (document.visibilityState === 'visible' && isRunning() && !isPaused() && !_wakeLock) {
        try {
            _wakeLock = await navigator.wakeLock.request('screen');
        } catch {}
    }
}

function _startInterval() {
    _clearInterval();
    _intervalId = setInterval(() => {
        const elapsed = getElapsedSeconds();
        _tickCallbacks.forEach(cb => cb(elapsed));
    }, 1000);
}

function _clearInterval() {
    if (_intervalId !== null) {
        clearInterval(_intervalId);
        _intervalId = null;
    }
}

// Resume interval on page load if session was actively running (not paused)
const _restoredSession = getActiveSession();
if (_restoredSession && _restoredSession.runSince !== null) {
    _startInterval();
}
