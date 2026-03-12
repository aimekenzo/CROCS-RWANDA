(function () {
    function ensureSearchBar(nav) {
        const menu = nav.querySelector('ul');
        if (!menu) return;

        const existingForm = menu.querySelector('form.search-bar');
        if (existingForm) {
            const existingItem = existingForm.closest('li');
            if (existingItem) {
                existingItem.classList.add('search-nav-item');
            }
            return;
        }

        const item = document.createElement('li');
        item.className = 'search-nav-item';
        item.innerHTML = `
            <form action="/products" method="GET" class="search-bar">
                <input type="search" name="q" placeholder="Search products..." aria-label="Search products">
                <button type="submit" aria-label="Search">&#128269;</button>
            </form>
        `;

        menu.insertBefore(item, menu.firstChild);
    }

    function ensurePinnedAccountIcon() {
        if (document.getElementById('account-pin-link')) return;

        const link = document.createElement('a');
        link.id = 'account-pin-link';
        link.className = 'account-pin-link';
        link.href = '/account';
        link.setAttribute('aria-label', 'Account');
        link.innerHTML = `
            <span class="account-pin-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" focusable="false" role="img">
                    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z"></path>
                </svg>
            </span>
            <span class="account-pin-label">Account</span>
        `;

        document.body.appendChild(link);
    }

    function closeMenu(nav, menu, toggle) {
        menu.classList.remove('open');
        nav.classList.remove('menu-open');
        if (toggle) toggle.setAttribute('aria-expanded', 'false');
    }

    function setupNav(nav) {
        if (!nav) return;
        const menu = nav.querySelector('ul');
        if (!menu) return;

        menu.classList.add('nav-links');

        let toggle = nav.querySelector('.nav-toggle');
        if (!toggle) {
            toggle = document.createElement('button');
            toggle.type = 'button';
            toggle.className = 'nav-toggle';
            toggle.setAttribute('aria-label', 'Toggle navigation menu');
            toggle.setAttribute('aria-expanded', 'false');
            toggle.innerHTML = '<span></span><span></span><span></span>';
            nav.insertBefore(toggle, menu);
        }

        toggle.addEventListener('click', function () {
            const isOpen = menu.classList.toggle('open');
            nav.classList.toggle('menu-open', isOpen);
            toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        });

        menu.querySelectorAll('a').forEach(function (link) {
            link.addEventListener('click', function () {
                closeMenu(nav, menu, toggle);
            });
        });

        document.addEventListener('click', function (event) {
            const target = event.target;
            if (!(target instanceof Element)) return;
            if (!nav.contains(target)) {
                closeMenu(nav, menu, toggle);
            }
        });

        window.addEventListener('resize', function () {
            if (window.innerWidth > 768) {
                closeMenu(nav, menu, toggle);
            }
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        document.querySelectorAll('nav').forEach(function (nav) {
            ensureSearchBar(nav);
            setupNav(nav);
        });
        ensurePinnedAccountIcon();
    });
})();
