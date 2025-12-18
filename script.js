(function() {
  'use strict';

  const CONFIG = {
    HEADER_HEIGHT: 72,
    HEADER_HEIGHT_MOBILE: 64,
    BREAKPOINT_MD: 768,
    BREAKPOINT_LG: 1024,
    SCROLL_THRESHOLD: 100,
    ANIMATION_DURATION: 300,
    DEBOUNCE_DELAY: 150,
    THROTTLE_DELAY: 100
  };

  const VALIDATORS = {
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    phone: /^[\d+\-()]{10,20}$/,
    name: /^[a-zA-ZÀ-ÿ\s\-']{2,50}$/,
    message: /^.{10,}$/
  };

  const app = {
    state: {
      isMenuOpen: false,
      scrollY: 0,
      isScrolling: false,
      activeSection: null,
      observers: [],
      animations: new Map()
    },

    init() {
      if (this.state.initialized) return;
      this.state.initialized = true;

      this.setupMobileMenu();
      this.setupSmoothScroll();
      this.setupScrollSpy();
      this.setupIntersectionObserver();
      this.setupFormValidation();
      this.setupMicroInteractions();
      this.setupScrollToTop();
      this.setupImageAnimations();
      this.setupCardAnimations();
      this.setupCountUp();
      this.setupRippleEffect();
      this.updateActiveMenu();
    },

    setupMobileMenu() {
      const toggle = document.querySelector('.navbar-toggler');
      const nav = document.querySelector('.navbar-collapse');
      const navLinks = document.querySelectorAll('.nav-link, .c-nav__link');

      if (!toggle || !nav) return;

      const openMenu = () => {
        this.state.isMenuOpen = true;
        nav.classList.add('show');
        toggle.setAttribute('aria-expanded', 'true');
        document.body.style.overflow = 'hidden';
        nav.style.maxHeight = 'calc(100vh - var(--header-h-mobile))';
        nav.style.opacity = '0';
        requestAnimationFrame(() => {
          nav.style.transition = 'opacity 300ms ease-in-out';
          nav.style.opacity = '1';
        });
      };

      const closeMenu = () => {
        this.state.isMenuOpen = false;
        nav.style.opacity = '0';
        setTimeout(() => {
          nav.classList.remove('show');
          toggle.setAttribute('aria-expanded', 'false');
          document.body.style.overflow = '';
          nav.style.maxHeight = '0';
        }, 300);
      };

      toggle.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.state.isMenuOpen ? closeMenu() : openMenu();
      });

      navLinks.forEach(link => {
        link.addEventListener('click', () => {
          if (window.innerWidth < CONFIG.BREAKPOINT_LG) {
            closeMenu();
          }
        });
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.state.isMenuOpen) {
          closeMenu();
        }
      });

      window.addEventListener('resize', this.debounce(() => {
        if (window.innerWidth >= CONFIG.BREAKPOINT_LG && this.state.isMenuOpen) {
          closeMenu();
        }
      }, CONFIG.DEBOUNCE_DELAY));
    },

    setupSmoothScroll() {
      const links = document.querySelectorAll('a[href^="#"]:not([href="#"]):not([href="#!"])');
      
      links.forEach(link => {
        link.addEventListener('click', (e) => {
          const href = link.getAttribute('href');
          if (!href.startsWith('#')) return;

          const targetId = href.substring(1);
          const target = document.getElementById(targetId);
          
          if (target) {
            e.preventDefault();
            const headerHeight = window.innerWidth < CONFIG.BREAKPOINT_MD 
              ? CONFIG.HEADER_HEIGHT_MOBILE 
              : CONFIG.HEADER_HEIGHT;
            const targetPosition = target.getBoundingClientRect().top + window.pageYOffset - headerHeight;
            
            window.scrollTo({
              top: targetPosition,
              behavior: 'smooth'
            });
          }
        });
      });
    },

    setupScrollSpy() {
      const sections = document.querySelectorAll('section[id]');
      const navLinks = document.querySelectorAll('.nav-link[href^="#"], .c-nav__link[href^="#"]');

      if (sections.length === 0) return;

      const updateActiveLink = () => {
        const scrollY = window.pageYOffset;
        const headerHeight = window.innerWidth < CONFIG.BREAKPOINT_MD 
          ? CONFIG.HEADER_HEIGHT_MOBILE 
          : CONFIG.HEADER_HEIGHT;

        sections.forEach(section => {
          const sectionTop = section.offsetTop - headerHeight - 50;
          const sectionHeight = section.offsetHeight;
          const sectionId = section.getAttribute('id');

          if (scrollY >= sectionTop && scrollY < sectionTop + sectionHeight) {
            navLinks.forEach(link => {
              link.classList.remove('active');
              link.removeAttribute('aria-current');
              
              if (link.getAttribute('href') === `#${sectionId}`) {
                link.classList.add('active');
                link.setAttribute('aria-current', 'page');
              }
            });
          }
        });
      };

      window.addEventListener('scroll', this.throttle(updateActiveLink, CONFIG.THROTTLE_DELAY));
    },

    setupIntersectionObserver() {
      const elements = document.querySelectorAll('.card, .c-card, img:not(.c-logo__img), .c-hero, .c-cta');

      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '0';
            entry.target.style.transform = 'translateY(30px)';
            
            requestAnimationFrame(() => {
              entry.target.style.transition = 'opacity 600ms ease-out, transform 600ms ease-out';
              entry.target.style.opacity = '1';
              entry.target.style.transform = 'translateY(0)';
            });

            observer.unobserve(entry.target);
          }
        });
      }, {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
      });

      elements.forEach(el => observer.observe(el));
      this.state.observers.push(observer);
    },

    setupFormValidation() {
      const form = document.querySelector('.c-form, form.needs-validation');
      if (!form) return;

      const fields = {
        firstName: { pattern: VALIDATORS.name, message: 'Vorname: 2-50 Zeichen, nur Buchstaben' },
        lastName: { pattern: VALIDATORS.name, message: 'Nachname: 2-50 Zeichen, nur Buchstaben' },
        email: { pattern: VALIDATORS.email, message: 'E-Mail: Ungültiges Format (z.B. name@beispiel.de)' },
        phone: { pattern: VALIDATORS.phone, message: 'Telefon: 10-20 Ziffern' },
        message: { pattern: VALIDATORS.message, message: 'Nachricht: Mindestens 10 Zeichen erforderlich' }
      };

      const validateField = (input, config) => {
        const value = input.value.trim();
        const group = input.closest('.c-form-group, .form-group');
        let errorEl = group?.querySelector('.c-error, .invalid-feedback');

        if (input.hasAttribute('required') && !value) {
          if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'c-error invalid-feedback';
            input.parentNode.appendChild(errorEl);
          }
          errorEl.textContent = 'Dieses Feld ist erforderlich';
          errorEl.style.display = 'block';
          group?.classList.add('has-error');
          input.setAttribute('aria-invalid', 'true');
          return false;
        }

        if (config && config.pattern && !config.pattern.test(value)) {
          if (!errorEl) {
            errorEl = document.createElement('div');
            errorEl.className = 'c-error invalid-feedback';
            input.parentNode.appendChild(errorEl);
          }
          errorEl.textContent = config.message;
          errorEl.style.display = 'block';
          group?.classList.add('has-error');
          input.setAttribute('aria-invalid', 'true');
          return false;
        }

        if (errorEl) errorEl.style.display = 'none';
        group?.classList.remove('has-error');
        input.removeAttribute('aria-invalid');
        return true;
      };

      Object.keys(fields).forEach(fieldName => {
        const input = form.querySelector(`#${fieldName}`);
        if (!input) return;

        input.addEventListener('blur', () => validateField(input, fields[fieldName]));
        input.addEventListener('input', this.debounce(() => {
          if (input.value.length > 0) {
            validateField(input, fields[fieldName]);
          }
        }, 500));
      });

      const privacyCheckbox = form.querySelector('#privacy');
      if (privacyCheckbox) {
        privacyCheckbox.addEventListener('change', () => {
          const group = privacyCheckbox.closest('.form-check');
          if (!privacyCheckbox.checked) {
            group?.classList.add('has-error');
          } else {
            group?.classList.remove('has-error');
          }
        });
      }

      form.addEventListener('submit', (e) => {
        e.preventDefault();

        let isValid = true;

        Object.keys(fields).forEach(fieldName => {
          const input = form.querySelector(`#${fieldName}`);
          if (input && !validateField(input, fields[fieldName])) {
            isValid = false;
          }
        });

        if (privacyCheckbox && !privacyCheckbox.checked) {
          isValid = false;
          const group = privacyCheckbox.closest('.form-check');
          group?.classList.add('has-error');
        }

        if (!isValid) {
          const firstError = form.querySelector('.has-error input, .has-error textarea');
          firstError?.focus();
          return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn?.innerHTML;
        
        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Wird gesendet...';
        }

        setTimeout(() => {
          window.location.href = 'thank_you.html';
        }, 1500);
      });
    },

    setupMicroInteractions() {
      const buttons = document.querySelectorAll('.c-button, .btn, a.nav-link, a.c-nav__link');

      buttons.forEach(btn => {
        btn.addEventListener('mouseenter', function() {
          this.style.transition = 'all 200ms ease-out';
          this.style.transform = 'translateY(-2px)';
        });

        btn.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0)';
        });

        btn.addEventListener('mousedown', function() {
          this.style.transform = 'scale(0.97)';
        });

        btn.addEventListener('mouseup', function() {
          this.style.transform = 'translateY(-2px)';
        });
      });

      const cards = document.querySelectorAll('.card, .c-card');
      cards.forEach(card => {
        card.addEventListener('mouseenter', function() {
          this.style.transition = 'all 300ms ease-out';
          this.style.transform = 'translateY(-8px)';
          this.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.18)';
        });

        card.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0)';
          this.style.boxShadow = '';
        });
      });
    },

    setupScrollToTop() {
      let scrollBtn = document.querySelector('[data-scroll-top]');
      
      if (!scrollBtn) {
        scrollBtn = document.createElement('button');
        scrollBtn.className = 'btn btn-primary rounded-circle';
        scrollBtn.style.cssText = `
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 56px;
          height: 56px;
          opacity: 0;
          visibility: hidden;
          transition: all 300ms ease-in-out;
          z-index: 999;
          box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
        `;
        scrollBtn.innerHTML = '↑';
        scrollBtn.setAttribute('aria-label', 'Nach oben scrollen');
        document.body.appendChild(scrollBtn);
      }

      const toggleButton = () => {
        if (window.pageYOffset > CONFIG.SCROLL_THRESHOLD) {
          scrollBtn.style.opacity = '1';
          scrollBtn.style.visibility = 'visible';
        } else {
          scrollBtn.style.opacity = '0';
          scrollBtn.style.visibility = 'hidden';
        }
      };

      window.addEventListener('scroll', this.throttle(toggleButton, CONFIG.THROTTLE_DELAY));

      scrollBtn.addEventListener('click', () => {
        window.scrollTo({
          top: 0,
          behavior: 'smooth'
        });
      });
    },

    setupImageAnimations() {
      const images = document.querySelectorAll('img:not(.c-logo__img)');
      
      images.forEach(img => {
        if (!img.hasAttribute('loading') && !img.hasAttribute('data-critical')) {
          img.setAttribute('loading', 'lazy');
        }

        img.addEventListener('error', function() {
          this.style.opacity = '0.6';
          this.style.filter = 'grayscale(1)';
        });
      });
    },

    setupCardAnimations() {
      const cards = document.querySelectorAll('.card, .c-card');
      
      cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
          card.style.transition = 'all 600ms ease-out';
          card.style.opacity = '1';
          card.style.transform = 'translateY(0)';
        }, index * 100);
      });
    },

    setupCountUp() {
      const counters = document.querySelectorAll('[data-count]');
      
      counters.forEach(counter => {
        const target = parseInt(counter.getAttribute('data-count'));
        const duration = 2000;
        const increment = target / (duration / 16);
        let current = 0;

        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              const updateCount = () => {
                current += increment;
                if (current < target) {
                  counter.textContent = Math.floor(current);
                  requestAnimationFrame(updateCount);
                } else {
                  counter.textContent = target;
                }
              };
              updateCount();
              observer.unobserve(counter);
            }
          });
        }, { threshold: 0.5 });

        observer.observe(counter);
        this.state.observers.push(observer);
      });
    },

    setupRippleEffect() {
      const buttons = document.querySelectorAll('.c-button--primary, .btn-primary');
      
      buttons.forEach(button => {
        button.addEventListener('click', function(e) {
          const ripple = document.createElement('span');
          const rect = this.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height);
          const x = e.clientX - rect.left - size / 2;
          const y = e.clientY - rect.top - size / 2;

          ripple.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.6);
            left: ${x}px;
            top: ${y}px;
            transform: scale(0);
            animation: ripple 600ms ease-out;
            pointer-events: none;
          `;

          this.style.position = 'relative';
          this.style.overflow = 'hidden';
          this.appendChild(ripple);

          setTimeout(() => ripple.remove(), 600);
        });
      });

      if (!document.getElementById('ripple-styles')) {
        const style = document.createElement('style');
        style.id = 'ripple-styles';
        style.textContent = `
          @keyframes ripple {
            to {
              transform: scale(2);
              opacity: 0;
            }
          }
        `;
        document.head.appendChild(style);
      }
    },

    updateActiveMenu() {
      const navLinks = document.querySelectorAll('.nav-link, .c-nav__link');
      const currentPath = window.location.pathname;
      const isHomepage = currentPath === '/' || currentPath.endsWith('/index.html');

      navLinks.forEach(link => {
        const href = link.getAttribute('href');
        link.classList.remove('active');
        link.removeAttribute('aria-current');

        if ((href === '/' || href === '/index.html') && isHomepage) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        } else if (href && href !== '/' && currentPath.endsWith(href)) {
          link.classList.add('active');
          link.setAttribute('aria-current', 'page');
        }
      });
    },

    debounce(func, wait) {
      let timeout;
      return function executedFunction(...args) {
        const later = () => {
          clearTimeout(timeout);
          func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
      };
    },

    throttle(func, limit) {
      let inThrottle;
      return function(...args) {
        if (!inThrottle) {
          func.apply(this, args);
          inThrottle = true;
          setTimeout(() => inThrottle = false, limit);
        }
      };
    },

    cleanup() {
      this.state.observers.forEach(observer => observer.disconnect());
      this.state.observers = [];
      this.state.animations.clear();
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.init());
  } else {
    app.init();
  }

  window.addEventListener('beforeunload', () => app.cleanup());

  window.__animationApp = app;
})();