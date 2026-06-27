// ==================== CONFIG ====================
const firebaseConfig = {
    apiKey: "AIzaSyBoCKXvZYcym7rhRg0QPujdbB1zkOEiyXU",
    authDomain: "gymawy-web.firebaseapp.com",
    projectId: "gymawy-web",
    storageBucket: "gymawy-web.firebasestorage.app",
    messagingSenderId: "861111958349",
    appId: "1:861111958349:web:5e547bb634ec169fd95504"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const rtdb = firebase.database();
db.enablePersistence().catch(function(err) {
    console.log('⚠️ Firestore offline persistence failed:', err);
});

const VODAFONE_CASH = "01016212814";
const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/di5z4lzwv/image/upload";
const CLOUDINARY_PRESET = "gymawy_upload";

const EGYPT_LOCATIONS = {
    "القاهرة": ["مدينة نصر", "مصر الجديدة", "المعادي", "الزمالك", "الشيخ زايد", "6 أكتوبر", "التجمع الخامس", "وسط البلد", "شبرا", "حلوان", "المقطم", "القاهرة الجديدة", "الشروق", "بدر", "العبور"],
    "الجيزة": ["الدقي", "المهندسين", "فيصل", "الهرم", "العجوزة", "إمبابة", "الوراق", "أكتوبر"],
    "الإسكندرية": ["سموحة", "سبورتنج", "محطة الرمل", "المنتزه", "العجمي", "برج العرب", "العامرية"],
    "الشرقية": ["الزقازيق", "العاشر من رمضان", "بلبيس", "أبو حماد", "منيا القمح", "فاقوس", "أبو كبير"],
    "الدقهلية": ["المنصورة", "طلخا", "ميت غمر", "السنبلاوين", "شربين", "دكرنس"],
    "الغربية": ["طنطا", "المحلة الكبرى", "زفتى", "السنطة", "كفر الزيات"],
    "القليوبية": ["بنها", "شبرا الخيمة", "العبور", "قليوب", "الخانكة"],
    "بورسعيد": ["بورسعيد", "بورفؤاد"], "السويس": ["السويس"], "الإسماعيلية": ["الإسماعيلية", "فايد", "القنطرة"],
    "دمياط": ["دمياط", "رأس البر", "فارسكور", "كفر سعد"], "كفر الشيخ": ["كفر الشيخ", "دسوق", "بلطيم", "البرلس"],
    "الفيوم": ["الفيوم", "سنورس", "طامية", "إطسا"], "بني سويف": ["بني سويف", "الواسطى", "ناصر", "ببا"],
    "المنيا": ["المنيا", "ملوي", "سمالوط", "بني مزار", "مغاغة"], "أسيوط": ["أسيوط", "ديروط", "القوصية", "منفلوط"],
    "سوهاج": ["سوهاج", "جرجا", "البلينا", "المراغة", "طهطا"], "قنا": ["قنا", "نجع حمادي", "دشنا", "قوص"],
    "الأقصر": ["الأقصر", "القرنة", "أرمنت"], "أسوان": ["أسوان", "كوم أمبو", "دراو", "إدفو"],
    "شمال سيناء": ["العريش", "بئر العبد", "الشيخ زويد"], "جنوب سيناء": ["شرم الشيخ", "دهب", "نويبع", "الطور"],
    "مطروح": ["مرسى مطروح", "الضبعة", "سيدي براني", "السلوم"], "البحر الأحمر": ["الغردقة", "مرسى علم", "سفاجا", "رأس غارب"]
};

var G = {
    currentUser: null, allGyms: [], selectedGym: null,
    currentFilter: { governorate: '', city: '', gender: '', minRating: 0, searchQuery: '' },
    quickFilter: 'all', notifications: [], favorites: [], recentlyViewed: [],
    shareGym: null, confirmCallback: null, _rating: 0, _subType: 'monthly',
    rtdbListeners: [], banListener: null
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Gymawy Starting...');
    
    loadUserFromStorage();
    loadFavorites();
    loadRecentlyViewed();
    loadDarkMode();
    setupAllListeners();

    document.getElementById('mainHeader').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('bottomNav').style.display = 'none';
    document.getElementById('onboardingOverlay').style.display = 'none';

    if (G.currentUser && localStorage.getItem('gymawy_keep_logged_in') === '1') {
        console.log('✅ Auto login:', G.currentUser.username);
        showMainApp();
        checkOnboarding();
        goTo('home');
        loadGyms();
        loadNotifications();
    } else {
        document.getElementById('loginOverlay').style.display = 'flex';
    }
});

function showMainApp() {
    document.getElementById('loginOverlay').style.display = 'none';
    document.getElementById('mainHeader').style.display = 'flex';
    document.getElementById('mainContainer').style.display = 'block';
    document.getElementById('bottomNav').style.display = 'flex';
}

function hideMainApp() {
    document.getElementById('loginOverlay').style.display = 'flex';
    document.getElementById('mainHeader').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('bottomNav').style.display = 'none';
}

// ==================== HELPERS ====================
function T(m, t) {
    t = t || 'success';
    var x = document.getElementById('toast');
    if (!x) return;
    x.textContent = m;
    x.className = 'toast ' + t + ' show';
    clearTimeout(x._t);
    x._t = setTimeout(function() { x.classList.remove('show'); }, 4000);
}

function formatDate(d) {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

function isExpired(d) { return new Date(d) < new Date(); }
function daysRemaining(d) { return Math.ceil((new Date(d) - new Date()) / 86400000); }
function timeAgo(d) {
    var diff = (new Date() - new Date(d)) / 1000;
    if (diff < 60) return 'الآن';
    if (diff < 3600) return 'منذ ' + Math.floor(diff / 60) + ' دقيقة';
    if (diff < 86400) return 'منذ ' + Math.floor(diff / 3600) + ' ساعة';
    return formatDate(d);
}

// ==================== AUTH ====================
function loadUserFromStorage() {
    try { G.currentUser = JSON.parse(localStorage.getItem('gymawy_user')); } 
    catch (e) { G.currentUser = null; console.log('⚠️ User data corrupted, resetting'); }
}

function saveUserToStorage() {
    if (G.currentUser) localStorage.setItem('gymawy_user', JSON.stringify(G.currentUser));
    else localStorage.removeItem('gymawy_user');
}

async function registerUser(fn, ph, un, pw, pwc, email) {
    // Validation with clear Arabic messages
    if (!fn || fn.length < 6) { T('❌ الاسم يجب أن يكون 6 أحرف على الأقل', 'error'); return false; }
    if (!un || un.length < 4) { T('❌ اسم المستخدم يجب أن يكون 4 أحرف على الأقل', 'error'); return false; }
    if (un.length > 16) { T('❌ اسم المستخدم يجب أن يكون 16 حرف كحد أقصى', 'error'); return false; }
    if (!/^[A-Z0-9_]+$/.test(un)) { T('❌ اسم المستخدم: أحرف إنجليزية، أرقام، و _ فقط', 'error'); return false; }
    if (!ph || ph.length < 10) { T('❌ رقم الهاتف غير صحيح - يجب أن يكون 11 رقم على الأقل', 'error'); return false; }
    if (!/^01[0-9]{9,}$/.test(ph)) { T('❌ رقم الهاتف يجب أن يبدأ بـ 01', 'error'); return false; }
    if (!pw || pw.length < 6) { T('❌ كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error'); return false; }
    if (pw !== pwc) { T('❌ كلمتا المرور غير متطابقتين', 'error'); return false; }
    if (!email || !email.includes('@')) { T('❌ بريد إلكتروني صحيح مطلوب (يحتوي على @)', 'error'); return false; }
    if (!email.includes('.')) { T('❌ بريد إلكتروني غير صحيح - مثال: example@gmail.com', 'error'); return false; }
    
    try {
        T('⏳ جاري إنشاء الحساب...', 'info');
        var uSnap = await db.collection('users').doc(un).get();
        if (uSnap.exists) { 
            T('❌ اسم المستخدم "' + un + '" مستخدم بالفعل - اختر اسم آخر', 'error'); 
            return false; 
        }
        
        // Check if phone already used
        var phoneSnap = await db.collection('users').where('phone', '==', ph).get();
        var phoneUsed = false;
        phoneSnap.forEach(function(doc) { phoneUsed = true; });
        if (phoneUsed) { T('❌ رقم الهاتف "' + ph + '" مستخدم بالفعل - استخدم رقم آخر', 'error'); return false; }
        
        // Check if email already used
        var emailSnap = await db.collection('users').where('email', '==', email).get();
        var emailUsed = false;
        emailSnap.forEach(function(doc) { emailUsed = true; });
        if (emailUsed) { T('❌ البريد الإلكتروني "' + email + '" مستخدم بالفعل - استخدم بريد آخر', 'error'); return false; }
        
        var hash = CryptoJS.SHA256(pw).toString();
        await db.collection('users').doc(un).set({
            fullName: fn, phone: ph, username: un, passHash: hash,
            email: email, emailVerified: true, role: 'user',
            createdAt: new Date().toISOString()
        });
        
        G.currentUser = { fullName: fn, phone: ph, username: un, email: email, emailVerified: true, role: 'user' };
        saveUserToStorage();
        localStorage.setItem('gymawy_keep_logged_in', '1');
        
        showMainApp();
        checkOnboarding();
        loadNotifications();
        goTo('home');
        loadGyms();
        T('🎉 تم إنشاء الحساب بنجاح - أهلاً ' + fn, 'success');
        return true;
    } catch (e) {
        console.error('Register error:', e);
        T('❌ حدث خطأ غير متوقع: ' + (e.message || 'تأكد من اتصالك بالإنترنت'), 'error');
        return false;
    }
}

async function loginUser(un, pw) {
    if (!un) { T('❌ أدخل اسم المستخدم', 'error'); return false; }
    if (!pw) { T('❌ أدخل كلمة المرور', 'error'); return false; }
    
    try {
        T('⏳ جاري تسجيل الدخول...', 'info');
        var snap = await db.collection('users').doc(un).get();
        
        if (!snap.exists) { 
            T('❌ اسم المستخدم "' + un + '" غير موجود - تأكد من كتابته بشكل صحيح', 'error'); 
            return false; 
        }
        
        var d = snap.data();
        
        if (d.banned) { 
            T('🚫 الحساب محظور من قبل الإدارة', 'error'); 
            return false; 
        }
        
        if (CryptoJS.SHA256(pw).toString() !== d.passHash) { 
            T('❌ كلمة المرور غير صحيحة - حاول مرة أخرى', 'error'); 
            return false; 
        }
        
        G.currentUser = { 
            fullName: d.fullName, phone: d.phone || '', username: un, 
            email: d.email || '', emailVerified: true, role: d.role || 'user' 
        };
        saveUserToStorage();
        localStorage.setItem('gymawy_keep_logged_in', '1');
        
        showMainApp();
        checkOnboarding();
        loadNotifications();
        goTo('home');
        loadGyms();
        T('👋 أهلاً ' + d.fullName + ' - تم تسجيل الدخول بنجاح', 'success');
        return true;
    } catch (e) {
        console.error('Login error:', e);
        T('❌ حدث خطأ في الاتصال - تأكد من الإنترنت وحاول مرة أخرى', 'error');
        return false;
    }
}

function logout() {
    if (G.banListener) { G.banListener.ref.off('child_added', G.banListener.fn); }
    G.rtdbListeners.forEach(function(l) { 
        try { l.ref.off('child_added', l.fn); } catch(e) {}
    });
    G.rtdbListeners = [];
    G.currentUser = null;
    saveUserToStorage();
    localStorage.removeItem('gymawy_keep_logged_in');
    hideMainApp();
    T('تم تسجيل الخروج', 'info');
}

function handleLogin() {
    var un = document.getElementById('loginUsername');
    var pw = document.getElementById('loginPassword');
    if (un && pw) {
        loginUser(un.value.trim().toUpperCase(), pw.value);
    }
}

// ==================== REGISTER FORM ====================
function showRegForm() {
    var c = document.getElementById('regForm');
    if (!c) return;
    c.style.display = 'block';
    c.innerHTML = '<h4 style="margin-bottom:14px;">إنشاء حساب جديد</h4>' +
        '<div class="form-row"><div class="form-group"><label>الاسم الرباعي (6 أحرف على الأقل)</label><input type="text" id="rf" class="form-control" placeholder="مثال: أحمد محمد علي"></div><div class="form-group"><label>رقم الهاتف (11 رقم)</label><input type="tel" id="rp" class="form-control" placeholder="01xxxxxxxxx"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="re" class="form-control" placeholder="example@mail.com"></div><div class="form-group"><label>اسم المستخدم (4-16 حرف إنجليزي)</label><input type="text" id="ru" class="form-control" style="text-transform:uppercase;" placeholder="USERNAME"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>كلمة المرور (6 أحرف على الأقل)</label><input type="password" id="rpa" class="form-control" placeholder="********"></div><div class="form-group"><label>تأكيد كلمة المرور</label><input type="password" id="rpc" class="form-control" placeholder="أعد كتابة كلمة المرور"></div></div>' +
        '<button class="btn btn-success" onclick="handleReg()"><i class="fas fa-user-plus"></i> إنشاء الحساب</button>' +
        '<button class="btn btn-outline btn-sm" onclick="hideForms()" style="margin-top:8px;">رجوع</button>';
    
    setTimeout(function() { c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
}

function hideForms() {
    var r = document.getElementById('regForm');
    var rs = document.getElementById('resetForm');
    if (r) r.style.display = 'none';
    if (rs) rs.style.display = 'none';
}

async function handleReg() {
    var fn = document.getElementById('rf');
    var ph = document.getElementById('rp');
    var em = document.getElementById('re');
    var un = document.getElementById('ru');
    var pw = document.getElementById('rpa');
    var pc = document.getElementById('rpc');
    
    if (!fn || !ph || !em || !un || !pw || !pc) return;
    
    var fullName = fn.value.trim();
    var phone = ph.value.trim();
    var email = em.value.trim();
    var username = un.value.trim().toUpperCase();
    var password = pw.value;
    var passwordConfirm = pc.value;
    
    if (!fullName || fullName.length < 6) { T('❌ الاسم يجب أن يكون 6 أحرف على الأقل', 'error'); return; }
    if (!phone || phone.length < 10) { T('❌ رقم الهاتف غير صحيح', 'error'); return; }
    if (!email || !email.includes('@') || !email.includes('.')) { T('❌ بريد إلكتروني صحيح مطلوب', 'error'); return; }
    if (!username || username.length < 4) { T('❌ اسم المستخدم 4 أحرف على الأقل', 'error'); return; }
    if (!password || password.length < 6) { T('❌ كلمة المرور 6 أحرف على الأقل', 'error'); return; }
    if (password !== passwordConfirm) { T('❌ كلمتا المرور غير متطابقتين', 'error'); return; }
    
    var ok = await registerUser(fullName, phone, username, password, passwordConfirm, email);
    if (ok) hideForms();
}

function showResetForm() {
    var c = document.getElementById('resetForm');
    var rf = document.getElementById('regForm');
    if (rf) rf.style.display = 'none';
    if (!c) return;
    c.style.display = 'block';
    c.innerHTML = '<h4 style="margin-bottom:12px;">نسيت كلمة المرور</h4>' +
        '<div style="text-align:center;padding:20px;">' +
        '<i class="fas fa-tools" style="font-size:50px;color:var(--warning);margin-bottom:12px;"></i>' +
        '<h3 style="color:var(--warning);">🚧 جاري تطوير هذه الميزة</h3>' +
        '<p style="font-size:13px;color:var(--text-secondary);">يرجى التواصل مع خدمة العملاء لاستعادة كلمة المرور</p></div>' +
        '<button class="btn btn-outline btn-sm" onclick="hideForms()" style="margin-top:12px;">رجوع</button>';
}

// ==================== NAVIGATION ====================
function goTo(page) {
    var pages = document.querySelectorAll('.page');
    for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active');
    
    var el = document.getElementById(page + 'Page');
    if (el) el.classList.add('active');
    
    if (page === 'home') loadGyms();
    if (page === 'profile') loadProfile();
    if (page === 'notifications') loadNotificationsPage();
    if (page === 'forum') loadForumPage();
    if (page === 'requests') loadMyRequests();
}

function setActiveNav(btn) {
    var items = document.querySelectorAll('.nav-item');
    for (var i = 0; i < items.length; i++) items[i].classList.remove('active');
    btn.classList.add('active');
}

function openModal(id) {
    document.getElementById(id).classList.add('active');
    document.body.style.overflow = 'hidden';
}

function closeModal(id) {
    document.getElementById(id).classList.remove('active');
    document.body.style.overflow = '';
}

function openSidebar() {
    document.getElementById('sidebar').classList.add('active');
    document.getElementById('sidebarOverlay').classList.add('active');
}

function closeSidebar() {
    document.getElementById('sidebar').classList.remove('active');
    document.getElementById('sidebarOverlay').classList.remove('active');
}

// ==================== ONBOARDING / DARK ====================
function checkOnboarding() {
    if (localStorage.getItem('gymawy_onboarding') === '1') {
        document.getElementById('onboardingOverlay').style.display = 'none';
    } else {
        document.getElementById('onboardingOverlay').style.display = 'flex';
    }
}

function nextOnboarding(s) {
    var slides = document.querySelectorAll('.onboarding-slide');
    var dots = document.querySelectorAll('.onboarding-dot');
    for (var i = 0; i < slides.length; i++) slides[i].classList.remove('active');
    for (var j = 0; j < dots.length; j++) dots[j].classList.remove('active');
    if (slides[s - 1]) slides[s - 1].classList.add('active');
    if (dots[s - 1]) dots[s - 1].classList.add('active');
}

function finishOnboarding() {
    localStorage.setItem('gymawy_onboarding', '1');
    document.getElementById('onboardingOverlay').style.display = 'none';
}

function toggleDarkMode() {
    document.body.classList.toggle('dark');
    localStorage.setItem('gymawy_dark_mode', document.body.classList.contains('dark') ? '1' : '0');
}

function loadDarkMode() {
    if (localStorage.getItem('gymawy_dark_mode') === '1') document.body.classList.add('dark');
}

// ==================== LISTENERS ====================
function setupAllListeners() {
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
    document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
    
    var sidebarItems = document.querySelectorAll('.sidebar-item[data-page]');
    for (var i = 0; i < sidebarItems.length; i++) {
        sidebarItems[i].addEventListener('click', function() {
            goTo(this.dataset.page);
            closeSidebar();
        });
    }
    
    document.getElementById('sidebarSupport').addEventListener('click', function() { openSupportChat(); closeSidebar(); });
    document.getElementById('sidebarAbout').addEventListener('click', function() { showAbout(); closeSidebar(); });
    document.getElementById('sidebarPrivacy').addEventListener('click', function() { showPrivacy(); closeSidebar(); });
    document.getElementById('sidebarWhoWeAre').addEventListener('click', function() { showWhoWeAre(); closeSidebar(); });
    document.getElementById('sidebarForum').addEventListener('click', function() { goTo('forum'); closeSidebar(); });
    document.getElementById('sidebarFavorites').addEventListener('click', function() { showFavorites(); closeSidebar(); });
    document.getElementById('sidebarRegisterCoach').addEventListener('click', function() { showCoachRegistration(); closeSidebar(); });
    
    var navItems = document.querySelectorAll('.nav-item[data-page]');
    for (var j = 0; j < navItems.length; j++) {
        navItems[j].addEventListener('click', function() {
            goTo(this.dataset.page);
            setActiveNav(this);
        });
    }
    
    var searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            G.currentFilter.searchQuery = this.value;
            filterAndDisplayGyms();
        });
    }
    
    var filterTags = document.querySelectorAll('.filter-tag');
    for (var k = 0; k < filterTags.length; k++) {
        filterTags[k].addEventListener('click', function() {
            G.quickFilter = this.dataset.filter;
            var tags = document.querySelectorAll('.filter-tag');
            for (var t = 0; t < tags.length; t++) tags[t].classList.remove('active');
            this.classList.add('active');
            filterAndDisplayGyms();
        });
    }
    
    document.getElementById('confirmCancel').addEventListener('click', function() {
        document.getElementById('confirmDialog').classList.remove('active');
    });
    
    document.getElementById('confirmYes').addEventListener('click', function() {
        document.getElementById('confirmDialog').classList.remove('active');
        if (G.confirmCallback) G.confirmCallback();
    });
    
    var overlays = document.querySelectorAll('.modal-overlay');
    for (var o = 0; o < overlays.length; o++) {
        overlays[o].addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
    }
}

// ==================== NOTIFICATIONS (RTDB + Ban + Popup) ====================
function loadNotifications() {
    try { G.notifications = JSON.parse(localStorage.getItem('gymawy_notifications') || '[]'); } 
    catch (e) { G.notifications = []; }
    
    if (G.currentUser && G.currentUser.username) {
        var username = G.currentUser.username;
        
        var fn1 = function(snap) {
            var data = snap.val();
            if (!data) return;
            
            if (data.type === 'ban') {
                showBanPopup(data.message || 'تم حظر حسابك من قبل الإدارة');
                return;
            }
            
            if (data.type === 'popup') {
                showPopup(data.title || 'إشعار', data.message || '');
            }
            
            if (data.title && data.message) {
                addRTDBNotification(snap.key, data);
            }
        };
        
        try {
            rtdb.ref('notifications/' + username).on('child_added', fn1);
            G.rtdbListeners.push({ ref: rtdb.ref('notifications/' + username), fn: fn1 });
        } catch(e) {
            console.log('⚠️ RTDB notifications path error:', e);
        }
        
        var fn2 = function(snap) {
            var data = snap.val();
            if (data && data.title && data.message) {
                addRTDBNotification(snap.key, data);
            }
        };
        
        try {
            rtdb.ref('users/' + username + '/notifications').on('child_added', fn2);
            G.rtdbListeners.push({ ref: rtdb.ref('users/' + username + '/notifications'), fn: fn2 });
        } catch(e) {
            console.log('⚠️ RTDB users path error:', e);
        }
    }
    
    updateBadges();
}

function showBanPopup(message) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.9);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s ease;';
    overlay.innerHTML = '<div style="background:white;border-radius:24px;padding:32px 24px;text-align:center;max-width:360px;width:100%;box-shadow:0 20px 60px rgba(0,0,0,0.3);">' +
        '<div style="width:70px;height:70px;border-radius:50%;background:#FFE0E0;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">' +
        '<i class="fas fa-ban" style="font-size:32px;color:#FF6B6B;"></i></div>' +
        '<h2 style="margin-bottom:8px;color:#2D3436;">🚫 تم حظر حسابك</h2>' +
        '<p style="color:#636E72;margin-bottom:24px;font-size:14px;line-height:1.6;">' + (message || 'تم حظر حسابك من قبل الإدارة. للمراجعة، يرجى التواصل مع خدمة العملاء.') + '</p>' +
        '<button onclick="forceLogout()" style="background:#6C5CE7;color:white;border:none;padding:14px 32px;border-radius:50px;font-weight:700;font-size:14px;cursor:pointer;width:100%;font-family:Cairo;">حسناً</button></div>';
    document.body.appendChild(overlay);
}

function showPopup(title, message) {
    var popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99998;animation:slideDown 0.4s ease;max-width:90%;';
    popup.innerHTML = '<div style="background:white;border-radius:16px;padding:20px 24px;box-shadow:0 10px 40px rgba(0,0,0,0.3);text-align:center;border:2px solid #6C5CE7;min-width:280px;">' +
        '<strong style="color:#6C5CE7;font-size:15px;">' + (title || 'إشعار') + '</strong>' +
        '<p style="margin:8px 0;font-size:13px;color:#2D3436;">' + (message || '') + '</p>' +
        '<button onclick="this.parentElement.parentElement.remove()" style="background:#6C5CE7;color:white;border:none;padding:8px 24px;border-radius:50px;font-weight:700;font-size:12px;cursor:pointer;font-family:Cairo;">موافق</button></div>';
    document.body.appendChild(popup);
    
    setTimeout(function() {
        if (popup.parentElement) popup.remove();
    }, 8000);
}

function forceLogout() {
    localStorage.removeItem('gymawy_user');
    localStorage.removeItem('gymawy_keep_logged_in');
    location.reload();
}

function addRTDBNotification(key, data) {
    var notif = {
        id: key || ('rtdb_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5)),
        title: data.title || 'إشعار',
        message: data.message || '',
        type: data.type || 'info',
        read: data.read || false,
        createdAt: data.createdAt || new Date().toISOString(),
        from: data.from || 'Gymawy'
    };
    
    var exists = false;
    for (var i = 0; i < G.notifications.length; i++) {
        if (G.notifications[i].id === notif.id) { exists = true; break; }
    }
    
    if (!exists) {
        G.notifications.unshift(notif);
        if (G.notifications.length > 100) G.notifications = G.notifications.slice(0, 100);
        saveNotifications();
        updateBadges();
    }
}

function loadNotificationsPage() {
    var c = document.getElementById('notificationsContent');
    if (!c) return;
    
    if (!G.notifications.length) {
        c.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><h4>لا توجد إشعارات</h4><p style="font-size:12px;">ستظهر هنا جميع الإشعارات الجديدة</p></div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < G.notifications.length; i++) {
        var n = G.notifications[i];
        html += '<div class="notification-item ' + (n.read ? '' : 'unread') + '" onclick="markNotifRead(\'' + n.id + '\')">' +
            '<div style="display:flex;justify-content:space-between;align-items:center;">' +
            '<strong>' + (n.read ? '' : '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:var(--primary);margin-left:6px;"></span>') + n.title + '</strong>' +
            '<small style="color:var(--gray-light);font-size:10px;">' + timeAgo(n.createdAt) + '</small></div>' +
            '<p style="font-size:12px;color:var(--text-secondary);margin:6px 0 0;">' + n.message + '</p></div>';
    }
    
    html += '<div style="display:flex;gap:8px;margin-top:16px;">' +
        '<button class="btn btn-outline btn-sm" onclick="markAllNotifRead()"><i class="fas fa-check-double"></i> تعليم الكل مقروء</button>' +
        '<button class="btn btn-danger btn-sm" onclick="clearNotifications()"><i class="fas fa-trash"></i> مسح الكل</button></div>';
    c.innerHTML = html;
}

function saveNotifications() {
    localStorage.setItem('gymawy_notifications', JSON.stringify(G.notifications));
    updateBadges();
}

function updateBadges() {
    var unread = 0;
    for (var i = 0; i < G.notifications.length; i++) {
        if (!G.notifications[i].read) unread++;
    }
    var badges = ['notifBadge', 'navNotifBadge'];
    for (var j = 0; j < badges.length; j++) {
        var b = document.getElementById(badges[j]);
        if (b) {
            b.textContent = unread > 99 ? '99+' : unread;
            if (unread > 0) b.classList.add('show');
            else b.classList.remove('show');
        }
    }
}

function markNotifRead(id) {
    for (var i = 0; i < G.notifications.length; i++) {
        if (G.notifications[i].id === id) {
            G.notifications[i].read = true;
            break;
        }
    }
    saveNotifications();
    loadNotificationsPage();
}

function markAllNotifRead() {
    for (var i = 0; i < G.notifications.length; i++) G.notifications[i].read = true;
    saveNotifications();
    loadNotificationsPage();
    T('✅ تم تعليم الكل كمقروء', 'success');
}

function clearNotifications() {
    G.notifications = [];
    saveNotifications();
    loadNotificationsPage();
    T('🗑️ تم مسح جميع الإشعارات', 'success');
}

// ==================== FORUM ====================
async function loadForumPage() {
    var c = document.getElementById('forumContent');
    if (!c) return;
    
    if (!G.currentUser) {
        c.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h4>المنتدى مقفول</h4><p>يجب تسجيل الدخول أولاً للوصول للمنتدى</p></div>';
        return;
    }
    
    c.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';
    
    try {
        var phone = G.currentUser.phone || '';
        var memberSnap = await db.collection('members').where('phone', '==', phone).get();
        var foundMember = null;
        memberSnap.forEach(function(doc) {
            var d = doc.data();
            if (d.active && !d.leftByUser && !isExpired(d.due)) {
                foundMember = { id: doc.id, gymId: d.gymId, gymName: d.gymName };
            }
        });
        
        if (!foundMember) {
            c.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h4>المنتدى مقفول</h4><p>يجب أن تكون مشتركاً في جيم للوصول للمنتدى</p></div>';
            return;
        }
        
        var fs = await db.collection('forum_messages').where('gymId', '==', foundMember.gymId).get();
        var msgs = [];
        fs.forEach(function(doc) { msgs.push(doc.data()); });
        msgs.sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
        
        var html = '<h3 style="margin-bottom:16px;"><i class="fas fa-comments"></i> ' + (foundMember.gymName || 'المنتدى') + '</h3>';
        html += '<div class="chat-messages">';
        if (msgs.length) {
            for (var i = 0; i < msgs.length; i++) {
                html += '<div class="chat-bubble incoming"><strong style="color:var(--primary);font-size:11px;">📢 ' + (msgs[i].senderName || 'الكوتش') + '</strong><p style="margin:5px 0;">' + msgs[i].message + '</p><div class="chat-time">' + timeAgo(msgs[i].timestamp) + '</div></div>';
            }
        } else {
            html += '<div class="empty-state"><i class="fas fa-comments"></i><h4>لا رسائل بعد</h4></div>';
        }
        html += '</div>';
        c.innerHTML = html;
    } catch (e) {
        console.error('Forum error:', e);
        c.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>حدث خطأ في تحميل المنتدى</h4><p>تأكد من اتصالك بالإنترنت</p></div>';
    }
}

// ==================== GYMS ====================
async function loadGyms() {
    var c = document.getElementById('gymsList');
    if (!c) return;
    c.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';
    
    try {
        var snap = await db.collection('gyms').get();
        G.allGyms = [];
        snap.forEach(function(doc) {
            var d = doc.data();
            if (d.active !== false && d.suspended !== true) {
                G.allGyms.push({
                    id: doc.id, name: d.name, images: d.images, verified: d.verified,
                    gender: d.gender, governorate: d.governorate, city: d.city,
                    location: d.location, monthlyPrice: d.monthlyPrice || 0,
                    yearlyPrice: d.yearlyPrice, sessionPrice: d.sessionPrice || 0,
                    openTime: d.openTime, closeTime: d.closeTime,
                    phones: d.phones, mapLink: d.mapLink,
                    avgRating: d.avgRating || 0, ratingCount: d.ratingCount || 0,
                    gymType: d.gymType || 'online', is24h: d.is24h,
                    genderShifts: d.genderShifts, offerPrice: d.offerPrice
                });
            }
        });
        
        if (!G.allGyms.length) {
            c.innerHTML = '<div class="empty-state"><i class="fas fa-dumbbell"></i><h4>لا توجد جيمات متاحة حالياً</h4><p style="font-size:12px;">ستظهر الجيمات هنا فور إضافتها</p></div>';
            return;
        }
        
        filterAndDisplayGyms();
        displayRecentGrid();
    } catch (e) {
        console.error('Load gyms error:', e);
        c.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>خطأ في تحميل الجيمات</h4><p>تأكد من اتصالك بالإنترنت وحاول مرة أخرى</p></div>';
    }
}

function filterAndDisplayGyms() {
    var f = G.currentFilter;
    var fl = G.allGyms.slice();
    
    if (G.quickFilter === 'verified') fl = fl.filter(function(g) { return g.verified; });
    else if (G.quickFilter === 'mixed') fl = fl.filter(function(g) { return g.gender === 'mixed'; });
    else if (G.quickFilter === 'men') fl = fl.filter(function(g) { return g.gender === 'men'; });
    else if (G.quickFilter === 'women') fl = fl.filter(function(g) { return g.gender === 'women'; });
    
    if (f.gender) fl = fl.filter(function(g) { return g.gender === f.gender; });
    if (f.governorate) fl = fl.filter(function(g) { return g.governorate === f.governorate; });
    if (f.city) fl = fl.filter(function(g) { return g.city === f.city; });
    if (f.minRating > 0) fl = fl.filter(function(g) { return g.avgRating >= f.minRating; });
    if (f.searchQuery) {
        var q = f.searchQuery.toLowerCase();
        fl = fl.filter(function(g) {
            return (g.name || '').toLowerCase().indexOf(q) > -1 ||
                   (g.location || '').toLowerCase().indexOf(q) > -1 ||
                   (g.governorate || '').toLowerCase().indexOf(q) > -1 ||
                   (g.city || '').toLowerCase().indexOf(q) > -1;
        });
    }
    
    fl.sort(function(a, b) {
        if (a.verified && !b.verified) return -1;
        if (!a.verified && b.verified) return 1;
        return (b.avgRating || 0) - (a.avgRating || 0);
    });
    
    displayGyms(fl);
}

function displayGyms(gyms) {
    var c = document.getElementById('gymsList');
    if (!gyms.length) {
        c.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h4>لا جيمات متطابقة مع البحث</h4><p style="font-size:12px;">جرب تغيير معايير البحث أو الفلترة</p></div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < gyms.length; i++) {
        var g = gyms[i];
        var stars = '';
        for (var s = 1; s <= 5; s++) {
            stars += s <= Math.round(g.avgRating) ? '<i class="fas fa-star" style="color:#FFD700;font-size:11px;"></i>' : '<i class="far fa-star" style="color:#DDD;font-size:11px;"></i>';
        }
        
        var isOnline = g.gymType !== 'offline';
        var shiftHtml = '';
        if (g.is24h) {
            shiftHtml = '<span class="shift-tag"><i class="fas fa-infinity"></i> 24 ساعة</span>';
        } else if (g.genderShifts) {
            if (g.genderShifts.mixed) shiftHtml += '<span class="shift-tag"><i class="fas fa-venus-mars"></i> مختلط: ' + g.genderShifts.mixed + '</span>';
            if (g.genderShifts.men) shiftHtml += '<span class="shift-tag"><i class="fas fa-male"></i> رجال: ' + g.genderShifts.men + '</span>';
            if (g.genderShifts.women) shiftHtml += '<span class="shift-tag"><i class="fas fa-female"></i> سيدات: ' + g.genderShifts.women + '</span>';
        } else if (g.openTime || g.closeTime) {
            shiftHtml = '<span class="shift-tag"><i class="fas fa-clock"></i> ' + (g.openTime || '--') + ' - ' + (g.closeTime || '--') + '</span>';
        }
        
        html += '<div class="gym-card" onclick="showGymDetail(\'' + g.id + '\')">' +
            '<div class="gym-card-header">' +
            (g.images && g.images.length ? '<img src="' + g.images[0] + '" alt="' + g.name + '" loading="lazy">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea,#764ba2);"><i class="fas fa-dumbbell" style="font-size:60px;color:rgba(255,255,255,0.25);"></i></div>') +
            (g.verified ? '<span class="badge badge-verified"><i class="fas fa-check-circle"></i> موثق</span>' : '') +
            (g.gender ? '<span class="badge badge-gender"><i class="fas fa-' + (g.gender === 'men' ? 'male' : g.gender === 'women' ? 'female' : 'venus-mars') + '"></i> ' + (g.gender === 'men' ? 'رجال' : g.gender === 'women' ? 'سيدات' : 'مختلط') + '</span>' : '') +
            '<button class="btn-favorite ' + (isFavorite(g.id) ? 'active' : '') + '" onclick="event.stopPropagation();toggleFavorite(\'' + g.id + '\');this.classList.toggle(\'active\');"><i class="fas fa-heart"></i></button>' +
            '<button class="btn-share-card" onclick="event.stopPropagation();shareGym(\'' + g.id + '\',event);"><i class="fas fa-share-alt"></i></button>' +
            '<button class="badge badge-qr" onclick="event.stopPropagation();showQRCode(\'' + g.id + '\',\'' + (g.name || '').replace(/'/g, "\\'") + '\',event);"><i class="fas fa-qrcode"></i></button>' +
            '<div class="gym-card-overlay"><i class="fas fa-map-marker-alt"></i> ' + (g.governorate || '') + (g.city ? ' • ' + g.city : '') + '</div></div>' +
            '<div class="gym-card-body">' +
            '<div class="gym-card-title"><span>' + g.name + '</span>' + (g.avgRating > 0 ? '<span style="font-size:12px;color:#FFD700;">' + stars + ' ' + g.avgRating + '</span>' : '<span style="font-size:10px;color:var(--text-secondary);">جديد</span>') + '</div>' +
            '<div class="gym-card-location"><i class="fas fa-location-dot"></i> ' + (g.location || g.governorate + ' - ' + g.city || 'غير محدد') + '</div>' +
            (g.gymType === 'offline' ? '<div style="margin:6px 0;font-size:11px;color:var(--warning);"><i class="fas fa-map-marker-alt"></i> جيم أوفلاين - زيارة فقط</div>' : '') +
            '<div style="margin:8px 0;">' + shiftHtml + '</div>' +
            '<div class="gym-card-prices">' +
            '<div class="price-tag"><div class="price-value">' + (g.monthlyPrice || 0) + ' ج.م</div><div class="price-label">شهري</div></div>' +
            (g.yearlyPrice ? '<div class="price-tag"><div class="price-value">' + g.yearlyPrice + ' ج.م</div><div class="price-label">سنوي</div></div>' : '') +
            '<div class="price-tag"><div class="price-value">' + (g.sessionPrice || 0) + ' ج.م</div><div class="price-label">حصة</div></div></div>' +
            '<div style="padding:8px 16px;font-size:11px;border-top:1px solid var(--border);color:' + (g.verified ? 'var(--success)' : 'var(--text-secondary)') + ';">' +
            '<i class="fas fa-' + (g.verified ? 'check-circle' : 'info-circle') + '"></i> ' + (g.verified ? 'جيم موثق من جيماوي' : 'جيم غير موثق') + '</div></div>' +
            '<div class="gym-card-footer">' +
            (isOnline ? '<button class="btn-apply" onclick="event.stopPropagation();applyToGym(\'' + g.id + '\')"><i class="fas fa-hand-paper"></i> تقديم طلب اشتراك</button>' : '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();showGymDetail(\'' + g.id + '\')"><i class="fas fa-info-circle"></i> عرض التفاصيل</button>') +
            '</div></div>';
    }
    c.innerHTML = html;
}

function showGymDetail(gid) {
    var gym = null;
    for (var i = 0; i < G.allGyms.length; i++) { if (G.allGyms[i].id === gid) { gym = G.allGyms[i]; break; } }
    if (!gym) return;
    
    G.selectedGym = gym;
    addToRecentlyViewed(gym);
    
    var isOnline = gym.gymType !== 'offline';
    document.getElementById('modalTitle').textContent = gym.name;
    
    var html = '';
    if (gym.images && gym.images.length) {
        html += '<div class="images-slider">';
        for (var j = 0; j < gym.images.length; j++) html += '<img src="' + gym.images[j] + '" loading="lazy" alt="صورة الجيم">';
        html += '</div>';
    }
    
    if (gym.verified) html += '<div class="info-highlight" style="background:#FFF8E1;color:#F57F17;text-align:center;"><i class="fas fa-check-circle"></i> جيم موثق من جيماوي</div>';
    if (gym.gymType === 'offline') html += '<div class="info-highlight" style="background:var(--warning-light);color:#856404;text-align:center;"><i class="fas fa-map-marker-alt"></i> جيم أوفلاين - لا يوجد تقديم طلبات</div>';
    
    html += '<div class="info-section"><h4><i class="fas fa-clock"></i> المواعيد</h4>';
    if (gym.is24h) html += '<div class="info-highlight"><i class="fas fa-infinity"></i> مفتوح 24 ساعة طوال أيام الأسبوع</div>';
    else if (gym.genderShifts) {
        if (gym.genderShifts.mixed) html += '<div class="info-row"><span><i class="fas fa-venus-mars"></i> مختلط</span><span>' + gym.genderShifts.mixed + '</span></div>';
        if (gym.genderShifts.men) html += '<div class="info-row"><span><i class="fas fa-male"></i> رجال</span><span>' + gym.genderShifts.men + '</span></div>';
        if (gym.genderShifts.women) html += '<div class="info-row"><span><i class="fas fa-female"></i> سيدات</span><span>' + gym.genderShifts.women + '</span></div>';
    } else {
        html += '<div class="info-row"><span>يفتح</span><span>' + (gym.openTime || '--') + '</span></div>';
        html += '<div class="info-row"><span>يقفل</span><span>' + (gym.closeTime || '--') + '</span></div>';
    }
    html += '</div>';
    
    html += '<div class="info-section"><h4><i class="fas fa-tag"></i> الأسعار</h4>' +
        '<div class="info-row"><span>اشتراك شهري</span><span>' + (gym.monthlyPrice || 0) + ' ج.م</span></div>' +
        (gym.yearlyPrice ? '<div class="info-row"><span>اشتراك سنوي</span><span>' + gym.yearlyPrice + ' ج.م</span></div>' : '') +
        '<div class="info-row"><span>الحصة الواحدة</span><span>' + (gym.sessionPrice || 0) + ' ج.م</span></div>' +
        (gym.offerPrice ? '<div class="info-row" style="color:#F57F17;"><span>عرض خاص</span><span>' + gym.offerPrice + ' ج.م</span></div>' : '') +
        '</div>';
    
    html += '<div class="info-section"><h4><i class="fas fa-star"></i> التقييم</h4><div class="info-row"><span>متوسط التقييم</span><span>' + (gym.avgRating || 0) + ' ⭐ (' + (gym.ratingCount || 0) + ' تقييم)</span></div></div>';
    
    html += '<div class="info-section"><h4><i class="fas fa-info-circle"></i> معلومات</h4>' +
        '<div class="info-row"><span>النوع</span><span>' + (gym.gender === 'men' ? 'رجال' : gym.gender === 'women' ? 'سيدات' : 'مختلط') + '</span></div>' +
        '<div class="info-row"><span>المحافظة</span><span>' + (gym.governorate || '--') + '</span></div>' +
        '<div class="info-row"><span>المدينة</span><span>' + (gym.city || '--') + '</span></div></div>';
    
    if (gym.phones && gym.phones.length) {
        html += '<div class="info-section"><h4><i class="fas fa-phone"></i> تواصل</h4>';
        for (var k = 0; k < gym.phones.length; k++) {
            html += '<a href="tel:' + gym.phones[k] + '" style="display:inline-block;margin:4px;padding:10px 16px;background:var(--primary-bg);border-radius:50px;color:var(--primary);text-decoration:none;font-weight:600;font-size:13px;"><i class="fas fa-phone"></i> ' + gym.phones[k] + '</a>';
        }
        html += '</div>';
    }
    
    if (gym.mapLink) {
        html += '<div class="info-section"><h4><i class="fas fa-map-marker-alt"></i> موقع</h4><a href="' + gym.mapLink + '" target="_blank" style="display:flex;align-items:center;gap:8px;padding:14px;background:var(--primary-bg);border-radius:12px;color:var(--primary);text-decoration:none;font-weight:600;"><i class="fas fa-map-marked-alt"></i> فتح في Google Maps</a></div>';
    }
    
    // Rating
    var canRate = false;
    if (gym.gymType === 'offline') {
        canRate = !!G.currentUser;
    } else {
        if (G.currentUser) {
            var phone = G.currentUser.phone || '';
            try {
                var memberSnap = await db.collection('members').where('phone', '==', phone).where('gymId', '==', gym.id).get();
                memberSnap.forEach(function(doc) { if (doc.data().active && !doc.data().leftByUser) canRate = true; });
            } catch(e) {}
        }
    }
    
    html += '<div class="info-section" style="text-align:center;"><h4>تقييمك للجيم</h4><div class="stars-input">';
    for (var s = 1; s <= 5; s++) html += '<i class="far fa-star" id="star' + s + '" onclick="setRating(' + s + ')"></i>';
    html += '</div>';
    if (canRate) {
        html += '<button class="btn btn-primary btn-sm" onclick="submitRating()" style="margin-top:10px;"><i class="fas fa-star"></i> تقييم</button>';
    } else if (G.currentUser && gym.gymType !== 'offline') {
        html += '<p style="font-size:11px;color:var(--danger);margin-top:6px;">🔒 فقط المشتركين في الجيم يمكنهم التقييم</p>';
    } else if (!G.currentUser) {
        html += '<p style="font-size:11px;color:var(--text-secondary);margin-top:6px;">سجل دخولك لتتمكن من التقييم</p>';
    }
    html += '</div>';
    
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalFooter').innerHTML = 
        (isOnline ? '<button class="btn btn-primary" onclick="applyToGym(\'' + gym.id + '\')"><i class="fas fa-hand-paper"></i> تقديم طلب اشتراك</button>' : '') +
        '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    G._rating = 0;
    openModal('gymModal');
}

function setRating(r) {
    G._rating = r;
    for (var i = 1; i <= 5; i++) {
        var s = document.getElementById('star' + i);
        if (s) s.className = i <= r ? 'fas fa-star active' : 'far fa-star';
    }
}

async function submitRating() {
    if (!G._rating) { T('⚠️ اختر تقييم من 1 إلى 5 نجوم', 'error'); return; }
    if (!G.selectedGym || !G.currentUser) return;
    
    try {
        await db.collection('ratings').add({
            gymId: G.selectedGym.id,
            userId: G.currentUser.username,
            userName: G.currentUser.fullName,
            rating: G._rating,
            createdAt: new Date().toISOString()
        });
        await updateGymRating(G.selectedGym.id);
        T('⭐ شكراً لتقييمك!', 'success');
        closeModal('gymModal');
        loadGyms();
    } catch(e) {
        T('❌ حدث خطأ في إرسال التقييم', 'error');
    }
}

async function updateGymRating(gymId) {
    var adminSnap = await db.collection('ratings').where('gymId', '==', gymId).where('userId', '==', 'admin').get();
    var adminRating = 0;
    adminSnap.forEach(function(doc) { adminRating = doc.data().rating; });
    
    var userSnap = await db.collection('ratings').where('gymId', '==', gymId).where('userId', '!=', 'admin').get();
    var totalRating = adminRating;
    var count = adminRating > 0 ? 1 : 0;
    userSnap.forEach(function(doc) { totalRating += doc.data().rating; count++; });
    
    var avgRating = count > 0 ? Math.round((totalRating / count) * 10) / 10 : 0;
    await db.collection('gyms').doc(gymId).update({ avgRating: avgRating, ratingCount: count });
}

async function applyToGym(gid) {
    if (!G.currentUser) { T('⚠️ يجب تسجيل الدخول أولاً', 'warning'); return; }
    
    var gym = null;
    for (var i = 0; i < G.allGyms.length; i++) { if (G.allGyms[i].id === gid) { gym = G.allGyms[i]; break; } }
    if (!gym || gym.gymType === 'offline') { T('⚠️ هذا الجيم لا يقبل طلبات الاشتراك', 'error'); return; }
    
    G.selectedGym = gym;
    G._subType = 'monthly';
    
    document.getElementById('modalTitle').textContent = 'تقديم طلب اشتراك';
    document.getElementById('modalBody').innerHTML = 
        '<div style="text-align:center;"><i class="fas fa-dumbbell" style="font-size:50px;color:var(--primary);"></i><h3>' + gym.name + '</h3></div>' +
        '<div class="gender-radio-group">' +
        '<div class="gender-radio selected" id="optMonthly" onclick="selSub(\'monthly\')"><i class="fas fa-calendar"></i> شهري<span style="display:block;font-size:11px;">' + (gym.monthlyPrice || 0) + ' ج.م</span></div>' +
        (gym.yearlyPrice ? '<div class="gender-radio" id="optYearly" onclick="selSub(\'yearly\')"><i class="fas fa-calendar-alt"></i> سنوي<span style="display:block;font-size:11px;">' + gym.yearlyPrice + ' ج.م</span></div>' : '') +
        '</div>' +
        '<div class="info-highlight" style="margin-top:14px;"><i class="fas fa-info-circle"></i> توجه للجيم للدفع مباشرة</div>';
    document.getElementById('modalFooter').innerHTML = 
        '<button class="btn btn-primary" onclick="confirmApply()"><i class="fas fa-check"></i> تأكيد الطلب</button>' +
        '<button class="btn btn-outline" onclick="showGymDetail(\'' + gid + '\')">رجوع</button>';
    openModal('gymModal');
}

function selSub(t) {
    G._subType = t;
    var m = document.getElementById('optMonthly');
    var y = document.getElementById('optYearly');
    if (m) m.classList.toggle('selected', t === 'monthly');
    if (y) y.classList.toggle('selected', t === 'yearly');
}

async function confirmApply() {
    var gym = G.selectedGym;
    if (!gym || !G.currentUser) return;
    
    var amount = G._subType === 'yearly' ? (gym.yearlyPrice || gym.monthlyPrice || 0) : (gym.monthlyPrice || 0);
    var platformFee = Math.round(amount * 0.01);
    
    try {
        await db.collection('requests').add({
            gymId: gym.id, gymName: gym.name,
            name: G.currentUser.fullName,
            phone: G.currentUser.phone || '',
            email: G.currentUser.email || '',
            username: G.currentUser.username,
            subType: G._subType,
            amount: amount,
            platformFee: platformFee,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        if (gym.id) {
            rtdb.ref('newRequests/' + gym.id).set({
                timestamp: new Date().toISOString(),
                from: G.currentUser.fullName
            });
        }
        
        closeModal('gymModal');
        T('✅ تم إرسال الطلب بنجاح - توجه للجيم للدفع', 'success');
    } catch(e) {
        T('❌ حدث خطأ في إرسال الطلب - حاول مرة أخرى', 'error');
    }
}

// ==================== FAVORITES ====================
function loadFavorites() { try { G.favorites = JSON.parse(localStorage.getItem('gymawy_favorites') || '[]'); } catch (e) { G.favorites = []; } }
function saveFavorites() { localStorage.setItem('gymawy_favorites', JSON.stringify(G.favorites)); }
function isFavorite(gid) { return G.favorites.indexOf(gid) > -1; }
function toggleFavorite(gid) {
    var idx = G.favorites.indexOf(gid);
    if (idx > -1) {
        G.favorites.splice(idx, 1);
        T('💔 تمت إزالة الجيم من المفضلة', 'info');
    } else {
        G.favorites.push(gid);
        T('❤️ تمت إضافة الجيم للمفضلة', 'success');
    }
    saveFavorites();
}

function showFavorites() {
    var fg = [];
    for (var i = 0; i < G.allGyms.length; i++) { if (G.favorites.indexOf(G.allGyms[i].id) > -1) fg.push(G.allGyms[i]); }
    
    document.getElementById('modalTitle').textContent = '❤️ المفضلة';
    if (!fg.length) {
        document.getElementById('modalBody').innerHTML = '<div class="empty-state"><i class="fas fa-heart-broken"></i><h4>لا مفضلات</h4><p>اضغط على القلب ♡ لإضافة جيم للمفضلة</p></div>';
        document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    } else {
        document.getElementById('modalBody').innerHTML = '<div class="gym-grid" id="favGymsList"></div>';
        document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
        displayGymsInContainer('favGymsList', fg);
    }
    openModal('gymModal');
}

function displayGymsInContainer(cid, gyms) {
    var c = document.getElementById(cid);
    if (!c) return;
    var html = '';
    for (var i = 0; i < gyms.length; i++) {
        var g = gyms[i];
        html += '<div class="gym-card" onclick="showGymDetail(\'' + g.id + '\')" style="margin-bottom:14px;">' +
            '<div class="gym-card-header">' + (g.images && g.images.length ? '<img src="' + g.images[0] + '">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea,#764ba2);"><i class="fas fa-dumbbell" style="font-size:50px;color:rgba(255,255,255,0.25);"></i></div>') +
            '<div class="gym-card-overlay">' + (g.governorate || '') + '</div></div>' +
            '<div class="gym-card-body"><div class="gym-card-title">' + g.name + '</div><div class="gym-card-prices"><div class="price-tag"><div class="price-value">' + (g.monthlyPrice || 0) + '</div><div class="price-label">ج.م/شهر</div></div></div></div></div>';
    }
    c.innerHTML = html;
}

// ==================== RECENTLY VIEWED ====================
function loadRecentlyViewed() { try { G.recentlyViewed = JSON.parse(localStorage.getItem('gymawy_recent') || '[]'); } catch (e) { G.recentlyViewed = []; } }
function saveRecentlyViewed() { localStorage.setItem('gymawy_recent', JSON.stringify(G.recentlyViewed)); }
function addToRecentlyViewed(gym) {
    G.recentlyViewed = G.recentlyViewed.filter(function(g) { return g.id !== gym.id; });
    G.recentlyViewed.unshift({ id: gym.id, name: gym.name, image: gym.images ? gym.images[0] : null, monthlyPrice: gym.monthlyPrice, verified: gym.verified });
    if (G.recentlyViewed.length > 6) G.recentlyViewed = G.recentlyViewed.slice(0, 6);
    saveRecentlyViewed();
    displayRecentGrid();
}

function displayRecentGrid() {
    var t = document.getElementById('recentTitle');
    var g = document.getElementById('recentGrid');
    if (!G.recentlyViewed.length) { if (t) t.style.display = 'none'; if (g) g.innerHTML = ''; return; }
    if (t) t.style.display = 'flex';
    var html = '';
    for (var i = 0; i < G.recentlyViewed.length; i++) {
        var x = G.recentlyViewed[i];
        html += '<div class="recent-card" onclick="showGymDetail(\'' + x.id + '\')">' +
            (x.image ? '<img src="' + x.image + '" loading="lazy">' : '<div style="height:85px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:22px;"><i class="fas fa-dumbbell"></i></div>') +
            '<div class="info"><div class="name">' + x.name + '</div><div class="price">' + (x.monthlyPrice || 0) + ' ج.م</div></div></div>';
    }
    if (g) g.innerHTML = html;
}

// ==================== FILTER ====================
function showFilterModal() {
    var govOptions = '';
    var govs = Object.keys(EGYPT_LOCATIONS);
    for (var i = 0; i < govs.length; i++) govOptions += '<option value="' + govs[i] + '">' + govs[i] + '</option>';
    
    document.getElementById('filterBody').innerHTML = 
        '<div class="form-group"><label>المحافظة</label><select id="fg" class="form-control" onchange="updateCities()"><option value="">كل المحافظات</option>' + govOptions + '</select></div>' +
        '<div class="form-group"><label>المدينة</label><select id="fc" class="form-control"><option value="">كل المدن</option></select></div>' +
        '<div class="form-group"><label>النوع</label><select id="fgn" class="form-control"><option value="">الكل</option><option value="mixed">مختلط</option><option value="men">رجال</option><option value="women">سيدات</option></select></div>' +
        '<div class="form-group"><label>التقييم</label><select id="frt" class="form-control"><option value="0">الكل</option><option value="3">3 نجوم فأكثر</option><option value="4">4 نجوم فأكثر</option></select></div>';
    document.getElementById('filterFooter').innerHTML = 
        '<button class="btn btn-primary" onclick="applyFilters()"><i class="fas fa-check"></i> تطبيق الفلتر</button>' +
        '<button class="btn btn-outline" onclick="closeModal(\'filterModal\')">إلغاء</button>';
    openModal('filterModal');
}

function updateCities() {
    var g = document.getElementById('fg')?.value;
    var c = document.getElementById('fc');
    if (c) {
        var cities = EGYPT_LOCATIONS[g] || [];
        var html = '<option value="">كل المدن</option>';
        for (var i = 0; i < cities.length; i++) html += '<option value="' + cities[i] + '">' + cities[i] + '</option>';
        c.innerHTML = html;
    }
}

function applyFilters() {
    G.currentFilter.governorate = document.getElementById('fg')?.value || '';
    G.currentFilter.city = document.getElementById('fc')?.value || '';
    G.currentFilter.gender = document.getElementById('fgn')?.value || '';
    G.currentFilter.minRating = parseFloat(document.getElementById('frt')?.value || 0);
    closeModal('filterModal');
    filterAndDisplayGyms();
}

// ==================== PROFILE ====================
async function loadProfile() {
    var c = document.getElementById('profileContent');
    if (!c) return;
    if (!G.currentUser) { c.innerHTML = '<div class="empty-state"><i class="fas fa-user"></i><h4>سجل دخولك أولاً</h4></div>'; return; }
    
    try {
        var phone = G.currentUser.phone || '';
        var allMemberSnap = await db.collection('members').where('phone', '==', phone).get();
        var activeMemberships = [];
        var pastMemberships = [];
        
        allMemberSnap.forEach(function(doc) {
            var d = doc.data();
            if (d.active && !d.leftByUser && !isExpired(d.due)) {
                activeMemberships.push(d);
            } else {
                pastMemberships.push(d);
            }
        });
        
        var lastChange = localStorage.getItem('gymawy_username_last_change');
        var canChange = true;
        var daysUntil = 0;
        if (lastChange) {
            daysUntil = 7 - Math.floor((new Date() - new Date(lastChange)) / 86400000);
            if (daysUntil > 0) canChange = false;
        }
        
        var html = '<div class="profile-card"><div class="profile-avatar"><i class="fas fa-user"></i></div>' +
            '<h2>' + G.currentUser.fullName + '</h2><p>@' + G.currentUser.username + '</p>' +
            '<p><i class="fas fa-phone"></i> ' + (G.currentUser.phone || '') + '</p>' +
            '<p><i class="fas fa-envelope"></i> ' + (G.currentUser.email || '') + ' <span style="color:var(--success);">✅ مفعل</span></p>' +
            '<div class="btn-group" style="margin-top:14px;">' +
            '<button class="btn btn-outline btn-sm" onclick="changeUsername()"><i class="fas fa-edit"></i> تغيير المستخدم</button>' +
            '<button class="btn btn-outline btn-sm" onclick="showEditAccount()"><i class="fas fa-user-cog"></i> تعديل الحساب</button>' +
            '<button class="btn btn-outline btn-sm" onclick="logout()" style="color:var(--danger);"><i class="fas fa-sign-out-alt"></i> خروج</button></div>' +
            (canChange ? '<p style="font-size:10px;color:var(--success);margin-top:10px;">✅ يمكنك تغيير اسم المستخدم</p>' : '<p style="font-size:10px;color:var(--danger);margin-top:10px;">⏳ تغيير اسم المستخدم متاح بعد ' + daysUntil + ' يوم</p>') +
            '</div>';
        
        if (activeMemberships.length) {
            html += '<h3 style="margin-bottom:10px;"><i class="fas fa-dumbbell"></i> اشتراكاتي الحالية</h3>';
            for (var i = 0; i < activeMemberships.length; i++) {
                var m = activeMemberships[i];
                html += '<div class="membership-card"><h4>' + m.gymName + '</h4><div class="info-box">' +
                    '<div class="info-row"><span>النوع</span><span>' + (m.type === 'monthly' ? 'شهري' : 'سنوي') + '</span></div>' +
                    '<div class="info-row"><span>البداية</span><span>' + formatDate(m.start) + '</span></div>' +
                    '<div class="info-row"><span>الاستحقاق</span><span>' + formatDate(m.due) + '</span></div>' +
                    '<div class="info-row"><span>متبقي</span><span>' + daysRemaining(m.due) + ' يوم</span></div>' +
                    '</div><span class="status-active">✅ نشط</span></div>';
            }
        }
        
        if (pastMemberships.length) {
            html += '<h3 style="margin-bottom:10px;"><i class="fas fa-history"></i> اشتراكات سابقة</h3>';
            for (var j = 0; j < pastMemberships.length; j++) {
                var pm = pastMemberships[j];
                html += '<div class="membership-card past"><h4>' + pm.gymName + '</h4><div class="info-box">' +
                    '<div class="info-row"><span>النوع</span><span>' + (pm.type === 'monthly' ? 'شهري' : 'سنوي') + '</span></div>' +
                    '<div class="info-row"><span>انتهى</span><span>' + formatDate(pm.due) + '</span></div>' +
                    '</div><span class="status-expired">❌ منتهي</span></div>';
            }
        }
        
        c.innerHTML = html;
    } catch(e) {
        c.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>خطأ في تحميل البيانات</h4></div>';
    }
}

// ==================== EDIT ACCOUNT ====================
function showEditAccount() {
    if (!G.currentUser) return;
    document.getElementById('modalTitle').textContent = 'تعديل بيانات الحساب';
    document.getElementById('modalBody').innerHTML = 
        '<div class="form-group"><label>رقم الهاتف</label><input type="tel" id="editPhone" class="form-control" value="' + (G.currentUser.phone || '') + '"></div>' +
        '<div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="editEmail" class="form-control" value="' + (G.currentUser.email || '') + '"></div>' +
        '<div class="form-group"><label>كلمة المرور الجديدة (اختياري)</label><input type="password" id="editNewPass" class="form-control" placeholder="6 أحرف على الأقل - اتركه فاضي لو مش عايز تغير"></div>' +
        '<div class="info-highlight" style="background:#FFF3CD;color:#856404;"><i class="fas fa-lock"></i> يجب إدخال كلمة المرور الحالية لتأكيد التعديلات</div>' +
        '<div class="form-group"><label>كلمة المرور الحالية *</label><input type="password" id="editCurrentPass" class="form-control" placeholder="********"></div>';
    document.getElementById('modalFooter').innerHTML = 
        '<button class="btn btn-primary" onclick="saveAccountChanges()"><i class="fas fa-save"></i> حفظ التعديلات</button>' +
        '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إلغاء</button>';
    openModal('gymModal');
}

async function saveAccountChanges() {
    var newPhone = document.getElementById('editPhone')?.value?.trim();
    var newEmail = document.getElementById('editEmail')?.value?.trim();
    var newPass = document.getElementById('editNewPass')?.value;
    var currentPass = document.getElementById('editCurrentPass')?.value;
    
    if (!currentPass) { T('❌ أدخل كلمة المرور الحالية لتأكيد التعديلات', 'error'); return; }
    if (!newPhone || newPhone.length < 10) { T('❌ رقم الهاتف غير صحيح - يجب أن يكون 11 رقم على الأقل', 'error'); return; }
    if (!newEmail || !newEmail.includes('@') || !newEmail.includes('.')) { T('❌ بريد إلكتروني صحيح مطلوب', 'error'); return; }
    
    try {
        var snap = await db.collection('users').doc(G.currentUser.username).get();
        if (!snap.exists) { T('❌ خطأ في تحميل بيانات الحساب', 'error'); return; }
        
        if (CryptoJS.SHA256(currentPass).toString() !== snap.data().passHash) {
            T('❌ كلمة المرور الحالية غير صحيحة', 'error');
            return;
        }
        
        // Check if email already used by another user
        if (newEmail !== G.currentUser.email) {
            var emailSnap = await db.collection('users').where('email', '==', newEmail).get();
            var emailUsed = false;
            emailSnap.forEach(function(doc) { if (doc.id !== G.currentUser.username) emailUsed = true; });
            if (emailUsed) { T('❌ البريد الإلكتروني "' + newEmail + '" مستخدم بالفعل', 'error'); return; }
        }
        
        // Check if phone already used by another user
        if (newPhone !== G.currentUser.phone) {
            var phoneSnap = await db.collection('users').where('phone', '==', newPhone).get();
            var phoneUsed = false;
            phoneSnap.forEach(function(doc) { if (doc.id !== G.currentUser.username) phoneUsed = true; });
            if (phoneUsed) { T('❌ رقم الهاتف "' + newPhone + '" مستخدم بالفعل', 'error'); return; }
        }
        
        // Update phone in members
        if (newPhone !== G.currentUser.phone) {
            var memberSnap = await db.collection('members').where('phone', '==', G.currentUser.phone).get();
            var batch = db.batch();
            memberSnap.forEach(function(doc) { batch.update(doc.ref, { phone: newPhone }); });
            await batch.commit();
        }
        
        var updateData = { phone: newPhone, email: newEmail };
        if (newPass && newPass.length >= 6) {
            updateData.passHash = CryptoJS.SHA256(newPass).toString();
        }
        
        await db.collection('users').doc(G.currentUser.username).update(updateData);
        G.currentUser.phone = newPhone;
        G.currentUser.email = newEmail;
        saveUserToStorage();
        
        closeModal('gymModal');
        loadProfile();
        T('✅ تم تحديث البيانات بنجاح', 'success');
    } catch(e) {
        T('❌ حدث خطأ في حفظ التعديلات', 'error');
    }
}

// ==================== CHANGE USERNAME ====================
async function changeUsername() {
    if (!G.currentUser) return;
    
    var lastChange = localStorage.getItem('gymawy_username_last_change');
    if (lastChange) {
        var daysSince = Math.floor((new Date() - new Date(lastChange)) / 86400000);
        if (daysSince < 7) {
            T('⏳ لا يمكن تغيير اسم المستخدم قبل ' + (7 - daysSince) + ' يوم', 'error');
            return;
        }
    }
    
    document.getElementById('modalTitle').textContent = 'تغيير اسم المستخدم';
    document.getElementById('modalBody').innerHTML = 
        '<div class="form-group"><label>اسم المستخدم الحالي</label><input type="text" class="form-control" value="@' + G.currentUser.username + '" disabled></div>' +
        '<div class="form-group"><label>اسم المستخدم الجديد (4-16 حرف إنجليزي)</label><input type="text" id="newUsername" class="form-control" style="text-transform:uppercase;" placeholder="USERNAME"></div>' +
        '<p style="font-size:11px;color:var(--text-secondary);">يمكنك تغيير اسم المستخدم مرة واحدة كل 7 أيام</p>';
    document.getElementById('modalFooter').innerHTML = 
        '<button class="btn btn-primary" onclick="saveNewUsername()"><i class="fas fa-check"></i> حفظ</button>' +
        '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إلغاء</button>';
    openModal('gymModal');
}

async function saveNewUsername() {
    var newUsername = document.getElementById('newUsername')?.value?.trim().toUpperCase();
    
    if (!newUsername || newUsername.length < 4) { T('❌ اسم المستخدم يجب أن يكون 4 أحرف على الأقل', 'error'); return; }
    if (newUsername.length > 16) { T('❌ اسم المستخدم يجب أن يكون 16 حرف كحد أقصى', 'error'); return; }
    if (newUsername === G.currentUser.username) { T('❌ نفس اسم المستخدم الحالي', 'error'); return; }
    if (!/^[A-Z0-9_]+$/.test(newUsername)) { T('❌ اسم المستخدم: أحرف إنجليزية، أرقام، و _ فقط', 'error'); return; }
    
    try {
        var snap = await db.collection('users').doc(newUsername).get();
        if (snap.exists) { T('❌ اسم المستخدم "' + newUsername + '" مستخدم بالفعل', 'error'); return; }
        
        var oldSnap = await db.collection('users').doc(G.currentUser.username).get();
        var userData = oldSnap.data();
        userData.username = newUsername;
        
        await db.collection('users').doc(newUsername).set(userData);
        await db.collection('users').doc(G.currentUser.username).delete();
        
        localStorage.setItem('gymawy_username_last_change', new Date().toISOString());
        G.currentUser.username = newUsername;
        saveUserToStorage();
        
        closeModal('gymModal');
        loadProfile();
        T('✅ تم تغيير اسم المستخدم بنجاح', 'success');
    } catch(e) {
        T('❌ حدث خطأ في تغيير اسم المستخدم', 'error');
    }
}

// ==================== SUPPORT ====================
function openSupportChat() {
    if (!G.currentUser) { T('⚠️ سجل دخولك أولاً', 'warning'); return; }
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-headset"></i> خدمة العملاء';
    document.getElementById('modalBody').innerHTML = 
        '<div style="text-align:center;margin-bottom:12px;"><i class="fas fa-headset" style="font-size:50px;color:var(--primary);"></i><h3>Gymawy Support</h3><p style="font-size:12px;color:var(--text-secondary);">بنرد عادة خلال دقائق</p></div>' +
        '<div class="chat-messages" id="supportChatMessages"><div style="text-align:center;padding:20px;">جاري تحميل المحادثة...</div></div>' +
        '<div style="display:flex;gap:8px;"><input type="text" id="supMsg" class="form-control" placeholder="اكتب رسالتك هنا..."><button class="btn btn-primary btn-sm" onclick="sendSupMsg()" style="width:44px;flex-shrink:0;"><i class="fas fa-paper-plane"></i></button></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    openModal('gymModal');
    loadSupMsgs();
}

async function sendSupMsg() {
    var m = document.getElementById('supMsg');
    if (!m || !G.currentUser) return;
    var msg = m.value.trim();
    if (!msg) { T('⚠️ اكتب رسالتك أولاً', 'warning'); return; }
    
    try {
        await db.collection('support_messages').add({
            chatId: G.currentUser.username,
            sender: G.currentUser.username,
            senderName: G.currentUser.fullName,
            senderPhone: G.currentUser.phone || '',
            senderEmail: G.currentUser.email || '',
            message: msg,
            timestamp: new Date().toISOString(),
            read: false
        });
        rtdb.ref('support_notifications').push({
            sender: G.currentUser.username,
            senderName: G.currentUser.fullName,
            timestamp: new Date().toISOString()
        });
        m.value = '';
        loadSupMsgs();
        T('📨 تم إرسال رسالتك - سنرد عليك قريباً', 'success');
    } catch(e) {
        T('❌ حدث خطأ في إرسال الرسالة', 'error');
    }
}

async function loadSupMsgs() {
    var c = document.getElementById('supportChatMessages');
    if (!c) return;
    
    try {
        var s = await db.collection('support_messages').where('chatId', '==', G.currentUser.username).get();
        var msgs = [];
        s.forEach(function(doc) { msgs.push(doc.data()); });
        msgs.sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
        
        var html = '';
        if (msgs.length) {
            for (var i = 0; i < msgs.length; i++) {
                html += '<div class="chat-bubble ' + (msgs[i].sender === G.currentUser.username ? 'outgoing' : 'incoming') + '">' + msgs[i].message + '<div class="chat-time">' + timeAgo(msgs[i].timestamp) + '</div></div>';
            }
        } else {
            html = '<div style="text-align:center;padding:20px;color:var(--text-secondary);"><p>👋 اكتب رسالتك وسنرد عليك في أقرب وقت</p></div>';
        }
        c.innerHTML = html;
        c.scrollTop = c.scrollHeight;
    } catch(e) {
        c.innerHTML = '<div style="text-align:center;padding:20px;"><p>خطأ في تحميل المحادثة</p></div>';
    }
}

// ==================== ABOUT / PRIVACY / WHO WE ARE ====================
function showAbout() {
    document.getElementById('modalTitle').textContent = 'عن التطبيق';
    document.getElementById('modalBody').innerHTML = 
        '<div style="text-align:center;margin-bottom:20px;"><div style="width:85px;height:85px;background:linear-gradient(135deg,var(--primary),var(--secondary));border-radius:22px;display:inline-flex;align-items:center;justify-content:center;font-size:42px;color:white;"><i class="fas fa-dumbbell"></i></div><h2>Gymawy</h2><p style="color:var(--primary);font-weight:700;">أول منصة جيمات ذكية في مصر</p></div>' +
        '<div class="info-section"><h4>🎯 هدفنا</h4><p>نساعد كل شخص يلاقي الجيم المناسب ليه بكل سهولة - مجاناً تماماً.</p></div>' +
        '<div class="info-section"><h4>📱 المنصة</h4><p>مجانية 100% للمستخدمين. صاحب الجيم يدفع نسبة بسيطة 1% فقط على كل مشترك جديد.</p></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    openModal('gymModal');
}

function showPrivacy() {
    document.getElementById('modalTitle').textContent = 'سياسة الخصوصية';
    document.getElementById('modalBody').innerHTML = 
        '<div class="info-section"><h4>🔒 خصوصيتك أمانة</h4><p>نلتزم بحماية بياناتك الشخصية وعدم مشاركتها مع أي طرف ثالث.</p></div>' +
        '<div class="info-section"><h4>🗑️ حذف حسابك</h4><p>يحق لك طلب حذف حسابك وجميع بياناتك في أي وقت من خلال خدمة العملاء.</p></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    openModal('gymModal');
}

function showWhoWeAre() {
    document.getElementById('modalTitle').textContent = 'من نحن';
    document.getElementById('modalBody').innerHTML = 
        '<div class="info-section"><h4>🏢 Gymawy</h4><p>شركة مصرية ناشئة متخصصة في التكنولوجيا الرياضية. مقرنا الرئيسي: مصر.</p></div>' +
        '<div class="info-section" style="background:var(--primary-bg);border-radius:14px;padding:16px;text-align:center;">' +
        '<h4 style="color:var(--primary);">🏋️ أضف جيمك مجاناً</h4><p style="font-size:13px;">لو عندك جيم وعايز تضمه للمنصة ويوصلك مشتركين جدد، سجل دلوقتي مجاناً.</p>' +
        '<button class="btn btn-primary btn-sm" onclick="showCoachRegistration();closeModal(\'gymModal\');" style="margin-top:10px;">أضف جيمك مجاناً</button></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    openModal('gymModal');
}

// ==================== SHARE / QR ====================
function shareGym(gid, e) { if (e) e.stopPropagation(); var gym = null; for (var i = 0; i < G.allGyms.length; i++) { if (G.allGyms[i].id === gid) { gym = G.allGyms[i]; break; } } if (!gym) return; G.shareGym = gym; document.getElementById('shareGymName').textContent = gym.name; openModal('shareModal'); }
function shareViaWhatsApp() { if (!G.shareGym) return; window.open('https://wa.me/?text=' + encodeURIComponent('🏋️ شوف جيم ' + G.shareGym.name + ' على Gymawy!\n\n' + (G.shareGym.location || '') + '\nالسعر: ' + (G.shareGym.monthlyPrice || 0) + ' ج.م/شهر\n\nسجل من هنا: ' + window.location.origin)); closeModal('shareModal'); }
function shareViaFacebook() { if (!G.shareGym) return; window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.origin + '/?gym=' + G.shareGym.id)); closeModal('shareModal'); }
function copyShareLink() { if (!G.shareGym) return; navigator.clipboard.writeText(window.location.origin + '/?gym=' + G.shareGym.id).then(function() { T('📋 تم نسخ الرابط', 'success'); }); closeModal('shareModal'); }
function showQRCode(gid, gn, e) { if (e) e.stopPropagation(); var gym = null; for (var i = 0; i < G.allGyms.length; i++) { if (G.allGyms[i].id === gid) { gym = G.allGyms[i]; break; } } if (!gym) return; G.shareGym = gym; document.getElementById('qrGymName').textContent = gn; document.getElementById('qrCode').innerHTML = ''; new QRCode(document.getElementById('qrCode'), { text: window.location.origin + '/?gym=' + gid, width: 220, height: 220, colorDark: '#6C5CE7', colorLight: '#FFFFFF' }); openModal('qrModal'); }
function copyGymLink() { if (!G.shareGym) return; navigator.clipboard.writeText(window.location.origin + '/?gym=' + G.shareGym.id).then(function() { T('📋 تم نسخ الرابط', 'success'); }); closeModal('qrModal'); }

// ==================== COACH REGISTRATION ====================
function showCoachRegistration() {
    document.getElementById('modalTitle').textContent = '🏋️ أضف جيمك مجاناً';
    var govOptions = '';
    var govs = Object.keys(EGYPT_LOCATIONS);
    for (var i = 0; i < govs.length; i++) govOptions += '<option value="' + govs[i] + '">' + govs[i] + '</option>';
    
    document.getElementById('modalBody').innerHTML = 
        '<div style="text-align:center;margin-bottom:14px;"><i class="fas fa-plus-circle" style="font-size:45px;color:var(--success);"></i><h3>أضف جيمك مجاناً</h3><p style="font-size:12px;color:var(--text-secondary);">فريق جيماوي هيتواصل معاك خلال 48 ساعة</p></div>' +
        '<div class="form-row"><div class="form-group"><label>الاسم الرباعي *</label><input type="text" id="crName" class="form-control"></div><div class="form-group"><label>رقم الهاتف *</label><input type="tel" id="crPhone" class="form-control"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>البريد الإلكتروني *</label><input type="email" id="crEmail" class="form-control"></div><div class="form-group"><label>رقم البطاقة *</label><input type="text" id="crIdNumber" class="form-control"></div></div>' +
        '<div class="form-group"><label>صورة البطاقة *</label><input type="file" id="crIdImage" accept="image/*" class="form-control"></div>' +
        '<div class="form-group"><label>اسم الجيم *</label><input type="text" id="crGymName" class="form-control"></div>' +
        '<div class="form-row"><div class="form-group"><label>المحافظة *</label><select id="crGovernorate" class="form-control" onchange="updateCRCities()"><option value="">اختر...</option>' + govOptions + '</select></div><div class="form-group"><label>المدينة *</label><select id="crCity" class="form-control"><option value="">اختر...</option></select></div></div>' +
        '<div class="form-group"><label>العنوان التفصيلي *</label><input type="text" id="crLocation" class="form-control" placeholder="شارع، منطقة، أقرب علامة مميزة"></div>' +
        '<div class="form-group"><label>رابط Google Maps</label><input type="text" id="crMapLink" class="form-control" placeholder="رابط موقع الجيم على الخريطة"></div>' +
        '<div class="form-row"><div class="form-group"><label>رقم تواصل 1 *</label><input type="tel" id="crPhone1" class="form-control"></div><div class="form-group"><label>رقم تواصل 2</label><input type="tel" id="crPhone2" class="form-control"></div></div>' +
        '<div class="form-group"><label>صورة واجهة الجيم *</label><input type="file" id="crGymImage" accept="image/*" class="form-control"></div>';
    document.getElementById('modalFooter').innerHTML = 
        '<button class="btn btn-success" onclick="submitCoachReg()"><i class="fas fa-paper-plane"></i> تقديم الطلب</button>' +
        '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إلغاء</button>';
    openModal('gymModal');
}

function updateCRCities() {
    var g = document.getElementById('crGovernorate')?.value;
    var c = document.getElementById('crCity');
    if (c) {
        var cities = EGYPT_LOCATIONS[g] || [];
        var html = '<option value="">اختر...</option>';
        for (var i = 0; i < cities.length; i++) html += '<option value="' + cities[i] + '">' + cities[i] + '</option>';
        c.innerHTML = html;
    }
}

async function submitCoachReg() {
    var name = document.getElementById('crName')?.value?.trim();
    var phone = document.getElementById('crPhone')?.value?.trim();
    var email = document.getElementById('crEmail')?.value?.trim();
    var idNumber = document.getElementById('crIdNumber')?.value?.trim();
    var idFile = document.getElementById('crIdImage')?.files[0];
    var gymName = document.getElementById('crGymName')?.value?.trim();
    var governorate = document.getElementById('crGovernorate')?.value;
    var city = document.getElementById('crCity')?.value;
    var location = document.getElementById('crLocation')?.value?.trim();
    var mapLink = document.getElementById('crMapLink')?.value?.trim();
    var phone1 = document.getElementById('crPhone1')?.value?.trim();
    var phone2 = document.getElementById('crPhone2')?.value?.trim();
    var gymFile = document.getElementById('crGymImage')?.files[0];
    
    if (!name || !phone || !email || !idNumber || !idFile || !gymName || !governorate || !city || !location || !phone1 || !gymFile) {
        T('⚠️ من فضلك أكمل جميع البيانات المطلوبة (المشار إليها بعلامة *)', 'error');
        return;
    }
    
    T('⏳ جاري رفع الصور وتقديم الطلب...', 'info');
    
    try {
        // Upload ID card
        var idFormData = new FormData();
        idFormData.append('file', idFile);
        idFormData.append('upload_preset', CLOUDINARY_PRESET);
        var idRes = await fetch(CLOUDINARY_URL, { method: 'POST', body: idFormData });
        var idData = await idRes.json();
        var idUrl = idData.secure_url || '';
        if (!idUrl) { T('❌ فشل رفع صورة البطاقة - حاول مرة أخرى', 'error'); return; }
        
        // Upload gym image
        var gymFormData = new FormData();
        gymFormData.append('file', gymFile);
        gymFormData.append('upload_preset', CLOUDINARY_PRESET);
        var gymRes = await fetch(CLOUDINARY_URL, { method: 'POST', body: gymFormData });
        var gymData = await gymRes.json();
        var gymImageUrl = gymData.secure_url || '';
        if (!gymImageUrl) { T('❌ فشل رفع صورة الجيم - حاول مرة أخرى', 'error'); return; }
        
        var phones = [phone1];
        if (phone2) phones.push(phone2);
        
        await db.collection('coach_applications').add({
            name: name, phone: phone, email: email,
            idCardNumber: idNumber, idCardImage: idUrl,
            gymName: gymName, governorate: governorate, city: city,
            location: location, mapLink: mapLink, phones: phones,
            gymFrontImage: gymImageUrl,
            status: 'pending',
            createdAt: new Date().toISOString()
        });
        
        closeModal('gymModal');
        T('✅ تم تقديم الطلب بنجاح - هنتواصل معاك خلال 48 ساعة', 'success');
    } catch(e) {
        console.error('Coach reg error:', e);
        T('❌ حدث خطأ أثناء تقديم الطلب - تأكد من اتصالك بالإنترنت', 'error');
    }
}

// ==================== MY REQUESTS ====================
async function loadMyRequests() {
    var c = document.getElementById('myRequestsContent');
    if (!c || !G.currentUser) return;
    
    try {
        var snap = await db.collection('requests').where('username', '==', G.currentUser.username).get();
        var requests = [];
        snap.forEach(function(doc) { requests.push({ id: doc.id, ...doc.data() }); });
        requests.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        
        if (!requests.length) {
            c.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><h4>لا طلبات حتى الآن</h4><p style="font-size:12px;">قدم طلب اشتراك في أي جيم وهيظهر هنا</p></div>';
            return;
        }
        
        var html = '';
        for (var i = 0; i < requests.length; i++) {
            var r = requests[i];
            var statusBadge = '';
            if (r.status === 'pending') statusBadge = '<span class="badge badge-warning" style="font-size:11px;">⏳ معلق</span>';
            else if (r.status === 'accepted') statusBadge = '<span class="badge badge-success" style="font-size:11px;">✅ مقبول</span>';
            else statusBadge = '<span class="badge badge-danger" style="font-size:11px;">❌ مرفوض</span>';
            
            html += '<div class="request-card">' +
                '<div style="display:flex;justify-content:space-between;align-items:center;">' +
                '<strong>' + r.gymName + '</strong>' + statusBadge + '</div>' +
                '<p style="font-size:12px;color:var(--text-secondary);margin-top:4px;">' +
                (r.subType === 'monthly' ? '📅 شهري' : '📅 سنوي') + ' • ' + formatDate(r.createdAt) + '</p></div>';
        }
        c.innerHTML = html;
    } catch(e) {
        c.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h4>خطأ في تحميل الطلبات</h4></div>';
    }
}

console.log('🏋️ Gymawy App Ready - v3.0 Final');