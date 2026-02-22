(function () {
    const form = document.getElementById('contactForm');
    if (!form) {
        return;
    }

    const submitButton = document.getElementById('submit-contact');
    const statusBox = document.getElementById('form-status');

    const fields = {
        name: document.getElementById('name'),
        email: document.getElementById('email'),
        subject: document.getElementById('subject'),
        message: document.getElementById('message'),
        company: document.getElementById('company')
    };

    const errorNodes = {
        name: document.getElementById('name-error'),
        email: document.getElementById('email-error'),
        subject: document.getElementById('subject-error'),
        message: document.getElementById('message-error')
    };

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const messageMinLength = 20;

    function setStatus(message, type) {
        statusBox.textContent = message;
        statusBox.className = 'form-status ' + type;
    }

    function clearStatus() {
        statusBox.textContent = '';
        statusBox.className = 'form-status';
    }

    function clearErrors() {
        Object.keys(errorNodes).forEach(function (key) {
            errorNodes[key].textContent = '';
        });
    }

    function getValues() {
        return {
            name: fields.name.value.trim(),
            email: fields.email.value.trim(),
            subject: fields.subject.value.trim(),
            message: fields.message.value.trim(),
            company: fields.company.value.trim()
        };
    }

    function validate(values) {
        let valid = true;
        clearErrors();

        if (!values.name) {
            errorNodes.name.textContent = 'Name is required.';
            valid = false;
        }

        if (!values.email) {
            errorNodes.email.textContent = 'Email is required.';
            valid = false;
        } else if (!emailRegex.test(values.email)) {
            errorNodes.email.textContent = 'Please enter a valid email address.';
            valid = false;
        }

        if (!values.subject) {
            errorNodes.subject.textContent = 'Subject is required.';
            valid = false;
        }

        if (!values.message) {
            errorNodes.message.textContent = 'Message is required.';
            valid = false;
        } else if (values.message.length < messageMinLength) {
            errorNodes.message.textContent = 'Message must be at least ' + messageMinLength + ' characters.';
            valid = false;
        }

        return valid;
    }

    function getApiUrl() {
        if (window.location.protocol === 'file:') {
            return 'http://localhost:3000/api/contact';
        }
        return '/api/contact';
    }

    form.addEventListener('submit', async function (event) {
        event.preventDefault();
        clearStatus();

        const values = getValues();
        if (!validate(values)) {
            setStatus('Please fix the highlighted fields and try again.', 'error');
            return;
        }

        submitButton.disabled = true;
        submitButton.textContent = 'Sending...';

        try {
            const response = await fetch(getApiUrl(), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(values)
            });

            const result = await response.json();

            if (!response.ok) {
                setStatus(result.message || 'Unable to send your message right now. Please try again.', 'error');
                return;
            }

            setStatus('Thank you for contacting us. We will get back to you soon.', 'success');
            form.reset();
        } catch (error) {
            setStatus('Network error. Please make sure the server is running and try again.', 'error');
        } finally {
            submitButton.disabled = false;
            submitButton.textContent = 'Send Message';
        }
    });
})();
