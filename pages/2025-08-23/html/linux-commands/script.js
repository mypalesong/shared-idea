// 전역 변수
let currentQuiz = 0;
const totalQuizzes = 5;

// DOM 로드 완료 후 실행
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 앱 초기화
function initializeApp() {
    setupTerminalAnimation();
    setupStickyNavigation();
    setupSmoothScrolling();
    setupCodeCopyFeature();
    setupQuizFunctionality();
    setupScrollAnimations();
    setupParticles();
    observeIntersections();
}

// 터미널 타이핑 애니메이션
function setupTerminalAnimation() {
    const terminalText = document.getElementById('terminalText');
    if (!terminalText) return;

    const commands = [
        '$ pwd',
        '/home/user/projects',
        '$ ls -la',
        'total 32',
        'drwxr-xr-x  4 user user 4096 Aug 23 10:30 .',
        'drwxr-xr-x  3 user user 4096 Aug 22 15:20 ..',
        '-rw-r--r--  1 user user  220 Aug 22 15:20 .bashrc',
        'drwxr-xr-x  2 user user 4096 Aug 23 09:15 Documents',
        'drwxr-xr-x  2 user user 4096 Aug 23 09:15 Projects',
        '$ cd Projects',
        '$ mkdir linux-tutorial',
        '$ echo "Ubuntu Linux 명령어 학습을 시작합니다!"',
        'Ubuntu Linux 명령어 학습을 시작합니다!',
        '$ _'
    ];

    let commandIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    let currentCommand = '';

    function typeWriter() {
        if (commandIndex >= commands.length) {
            commandIndex = 0;
            setTimeout(typeWriter, 3000);
            return;
        }

        const fullCommand = commands[commandIndex];
        
        if (!isDeleting && charIndex <= fullCommand.length) {
            currentCommand = fullCommand.substring(0, charIndex);
            charIndex++;
        } else if (isDeleting && charIndex >= 0) {
            currentCommand = fullCommand.substring(0, charIndex);
            charIndex--;
        }

        terminalText.innerHTML = terminalText.innerHTML.split('\n').slice(0, commandIndex).join('\n') + 
                                (commandIndex > 0 ? '\n' : '') + currentCommand;

        let typeSpeed = 50;
        if (isDeleting) typeSpeed = 25;

        if (!isDeleting && charIndex > fullCommand.length) {
            typeSpeed = 1000;
            commandIndex++;
            charIndex = 0;
        } else if (isDeleting && charIndex < 0) {
            isDeleting = false;
            commandIndex++;
            charIndex = 0;
        }

        setTimeout(typeWriter, typeSpeed);
    }

    setTimeout(typeWriter, 1000);
}

// 고정 네비게이션 설정
function setupStickyNavigation() {
    const stickyNav = document.getElementById('stickyNav');
    if (!stickyNav) return;

    let lastScrollTop = 0;
    const heroHeight = window.innerHeight * 0.8;

    window.addEventListener('scroll', function() {
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        if (scrollTop > heroHeight) {
            stickyNav.classList.add('visible');
        } else {
            stickyNav.classList.remove('visible');
        }

        lastScrollTop = scrollTop;
    });

    // 네비게이션 링크 활성화
    const navLinks = document.querySelectorAll('.nav-links a');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetSection = document.querySelector(targetId);
            
            if (targetSection) {
                targetSection.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
                
                // 활성 링크 업데이트
                navLinks.forEach(l => l.classList.remove('active'));
                this.classList.add('active');
            }
        });
    });
}

// 부드러운 스크롤
function setupSmoothScrolling() {
    // 버튼 클릭 시 스크롤
    window.scrollToSection = function(sectionId) {
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            const offsetTop = targetSection.offsetTop - 80;
            window.scrollTo({
                top: offsetTop,
                behavior: 'smooth'
            });
        }
    };
}

// 코드 복사 기능
function setupCodeCopyFeature() {
    const codeBlocks = document.querySelectorAll('.command-example pre');
    
    codeBlocks.forEach(block => {
        block.addEventListener('click', function() {
            const code = this.querySelector('code');
            const text = code ? code.textContent : this.textContent;
            
            // 프롬프트 기호($) 제거
            const cleanText = text.replace(/^\$ /gm, '');
            
            navigator.clipboard.writeText(cleanText).then(() => {
                this.classList.add('copied');
                setTimeout(() => {
                    this.classList.remove('copied');
                }, 2000);
            }).catch(err => {
                console.error('복사 실패:', err);
                // 폴백: 선택 영역으로 복사
                const selection = window.getSelection();
                const range = document.createRange();
                range.selectNodeContents(this);
                selection.removeAllRanges();
                selection.addRange(range);
            });
        });
        
        // 마우스 오버 시 툴팁 표시
        block.style.position = 'relative';
        block.addEventListener('mouseenter', function() {
            if (!this.classList.contains('copied')) {
                this.style.cursor = 'pointer';
            }
        });
    });
}

// 퀴즈 기능
function setupQuizFunctionality() {
    const quizOptions = document.querySelectorAll('.quiz-option');
    const prevButton = document.getElementById('prevQuiz');
    const nextButton = document.getElementById('nextQuiz');
    const progressText = document.getElementById('quizProgress');

    // 퀴즈 옵션 클릭 이벤트
    quizOptions.forEach(option => {
        option.addEventListener('click', function() {
            const isCorrect = this.getAttribute('data-correct') === 'true';
            const quizCard = this.closest('.quiz-card');
            const feedback = quizCard.querySelector('.quiz-feedback');
            const allOptions = quizCard.querySelectorAll('.quiz-option');
            
            // 모든 옵션 비활성화
            allOptions.forEach(opt => {
                opt.style.pointerEvents = 'none';
                if (opt.getAttribute('data-correct') === 'true') {
                    opt.classList.add('correct');
                } else {
                    opt.classList.add('incorrect');
                }
            });
            
            // 피드백 표시
            if (isCorrect) {
                feedback.innerHTML = '<div style="background: rgba(40, 167, 69, 0.2); padding: 1rem; border-radius: 8px;"><strong>정답입니다! 🎉</strong><br>올바른 명령어를 선택하셨습니다.</div>';
            } else {
                feedback.innerHTML = '<div style="background: rgba(220, 53, 69, 0.2); padding: 1rem; border-radius: 8px;"><strong>틀렸습니다. 😅</strong><br>정답은 초록색으로 표시된 옵션입니다.</div>';
            }
            
            feedback.classList.add('show');
        });
    });

    // 이전/다음 버튼
    if (prevButton) {
        prevButton.addEventListener('click', function() {
            if (currentQuiz > 0) {
                currentQuiz--;
                showQuiz(currentQuiz);
            }
        });
    }

    if (nextButton) {
        nextButton.addEventListener('click', function() {
            if (currentQuiz < totalQuizzes - 1) {
                currentQuiz++;
                showQuiz(currentQuiz);
            }
        });
    }

    // 초기 퀴즈 표시
    showQuiz(currentQuiz);

    function showQuiz(index) {
        const quizCards = document.querySelectorAll('.quiz-card');
        
        quizCards.forEach((card, i) => {
            if (i === index) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
        
        // 진행 상황 업데이트
        if (progressText) {
            progressText.textContent = `${index + 1} / ${totalQuizzes}`;
        }
        
        // 버튼 상태 업데이트
        if (prevButton) {
            prevButton.disabled = index === 0;
        }
        if (nextButton) {
            nextButton.disabled = index === totalQuizzes - 1;
        }
    }
}

// 스크롤 애니메이션
function setupScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.animation = 'fadeInUp 0.6s ease-out forwards';
            }
        });
    }, observerOptions);

    // 명령어 카드 애니메이션 관찰
    const commandCards = document.querySelectorAll('.command-card');
    commandCards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        card.style.animationDelay = `${index * 0.1}s`;
        observer.observe(card);
    });
}

// 파티클 효과
function setupParticles() {
    const particles = document.querySelector('.particles');
    if (!particles) return;
    
    const colors = ['#ff6b35', '#004e89', '#1a659e', '#e95420', '#772953'];
    
    function createParticle() {
        const particle = document.createElement('div');
        particle.style.position = 'absolute';
        particle.style.width = Math.random() * 4 + 2 + 'px';
        particle.style.height = particle.style.width;
        particle.style.background = colors[Math.floor(Math.random() * colors.length)];
        particle.style.borderRadius = '50%';
        particle.style.left = Math.random() * window.innerWidth + 'px';
        particle.style.top = window.innerHeight + 'px';
        particle.style.opacity = Math.random() * 0.5 + 0.2;
        particle.style.pointerEvents = 'none';
        
        particles.appendChild(particle);
        
        const duration = Math.random() * 10000 + 5000;
        const size = parseFloat(particle.style.width);
        
        particle.animate([
            {
                transform: 'translateY(0px) rotate(0deg)',
                opacity: particle.style.opacity
            },
            {
                transform: `translateY(-${window.innerHeight + 100}px) rotate(360deg)`,
                opacity: 0
            }
        ], {
            duration: duration,
            easing: 'linear'
        }).onfinish = () => {
            particle.remove();
        };
    }
    
    // 주기적으로 파티클 생성
    setInterval(createParticle, 1000);
}

// 교차 관찰자 설정
function observeIntersections() {
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a[data-section]');
    
    const sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const sectionId = entry.target.id;
                
                // 네비게이션 링크 활성화 업데이트
                navLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('data-section') === sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }, {
        threshold: 0.3,
        rootMargin: '-80px 0px -80px 0px'
    });
    
    sections.forEach(section => {
        sectionObserver.observe(section);
    });
}

// 키보드 네비게이션 지원
document.addEventListener('keydown', function(e) {
    // 퀴즈 섹션에서 화살표 키로 네비게이션
    if (document.activeElement.closest('.quiz-section')) {
        if (e.key === 'ArrowLeft' && currentQuiz > 0) {
            e.preventDefault();
            currentQuiz--;
            showQuiz(currentQuiz);
        } else if (e.key === 'ArrowRight' && currentQuiz < totalQuizzes - 1) {
            e.preventDefault();
            currentQuiz++;
            showQuiz(currentQuiz);
        }
    }
});

// 반응형 최적화
window.addEventListener('resize', function() {
    // 터미널 크기 조정
    const terminal = document.querySelector('.terminal-mockup');
    if (terminal && window.innerWidth < 768) {
        terminal.style.maxWidth = '100%';
        terminal.style.marginLeft = '0';
    }
});

// 성능 최적화: 스크롤 이벤트 쓰로틀링
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 스크롤 성능 최적화
window.addEventListener('scroll', throttle(function() {
    // 패럴랙스 효과 (옵션)
    const scrolled = window.pageYOffset;
    const parallax = document.querySelector('.hero::before');
    if (parallax) {
        const speed = scrolled * 0.5;
        parallax.style.transform = `translateY(${speed}px)`;
    }
}, 16));

// 접근성 개선: 키보드 포커스 관리
document.addEventListener('focusin', function(e) {
    if (e.target.matches('.command-card')) {
        e.target.style.outline = '2px solid #ff6b35';
        e.target.style.outlineOffset = '2px';
    }
});

document.addEventListener('focusout', function(e) {
    if (e.target.matches('.command-card')) {
        e.target.style.outline = 'none';
    }
});

// 다크 모드 토글 (향후 확장 가능)
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
}

// 로컬 스토리지에서 다크 모드 상태 복원
if (localStorage.getItem('darkMode') === 'true') {
    document.body.classList.add('dark-mode');
}

// 에러 처리
window.addEventListener('error', function(e) {
    console.error('JavaScript 에러 발생:', e.error);
});

// 브라우저 호환성 확인
function checkBrowserCompatibility() {
    const isModernBrowser = 'IntersectionObserver' in window && 
                           'Promise' in window && 
                           'fetch' in window;
    
    if (!isModernBrowser) {
        console.warn('이 브라우저는 일부 고급 기능을 지원하지 않을 수 있습니다.');
    }
}

checkBrowserCompatibility();