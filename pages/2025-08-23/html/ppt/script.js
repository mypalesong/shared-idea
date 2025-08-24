let currentSlideIndex = 1;
const totalSlides = 10;

// Initialize presentation
document.addEventListener('DOMContentLoaded', function() {
    updatePageIndicator();
    updateProgress();
    
    // Make body focusable for keyboard navigation
    document.body.setAttribute('tabindex', '0');
    document.body.focus();
    
    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Prevent default for presentation keys
        if (['ArrowRight', 'ArrowLeft', ' ', 'Home', 'End', 'PageUp', 'PageDown'].includes(e.key) || 
            (e.key >= '1' && e.key <= '9')) {
            e.preventDefault();
        }
        
        if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') {
            changeSlide(1);
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
            changeSlide(-1);
        } else if (e.key >= '1' && e.key <= '9') {
            const slideNum = parseInt(e.key);
            if (slideNum <= totalSlides) {
                currentSlide(slideNum);
            }
        } else if (e.key === 'Home') {
            currentSlide(1);
        } else if (e.key === 'End') {
            currentSlide(totalSlides);
        } else if (e.key === 'F11' || e.key === 'f') {
            e.preventDefault();
            toggleFullscreen();
        }
    });
    
    // Touch/swipe support for mobile
    let touchStartX = 0;
    let touchEndX = 0;
    
    document.addEventListener('touchstart', function(e) {
        touchStartX = e.changedTouches[0].screenX;
    });
    
    document.addEventListener('touchend', function(e) {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const diff = touchStartX - touchEndX;
        
        if (Math.abs(diff) > swipeThreshold) {
            if (diff > 0) {
                // Swipe left - next slide
                changeSlide(1);
            } else {
                // Swipe right - previous slide
                changeSlide(-1);
            }
        }
    }
    
    // Show controls info on first visit
    setTimeout(showControlsInfo, 1000);
});

function changeSlide(direction) {
    const newSlideIndex = currentSlideIndex + direction;
    
    if (newSlideIndex >= 1 && newSlideIndex <= totalSlides) {
        currentSlide(newSlideIndex);
    }
}

function currentSlide(slideIndex) {
    if (slideIndex < 1 || slideIndex > totalSlides) {
        return;
    }
    
    // Hide current slide
    const currentSlide = document.querySelector('.slide.active');
    if (currentSlide) {
        currentSlide.classList.remove('active');
        
        // Add animation class based on direction
        if (slideIndex > currentSlideIndex) {
            currentSlide.classList.add('prev');
        }
    }
    
    // Show new slide
    const newSlide = document.querySelector(`.slide[data-slide="${slideIndex}"]`);
    if (newSlide) {
        // Small delay to ensure smooth transition
        setTimeout(() => {
            newSlide.classList.add('active');
            newSlide.classList.remove('prev');
        }, 50);
    }
    
    currentSlideIndex = slideIndex;
    updatePageIndicator();
    updateProgress();
    
    // Trigger slide-specific animations
    triggerSlideAnimations(slideIndex);
}

function updatePageIndicator() {
    const currentPageEl = document.getElementById('currentPage');
    const totalPagesEl = document.getElementById('totalPages');
    
    if (currentPageEl && totalPagesEl) {
        currentPageEl.textContent = currentSlideIndex;
        totalPagesEl.textContent = totalSlides;
    }
}

function triggerSlideAnimations(slideIndex) {
    const slide = document.querySelector(`.slide[data-slide="${slideIndex}"]`);
    if (!slide) return;
    
    // Reset all animations first
    const animatedElements = slide.querySelectorAll('*');
    animatedElements.forEach(el => {
        el.style.animation = '';
        el.style.transform = '';
        el.style.opacity = '';
        el.style.transition = '';
    });
    
    // Apply slide-specific animations
    switch(slideIndex) {
        case 1:
            // Title slide animation
            const title = slide.querySelector('h1');
            const subtitle = slide.querySelector('h2');
            const subtext = slide.querySelector('.subtitle');
            const metaInfo = slide.querySelector('.meta-info');
            const stats = slide.querySelectorAll('.stat-item');
            
            if (title) {
                title.style.transform = 'translateY(-30px)';
                title.style.opacity = '0';
                setTimeout(() => {
                    title.style.transition = 'all 0.8s ease-out';
                    title.style.transform = 'translateY(0)';
                    title.style.opacity = '1';
                }, 100);
            }
            
            if (subtitle) {
                subtitle.style.transform = 'translateY(30px)';
                subtitle.style.opacity = '0';
                setTimeout(() => {
                    subtitle.style.transition = 'all 0.8s ease-out';
                    subtitle.style.transform = 'translateY(0)';
                    subtitle.style.opacity = '1';
                }, 300);
            }
            
            if (subtext) {
                subtext.style.opacity = '0';
                setTimeout(() => {
                    subtext.style.transition = 'all 0.8s ease-out';
                    subtext.style.opacity = '1';
                }, 600);
            }
            
            if (metaInfo) {
                metaInfo.style.opacity = '0';
                setTimeout(() => {
                    metaInfo.style.transition = 'all 0.8s ease-out';
                    metaInfo.style.opacity = '1';
                }, 800);
            }
            
            stats.forEach((stat, index) => {
                stat.style.transform = 'scale(0.8)';
                stat.style.opacity = '0';
                setTimeout(() => {
                    stat.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    stat.style.transform = 'scale(1)';
                    stat.style.opacity = '1';
                }, 1000 + index * 200);
            });
            break;
            
        case 2:
            // Executive summary animation
            const summarysections = slide.querySelectorAll('.summary-section');
            const kpiCards = slide.querySelectorAll('.kpi-card');
            
            summarysections.forEach((section, index) => {
                section.style.transform = 'translateY(40px)';
                section.style.opacity = '0';
                setTimeout(() => {
                    section.style.transition = 'all 0.6s ease-out';
                    section.style.transform = 'translateY(0)';
                    section.style.opacity = '1';
                }, index * 200 + 200);
            });
            
            kpiCards.forEach((card, index) => {
                card.style.transform = 'translateY(40px) scale(0.9)';
                card.style.opacity = '0';
                setTimeout(() => {
                    card.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    card.style.transform = 'translateY(0) scale(1)';
                    card.style.opacity = '1';
                }, index * 150 + 600);
            });
            break;
            
        case 3:
        case 4:
            // Detailed analysis animation
            const detailSections = slide.querySelectorAll('.detail-section');
            detailSections.forEach((section, index) => {
                section.style.transform = 'translateX(' + (index % 2 === 0 ? '-' : '') + '40px)';
                section.style.opacity = '0';
                setTimeout(() => {
                    section.style.transition = 'all 0.6s ease-out';
                    section.style.transform = 'translateX(0)';
                    section.style.opacity = '1';
                }, index * 200 + 200);
            });
            
            const costAnalysis = slide.querySelector('.cost-analysis');
            if (costAnalysis) {
                costAnalysis.style.transform = 'translateY(40px)';
                costAnalysis.style.opacity = '0';
                setTimeout(() => {
                    costAnalysis.style.transition = 'all 0.6s ease-out';
                    costAnalysis.style.transform = 'translateY(0)';
                    costAnalysis.style.opacity = '1';
                }, 800);
            }
            
            const archDiagram = slide.querySelector('.architecture-diagram');
            if (archDiagram) {
                archDiagram.style.transform = 'translateY(40px)';
                archDiagram.style.opacity = '0';
                setTimeout(() => {
                    archDiagram.style.transition = 'all 0.6s ease-out';
                    archDiagram.style.transform = 'translateY(0)';
                    archDiagram.style.opacity = '1';
                }, 800);
            }
            break;
            
        case 5:
            // Deployment comparison animation
            const timelineSections = slide.querySelectorAll('.timeline-section');
            timelineSections.forEach((section, index) => {
                section.style.transform = 'translateX(' + (index === 0 ? '-' : '') + '50px)';
                section.style.opacity = '0';
                setTimeout(() => {
                    section.style.transition = 'all 0.8s ease-out';
                    section.style.transform = 'translateX(0)';
                    section.style.opacity = '1';
                }, index * 400 + 200);
            });
            
            const riskAnalysis = slide.querySelector('.risk-analysis');
            if (riskAnalysis) {
                riskAnalysis.style.transform = 'translateY(40px)';
                riskAnalysis.style.opacity = '0';
                setTimeout(() => {
                    riskAnalysis.style.transition = 'all 0.6s ease-out';
                    riskAnalysis.style.transform = 'translateY(0)';
                    riskAnalysis.style.opacity = '1';
                }, 1000);
            }
            break;
            
        case 6:
            // Monitoring evolution animation
            const monitoringEras = slide.querySelectorAll('.monitoring-era');
            monitoringEras.forEach((era, index) => {
                era.style.transform = 'translateX(' + (index === 0 ? '-' : '') + '50px)';
                era.style.opacity = '0';
                setTimeout(() => {
                    era.style.transition = 'all 0.8s ease-out';
                    era.style.transform = 'translateX(0)';
                    era.style.opacity = '1';
                }, index * 400 + 200);
            });
            
            const pillars = slide.querySelector('.observability-pillars');
            if (pillars) {
                pillars.style.transform = 'translateY(40px)';
                pillars.style.opacity = '0';
                setTimeout(() => {
                    pillars.style.transition = 'all 0.6s ease-out';
                    pillars.style.transform = 'translateY(0)';
                    pillars.style.opacity = '1';
                }, 1000);
            }
            break;
            
        case 7:
            // Infrastructure evolution animation
            const timelineStages = slide.querySelectorAll('.timeline-stage');
            timelineStages.forEach((stage, index) => {
                stage.style.transform = 'scale(0.9)';
                stage.style.opacity = '0';
                setTimeout(() => {
                    stage.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                    stage.style.transform = 'scale(1)';
                    stage.style.opacity = '1';
                }, index * 200 + 200);
            });
            break;
            
        case 8:
        case 9:
            // SWOT analysis animation
            const swotSections = slide.querySelectorAll('.swot-section, .advantage-categories, .challenge-categories');
            swotSections.forEach((section, index) => {
                section.style.transform = 'translateX(' + (index % 2 === 0 ? '-' : '') + '40px)';
                section.style.opacity = '0';
                setTimeout(() => {
                    section.style.transition = 'all 0.6s ease-out';
                    section.style.transform = 'translateX(0)';
                    section.style.opacity = '1';
                }, index * 200 + 200);
            });
            
            const businessImpact = slide.querySelector('.business-impact');
            const roiAnalysis = slide.querySelector('.roi-analysis');
            const maturityModel = slide.querySelector('.maturity-model');
            
            [businessImpact, roiAnalysis, maturityModel].forEach((element, index) => {
                if (element) {
                    element.style.transform = 'translateY(40px)';
                    element.style.opacity = '0';
                    setTimeout(() => {
                        element.style.transition = 'all 0.6s ease-out';
                        element.style.transform = 'translateY(0)';
                        element.style.opacity = '1';
                    }, 800 + index * 200);
                }
            });
            break;
            
        case 10:
            // Future roadmap animation
            const roadmapPeriods = slide.querySelectorAll('.roadmap-period');
            roadmapPeriods.forEach((period, index) => {
                period.style.transform = 'translateY(40px)';
                period.style.opacity = '0';
                setTimeout(() => {
                    period.style.transition = 'all 0.6s ease-out';
                    period.style.transform = 'translateY(0)';
                    period.style.opacity = '1';
                }, index * 300 + 200);
            });
            
            const recommendations = slide.querySelector('.strategic-recommendations');
            const metrics = slide.querySelector('.success-metrics');
            const finalMessage = slide.querySelector('.final-message');
            
            [recommendations, metrics, finalMessage].forEach((element, index) => {
                if (element) {
                    element.style.transform = 'scale(0.95)';
                    element.style.opacity = '0';
                    setTimeout(() => {
                        element.style.transition = 'all 0.6s cubic-bezier(0.34, 1.56, 0.64, 1)';
                        element.style.transform = 'scale(1)';
                        element.style.opacity = '1';
                    }, 1200 + index * 400);
                }
            });
            break;
            
        default:
            // Default animation for other slides
            const allSections = slide.querySelectorAll('.summary-section, .detail-section, .kpi-card');
            allSections.forEach((section, index) => {
                section.style.transform = 'translateY(20px)';
                section.style.opacity = '0';
                setTimeout(() => {
                    section.style.transition = 'all 0.5s ease-out';
                    section.style.transform = 'translateY(0)';
                    section.style.opacity = '1';
                }, index * 100 + 100);
            });
            break;
    }
}

// Fullscreen functionality
function toggleFullscreen() {
    if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(err => {
            console.log('Error attempting to enable fullscreen:', err);
        });
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
    }
}

// Progress indicator
function updateProgress() {
    const progress = (currentSlideIndex / totalSlides) * 100;
    let progressBar = document.querySelector('.progress-bar');
    
    if (!progressBar) {
        progressBar = document.createElement('div');
        progressBar.className = 'progress-bar';
        progressBar.innerHTML = '<div class="progress-fill"></div>';
        document.body.appendChild(progressBar);
    }
    
    const progressFill = progressBar.querySelector('.progress-fill');
    if (progressFill) {
        progressFill.style.width = progress + '%';
    }
}

// Presentation controls info (shown on first load)
function showControlsInfo() {
    if (localStorage.getItem('ppt-controls-shown') !== 'true') {
        const info = document.createElement('div');
        info.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.95);
            color: white;
            padding: 40px;
            border-radius: 20px;
            font-family: Inter, sans-serif;
            z-index: 10000;
            text-align: center;
            backdrop-filter: blur(20px);
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
            border: 1px solid rgba(255, 255, 255, 0.1);
            max-width: 500px;
            width: 90%;
        `;
        
        info.innerHTML = `
            <h3 style="margin-bottom: 24px; font-size: 1.6rem; font-weight: 600;">프레젠테이션 조작법</h3>
            <div style="text-align: left; font-size: 1rem; line-height: 1.8; margin-bottom: 24px;">
                <div style="display: grid; gap: 12px;">
                    <p><span style="color: #667eea; font-weight: 600; display: inline-block; width: 120px;">→ / 스페이스:</span> 다음 슬라이드</p>
                    <p><span style="color: #667eea; font-weight: 600; display: inline-block; width: 120px;">← :</span> 이전 슬라이드</p>
                    <p><span style="color: #667eea; font-weight: 600; display: inline-block; width: 120px;">1-9 숫자키:</span> 해당 슬라이드로 이동</p>
                    <p><span style="color: #667eea; font-weight: 600; display: inline-block; width: 120px;">Home:</span> 첫 번째 슬라이드</p>
                    <p><span style="color: #667eea; font-weight: 600; display: inline-block; width: 120px;">End:</span> 마지막 슬라이드</p>
                    <p><span style="color: #667eea; font-weight: 600; display: inline-block; width: 120px;">F11 / F:</span> 전체화면 토글</p>
                </div>
            </div>
            <button onclick="this.parentElement.remove(); localStorage.setItem('ppt-controls-shown', 'true');" 
                    style="padding: 12px 24px; background: linear-gradient(135deg, #667eea, #764ba2); color: white; border: none; border-radius: 12px; cursor: pointer; font-size: 1rem; font-weight: 500; transition: transform 0.2s ease;">
                시작하기
            </button>
        `;
        
        document.body.appendChild(info);
        
        // Button hover effect
        const button = info.querySelector('button');
        button.addEventListener('mouseenter', () => {
            button.style.transform = 'scale(1.05)';
        });
        button.addEventListener('mouseleave', () => {
            button.style.transform = 'scale(1)';
        });
        
        // Auto-hide after 15 seconds
        setTimeout(() => {
            if (info.parentElement) {
                info.style.opacity = '0';
                info.style.transform = 'translate(-50%, -50%) scale(0.95)';
                setTimeout(() => {
                    info.remove();
                    localStorage.setItem('ppt-controls-shown', 'true');
                }, 300);
            }
        }, 15000);
        
        // Click outside to close
        info.addEventListener('click', (e) => {
            if (e.target === info) {
                info.remove();
                localStorage.setItem('ppt-controls-shown', 'true');
            }
        });
    }
}

// Preload next slide for smoother transitions
function preloadSlide(slideIndex) {
    const slide = document.querySelector(`.slide[data-slide="${slideIndex}"]`);
    if (slide) {
        const images = slide.querySelectorAll('img');
        images.forEach(img => {
            if (!img.complete) {
                img.loading = 'eager';
            }
        });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Preload first few slides
    for (let i = 1; i <= Math.min(3, totalSlides); i++) {
        preloadSlide(i);
    }
    
    // Initial animation for first slide
    triggerSlideAnimations(1);
});