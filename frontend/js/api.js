export const api = new Proxy({}, {
    get(_, method) {
        return (...args) => new Promise((resolve, reject) => {
            const call = () => {
                window.pywebview.api[method](...args).then(resolve).catch(reject);
            };
            if (window.pywebview?.api) {
                call();
            } else {
                window.addEventListener('pywebviewready', call, { once: true });
            }
        });
    }
});
