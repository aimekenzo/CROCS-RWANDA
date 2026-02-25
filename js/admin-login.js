(function () {
    async function checkSession() {
        try {
            const response = await fetch('/api/admin/session');
            const data = await response.json();
            if (response.ok && data.authenticated) {
                window.location.href = '/pages/admin.html';
            }
        } catch (error) {
            // keep login form available
        }
    }

    function initLogin() {
        const form = document.getElementById('admin-login-form');
        const passwordInput = document.getElementById('admin-password');
        const feedback = document.getElementById('admin-login-feedback');
        if (!form || !passwordInput || !feedback) return;

        form.addEventListener('submit', async (event) => {
            event.preventDefault();
            feedback.textContent = 'Signing in...';

            try {
                const response = await fetch('/api/admin/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: passwordInput.value })
                });
                const data = await response.json().catch(() => ({}));
                if (!response.ok) {
                    feedback.textContent = data.message || 'Login failed.';
                    return;
                }

                feedback.textContent = 'Login successful. Redirecting...';
                window.location.href = '/pages/admin.html';
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
