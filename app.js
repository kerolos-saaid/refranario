// Señor Shaعbi - Data Management & Utilities

// ============================================================================
// DATA LAYER - LocalStorage Management
// ============================================================================

const DataStore = {
    // Initialize with sample data if empty
    init() {
        if (!localStorage.getItem('proverbs')) {
            const sampleData = [
                {
                    id: '1',
                    spanish: 'A quien madruga, Dios le ayuda.',
                    arabic: 'من جد وجد',
                    english: 'The early bird catches the worm.',
                    category: 'Wisdom',
                    note: 'Un refrán sobre la diligencia y la acción temprana que conduce al éxito.',
                    image: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400',
                    curator: 'A. Al-Fayed',
                    date: '12th Oct, 2023',
                    bookmarked: false
                },
                {
                    id: '2',
                    spanish: 'Más vale pájaro en mano que ciento volando.',
                    arabic: 'عصفور في اليد خير من عشرة على الشجرة',
                    english: 'A bird in the hand is worth two in the bush.',
                    category: 'Prudence',
                    note: 'Este refrán aconseja no arriesgar una ganancia segura por una potencialmente mayor, pero incierta.',
                    image: 'https://images.unsplash.com/photo-1444464666168-49d633b86797?w=400',
                    curator: 'A. Al-Fayed',
                    date: '12th Oct, 2023',
                    bookmarked: false
                },
                {
                    id: '3',
                    spanish: 'El tiempo es oro.',
                    arabic: 'الوقت من ذهب',
                    english: 'Time is money.',
                    category: 'Time',
                    note: 'Un refrán universal que enfatiza el valor del tiempo.',
                    image: 'https://images.unsplash.com/photo-1501139083538-0139583c060f?w=400',
                    curator: 'A. Al-Fayed',
                    date: '12th Oct, 2023',
                    bookmarked: false
                },
                {
                    id: '4',
                    spanish: 'Ojos que no ven, corazón que no siente.',
                    arabic: 'بعيد عن العين بعيد عن القلب',
                    english: 'Out of sight, out of mind.',
                    category: 'Nature',
                    note: 'Un refrán sobre la distancia emocional y la conciencia.',
                    image: 'https://images.unsplash.com/photo-1518837695005-2083093ee35b?w=400',
                    curator: 'A. Al-Fayed',
                    date: '12th Oct, 2023',
                    bookmarked: false
                }
            ];
            localStorage.setItem('proverbs', JSON.stringify(sampleData));
        }
    },

    getAll() {
        return JSON.parse(localStorage.getItem('proverbs') || '[]');
    },

    getById(id) {
        const proverbs = this.getAll();
        return proverbs.find(p => p.id === id);
    },

    add(proverb) {
        const proverbs = this.getAll();
        const newProverb = {
            ...proverb,
            id: Date.now().toString(),
            date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
            curator: Auth.getCurrentUser() || 'Anonymous',
            bookmarked: false
        };
        proverbs.push(newProverb);
        localStorage.setItem('proverbs', JSON.stringify(proverbs));
        return newProverb;
    },

    update(id, updates) {
        const proverbs = this.getAll();
        const index = proverbs.findIndex(p => p.id === id);
        if (index !== -1) {
            proverbs[index] = { ...proverbs[index], ...updates };
            localStorage.setItem('proverbs', JSON.stringify(proverbs));
            return proverbs[index];
        }
        return null;
    },

    delete(id) {
        const proverbs = this.getAll();
        const filtered = proverbs.filter(p => p.id !== id);
        localStorage.setItem('proverbs', JSON.stringify(filtered));
        return true;
    },

    toggleBookmark(id) {
        const proverb = this.getById(id);
        if (proverb) {
            return this.update(id, { bookmarked: !proverb.bookmarked });
        }
        return null;
    },

    search(query) {
        if (!query) return this.getAll();
        const lowerQuery = query.toLowerCase();
        return this.getAll().filter(p => 
            p.spanish.toLowerCase().includes(lowerQuery) ||
            p.arabic.includes(query) ||
            p.english.toLowerCase().includes(lowerQuery) ||
            p.category.toLowerCase().includes(lowerQuery)
        );
    },

    filterByCategory(category) {
        if (category === 'All Records') return this.getAll();
        return this.getAll().filter(p => p.category === category);
    }
};

// ============================================================================
// AUTHENTICATION
// ============================================================================

const Auth = {
    isLoggedIn() {
        return localStorage.getItem('isAuthenticated') === 'true';
    },

    login(email, password) {
        if (email && password) {
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('currentUser', email);
            return true;
        }
        return false;
    },

    logout() {
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('currentUser');
    },

    getCurrentUser() {
        return localStorage.getItem('currentUser');
    },

    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = '5-login.html';
            return false;
        }
        return true;
    }
};

// ============================================================================
// OFFLINE DETECTION
// ============================================================================

const OfflineManager = {
    init() {
        this.updateStatus();
        window.addEventListener('online', () => this.updateStatus());
        window.addEventListener('offline', () => this.updateStatus());
    },

    isOnline() {
        return navigator.onLine;
    },

    updateStatus() {
        const banner = document.getElementById('offline-banner');
        if (banner) {
            if (this.isOnline()) {
                banner.classList.add('-translate-y-full');
                // Remove padding from body when online
                setTimeout(() => {
                    document.body.style.paddingTop = '0';
                }, 300); // Wait for animation to complete
            } else {
                banner.classList.remove('-translate-y-full');
                // Add padding to body to prevent content overlap
                setTimeout(() => {
                    document.body.style.paddingTop = banner.offsetHeight + 'px';
                }, 10);
            }
        }
    },

    createBanner() {
        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        banner.className = 'fixed top-0 left-0 right-0 z-[60] bg-primary shadow-md transition-transform duration-300 ease-in-out transform -translate-y-full';
        banner.innerHTML = `
            <div class="max-w-md mx-auto px-4 py-2 flex items-center justify-center gap-2">
                <span aria-hidden="true" class="material-symbols-outlined text-white text-[18px]">wifi_off</span>
                <p class="text-white text-xs font-bold tracking-wide uppercase leading-none pt-0.5">
                    Modo sin conexión. Viendo archivo en caché.
                </p>
            </div>
        `;
        document.body.insertBefore(banner, document.body.firstChild);
        return banner;
    }
};

// ============================================================================
// UI UTILITIES
// ============================================================================

const UI = {
    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg z-50 animate-toast ${
            type === 'success' ? 'bg-primary text-white' : 'bg-red-600 text-white'
        }`;
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'toast-out 0.3s ease-out forwards';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    },

    confirm(message, onConfirm) {
        if (window.confirm(message)) {
            onConfirm();
        }
    },

    animateIn(element, animation = 'fade-in') {
        element.style.animation = `${animation} 0.3s ease-out forwards`;
    },

    animateOut(element, animation = 'fade-out', callback) {
        element.style.animation = `${animation} 0.3s ease-out forwards`;
        setTimeout(() => {
            if (callback) callback();
        }, 300);
    }
};

// ============================================================================
// INITIALIZE ON LOAD
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    DataStore.init();
    
    if (!window.location.pathname.includes('1-splash') && 
        !window.location.pathname.includes('6-offline')) {
        OfflineManager.createBanner();
        OfflineManager.init();
    }
});

// Add custom animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fade-in {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes fade-out {
        from { opacity: 1; transform: translateY(0); }
        to { opacity: 0; transform: translateY(10px); }
    }
    @keyframes slide-in-left {
        from { opacity: 0; transform: translateX(-20px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes slide-in-right {
        from { opacity: 0; transform: translateX(20px); }
        to { opacity: 1; transform: translateX(0); }
    }
    @keyframes toast {
        0% { opacity: 0; transform: translate(-50%, 20px); }
        100% { opacity: 1; transform: translate(-50%, 0); }
    }
    @keyframes toast-out {
        0% { opacity: 1; transform: translate(-50%, 0); }
        100% { opacity: 0; transform: translate(-50%, 20px); }
    }
    @keyframes pulse {
        0%, 100% { transform: scale(1); }
        50% { transform: scale(1.05); }
    }
    @keyframes shake {
        10%, 90% { transform: translate3d(-1px, 0, 0); }
        20%, 80% { transform: translate3d(2px, 0, 0); }
        30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
        40%, 60% { transform: translate3d(4px, 0, 0); }
    }
    .animate-toast {
        animation: toast 0.3s ease-out forwards;
    }
`;
document.head.appendChild(style);
