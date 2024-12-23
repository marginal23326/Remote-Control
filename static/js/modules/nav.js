// static/js/modules/nav.js

function initializeNavigation(isAuthenticated = true) {
    const navLinks = document.querySelectorAll('.nav-link');
    const sections = document.querySelectorAll('.section');

    function showSection(sectionId) {
        sections.forEach(section => {
            section.classList.toggle('hidden', section.id !== sectionId);
        });
    }

    function updateActiveNavLink(activeLinkId) {
        navLinks.forEach(link => {
            link.classList.toggle('active', link.getAttribute('href') === `#${activeLinkId}`);
        });
    }

    if (isAuthenticated) {
        const defaultSectionId = 'streamSection';
        showSection(defaultSectionId);
        updateActiveNavLink(defaultSectionId);
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const sectionId = link.getAttribute('href').substring(1); // Remove the '#'
            showSection(sectionId);
            updateActiveNavLink(sectionId);
        });
    });
}

export { initializeNavigation };
