// static/js/modules/nav.js
function initializeNavigation(isAuthenticated = true) {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');
    const navContainer = document.querySelector('.flex-1.overflow-x-auto');

    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.toggle('hidden', section.id !== sectionId);
        });
    }

    function updateActiveNavLink(activeLinkId) {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${activeLinkId}`);
        });
        updateOverflowIndicators();
    }

    function updateOverflowIndicators() {
        const isOverflowing = navContainer.scrollWidth > navContainer.clientWidth;
        const isAtStart = navContainer.scrollLeft === 0;
        const isAtEnd = navContainer.scrollLeft + navContainer.clientWidth >= navContainer.scrollWidth;

        navContainer.classList.toggle('overflow-indicator-start', isOverflowing && !isAtStart);
        navContainer.classList.toggle('overflow-indicator-end', isOverflowing && !isAtEnd);
    }

    if (isAuthenticated) {
        const defaultSectionId = 'streamSection';
        showSection(defaultSectionId);
        updateActiveNavLink(defaultSectionId);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const sectionId = link.getAttribute('href').substring(1);
            showSection(sectionId);
            updateActiveNavLink(sectionId);
        });
    });

    navContainer.addEventListener('scroll', updateOverflowIndicators);
    window.addEventListener('resize', updateOverflowIndicators);

    updateOverflowIndicators(); // Initial check on page load
}

export { initializeNavigation };