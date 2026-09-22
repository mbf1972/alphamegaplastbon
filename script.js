/* 
    Alphamegaplast - High-Performance UI Interactions
    Optimized for Vibrant & Professional Industrial Aesthetic
*/

document.addEventListener('DOMContentLoaded', () => {
    // 1. Navbar Dynamic State (Glassmorphism & Scroll)
    const nav = document.getElementById('main-nav');
    if (nav) {
        const handleScroll = () => {
            if (window.scrollY > 50) {
                nav.classList.add('py-2', 'bg-white/90', 'dark:bg-slate-900/90', 'shadow-2xl');
                nav.classList.remove('py-3', 'bg-white/70', 'dark:bg-background-dark/80');
            } else {
                nav.classList.remove('py-2', 'bg-white/90', 'dark:bg-slate-900/90', 'shadow-2xl');
                nav.classList.add('py-3', 'bg-white/70', 'dark:bg-background-dark/80');
            }
        };
        window.addEventListener('scroll', handleScroll, { passive: true });
        handleScroll();
    }

    // 2. High-Precision Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href === '#' || !href) return;

            e.preventDefault();
            const target = document.querySelector(href);
            if (target) {
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });

                // Focus management
                target.setAttribute('tabindex', '-1');
                target.focus({ preventScroll: true });
            }
        });
    });

    // 3. Advanced Scroll Reveal (Intersection Observer)
    const animateObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.fade-up').forEach(el => {
        animateObserver.observe(el);
    });

    // 4. Counter / Stats Animation (Optional but "Vibrant")
    const animateStats = () => {
        document.querySelectorAll('.stat-value').forEach(stat => {
            const target = +stat.dataset.target;
            const count = +stat.innerText;
            const speed = 200;
            const inc = target / speed;

            if (count < target) {
                stat.innerText = Math.ceil(count + inc);
                setTimeout(animateStats, 1);
            } else {
                stat.innerText = target;
            }
        });
    };

    // 5. Mobile Menu Toggle Logic
    const mobileMenuBtn = document.getElementById('mobile-menu-toggle');
    const mobileMenuClose = document.getElementById('mobile-menu-close');
    const mobileMenu = document.getElementById('mobile-menu');
    const mobileMenuBackdrop = document.getElementById('mobile-menu-backdrop');
    const mobileLinks = document.querySelectorAll('.mobile-nav-link');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            mobileMenu.classList.remove('translate-x-full');
            if (mobileMenuBackdrop) {
                mobileMenuBackdrop.classList.remove('opacity-0', 'pointer-events-none');
                mobileMenuBackdrop.classList.add('opacity-100', 'pointer-events-auto');
            }
            document.body.style.overflow = 'hidden'; // Prevent scroll
        });
    }

    const closeMenu = () => {
        if (mobileMenu) {
            mobileMenu.classList.add('translate-x-full');
            if (mobileMenuBackdrop) {
                mobileMenuBackdrop.classList.remove('opacity-100', 'pointer-events-auto');
                mobileMenuBackdrop.classList.add('opacity-0', 'pointer-events-none');
            }
            document.body.style.overflow = ''; // Restore scroll
        }
    };

    if (mobileMenuClose) {
        mobileMenuClose.addEventListener('click', closeMenu);
    }

    if (mobileMenuBackdrop) {
        mobileMenuBackdrop.addEventListener('click', closeMenu);
    }

    mobileLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
    });

    // 6. Button & Card Logic
    const interactables = document.querySelectorAll('button, a, .group');
});
