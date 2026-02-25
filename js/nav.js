(function () {
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
        document.querySelectorAll('nav').forEach(setupNav);
    });
})();
