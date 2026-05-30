// Configurações globais
const CONFIG = {
    testimonials: {
        autoPlay: false,
        interval: 10000,
        totalItems: 7
    },
    transformations: {
        autoPlay: false,
        interval: 10000,
        totalItems: 4
    },
    about: {
        autoPlay: true,
        interval: 8000,
        totalItems: 3
    },
    pixKey: 'doe@abrigoresgaute.com'
};

// Estado da aplicação
let currentTestimonial = 0;
let currentTransformation = 0;
let currentAbout = 0;
let testimonialInterval = null;
let transformationInterval = null;
let aboutInterval = null;

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function () {
    initializeProgressiveImageLoading();
    initializeCarousel();
    initializeTransformationCarousel();
    initializeAboutCarousel();
    initializeDonationGoal();
    initializeAnimations();
    initializePIXCopy();
    console.log('Site do Resgaute carregado com sucesso!');
});

// ===== CARREGAMENTO PROGRESSIVO DE IMAGENS =====

function initializeProgressiveImageLoading() {
    // Lista de imagens em ordem de prioridade (de cima para baixo)
    const imagePriority = [
        // Prioridade 1: Logo e banners principais (carregam imediatamente)
        'imagens/logoo.png',
        'imagens/logonovo.png',
        'imagens/B1.webp',
        'imagens/B3.webp',

        // Prioridade 2: Imagens do carrossel Quem Somos
        'imagens/cachorro.webp',
        'imagens/obra.webp',
        'imagens/cachorros.webp',

        // Prioridade 3: Imagens de Histórias de Transformação (novo carrossel)
        'imagens/trans/trans1.webp',
        'imagens/trans/trans2.webp',
        'imagens/trans/trans3.webp',
        'imagens/trans/trans4.webp',
        'imagens/trans/trans5.webp',
        'imagens/trans/trans6.webp',
        'imagens/trans/trans7.webp',
        'imagens/trans/trans8.webp',
        'imagens/trans/trans9.webp',

        // Prioridade 4: Imagens dos depoimentos (novo carrossel)
        'imagens/dep/dep1.webp',
        'imagens/dep/dep2.webp',
        'imagens/dep/dep3.webp',
        'imagens/dep/dep4.webp',
        'imagens/dep/dep5.webp',
        'imagens/dep/dep6.webp',
        'imagens/dep/dep7.webp',
        'imagens/dep/dep8.webp',

        // Prioridade 5: Imagem QR Code PIX
        'imagens/otd3.png'
    ];

    // Função para carregar uma imagem
    function loadImage(src) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(src);
            img.onerror = () => reject(src);
            img.src = src;
        });
    }

    // Função para carregar imagens em lotes com delay
    async function loadImagesInBatches() {
        const batchSize = 3; // Carrega 3 imagens por vez
        const delayBetweenBatches = 100; // 100ms entre lotes

        for (let i = 0; i < imagePriority.length; i += batchSize) {
            const batch = imagePriority.slice(i, i + batchSize);

            // Carrega o lote atual
            const promises = batch.map(src => loadImage(src).catch(err => {
                console.warn(`Falha ao carregar imagem: ${src}`, err);
                return null;
            }));

            await Promise.all(promises);

            // Aguarda um pouco antes do próximo lote (exceto para o primeiro lote)
            if (i + batchSize < imagePriority.length) {
                await new Promise(resolve => setTimeout(resolve, delayBetweenBatches));
            }
        }

        console.log('✅ Todas as imagens foram carregadas progressivamente!');
    }

    // Carrega as imagens críticas imediatamente
    const criticalImages = [
        'imagens/logoo.png',
        'imagens/logonovo.png',
        'imagens/B1.webp',
        'imagens/B3.webp'
    ];

    // Carrega imagens críticas primeiro
    Promise.all(criticalImages.map(src => loadImage(src).catch(err => {
        console.warn(`Falha ao carregar imagem crítica: ${src}`, err);
        return null;
    }))).then(() => {
        console.log('✅ Imagens críticas carregadas!');
        // Inicia o carregamento progressivo das demais imagens
        loadImagesInBatches();
    });

    // Função para pré-carregar imagens dos carrosséis
    function preloadCarouselImages() {
        const carouselImages = [
            // Imagens do carrossel Quem Somos
            'imagens/cachorro.webp', 'imagens/obra.webp', 'imagens/cachorros.webp',
            // Imagens de Histórias de Transformação (novo)
            'imagens/trans/trans1.webp', 'imagens/trans/trans2.webp', 'imagens/trans/trans3.webp',
            'imagens/trans/trans4.webp', 'imagens/trans/trans5.webp', 'imagens/trans/trans6.webp',
            'imagens/trans/trans7.webp', 'imagens/trans/trans8.webp', 'imagens/trans/trans9.webp',
            // Imagens de depoimentos (novo)
            'imagens/dep/dep1.webp', 'imagens/dep/dep2.webp', 'imagens/dep/dep3.webp', 'imagens/dep/dep4.webp',
            'imagens/dep/dep5.webp', 'imagens/dep/dep6.webp', 'imagens/dep/dep7.webp', 'imagens/dep/dep8.webp',
            // Imagem PIX
            'imagens/otd3.png'
        ];

        carouselImages.forEach(src => {
            const img = new Image();
            img.src = src;
        });
    }

    // Pré-carrega imagens dos carrosséis em background
    setTimeout(preloadCarouselImages, 500);
}

// ===== CAROUSEL DE DEPOIMENTOS =====

function initializeCarousel() {
    createCarouselIndicators();

    // Garante que o primeiro depoimento seja mostrado
    showTestimonial(0);

    if (CONFIG.testimonials.autoPlay) {
        startAutoPlay();
    }

    // Event listeners para controles
    document.addEventListener('keydown', handleKeyboardNavigation);

    // Pausa autoplay quando mouse está sobre o carousel
    const carousel = document.getElementById('testimonialsCarousel');
    if (carousel) {
        if (CONFIG.testimonials.autoPlay) {
            carousel.addEventListener('mouseenter', stopAutoPlay);
            carousel.addEventListener('mouseleave', startAutoPlay);
        }

        // Adiciona suporte para touch/swipe
        initializeTestimonialTouch(carousel);
    }
}

// ===== CAROUSEL DE TRANSFORMAÇÕES =====

function initializeTransformationCarousel() {
    createTransformationIndicators();
    if (CONFIG.transformations.autoPlay) {
        startTransformationAutoPlay();
    }

    // Pausa autoplay quando mouse está sobre o carousel
    const transformationCarousel = document.getElementById('transformationCarousel');
    if (transformationCarousel) {
        transformationCarousel.addEventListener('mouseenter', stopTransformationAutoPlay);
        transformationCarousel.addEventListener('mouseleave', startTransformationAutoPlay);

        // Adiciona suporte para touch/swipe
        initializeTransformationTouch(transformationCarousel);
    }
}

function createTransformationIndicators() {
    const indicatorsContainer = document.getElementById('transformationIndicators');
    if (!indicatorsContainer) return;

    indicatorsContainer.innerHTML = '';

    for (let i = 0; i < CONFIG.transformations.totalItems; i++) {
        const indicator = document.createElement('div');
        indicator.className = `transformation-indicator ${i === 0 ? 'active' : ''}`;
        indicator.addEventListener('click', () => goToTransformation(i));
        indicator.setAttribute('aria-label', `Ir para história ${i + 1}`);
        indicator.setAttribute('role', 'button');
        indicator.setAttribute('tabindex', '0');

        // Suporte para navegação por teclado nos indicadores
        indicator.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToTransformation(i);
            }
        });

        indicatorsContainer.appendChild(indicator);
    }
}

function showTransformation(index) {
    const transformations = document.querySelectorAll('.transformation-item');
    const indicators = document.querySelectorAll('.transformation-indicator');

    // Remove classe active de todos
    transformations.forEach(item => item.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    // Adiciona classe active ao atual
    if (transformations[index]) {
        transformations[index].classList.add('active');
    }
    if (indicators[index]) {
        indicators[index].classList.add('active');
    }

    currentTransformation = index;
}

function nextTransformation() {
    const next = (currentTransformation + 1) % CONFIG.transformations.totalItems;
    goToTransformation(next);
}

function prevTransformation() {
    const prev = currentTransformation === 0 ? CONFIG.transformations.totalItems - 1 : currentTransformation - 1;
    goToTransformation(prev);
}

function goToTransformation(index) {
    if (index >= 0 && index < CONFIG.transformations.totalItems) {
        showTransformation(index);
    }
}

function startTransformationAutoPlay() {
    if (transformationInterval) {
        clearInterval(transformationInterval);
    }

    transformationInterval = setInterval(() => {
        nextTransformation();
    }, CONFIG.transformations.interval);
}

function stopTransformationAutoPlay() {
    if (transformationInterval) {
        clearInterval(transformationInterval);
        transformationInterval = null;
    }
}

// ===== CAROUSEL QUEM SOMOS =====

function initializeAboutCarousel() {
    createAboutIndicators();
    initializeAboutTouch();
    if (CONFIG.about.autoPlay) {
        startAboutAutoPlay();
    }
}

function createAboutIndicators() {
    const indicatorsContainer = document.querySelector('.about-indicators');
    if (!indicatorsContainer) return;

    indicatorsContainer.innerHTML = '';
    for (let i = 0; i < CONFIG.about.totalItems; i++) {
        const indicator = document.createElement('span');
        indicator.className = 'about-indicator';
        if (i === 0) indicator.classList.add('active');
        indicator.onclick = () => goToAbout(i);
        indicatorsContainer.appendChild(indicator);
    }
}

function showAbout(index) {
    const slides = document.querySelectorAll('.about-slide');
    const indicators = document.querySelectorAll('.about-indicator');

    slides.forEach((slide, i) => {
        slide.classList.toggle('active', i === index);
    });

    indicators.forEach((indicator, i) => {
        indicator.classList.toggle('active', i === index);
    });

    currentAbout = index;
}

function nextAbout() {
    const next = (currentAbout + 1) % CONFIG.about.totalItems;
    goToAbout(next);
}

function prevAbout() {
    const prev = currentAbout === 0 ? CONFIG.about.totalItems - 1 : currentAbout - 1;
    goToAbout(prev);
}

function goToAbout(index) {
    if (index >= 0 && index < CONFIG.about.totalItems) {
        showAbout(index);
        if (CONFIG.about.autoPlay) {
            stopAboutAutoPlay();
            startAboutAutoPlay();
        }
    }
}

function startAboutAutoPlay() {
    if (aboutInterval) clearInterval(aboutInterval);
    aboutInterval = setInterval(() => {
        nextAbout();
    }, CONFIG.about.interval);
}

function stopAboutAutoPlay() {
    if (aboutInterval) {
        clearInterval(aboutInterval);
        aboutInterval = null;
    }
}

function initializeAboutTouch() {
    const carousel = document.getElementById('aboutCarousel');
    if (!carousel) return;

    let startX = 0;
    let endX = 0;
    let isDragging = false;

    let startY = 0;
    let endY = 0;
    let isHorizontalSwipe = false;

    // Touch events
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        isHorizontalSwipe = false;
        stopAboutAutoPlay();
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = Math.abs(currentX - startX);
        const diffY = Math.abs(currentY - startY);

        // Determina se é um swipe horizontal ou vertical
        if (!isHorizontalSwipe && (diffX > 10 || diffY > 10)) {
            isHorizontalSwipe = diffX > diffY;
        }

        // Só previne o comportamento padrão se for um swipe horizontal
        if (isHorizontalSwipe) {
            e.preventDefault();
        }
    }, { passive: false });

    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;

        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;

        // Só processa o swipe se foi identificado como horizontal
        if (isHorizontalSwipe) {
            handleAboutSwipe();
        }

        isDragging = false;
        if (CONFIG.about.autoPlay) {
            startAboutAutoPlay();
        }
    }, { passive: true });

    // Mouse events para desktop
    carousel.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
        stopAboutAutoPlay();
        e.preventDefault();
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
    });

    carousel.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        endX = e.clientX;
        handleAboutSwipe();
        isDragging = false;
        if (CONFIG.about.autoPlay) {
            startAboutAutoPlay();
        }
    });

    carousel.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    function handleAboutSwipe() {
        const diffX = startX - endX;
        const threshold = 50;

        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                nextAbout();
            } else {
                prevAbout();
            }
        }
    }
}

// ===== META DE DOAÇÃO - VALORES FIXOS =====

function initializeDonationGoal() {
    // ===== CONFIGURAÇÃO MANUAL DOS VALORES =====
    // Para alterar os valores, modifique as linhas abaixo:

    const goalConfig = {
        targetAmount: 73046.38,        // Meta total (R$ 73.046,38)
        currentAmount: 64780,       // ← Valor arrecadado atual (80% da meta)
        totalDonations: 1080        // ← Número de doações
    };

    // A porcentagem é calculada automaticamente baseada nos valores acima
    const percentage = Math.floor((goalConfig.currentAmount / goalConfig.targetAmount) * 100);

    // Atualiza a interface com os valores
    updateDonationUI(goalConfig.currentAmount, percentage, goalConfig.totalDonations, goalConfig.targetAmount);
    updateProgressCircle(percentage);
}

// Função removida - não mais necessária com valores fixos

function updateDonationUI(amount, percentage, donations, target) {
    // Formata valores
    const formattedAmount = formatCurrency(amount);
    const formattedTarget = formatCurrency(target);
    const formattedDonations = formatNumber(donations);

    // Atualiza elementos
    const amountElement = document.getElementById('amountRaised');
    const percentageElement = document.getElementById('progressPercentage');
    const donationsElement = document.getElementById('donationsCount');

    if (amountElement) {
        amountElement.textContent = formattedAmount;
    }

    if (percentageElement) {
        percentageElement.textContent = percentage + '%';
    }

    if (donationsElement) {
        donationsElement.textContent = formattedDonations + ' doações';
    }

    // Atualiza o círculo de progresso
    updateProgressCircle(percentage);

    // Salva os valores para persistência
    saveProgress(amount, percentage, donations);
}

function updateProgressCircle(percentage) {
    const circle = document.querySelector('.progress-ring-circle');
    if (circle) {
        const radius = 40; // Novo raio do círculo menor
        const circumference = 2 * Math.PI * radius;
        const offset = circumference - (percentage / 100) * circumference;
        circle.style.strokeDashoffset = offset;
    }
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

function formatNumber(number) {
    return new Intl.NumberFormat('pt-BR').format(number);
}

// ===== FUNCIONALIDADES DE PERSISTÊNCIA REMOVIDAS =====
// Todas as funções de LocalStorage foram removidas para evitar conflitos de cache

// ===== TOUCH SUPPORT PARA DEPOIMENTOS =====

function initializeTestimonialTouch(carousel) {
    let startX = 0;
    let endX = 0;
    let isDragging = false;

    // Touch events
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        if (CONFIG.testimonials.autoPlay) {
            stopAutoPlay();
        }
    });

    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;

        endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        const threshold = 50; // Sensibilidade do swipe

        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                // Swipe para esquerda - próximo
                nextTestimonial();
            } else {
                // Swipe para direita - anterior
                prevTestimonial();
            }
        }

        isDragging = false;
        // Só reinicia o autoplay se estiver habilitado
        if (CONFIG.testimonials.autoPlay) {
            startAutoPlay();
        }
    });

    // Mouse events para desktop
    carousel.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
        if (CONFIG.testimonials.autoPlay) {
            stopAutoPlay();
        }
    });

    carousel.addEventListener('mouseup', (e) => {
        if (!isDragging) return;

        endX = e.clientX;
        const diffX = startX - endX;
        const threshold = 50;

        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                nextTestimonial();
            } else {
                prevTestimonial();
            }
        }

        isDragging = false;
        // Só reinicia o autoplay se estiver habilitado
        if (CONFIG.testimonials.autoPlay) {
            startAutoPlay();
        }
    });

    // Previne seleção de texto durante o drag
    carousel.addEventListener('selectstart', (e) => {
        if (isDragging) {
            e.preventDefault();
        }
    });
}

// ===== TOUCH SUPPORT PARA TRANSFORMAÇÕES =====

function initializeTransformationTouch(carousel) {
    let startX = 0;
    let endX = 0;
    let isDragging = false;

    // Touch events
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        isDragging = true;
        if (CONFIG.transformations.autoPlay) {
            stopTransformationAutoPlay();
        }
    });


    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;

        endX = e.changedTouches[0].clientX;
        const diffX = startX - endX;
        const threshold = 50; // Sensibilidade do swipe

        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                // Swipe para esquerda - próximo
                nextTransformation();
            } else {
                // Swipe para direita - anterior
                prevTransformation();
            }
        }

        isDragging = false;
        startTransformationAutoPlay();
    });

    // Mouse events para desktop
    carousel.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
        if (CONFIG.transformations.autoPlay) {
            stopTransformationAutoPlay();
        }
    });

    carousel.addEventListener('mouseup', (e) => {
        if (!isDragging) return;

        endX = e.clientX;
        const diffX = startX - endX;
        const threshold = 50;

        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                nextTransformation();
            } else {
                prevTransformation();
            }
        }

        isDragging = false;
        startTransformationAutoPlay();
    });

    // Previne seleção de texto durante o drag
    carousel.addEventListener('selectstart', (e) => {
        if (isDragging) {
            e.preventDefault();
        }
    });
}

function createCarouselIndicators() {
    const indicatorsContainer = document.getElementById('testimonialIndicators');
    if (!indicatorsContainer) return;

    indicatorsContainer.innerHTML = '';

    for (let i = 0; i < CONFIG.testimonials.totalItems; i++) {
        const indicator = document.createElement('div');
        indicator.className = `testimonial-indicator ${i === 0 ? 'active' : ''}`;
        indicator.addEventListener('click', () => goToTestimonial(i));
        indicator.setAttribute('aria-label', `Ir para depoimento ${i + 1}`);
        indicator.setAttribute('role', 'button');
        indicator.setAttribute('tabindex', '0');

        // Suporte para navegação por teclado nos indicadores
        indicator.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToTestimonial(i);
            }
        });

        indicatorsContainer.appendChild(indicator);
    }
}

function showTestimonial(index) {
    const testimonials = document.querySelectorAll('.testimonial-item');
    const indicators = document.querySelectorAll('.testimonial-indicator');

    // Remove classe active de todos (mesmo princípio do transformation)
    testimonials.forEach(item => item.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    // Adiciona classe active ao atual
    if (testimonials[index]) {
        testimonials[index].classList.add('active');
    }
    if (indicators[index]) {
        indicators[index].classList.add('active');
    }

    currentTestimonial = index;
}

function nextTestimonial() {
    const next = (currentTestimonial + 1) % CONFIG.testimonials.totalItems;
    goToTestimonial(next);
}

function prevTestimonial() {
    const prev = currentTestimonial === 0 ? CONFIG.testimonials.totalItems - 1 : currentTestimonial - 1;
    goToTestimonial(prev);
}

function goToTestimonial(index) {
    if (index >= 0 && index < CONFIG.testimonials.totalItems) {
        showTestimonial(index);
        if (CONFIG.testimonials.autoPlay) {
            restartAutoPlay();
        }
    }
}

function startAutoPlay() {
    if (CONFIG.testimonials.autoPlay) {
        stopAutoPlay(); // Limpa interval anterior
        testimonialInterval = setInterval(nextTestimonial, CONFIG.testimonials.interval);
    }
}

function stopAutoPlay() {
    if (testimonialInterval) {
        clearInterval(testimonialInterval);
        testimonialInterval = null;
    }
}

function restartAutoPlay() {
    stopAutoPlay();
    startAutoPlay();
}

function handleKeyboardNavigation(e) {
    const carousel = document.getElementById('testimonialsCarousel');
    if (!carousel) return;

    // Verifica se o foco está no carousel ou seus controles
    const isCarouselFocused = carousel.contains(document.activeElement) ||
        document.activeElement.classList.contains('testimonial-btn') ||
        document.activeElement.classList.contains('testimonial-indicator');

    if (isCarouselFocused) {
        switch (e.key) {
            case 'ArrowLeft':
                e.preventDefault();
                prevTestimonial();
                break;
            case 'ArrowRight':
                e.preventDefault();
                nextTestimonial();
                break;
            case 'Home':
                e.preventDefault();
                goToTestimonial(0);
                break;
            case 'End':
                e.preventDefault();
                goToTestimonial(CONFIG.testimonials.totalItems - 1);
                break;
        }
    }
}

// ===== FUNCIONALIDADE PIX - SIMPLES =====

function copiarChavePix() {
    const pixKey = CONFIG.pixKey;

    const textarea = document.createElement('textarea');
    textarea.value = pixKey;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);

    trackUtmify('InitiateCheckout', { value: 0, currency: 'BRL' });

    alert('✅ Chave PIX copiada!\n\nObrigado por ajudar! ❤️');

    return false;
}

// Exporta função
window.copiarChavePix = copiarChavePix;

// ===== SCROLL SUAVE =====





// ===== ANIMAÇÕES E EFEITOS VISUAIS =====

function initializeAnimations() {
    // Intersection Observer para animações on scroll
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver(handleIntersection, observerOptions);

        // Observa elementos que devem ser animados
        const animatedElements = document.querySelectorAll(
            '.stat-item, .testimonial-item, .value-item, .footer-section'
        );

        animatedElements.forEach(el => {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            observer.observe(el);
        });
    }

    // Efeito parallax sutil no banner (se suportado)
    initializeParallax();
}

function handleIntersection(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const element = entry.target;

            // Anima o elemento
            element.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';

            // Para de observar o elemento após animação
            setTimeout(() => {
                entry.target.style.transition = '';
            }, 600);
        }
    });
}

function initializeParallax() {
    // Desabilitado para evitar problemas de rolagem
    return;

    const banner = document.querySelector('.banner-image');
    if (!banner) return;

    // Verifica se o usuário não prefere movimento reduzido
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    // Aplica efeito parallax sutil
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallax = scrolled * 0.3;
        banner.style.transform = `translateY(${parallax}px)`;
    });
}

// ===== UTILITÁRIOS =====

// Debounce function para otimizar eventos de scroll/resize
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Função para detectar dispositivos móveis
function isMobile() {
    return window.innerWidth <= 768;
}

// Função para logging de eventos (útil para analytics)
function trackEvent(eventName, properties = {}) {
    console.log(`Event: ${eventName}`, properties);

    // Aqui você pode integrar com Google Analytics, Facebook Pixel, TikTok Pixel, etc.
    // Exemplo: gtag('event', eventName, properties);
}

function trackUtmify(eventName, properties = {}) {
    try {
        if (typeof window.utmify === 'function') {
            window.utmify('track', eventName, properties);
        }
    } catch (e) {}
}

// ===== EVENT LISTENERS ADICIONAIS =====

// Otimização para redimensionamento de tela
window.addEventListener('resize', debounce(() => {
    // Reajusta elementos se necessário
    if (CONFIG.testimonials.autoPlay) {
        if (isMobile()) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    }
}, 250));

// Detecta quando a aba fica inativa/ativa
document.addEventListener('visibilitychange', () => {
    if (CONFIG.testimonials.autoPlay) {
        if (document.hidden) {
            stopAutoPlay();
        } else {
            startAutoPlay();
        }
    }
});

// ===== ACESSIBILIDADE =====

// Melhora a navegação por teclado
document.addEventListener('keydown', (e) => {
    // Esc fecha modais ou para autoplay
    if (e.key === 'Escape' && CONFIG.testimonials.autoPlay) {
        stopAutoPlay();
    }

    // Tab trap para elementos focáveis
    handleTabTrap(e);
});

function handleTabTrap(e) {
    if (e.key !== 'Tab') return;

    const focusableElements = document.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (e.shiftKey) {
        if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
        }
    } else {
        if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
        }
    }
}

// ===== PERFORMANCE =====

// Função para otimizar carregamento de imagens (sem lazy loading)
function optimizeImageLoading() {
    // Adiciona classe 'loaded' quando a imagem termina de carregar
    const images = document.querySelectorAll('img');

    images.forEach(img => {
        if (img.complete) {
            img.classList.add('loaded');
        } else {
            img.addEventListener('load', function () {
                this.classList.add('loaded');
            });
        }
    });
}

// Otimiza carregamento de imagens
optimizeImageLoading();

// ===== FUNÇÕES EXPOSTAS GLOBALMENTE =====

// Exporta funções que podem ser chamadas pelo HTML
window.nextTestimonial = nextTestimonial;
window.prevTestimonial = prevTestimonial;
window.nextTransformation = nextTransformation;
window.prevTransformation = prevTransformation;
window.nextAbout = nextAbout;
window.prevAbout = prevAbout;
window.goToAbout = goToAbout;
// window.copyPixKey removido - não precisa ser global

// Função simples para scroll para seção de doação
window.scrollToDonation = function () {
    const donationSection = document.getElementById('como-doar-pix');

    if (donationSection) {
        // Scroll simples e direto - centraliza a seção na tela
        donationSection.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
};

// Função para scroll para seção Ajude o Abrigo
window.scrollToAjudaAbrigo = function () {
    const ajudaAbrigoSection = document.getElementById('ajude-o-abrigo');

    if (ajudaAbrigoSection) {
        // Scroll simples e direto - centraliza a seção na tela
        ajudaAbrigoSection.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
};

// Função para scroll para seção Entenda Nosso Propósito
window.scrollToAbout = function () {
    const aboutSection = document.querySelector('.about-section');

    if (aboutSection) {
        // Scroll simples e direto - centraliza a seção na tela
        aboutSection.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
        });
    }
};

// ===== ERROR HANDLING =====

// Captura erros JavaScript
window.addEventListener('error', (e) => {
    console.error('Erro JavaScript:', e.error);
    // Em produção, você enviaria isso para um serviço de logging
});

// Captura erros de Promise rejeitadas
window.addEventListener('unhandledrejection', (e) => {
    console.error('Promise rejeitada:', e.reason);
    e.preventDefault();
});

// ===== INICIALIZAÇÃO FINAL =====

// Marca que o script foi carregado
window.ResgauteLoaded = true;

// Log de inicialização
console.log('🐕 Resgaute - Sistema carregado com sucesso! 🐱');
console.log('Desenvolvido com ❤️ para salvar vidas');

// Service Worker registration (se disponível)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Registra service worker para cache offline (implementar se necessário)
        // navigator.serviceWorker.register('/sw.js');
    });
}

// ===== MODAL DE DOAÇÃO =====

let selectedDonationAmount = null;
let donationType = 'unica'; // 'unica' ou 'mensal'

function openDonationModal() {
    const modal = document.getElementById('donationModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        modal.style.display = 'flex';
        switchDonationTab('unica');
        goToStep1();
        trackUtmify('InitiateCheckout', { value: 0, currency: 'BRL' });
    }
}

function closeDonationModal() {
    const modal = document.getElementById('donationModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        // Reset selection
        selectedDonationAmount = null;
        document.querySelectorAll('.donation-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        const customAmountInput = document.getElementById('customAmount');
        if (customAmountInput) customAmountInput.value = '';
        // Reset form
        resetDonationForm();
    }

    // Hide loading and show modal content
    hideDonationLoading();
}

function goToStep1() {
    const step1 = document.getElementById('donationStep1');
    const step2Unica = document.getElementById('donationStep2Unica');
    const step2Mensal = document.getElementById('donationStep2Mensal');
    const tabs = document.getElementById('donationTabs');
    const typeIndicator = document.getElementById('donationTypeIndicator');

    // Mostra etapa 1 e tabs, esconde etapas 2
    if (step1) step1.style.display = 'block';
    if (step2Unica) step2Unica.style.display = 'none';
    if (step2Mensal) step2Mensal.style.display = 'none';
    if (tabs) tabs.style.display = 'flex';
    if (typeIndicator) typeIndicator.style.display = 'none';

    hideDonationLoading();
}

function goToStep2() {
    // Valida se tem valor selecionado
    const customAmountInput = document.getElementById('customAmount');
    const customAmount = customAmountInput ? parseFloat(customAmountInput.value) : 0;

    let amount = selectedDonationAmount;

    // Se tem valor customizado, usa ele
    if (customAmount && customAmount > 0) {
        amount = customAmount;
    }

    if (!amount || amount <= 0) {
        alert('Por favor, selecione um valor ou digite um valor personalizado.');
        return;
    }

    // Valida valor mínimo de R$ 10,00
    if (amount < 10) {
        alert('O valor mínimo para doação é de R$ 10,00.');
        return;
    }

    // Valida valor maximo de R$ 15,00
    if (amount > 15000) {
        alert('O valor maximo para doação é de R$ 15.000.');
        return;
    }

    // Atualiza o valor selecionado
    selectedDonationAmount = amount;

    // Esconde tabs e mostra indicador de tipo na etapa 2
    const tabs = document.getElementById('donationTabs');
    const typeIndicator = document.getElementById('donationTypeIndicator');
    const typeText = document.getElementById('selectedDonationTypeText');

    if (tabs) tabs.style.display = 'none';
    if (typeIndicator) typeIndicator.style.display = 'block';
    if (typeText) {
        typeText.textContent = donationType === 'mensal' ? 'Doação Mensal' : 'Doação Única';
    }

    // Esconde etapa 1
    const step1 = document.getElementById('donationStep1');
    if (step1) step1.style.display = 'none';

    // Mostra a etapa 2 correta baseada no tipo de doação
    if (donationType === 'mensal') {
        const step2Mensal = document.getElementById('donationStep2Mensal');
        if (step2Mensal) {
            step2Mensal.style.display = 'block';
            // Atualiza o valor na etapa mensal
            const amountDisplayMensal = document.getElementById('selectedAmountDisplayMensal');
            if (amountDisplayMensal) {
                amountDisplayMensal.textContent = formatCurrency(amount);
            }
        }
        // Esconde etapa única
        const step2Unica = document.getElementById('donationStep2Unica');
        if (step2Unica) step2Unica.style.display = 'none';
    } else {
        const step2Unica = document.getElementById('donationStep2Unica');
        if (step2Unica) {
            step2Unica.style.display = 'block';
            // Atualiza o valor na etapa única
            const amountDisplay = document.getElementById('selectedAmountDisplay');
            if (amountDisplay) {
                amountDisplay.textContent = formatCurrency(amount);
            }
        }
        // Esconde etapa mensal
        const step2Mensal = document.getElementById('donationStep2Mensal');
        if (step2Mensal) step2Mensal.style.display = 'none';
    }

    // Atualiza o valor com a taxa administrativa se necessário
    updateAmountDisplay();
}

// Função para lidar com a taxa administrativa
function handleAdministrativeFee() {
    updateAmountDisplay();
}

// Função para atualizar o display do valor (incluindo taxa administrativa se marcada)
function updateAmountDisplay() {
    if (donationType !== 'unica') return; // Só funciona para doação única

    const feeCheckbox = document.getElementById('addAdministrativeFee');
    const amountDisplay = document.getElementById('selectedAmountDisplay');

    if (!amountDisplay || !selectedDonationAmount) return;

    let totalAmount = selectedDonationAmount;

    // Adiciona taxa administrativa se o checkbox estiver marcado
    if (feeCheckbox && feeCheckbox.checked) {
        totalAmount += 6.99;
    }

    // Atualiza o display
    amountDisplay.textContent = formatCurrency(totalAmount);
}

function goBackToStep1() {
    goToStep1();
}

function selectDonationAmount(amount) {
    selectedDonationAmount = amount;

    // Remove selection from all buttons
    document.querySelectorAll('.donation-btn').forEach(btn => {
        btn.classList.remove('selected');
    });

    // Add selection to clicked button
    event.target.classList.add('selected');

    // Clear custom amount
    const customAmountInput = document.getElementById('customAmount');
    if (customAmountInput) customAmountInput.value = '';
}

function handleCustomAmount() {
    const customAmountInput = document.getElementById('customAmount');
    if (customAmountInput && customAmountInput.value) {
        // Remove selection from buttons when typing custom amount
        document.querySelectorAll('.donation-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        selectedDonationAmount = null;
    }
}


function resetDonationForm() {
    // Reseta formulário de doação única
    const phoneInput = document.getElementById('donorPhone');
    const messageInput = document.getElementById('donorMessage');

    if (phoneInput) phoneInput.value = '';
    if (messageInput) {
        messageInput.value = '';
        updateCharCount();
    }

    // Reseta formulário de doação mensal
    const nameInputMensal = document.getElementById('donorNameMensal');
    const phoneInputMensal = document.getElementById('donorPhoneMensal');
    const emailInputMensal = document.getElementById('donorEmailMensal');
    const documentInputMensal = document.getElementById('donorDocumentMensal');

    if (nameInputMensal) nameInputMensal.value = '';
    if (phoneInputMensal) phoneInputMensal.value = '';
    if (emailInputMensal) emailInputMensal.value = '';
    if (documentInputMensal) documentInputMensal.value = '';
}

// Atualiza contador de caracteres da mensagem
function updateCharCount() {
    const messageInput = document.getElementById('donorMessage');
    const charCount = document.getElementById('charCount');
    if (messageInput && charCount) {
        charCount.textContent = messageInput.value.length;
    }
}

// Função para formatar moeda
function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

// ── Supabase Lead Capture ─────────────────────────────────────
function saveLead(telefone, nome, amount, utms) {
    try {
        fetch('https://mzhcoaazbhyejhkupimi.supabase.co/rest/v1/resgaute_leads', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16aGNvYWF6Ymh5ZWpoa3VwaW1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzAxOTgsImV4cCI6MjA5MTg0NjE5OH0.lkJfhhEbVVTTO4q3ypD6whkuMg4VPX7VTOD9t0RBI-4',
                'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im16aGNvYWF6Ymh5ZWpoa3VwaW1pIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyNzAxOTgsImV4cCI6MjA5MTg0NjE5OH0.lkJfhhEbVVTTO4q3ypD6whkuMg4VPX7VTOD9t0RBI-4',
                'Prefer': 'return=minimal',
            },
            body: JSON.stringify({
                telefone: telefone || '00000000000',
                nome: nome || null,
                amount: parseFloat(amount) || 0,
                utm_source:   (utms && utms.utm_source)   || null,
                utm_campaign: (utms && utms.utm_campaign) || null,
                utm_medium:   (utms && utms.utm_medium)   || null,
                utm_content:  (utms && utms.utm_content)  || null,
                utm_term:     (utms && utms.utm_term)     || null,
            }),
        }).catch(function() {});
    } catch (e) {}
}

// Função para gerar contribuição (chama gerarpix com todos os dados)
function generateContribution() {
    let nome, telefone, email, cpf, mensagem;

    // Validação baseada no tipo de doação
    if (donationType === 'mensal') {
        // DOAÇÃO MENSAL: Campos obrigatórios
        const nameInput = document.getElementById('donorNameMensal');
        const phoneInput = document.getElementById('donorPhoneMensal');
        const emailInput = document.getElementById('donorEmailMensal');
        const documentInput = document.getElementById('donorDocumentMensal');

        nome = nameInput ? nameInput.value.trim() : '';
        telefone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
        email = emailInput ? emailInput.value.trim() : '';
        cpf = documentInput ? documentInput.value.replace(/\D/g, '') : '';
        mensagem = ''; // Não tem mensagem na doação mensal

        // Validações
        if (!nome || nome === '') {
            alert('Por favor, preencha seu nome completo.');
            return;
        }

        if (!telefone || telefone.length < 11) {
            alert('Por favor, preencha um telefone válido.');
            return;
        }

        if (!cpf || cpf.length !== 11) {
            alert('Por favor, preencha um CPF válido.');
            return;
        }
    } else {
        // DOAÇÃO ÚNICA: Sempre usa "Anonimo" como nome padrão
        const phoneInput = document.getElementById('donorPhone');
        const messageInput = document.getElementById('donorMessage');
        
        nome = 'Anonimo'; // Sempre anônimo na doação única
        telefone = phoneInput ? phoneInput.value.replace(/\D/g, '') : '';
        mensagem = messageInput ? messageInput.value.trim() : '';
        email = '';
        cpf = '';
        
        // Verifica se o telefone está vazio ou inválido
        if (!telefone || telefone.length < 11) {
            // Mostra modal de confirmação ao invés de continuar
            //showPhoneConfirmationModal();
            //return;
            telefone = '00000000000';
        }
    }

    // Valida valor
    if (!selectedDonationAmount || selectedDonationAmount <= 0) {
        alert('Por favor, selecione um valor válido.');
        return;
    }

    // Continua com o processo de geração se chegou até aqui
    proceedWithContribution(nome, telefone, email, cpf, mensagem);
}

// Função para continuar com a geração da contribuição
function proceedWithContribution(nome, telefone, email, cpf, mensagem) {
    // Calcula valor final (incluindo taxa administrativa se marcada para doação única)
    let finalAmount = selectedDonationAmount;
    if (donationType === 'unica') {
        const feeCheckbox = document.getElementById('addAdministrativeFee');
        if (feeCheckbox && feeCheckbox.checked) {
            finalAmount += 6.99;
        }
    }

    // Fecha o modal primeiro - esconde as etapas
    const step1 = document.getElementById('donationStep1');
    const step2Unica = document.getElementById('donationStep2Unica');
    const step2Mensal = document.getElementById('donationStep2Mensal');

    // Esconde as etapas
    if (step1) step1.style.display = 'none';
    if (step2Unica) step2Unica.style.display = 'none';
    if (step2Mensal) step2Mensal.style.display = 'none';

    // Pequeno delay para garantir que as etapas foram escondidas
    setTimeout(() => {
        // Mostra o loading
        showDonationLoading();
    }, 50);

    // Get current UTM parameters
    const urlParams = new URLSearchParams(window.location.search);
    const utmParams = {};

    ['utm_source', 'utm_campaign', 'utm_medium', 'utm_content', 'utm_term'].forEach(param => {
        const value = urlParams.get(param);
        if (value) {
            utmParams[param] = value;
        }
    });

    // Build PIX URL com todos os parâmetros
    // Escolhe o endpoint baseado no tipo de doação (única ou mensal)
    const endpoint = 'https://pix.oficialresgaute.org/gerarpix';
    let pixUrl = `${endpoint}?amount=${finalAmount}&nome=${encodeURIComponent(nome)}&telefone=${encodeURIComponent(telefone)}`;

    // Adiciona email e cpf apenas para doação mensal
    if (donationType === 'mensal') {
        pixUrl += `&email=${encodeURIComponent(email)}&cpf=${encodeURIComponent(cpf)}`;
    }

    // Adiciona mensagem apenas para doação única (se houver)
    if (donationType === 'unica' && mensagem) {
        pixUrl += `&mensagem=${encodeURIComponent(mensagem)}`;
    }

    // Add UTM parameters
    Object.keys(utmParams).forEach(key => {
        pixUrl += `&${key}=${encodeURIComponent(utmParams[key])}`;
    });

    pixUrl += '&pixel_id=69ae3ab43822e15c2b8b581f&pixel_type=facebook';
    trackUtmify('InitiateCheckout', { value: finalAmount, currency: 'BRL' });
    saveLead(telefone, nome, finalAmount, utmParams);
    // Small delay to show loading, then redirect
    setTimeout(() => {
        window.location.href = pixUrl;
    }, 500);
}

// Função para mostrar loading no modal
function showDonationLoading() {
    const loading = document.getElementById('donationLoading');
    const step1 = document.getElementById('donationStep1');
    const step2Unica = document.getElementById('donationStep2Unica');
    const step2Mensal = document.getElementById('donationStep2Mensal');
    const donationModal = document.getElementById('donationModal');

    // Garante que o modal de doação está visível
    if (donationModal) {
        donationModal.classList.add('show');
        donationModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    if (loading) {
        loading.style.display = 'flex';
        // Garante que as etapas estão escondidas
        if (step1) step1.style.display = 'none';
        if (step2Unica) step2Unica.style.display = 'none';
        if (step2Mensal) step2Mensal.style.display = 'none';
    }
}

// Função para esconder loading no modal
function hideDonationLoading() {
    const loading = document.getElementById('donationLoading');

    if (loading) {
        loading.style.display = 'none';
    }
}

// Adiciona listener para contador de caracteres
document.addEventListener('DOMContentLoaded', function () {
    const messageInput = document.getElementById('donorMessage');
    if (messageInput) {
        messageInput.addEventListener('input', updateCharCount);
    }

    // Máscara para telefone (doação única) - apenas celular (11 dígitos)
    const phoneInput = document.getElementById('donorPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            // Limita a 11 dígitos (apenas celular)
            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            // Aplica máscara progressiva para celular: (99)99999-9999
            if (value.length <= 2) {
                value = value.length > 0 ? `(${value}` : '';
            } else if (value.length <= 7) {
                value = value.replace(/(\d{2})(\d+)/, '($1) $2');
            } else {
                value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
            }
            e.target.value = value;
        });
    }

    // Máscara para telefone (doação mensal) - apenas celular (11 dígitos)
    const phoneInputMensal = document.getElementById('donorPhoneMensal');
    if (phoneInputMensal) {
        phoneInputMensal.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            // Limita a 11 dígitos (apenas celular)
            if (value.length > 11) {
                value = value.substring(0, 11);
            }
            // Aplica máscara progressiva para celular: (99)99999-9999
            if (value.length <= 2) {
                value = value.length > 0 ? `(${value}` : '';
            } else if (value.length <= 7) {
                value = value.replace(/(\d{2})(\d+)/, '($1) $2');
            } else {
                value = value.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3');
            }
            e.target.value = value;
        });
    }

    // Máscara para CPF (doação mensal)
    const documentInput = document.getElementById('donorDocumentMensal');
    if (documentInput) {
        documentInput.addEventListener('input', function (e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d)/, '$1.$2');
                value = value.replace(/(\d{3})(\d{1,2})$/, '$1-$2');
            }
            e.target.value = value;
        });
    }
});

function switchDonationTab(type) {
    donationType = type;

    // Atualiza visual das abas
    const tabUnica = document.getElementById('tabUnica');
    const tabMensal = document.getElementById('tabMensal');

    if (tabUnica && tabMensal) {
        if (type === 'unica') {
            tabUnica.classList.add('active');
            tabMensal.classList.remove('active');
        } else {
            tabMensal.classList.add('active');
            tabUnica.classList.remove('active');
        }
    }
}

// Update scrollToDonation function to open modal instead
function scrollToDonation() {
    openDonationModal();
}

// Close modal when clicking outside
document.addEventListener('click', function (event) {
    const modal = document.getElementById('donationModal');
    if (event.target === modal) {
        closeDonationModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        closeDonationModal();
    }
});

// Exporta funções para uso global
window.openDonationModal = openDonationModal;
window.closeDonationModal = closeDonationModal;
window.selectDonationAmount = selectDonationAmount;
window.handleCustomAmount = handleCustomAmount;
window.goToStep2 = goToStep2;
window.goBackToStep1 = goBackToStep1;
window.generateContribution = generateContribution;
window.scrollToDonation = scrollToDonation;
window.switchDonationTab = switchDonationTab;
window.handleAdministrativeFee = handleAdministrativeFee;

// ===== NOVO CARROSSEL DE TRANSFORMAÇÕES (ANTES NO ABRIGO E DEPOIS NO NOVO LAR) =====

let currentNewTransformation = 0;
const totalNewTransformations = 8;

// Inicializa o novo carrossel
document.addEventListener('DOMContentLoaded', function () {
    initializeNewTransformationCarousel();
});

function initializeNewTransformationCarousel() {
    createNewTransformationIndicators();
    showNewTransformation(0);

    // Adiciona suporte para touch/swipe
    const carousel = document.getElementById('newTransformationCarousel');
    if (carousel) {
        initializeNewTransformationTouch(carousel);
    }
}

function createNewTransformationIndicators() {
    const indicatorsContainer = document.getElementById('newTransformationIndicators');
    if (!indicatorsContainer) return;

    indicatorsContainer.innerHTML = '';

    for (let i = 0; i < totalNewTransformations; i++) {
        const indicator = document.createElement('div');
        indicator.className = `new-transformation-indicator ${i === 0 ? 'active' : ''}`;
        indicator.addEventListener('click', () => goToNewTransformation(i));
        indicator.setAttribute('aria-label', `Ir para transformação ${i + 1}`);
        indicator.setAttribute('role', 'button');
        indicator.setAttribute('tabindex', '0');

        indicator.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToNewTransformation(i);
            }
        });

        indicatorsContainer.appendChild(indicator);
    }
}

function showNewTransformation(index) {
    const transformations = document.querySelectorAll('.new-transformation-item');
    const indicators = document.querySelectorAll('.new-transformation-indicator');

    transformations.forEach(item => item.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    if (transformations[index]) {
        transformations[index].classList.add('active');
    }
    if (indicators[index]) {
        indicators[index].classList.add('active');
    }

    currentNewTransformation = index;
}

function nextNewTransformation() {
    const next = (currentNewTransformation + 1) % totalNewTransformations;
    goToNewTransformation(next);
}

function prevNewTransformation() {
    const prev = currentNewTransformation === 0 ? totalNewTransformations - 1 : currentNewTransformation - 1;
    goToNewTransformation(prev);
}

function goToNewTransformation(index) {
    if (index >= 0 && index < totalNewTransformations) {
        showNewTransformation(index);
    }
}

// Touch support para o novo carrossel de transformações
function initializeNewTransformationTouch(carousel) {
    let startX = 0;
    let endX = 0;
    let isDragging = false;

    let startY = 0;
    let endY = 0;
    let isHorizontalSwipe = false;

    // Touch events
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        isHorizontalSwipe = false;
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = Math.abs(currentX - startX);
        const diffY = Math.abs(currentY - startY);

        // Determina se é um swipe horizontal ou vertical
        if (!isHorizontalSwipe && (diffX > 10 || diffY > 10)) {
            isHorizontalSwipe = diffX > diffY;
        }

        // Só previne o comportamento padrão se for um swipe horizontal
        if (isHorizontalSwipe) {
            e.preventDefault();
        }
    }, { passive: false });

    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;

        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;

        // Só processa o swipe se foi identificado como horizontal
        if (isHorizontalSwipe) {
            handleNewTransformationSwipe();
        }

        isDragging = false;
    }, { passive: true });

    // Mouse events para desktop
    carousel.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
        e.preventDefault();
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
    });

    carousel.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        endX = e.clientX;
        handleNewTransformationSwipe();
        isDragging = false;
    });

    carousel.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    function handleNewTransformationSwipe() {
        const diffX = startX - endX;
        const threshold = 50; // Sensibilidade do swipe

        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                // Swipe para esquerda - próxima
                nextNewTransformation();
            } else {
                // Swipe para direita - anterior
                prevNewTransformation();
            }
        }
    }
}

// Exporta funções globalmente
window.nextNewTransformation = nextNewTransformation;
window.prevNewTransformation = prevNewTransformation;
window.goToNewTransformation = goToNewTransformation;

// ===== NOVO CARROSSEL DE DEPOIMENTOS (ESTILO STORIES) =====

let currentNewTestimonial = 0;
const totalNewTestimonials = 8;

// Inicializa o novo carrossel de depoimentos
document.addEventListener('DOMContentLoaded', function () {
    initializeNewTestimonialsCarousel();
});

function initializeNewTestimonialsCarousel() {
    createNewTestimonialsIndicators();
    showNewTestimonial(0);

    // Adiciona suporte para touch/swipe
    const carousel = document.getElementById('newTestimonialsCarousel');
    if (carousel) {
        initializeNewTestimonialsTouch(carousel);
    }
}

function createNewTestimonialsIndicators() {
    const indicatorsContainer = document.getElementById('newTestimonialsIndicators');
    if (!indicatorsContainer) return;

    indicatorsContainer.innerHTML = '';

    for (let i = 0; i < totalNewTestimonials; i++) {
        const indicator = document.createElement('div');
        indicator.className = `new-testimonials-indicator ${i === 0 ? 'active' : ''}`;
        indicator.addEventListener('click', () => goToNewTestimonial(i));
        indicator.setAttribute('aria-label', `Ir para depoimento ${i + 1}`);
        indicator.setAttribute('role', 'button');
        indicator.setAttribute('tabindex', '0');

        indicator.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToNewTestimonial(i);
            }
        });

        indicatorsContainer.appendChild(indicator);
    }
}

function showNewTestimonial(index) {
    const testimonials = document.querySelectorAll('.new-testimonial-item');
    const indicators = document.querySelectorAll('.new-testimonials-indicator');

    testimonials.forEach(item => item.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    if (testimonials[index]) {
        testimonials[index].classList.add('active');
    }
    if (indicators[index]) {
        indicators[index].classList.add('active');
    }

    currentNewTestimonial = index;
}

function nextNewTestimonial() {
    const next = (currentNewTestimonial + 1) % totalNewTestimonials;
    goToNewTestimonial(next);
}

function prevNewTestimonial() {
    const prev = currentNewTestimonial === 0 ? totalNewTestimonials - 1 : currentNewTestimonial - 1;
    goToNewTestimonial(prev);
}

function goToNewTestimonial(index) {
    if (index >= 0 && index < totalNewTestimonials) {
        showNewTestimonial(index);
    }
}

// Touch support para o novo carrossel de depoimentos
function initializeNewTestimonialsTouch(carousel) {
    let startX = 0;
    let endX = 0;
    let isDragging = false;

    let startY = 0;
    let endY = 0;
    let isHorizontalSwipe = false;

    // Touch events
    carousel.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        isHorizontalSwipe = false;
    }, { passive: true });

    carousel.addEventListener('touchmove', (e) => {
        if (!isDragging) return;

        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const diffX = Math.abs(currentX - startX);
        const diffY = Math.abs(currentY - startY);

        if (!isHorizontalSwipe && (diffX > 10 || diffY > 10)) {
            isHorizontalSwipe = diffX > diffY;
        }

        if (isHorizontalSwipe) {
            e.preventDefault();
        }
    }, { passive: false });

    carousel.addEventListener('touchend', (e) => {
        if (!isDragging) return;

        endX = e.changedTouches[0].clientX;
        endY = e.changedTouches[0].clientY;

        if (isHorizontalSwipe) {
            handleNewTestimonialSwipe();
        }

        isDragging = false;
    }, { passive: true });

    // Mouse events para desktop
    carousel.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        isDragging = true;
        e.preventDefault();
    });

    carousel.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
    });

    carousel.addEventListener('mouseup', (e) => {
        if (!isDragging) return;
        endX = e.clientX;
        handleNewTestimonialSwipe();
        isDragging = false;
    });

    carousel.addEventListener('mouseleave', () => {
        isDragging = false;
    });

    function handleNewTestimonialSwipe() {
        const diffX = startX - endX;
        const threshold = 50;

        if (Math.abs(diffX) > threshold) {
            if (diffX > 0) {
                nextNewTestimonial();
            } else {
                prevNewTestimonial();
            }
        }
    }
}

// Exporta funções globalmente
window.nextNewTestimonial = nextNewTestimonial;
window.prevNewTestimonial = prevNewTestimonial;
window.goToNewTestimonial = goToNewTestimonial;

// Script FAQ
(function () {
    function initFAQ(root) {
        if (!root) return;

        // Estado inicial
        root.querySelectorAll('.faq-item').forEach(i => {
            const ans = i.querySelector('.faq-answer');
            const btn = i.querySelector('.faq-question');
            if (btn) btn.setAttribute('aria-expanded', i.classList.contains('open') ? 'true' : 'false');

            if (ans) {
                if (i.classList.contains('open')) {
                    ans.style.maxHeight = ans.scrollHeight + 'px';
                    ans.style.padding = '10px 16px 16px 16px';
                } else {
                    ans.style.maxHeight = '0px';
                    ans.style.padding = '0 16px';
                }
            }
        });

        // Handler com CAPTURE (importante!)
        document.addEventListener('click', function (ev) {
            const btn = ev.target.closest('.faq-question');
            if (!btn) return;

            // Para impedir outros scripts de bloquear o clique
            ev.preventDefault();
            ev.stopImmediatePropagation();

            const item = btn.closest('.faq-item');
            if (!item) return;
            const isOpen = item.classList.contains('open');

            // Fecha os outros
            root.querySelectorAll('.faq-item.open').forEach(i => {
                if (i === item) return;
                collapse(i);
                i.classList.remove('open');
                const qb = i.querySelector('.faq-question');
                if (qb) qb.setAttribute('aria-expanded', 'false');
            });

            // Abre/fecha o atual
            if (!isOpen) {
                item.classList.add('open');
                expand(item);
                btn.setAttribute('aria-expanded', 'true');
            } else {
                item.classList.remove('open');
                collapse(item);
                btn.setAttribute('aria-expanded', 'false');
            }

        }, true); // *** CAPTURE = true ***

        function expand(it) {
            const ans = it.querySelector('.faq-answer');
            if (!ans) return;
            // Primeiro, mostra o elemento para calcular a altura real
            ans.style.display = 'block';
            ans.style.maxHeight = 'none';
            ans.style.padding = '10px 16px 16px 16px';
            const fullHeight = ans.scrollHeight;
            // Reseta para animação
            ans.style.maxHeight = '0px';
            ans.style.padding = '0 16px';
            // Usa requestAnimationFrame para garantir que a transição funcione
            requestAnimationFrame(() => {
                ans.style.transition = 'max-height .32s ease, padding .32s ease';
                ans.style.maxHeight = (fullHeight + 50) + 'px'; // Adiciona margem extra para garantir que não corte
                ans.style.padding = '10px 16px 16px 16px';
            });
        }

        function collapse(it) {
            const ans = it.querySelector('.faq-answer');
            if (!ans) return;
            ans.style.transition = 'max-height .28s ease, padding .28s ease';
            ans.style.maxHeight = '0px';
            ans.style.padding = '0 16px';
            setTimeout(() => { ans.style.display = ''; }, 320);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () =>
            initFAQ(document.querySelector('.faq-container'))
        );
    } else {
        initFAQ(document.querySelector('.faq-container'));
    }
})();

// ===== MODAL DE DESPESAS =====
function openExpensesModal() {
    const modal = document.getElementById('expensesModal');
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
        modal.style.display = 'flex';
    }
}

function closeExpensesModal() {
    const modal = document.getElementById('expensesModal');
    if (modal) {
        modal.classList.remove('show');
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Exporta funções para uso global
window.openExpensesModal = openExpensesModal;
window.closeExpensesModal = closeExpensesModal;

// Close modal when clicking outside
document.addEventListener('click', function (event) {
    const modal = document.getElementById('expensesModal');
    if (event.target === modal) {
        closeExpensesModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') {
        const expensesModal = document.getElementById('expensesModal');
        if (expensesModal && expensesModal.classList.contains('show')) {
            closeExpensesModal();
        }
    }
});

// ===== MODAL DE CONFIRMAÇÃO DE TELEFONE =====

// Função para mostrar o modal de confirmação de telefone
function showPhoneConfirmationModal() {
    // Fecha o modal de doação primeiro
    const donationModal = document.getElementById('donationModal');
    if (donationModal) {
        donationModal.classList.remove('show');
        donationModal.style.display = 'none';
    }
    
    // Mostra o modal de confirmação
    const modal = document.getElementById('phoneConfirmationModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

// Função para esconder o modal de confirmação de telefone
function hidePhoneConfirmationModal() {
    const modal = document.getElementById('phoneConfirmationModal');
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }
}

// Função para voltar e preencher o telefone
function goBackToFillPhone() {
    hidePhoneConfirmationModal();
    
    // Reabre o modal de doação na etapa 2 (doação única)
    const donationModal = document.getElementById('donationModal');
    if (donationModal) {
        donationModal.classList.add('show');
        donationModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    // Garante que está na etapa 2 de doação única
    const step1 = document.getElementById('donationStep1');
    const step2Unica = document.getElementById('donationStep2Unica');
    const step2Mensal = document.getElementById('donationStep2Mensal');
    
    if (step1) step1.style.display = 'none';
    if (step2Mensal) step2Mensal.style.display = 'none';
    if (step2Unica) step2Unica.style.display = 'block';
    
    // Foca no campo de telefone após um pequeno delay
    setTimeout(() => {
        const phoneInput = document.getElementById('donorPhone');
        if (phoneInput) {
            phoneInput.focus();
        }
    }, 100);
}

// Função para continuar sem telefone
function continueWithoutPhone() {
    hidePhoneConfirmationModal();
    
    // Garante que o modal de doação está aberto para mostrar o loading
    const donationModal = document.getElementById('donationModal');
    if (donationModal) {
        donationModal.classList.add('show');
        donationModal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
    
    // Continua com o processo usando telefone vazio (será convertido para 000000000)
    const messageInput = document.getElementById('donorMessage');
    const mensagem = messageInput ? messageInput.value.trim() : '';
    
    // Chama a função de geração de contribuição
    proceedWithContribution('Anonimo', '000000000', '', '', mensagem);
}

// Exporta funções para uso global
window.goBackToFillPhone = goBackToFillPhone;
window.continueWithoutPhone = continueWithoutPhone;

