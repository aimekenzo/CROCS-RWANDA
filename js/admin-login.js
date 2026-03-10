(function () {
    async function checkSession() {
        try {
            const response = await fetch('/api/admin/session');
            const data = await response.json();
            if (response.ok && data.authenticated) {
                window.location.href = '/admin';
            }
        } catch (error) {
            // keep login form available
        }
    }

    function initLogin() {
        const form = document.getElementById('admin-login-form');
        const usernameInput = document.getElementById('admin-username');
        const passwordInput = document.getElementById('admin-password');
        const feedback = document.getElementById('admin-login-feedback');
        if (!form || !usernameInput || !passwordInput || !feedback) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            feedback.textContent = 'Signing in...';

            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        username: usernameInput.value,
                        password: passwordInput.value
                    })
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    feedback.textContent = data.message || 'Login failed.';
                    return;
                }

                feedback.textContent = 'Login successful. Redirecting...';
                window.location.href = '/admin';
            } catch (error) {
                feedback.textContent = 'Network error. Try again.';
            }
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        checkSession();
        initLogin();
    });
})();
