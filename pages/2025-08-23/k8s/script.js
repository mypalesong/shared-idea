// Kubernetes Manual Interactive Features
document.addEventListener('DOMContentLoaded', function() {
    initializeNavigation();
    initializeTheme();
    initializeProgressBar();
    initializeTabs();
    initializeCodeHighlighting();
    initializeSearch();
    initializePrintFunction();
    initializeSmoothing();
});

// Navigation functionality
function initializeNavigation() {
    const toggleBtn = document.getElementById('toggle-nav');
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const navLinks = document.querySelectorAll('.nav-link');
    const subNavLinks = document.querySelectorAll('.sub-nav a');

    // Toggle sidebar
    toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('closed');
        mainContent.classList.toggle('full-width');
    });

    // Auto-close sidebar on mobile when link is clicked
    function closeSidebarOnMobile() {
        if (window.innerWidth <= 768) {
            sidebar.classList.add('closed');
            mainContent.classList.add('full-width');
        }
    }

    // Handle navigation links
    [...navLinks, ...subNavLinks].forEach(link => {
        link.addEventListener('click', function(e) {
            // Remove active class from all links
            [...navLinks, ...subNavLinks].forEach(l => l.classList.remove('active'));
            
            // Add active class to clicked link
            this.classList.add('active');
            
            // Expand parent nav item if it's a sub-nav link
            if (this.closest('.sub-nav')) {
                this.closest('li').querySelector('.nav-link').classList.add('active');
            }
            
            closeSidebarOnMobile();
        });
    });

    // Expand navigation based on current section
    function updateActiveNavigation() {
        const currentSection = getCurrentSection();
        if (currentSection) {
            // Remove all active states
            [...navLinks, ...subNavLinks].forEach(l => l.classList.remove('active'));
            
            // Find and activate the corresponding nav link
            const targetLink = document.querySelector(`[href="#${currentSection}"]`);
            if (targetLink) {
                targetLink.classList.add('active');
                
                // If it's a sub-nav link, also activate parent
                if (targetLink.closest('.sub-nav')) {
                    const parentNavLink = targetLink.closest('li').parentElement.closest('li').querySelector('.nav-link');
                    if (parentNavLink) {
                        parentNavLink.classList.add('active');
                    }
                }
            }
        }
    }

    // Update navigation on scroll
    window.addEventListener('scroll', updateActiveNavigation);
    updateActiveNavigation(); // Initial call
}

// Theme switching functionality
function initializeTheme() {
    const themeToggle = document.getElementById('toggle-theme');
    const body = document.body;
    
    // Check for saved theme preference or default to 'light'
    const currentTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', currentTheme);
    updateThemeButton(currentTheme);

    themeToggle.addEventListener('click', function() {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        updateThemeButton(newTheme);
    });

    function updateThemeButton(theme) {
        themeToggle.textContent = theme === 'dark' ? '☀️ 라이트모드' : '🌙 다크모드';
    }
}

// Progress bar functionality
function initializeProgressBar() {
    const progressBar = document.getElementById('progress-bar');
    
    function updateProgressBar() {
        const scrollTop = window.pageYOffset;
        const docHeight = document.body.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;
        
        progressBar.style.width = progress + '%';
    }
    
    window.addEventListener('scroll', updateProgressBar);
    updateProgressBar(); // Initial call
}

// Tab functionality for deployment strategies
function initializeTabs() {
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            const targetTab = this.getAttribute('data-tab');
            
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            this.classList.add('active');
            document.getElementById(targetTab).classList.add('active');
        });
    });
}

// Code highlighting
function initializeCodeHighlighting() {
    // Highlight all code blocks
    hljs.highlightAll();
    
    // Add copy functionality to code blocks
    const codeBlocks = document.querySelectorAll('pre code');
    codeBlocks.forEach((block, index) => {
        // Create copy button
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn';
        copyBtn.innerHTML = '📋 복사';
        copyBtn.onclick = () => copyCode(block, copyBtn);
        
        // Add copy button to code block container
        const pre = block.parentElement;
        pre.style.position = 'relative';
        pre.appendChild(copyBtn);
    });
}

// Copy code functionality
function copyCode(codeBlock, button) {
    const text = codeBlock.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        const originalText = button.innerHTML;
        button.innerHTML = '✅ 복사됨';
        button.style.background = '#34a853';
        
        setTimeout(() => {
            button.innerHTML = originalText;
            button.style.background = '';
        }, 2000);
    }).catch(() => {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        
        const originalText = button.innerHTML;
        button.innerHTML = '✅ 복사됨';
        setTimeout(() => {
            button.innerHTML = originalText;
        }, 2000);
    });
}

// Search functionality
function initializeSearch() {
    // Create search box
    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.innerHTML = `
        <input type="text" id="search-input" placeholder="문서 내 검색..." />
        <button id="search-clear">✖</button>
    `;
    
    // Add search box to sidebar
    const sidebarContent = document.querySelector('.sidebar-content');
    sidebarContent.insertBefore(searchContainer, sidebarContent.firstChild);
    
    const searchInput = document.getElementById('search-input');
    const searchClear = document.getElementById('search-clear');
    const navLinks = document.querySelectorAll('.nav-list a');
    
    // Search functionality
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            // Show all navigation items
            navLinks.forEach(link => {
                link.style.display = 'block';
                link.parentElement.style.display = 'block';
            });
            searchClear.style.display = 'none';
        } else {
            searchClear.style.display = 'block';
            
            // Filter navigation items
            navLinks.forEach(link => {
                const text = link.textContent.toLowerCase();
                const isVisible = text.includes(searchTerm);
                
                link.style.display = isVisible ? 'block' : 'none';
                
                // Handle parent list items
                const parentLi = link.parentElement;
                const visibleChildren = Array.from(parentLi.querySelectorAll('a')).some(a => 
                    a.style.display !== 'none'
                );
                
                if (parentLi.querySelector('.nav-link') === link) {
                    // This is a main navigation item
                    parentLi.style.display = isVisible || visibleChildren ? 'block' : 'none';
                }
            });
        }
    });
    
    // Clear search
    searchClear.addEventListener('click', function() {
        searchInput.value = '';
        searchInput.dispatchEvent(new Event('input'));
        searchInput.focus();
    });
}

// Print functionality
function initializePrintFunction() {
    const printBtn = document.getElementById('print-btn');
    
    printBtn.addEventListener('click', function() {
        // Expand all sections before printing
        const sidebar = document.getElementById('sidebar');
        const originalDisplay = sidebar.style.display;
        
        // Temporarily hide sidebar for printing
        sidebar.style.display = 'none';
        
        // Trigger print
        window.print();
        
        // Restore sidebar
        sidebar.style.display = originalDisplay;
    });
}

// Smooth scrolling
function initializeSmoothing() {
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Utility function to get current section
function getCurrentSection() {
    const sections = document.querySelectorAll('.content-section');
    const scrollTop = window.pageYOffset + 100; // Offset for header
    
    for (let i = sections.length - 1; i >= 0; i--) {
        const section = sections[i];
        const sectionTop = section.offsetTop;
        
        if (scrollTop >= sectionTop) {
            return section.id;
        }
    }
    
    return null;
}

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();
            searchInput.select();
        }
    }
    
    // Ctrl/Cmd + P to print
    if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
        e.preventDefault();
        document.getElementById('print-btn').click();
    }
    
    // Escape to close sidebar on mobile
    if (e.key === 'Escape') {
        const sidebar = document.getElementById('sidebar');
        const mainContent = document.getElementById('main-content');
        if (window.innerWidth <= 768 && !sidebar.classList.contains('closed')) {
            sidebar.classList.add('closed');
            mainContent.classList.add('full-width');
        }
    }
});

// Add intersection observer for section visibility
function initializeSectionObserver() {
    const sections = document.querySelectorAll('.content-section');
    const navLinks = document.querySelectorAll('.nav-list a');
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                
                // Update active navigation
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${id}`) {
                        link.classList.add('active');
                        
                        // Also activate parent if it's a sub-nav
                        if (link.closest('.sub-nav')) {
                            const parentNavLink = link.closest('li').parentElement.closest('li').querySelector('.nav-link');
                            if (parentNavLink) {
                                parentNavLink.classList.add('active');
                            }
                        }
                    }
                });
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-100px 0px -50% 0px'
    });
    
    sections.forEach(section => observer.observe(section));
}

// Mobile menu handling
function initializeMobileMenu() {
    const sidebar = document.getElementById('sidebar');
    const mainContent = document.getElementById('main-content');
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    document.body.appendChild(overlay);
    
    // Toggle mobile menu
    function toggleMobileMenu() {
        sidebar.classList.toggle('open');
        overlay.classList.toggle('active');
        document.body.classList.toggle('sidebar-open');
    }
    
    // Close mobile menu
    function closeMobileMenu() {
        sidebar.classList.remove('open');
        overlay.classList.remove('active');
        document.body.classList.remove('sidebar-open');
    }
    
    // Handle overlay click
    overlay.addEventListener('click', closeMobileMenu);
    
    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    });
}

// Initialize additional features when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeSectionObserver();
    initializeMobileMenu();
    
    // Add loading animation
    setTimeout(() => {
        document.body.classList.add('loaded');
    }, 100);
});

// Add CSS for additional features
const additionalStyles = `
<style>
.search-container {
    padding: 1rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    position: relative;
}

#search-input {
    width: 100%;
    padding: 0.75rem 2rem 0.75rem 0.75rem;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.1);
    color: var(--text-inverse);
    font-size: 0.9rem;
}

#search-input::placeholder {
    color: rgba(255, 255, 255, 0.6);
}

#search-input:focus {
    outline: none;
    border-color: var(--primary-color);
    background: rgba(255, 255, 255, 0.15);
}

#search-clear {
    position: absolute;
    right: 1.5rem;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    cursor: pointer;
    font-size: 0.8rem;
    display: none;
    padding: 0.25rem;
    border-radius: 3px;
}

#search-clear:hover {
    color: var(--text-inverse);
    background: rgba(255, 255, 255, 0.1);
}

.copy-btn {
    position: absolute;
    top: 0.5rem;
    right: 0.5rem;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.8rem;
    opacity: 0;
    transition: opacity 0.2s ease;
}

pre:hover .copy-btn {
    opacity: 1;
}

.copy-btn:hover {
    background: rgba(0, 0, 0, 0.9);
}

.sidebar-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    z-index: 999;
}

.sidebar-overlay.active {
    display: block;
}

body.sidebar-open {
    overflow: hidden;
}

body.loaded {
    opacity: 1;
}

body {
    opacity: 0;
    transition: opacity 0.3s ease;
}

@media (max-width: 768px) {
    .sidebar.open {
        transform: translateX(0);
    }
    
    .sidebar-overlay.active {
        display: block;
    }
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', additionalStyles);