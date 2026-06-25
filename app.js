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
db.enablePersistence().catch(function(){});

const VODAFONE_CASH = "01016212814";

const EGYPT_LOCATIONS = {
    "القاهرة": ["مدينة نصر", "مصر الجديدة", "المعادي", "الزمالك", "الشيخ زايد", "6 أكتوبر", "التجمع الخامس"],
    "الجيزة": ["الدقي", "المهندسين", "فيصل", "الهرم"],
    "الإسكندرية": ["سموحة", "سبورتنج", "محطة الرمل", "المنتزه", "العجمي"],
    "الشرقية": ["الزقازيق", "العاشر من رمضان", "بلبيس", "أبو حماد", "منيا القمح", "فاقوس", "أبو كبير"],
    "الدقهلية": ["المنصورة", "طلخا", "ميت غمر", "السنبلاوين"],
    "الغربية": ["طنطا", "المحلة الكبرى", "زفتى"],
    "القليوبية": ["بنها", "شبرا الخيمة", "العبور"],
    "بورسعيد": ["بورسعيد"],
    "السويس": ["السويس"],
    "الإسماعيلية": ["الإسماعيلية"],
    "دمياط": ["دمياط"],
    "كفر الشيخ": ["كفر الشيخ"],
    "الفيوم": ["الفيوم"],
    "بني سويف": ["بني سويف"],
    "المنيا": ["المنيا"],
    "أسيوط": ["أسيوط"],
    "سوهاج": ["سوهاج"],
    "قنا": ["قنا"],
    "الأقصر": ["الأقصر"],
    "أسوان": ["أسوان"],
    "شمال سيناء": ["العريش"],
    "جنوب سيناء": ["شرم الشيخ", "دهب"],
    "مطروح": ["مرسى مطروح"],
    "البحر الأحمر": ["الغردقة", "مرسى علم"]
};

var G = {
    currentUser: null,
    allGyms: [],
    selectedGym: null,
    currentFilter: { governorate: '', city: '', gender: '', minRating: 0, searchQuery: '' },
    quickFilter: 'all',
    notifications: [],
    favorites: [],
    recentlyViewed: [],
    shareGym: null,
    confirmCallback: null,
    _rating: 0,
    _subType: 'monthly'
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Gymawy Starting...');
    
    loadUserFromStorage();
    loadFavorites();
    loadRecentlyViewed();
    loadNotifications();
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
    x._t = setTimeout(function() { x.classList.remove('show'); }, 3000);
}

function formatDate(d) {
    if (!d) return '--';
    return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
}

function isExpired(d) { return new Date(d) < new Date(); }
function daysRemaining(d) { return Math.ceil((new Date(d) - new Date()) / 86400000); }

// ==================== AUTH ====================
function loadUserFromStorage() {
    try { G.currentUser = JSON.parse(localStorage.getItem('gymawy_user')); } 
    catch (e) { G.currentUser = null; }
}

function saveUserToStorage() {
    if (G.currentUser) localStorage.setItem('gymawy_user', JSON.stringify(G.currentUser));
    else localStorage.removeItem('gymawy_user');
}

async function registerUser(fn, ph, un, pw, pwc, email) {
    if (!fn || fn.length < 6) { T('الاسم 6 أحرف على الأقل', 'error'); return false; }
    if (!un || un.length < 4) { T('اسم المستخدم 4 أحرف على الأقل', 'error'); return false; }
    if (!ph || ph.length < 10) { T('رقم الهاتف غير صحيح', 'error'); return false; }
    if (!pw || pw.length < 6) { T('كلمة المرور 6 أحرف على الأقل', 'error'); return false; }
    if (pw !== pwc) { T('كلمتا المرور غير متطابقتين', 'error'); return false; }
    if (!email || !email.includes('@')) { T('بريد صحيح مطلوب', 'error'); return false; }
    
    try {
        var uSnap = await db.collection('users').doc(un).get();
        if (uSnap.exists) { T('اسم المستخدم مستخدم بالفعل', 'error'); return false; }
        
        var hash = CryptoJS.SHA256(pw).toString();
        await db.collection('users').doc(un).set({
            fullName: fn, phone: ph, username: un, passHash: hash,
            email: email, emailVerified: true, createdAt: new Date().toISOString()
        });
        
        G.currentUser = { fullName: fn, phone: ph, username: un, email: email, emailVerified: true };
        saveUserToStorage();
        localStorage.setItem('gymawy_keep_logged_in', '1');
        
        showMainApp(); checkOnboarding(); goTo('home'); loadGyms();
        T('تم إنشاء الحساب - أهلاً ' + fn, 'success');
        return true;
    } catch (e) {
        console.error('Register error:', e);
        T('حدث خطأ في التسجيل', 'error');
        return false;
    }
}

async function loginUser(un, pw) {
    if (!un) { T('أدخل اسم المستخدم', 'error'); return false; }
    if (!pw) { T('أدخل كلمة المرور', 'error'); return false; }
    
    try {
        var snap = await db.collection('users').doc(un).get();
        if (!snap.exists) { T('اسم المستخدم غير موجود', 'error'); return false; }
        
        var d = snap.data();
        if (d.banned) { T('الحساب محظور', 'error'); return false; }
        if (CryptoJS.SHA256(pw).toString() !== d.passHash) { T('كلمة المرور غير صحيحة', 'error'); return false; }
        
        G.currentUser = { fullName: d.fullName, phone: d.phone || '', username: un, email: d.email || '', emailVerified: true };
        saveUserToStorage();
        localStorage.setItem('gymawy_keep_logged_in', '1');
        
        showMainApp(); checkOnboarding(); goTo('home'); loadGyms();
        T('أهلاً ' + d.fullName, 'success');
        return true;
    } catch (e) {
        console.error('Login error:', e);
        T('حدث خطأ في تسجيل الدخول', 'error');
        return false;
    }
}

function logout() {
    G.currentUser = null;
    saveUserToStorage();
    localStorage.removeItem('gymawy_keep_logged_in');
    hideMainApp();
    T('تم تسجيل الخروج', 'info');
}

// ==================== HANDLE LOGIN ====================
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
    c.innerHTML = '<h4 style="margin-bottom:12px;">إنشاء حساب جديد</h4>' +
        '<div class="form-row"><div class="form-group"><label>الاسم الرباعي</label><input type="text" id="rf" class="form-control" placeholder="6 أحرف على الأقل"></div><div class="form-group"><label>رقم الهاتف</label><input type="tel" id="rp" class="form-control" placeholder="01xxxxxxxxx"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="re" class="form-control" placeholder="example@mail.com"></div><div class="form-group"><label>اسم المستخدم</label><input type="text" id="ru" class="form-control" style="text-transform:uppercase;" placeholder="4-16 حرف"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>كلمة المرور</label><input type="password" id="rpa" class="form-control" placeholder="6 أحرف على الأقل"></div><div class="form-group"><label>تأكيد كلمة المرور</label><input type="password" id="rpc" class="form-control" placeholder="أعد كتابة كلمة المرور"></div></div>' +
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
    
    if (!fullName || fullName.length < 6) { T('الاسم 6 أحرف على الأقل', 'error'); return; }
    if (!phone || phone.length < 10) { T('رقم الهاتف غير صحيح', 'error'); return; }
    if (!email || !email.includes('@')) { T('بريد صحيح مطلوب', 'error'); return; }
    if (!username || username.length < 4) { T('اسم المستخدم 4 أحرف على الأقل', 'error'); return; }
    if (!password || password.length < 6) { T('كلمة المرور 6 أحرف على الأقل', 'error'); return; }
    if (password !== passwordConfirm) { T('غير متطابقتين', 'error'); return; }
    
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
        '<h3 style="color:var(--warning);">🚧 تحت التطوير</h3>' +
        '<p style="font-size:13px;color:var(--text-secondary);">هذه الميزة قيد التطوير حالياً وستكون متاحة قريباً</p></div>' +
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
    
    var sidebarSupport = document.getElementById('sidebarSupport');
    if (sidebarSupport) sidebarSupport.addEventListener('click', function() { openSupportChat(); closeSidebar(); });
    
    var sidebarAbout = document.getElementById('sidebarAbout');
    if (sidebarAbout) sidebarAbout.addEventListener('click', function() { showAbout(); closeSidebar(); });
    
    var sidebarPrivacy = document.getElementById('sidebarPrivacy');
    if (sidebarPrivacy) sidebarPrivacy.addEventListener('click', function() { showPrivacy(); closeSidebar(); });
    
    var sidebarWhoWeAre = document.getElementById('sidebarWhoWeAre');
    if (sidebarWhoWeAre) sidebarWhoWeAre.addEventListener('click', function() { showWhoWeAre(); closeSidebar(); });
    
    var sidebarForum = document.getElementById('sidebarForum');
    if (sidebarForum) sidebarForum.addEventListener('click', function() { goTo('forum'); closeSidebar(); });
    
    var sidebarFavorites = document.getElementById('sidebarFavorites');
    if (sidebarFavorites) sidebarFavorites.addEventListener('click', function() { showFavorites(); closeSidebar(); });
    
    var sidebarRegisterCoach = document.getElementById('sidebarRegisterCoach');
    if (sidebarRegisterCoach) sidebarRegisterCoach.addEventListener('click', function() { showCoachRegistration(); closeSidebar(); });
    
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

// ==================== NOTIFICATIONS ====================
function loadNotificationsPage() {
    var c = document.getElementById('notificationsContent');
    if (!c) return;
    
    if (!G.notifications.length) {
        c.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><h4>لا توجد إشعارات</h4></div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < G.notifications.length; i++) {
        var n = G.notifications[i];
        html += '<div class="notification-item ' + (n.read ? '' : 'unread') + '" onclick="markNotifRead(\'' + n.id + '\')">' +
            '<strong>' + n.title + '</strong>' +
            '<p style="font-size:12px;color:var(--text-secondary);margin:4px 0;">' + n.message + '</p></div>';
    }
    html += '<div style="display:flex;gap:8px;margin-top:16px;">' +
        '<button class="btn btn-outline btn-sm" onclick="markAllNotifRead()">تعليم الكل مقروء</button>' +
        '<button class="btn btn-danger btn-sm" onclick="clearNotifications()">مسح الكل</button></div>';
    c.innerHTML = html;
}

function loadNotifications() {
    try { G.notifications = JSON.parse(localStorage.getItem('gymawy_notifications') || '[]'); } 
    catch (e) { G.notifications = []; }
    updateBadges();
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
    T('تم تعليم الكل كمقروء', 'success');
}

function clearNotifications() {
    G.notifications = [];
    saveNotifications();
    loadNotificationsPage();
    T('تم مسح الكل', 'success');
}

// ==================== FORUM ====================
async function loadForumPage() {
    var c = document.getElementById('forumContent');
    if (!c) return;
    
    if (!G.currentUser) {
        c.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h4>المنتدى مقفول</h4><p>يجب تسجيل الدخول أولاً</p></div>';
        return;
    }
    
    c.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';
    
    try {
        var phone = G.currentUser.phone || '';
        var memberSnap = await db.collection('members').where('phone', '==', phone).get();
        var foundMember = null;
        memberSnap.forEach(function(doc) {
            var d = doc.data();
            if (d.active && !d.leftByUser) foundMember = { id: doc.id, gymId: d.gymId, gymName: d.gymName };
        });
        
        if (!foundMember) {
            c.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h4>المنتدى مقفول</h4><p>يجب أن تكون مشتركاً في جيم</p></div>';
            return;
        }
        
        var fs = await db.collection('forum_messages').where('gymId', '==', foundMember.gymId).get();
        var msgs = [];
        fs.forEach(function(doc) { msgs.push(doc.data()); });
        msgs.sort(function(a, b) { return new Date(b.timestamp) - new Date(a.timestamp); });
        
        var html = '<h3 style="margin-bottom:16px;"><i class="fas fa-comments"></i> ' + (foundMember.gymName || 'المنتدى') + '</h3>';
        html += '<div class="chat-messages">';
        if (msgs.length) {
            for (var i = 0; i < msgs.length; i++) {
                html += '<div class="chat-bubble incoming"><strong style="color:var(--primary);font-size:11px;">📢 ' + (msgs[i].senderName || 'الكوتش') + '</strong><p style="margin:4px 0;">' + msgs[i].message + '</p><div class="chat-time">' + formatDate(msgs[i].timestamp) + '</div></div>';
            }
        } else {
            html += '<div class="empty-state"><i class="fas fa-comments"></i><h4>لا رسائل بعد</h4></div>';
        }
        html += '</div>';
        c.innerHTML = html;
    } catch (e) {
        c.innerHTML = '<div class="empty-state"><h4>حدث خطأ</h4></div>';
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
                G.allGyms.push({ id: doc.id, name: d.name, images: d.images, verified: d.verified, offerPrice: d.offerPrice, gender: d.gender, governorate: d.governorate, city: d.city, location: d.location, monthlyPrice: d.monthlyPrice, yearlyPrice: d.yearlyPrice, sessionPrice: d.sessionPrice, openTime: d.openTime, closeTime: d.closeTime, phones: d.phones, mapLink: d.mapLink, avgRating: 0, ratingCount: 0 });
            }
        });
        
        if (!G.allGyms.length) {
            c.innerHTML = '<div class="empty-state"><i class="fas fa-dumbbell"></i><h4>لا توجد جيمات متاحة حالياً</h4></div>';
            return;
        }
        
        filterAndDisplayGyms();
        displayRecentGrid();
    } catch (e) {
        c.innerHTML = '<div class="empty-state"><h4>خطأ في التحميل</h4></div>';
    }
}

function filterAndDisplayGyms() {
    var f = G.currentFilter;
    var fl = G.allGyms.slice();
    
    if (G.quickFilter === 'verified') fl = fl.filter(function(g) { return g.verified; });
    if (G.quickFilter === 'mixed') fl = fl.filter(function(g) { return g.gender === 'mixed'; });
    if (G.quickFilter === 'men') fl = fl.filter(function(g) { return g.gender === 'men'; });
    if (G.quickFilter === 'women') fl = fl.filter(function(g) { return g.gender === 'women'; });
    if (G.quickFilter === 'offers') fl = fl.filter(function(g) { return g.offerPrice; });
    
    if (f.gender) fl = fl.filter(function(g) { return g.gender === f.gender; });
    if (f.governorate) fl = fl.filter(function(g) { return g.governorate === f.governorate; });
    if (f.city) fl = fl.filter(function(g) { return g.city === f.city; });
    if (f.minRating > 0) fl = fl.filter(function(g) { return g.avgRating >= f.minRating; });
    if (f.searchQuery) {
        var q = f.searchQuery.toLowerCase();
        fl = fl.filter(function(g) {
            return (g.name || '').toLowerCase().indexOf(q) > -1 || (g.location || '').toLowerCase().indexOf(q) > -1;
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
        c.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h4>لا جيمات متطابقة</h4></div>';
        return;
    }
    
    var html = '';
    for (var i = 0; i < gyms.length; i++) {
        var g = gyms[i];
        var stars = '';
        for (var s = 1; s <= 5; s++) {
            stars += s <= Math.round(g.avgRating) ? '<i class="fas fa-star" style="color:#FFD700;font-size:11px;"></i>' : '<i class="far fa-star" style="color:#DDD;font-size:11px;"></i>';
        }
        
        html += '<div class="gym-card" onclick="showGymDetail(\'' + g.id + '\')">' +
            '<div class="gym-card-header">' +
            (g.images && g.images.length ? '<img src="' + g.images[0] + '" alt="' + g.name + '">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-dumbbell ph"></i></div>') +
            (g.verified ? '<span class="badge badge-verified"><i class="fas fa-check-circle"></i> موثق</span>' : '') +
            (g.offerPrice ? '<span class="badge badge-offer">عرض ' + g.offerPrice + ' ج.م</span>' : '') +
            (g.gender ? '<span class="badge badge-gender"><i class="fas fa-' + (g.gender === 'men' ? 'male' : g.gender === 'women' ? 'female' : 'venus-mars') + '"></i> ' + (g.gender === 'men' ? 'رجال' : g.gender === 'women' ? 'سيدات' : 'مختلط') + '</span>' : '') +
            '<div class="gym-card-overlay">' + (g.governorate || '') + ' ' + (g.city ? '• ' + g.city : '') + '</div></div>' +
            '<div class="gym-card-body">' +
            '<div class="gym-card-title"><span>' + g.name + '</span>' + (g.avgRating > 0 ? '<span style="font-size:12px;color:#FFD700;">' + stars + ' ' + g.avgRating + '</span>' : '') + '</div>' +
            '<div class="gym-card-location"><i class="fas fa-map-marker-alt"></i> ' + (g.location || 'غير محدد') + '</div>' +
            '<div class="gym-card-prices">' +
            '<div class="price-tag"><div class="price-value">' + (g.monthlyPrice || 0) + '</div><div class="price-label">ج.م/شهر</div></div>' +
            (g.yearlyPrice ? '<div class="price-tag"><div class="price-value">' + g.yearlyPrice + '</div><div class="price-label">ج.م/سنة</div></div>' : '') +
            '<div class="price-tag"><div class="price-value">' + (g.sessionPrice || 0) + '</div><div class="price-label">ج.م/حصة</div></div></div></div>' +
            '<div class="gym-card-footer"><button class="btn-apply" onclick="event.stopPropagation();applyToGym(\'' + g.id + '\')"><i class="fas fa-hand-paper"></i> تقديم طلب</button></div></div>';
    }
    c.innerHTML = html;
}

// ==================== GYM DETAIL ====================
function showGymDetail(gid) {
    var gym = null;
    for (var i = 0; i < G.allGyms.length; i++) { if (G.allGyms[i].id === gid) { gym = G.allGyms[i]; break; } }
    if (!gym) return;
    G.selectedGym = gym;
    addToRecentlyViewed(gym);
    
    document.getElementById('modalTitle').textContent = gym.name;
    
    var html = '';
    if (gym.images && gym.images.length) {
        html += '<div class="images-slider">';
        for (var j = 0; j < gym.images.length; j++) html += '<img src="' + gym.images[j] + '">';
        html += '</div>';
    }
    if (gym.verified) html += '<div class="info-highlight" style="background:#FFF8E1;color:#F57F17;text-align:center;"><i class="fas fa-check-circle"></i> موثق</div>';
    
    html += '<div class="info-section"><h4><i class="fas fa-tag"></i> الأسعار</h4>' +
        '<div class="info-row"><span>شهري</span><span>' + (gym.monthlyPrice || 0) + ' ج.م</span></div>' +
        (gym.yearlyPrice ? '<div class="info-row"><span>سنوي</span><span>' + gym.yearlyPrice + ' ج.م</span></div>' : '') +
        '<div class="info-row"><span>حصة</span><span>' + (gym.sessionPrice || 0) + ' ج.م</span></div></div>' +
        '<div class="info-section"><h4><i class="fas fa-clock"></i> مواعيد</h4>' +
        '<div class="info-row"><span>يفتح</span><span>' + (!gym.openTime && !gym.closeTime ? '24 ساعة' : gym.openTime || '--') + '</span></div>' +
        '<div class="info-row"><span>يقفل</span><span>' + (!gym.openTime && !gym.closeTime ? '24 ساعة' : gym.closeTime || '--') + '</span></div></div>' +
        '<div class="info-section"><h4><i class="fas fa-info-circle"></i> معلومات</h4>' +
        '<div class="info-row"><span>النوع</span><span>' + (gym.gender === 'men' ? 'رجال' : gym.gender === 'women' ? 'سيدات' : 'مختلط') + '</span></div>' +
        '<div class="info-row"><span>المحافظة</span><span>' + (gym.governorate || '--') + '</span></div></div>';
    
    if (gym.phones && gym.phones.length) {
        html += '<div class="info-section"><h4><i class="fas fa-phone"></i> تواصل</h4>';
        for (var k = 0; k < gym.phones.length; k++) html += '<a href="tel:' + gym.phones[k] + '" style="display:inline-block;margin:4px;padding:8px 14px;background:var(--primary-bg);border-radius:50px;color:var(--primary);text-decoration:none;font-weight:600;font-size:13px;">' + gym.phones[k] + '</a>';
        html += '</div>';
    }
    
    if (gym.mapLink) html += '<div class="info-section"><h4><i class="fas fa-map-marker-alt"></i> موقع</h4><a href="' + gym.mapLink + '" target="_blank" style="display:flex;align-items:center;gap:8px;padding:12px;background:var(--primary-bg);border-radius:12px;color:var(--primary);text-decoration:none;font-weight:600;"><i class="fas fa-map-marked-alt"></i> فتح في Google Maps</a></div>';
    
    html += '<div class="info-section" style="text-align:center;"><h4>تقييم</h4><div class="stars-input">';
    for (var s = 1; s <= 5; s++) html += '<i class="far fa-star" id="star' + s + '" onclick="setRating(' + s + ')"></i>';
    html += '</div><p style="font-size:11px;">' + (gym.ratingCount || 0) + ' تقييم</p>';
    if (G.currentUser && G.currentUser.emailVerified) html += '<button class="btn btn-primary btn-sm" onclick="submitRating()" style="margin-top:8px;">تقييم</button>';
    else html += '<p style="font-size:11px;color:var(--danger);">فعّل بريدك للتقييم</p>';
    html += '</div>';
    
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-primary" onclick="applyToGym(\'' + gym.id + '\')"><i class="fas fa-hand-paper"></i> تقديم طلب</button><button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
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
    if (!G._rating) { T('اختر تقييم', 'error'); return; }
    if (!G.selectedGym || !G.currentUser) return;
    await db.collection('ratings').add({ gymId: G.selectedGym.id, userId: G.currentUser.username, userName: G.currentUser.fullName, rating: G._rating, createdAt: new Date().toISOString() });
    T('شكراً لتقييمك', 'success');
    closeModal('gymModal');
    loadGyms();
}

async function applyToGym(gid) {
    if (!G.currentUser || !G.currentUser.emailVerified) { T('سجل دخولك', 'warning'); return; }
    var gym = null;
    for (var i = 0; i < G.allGyms.length; i++) { if (G.allGyms[i].id === gid) { gym = G.allGyms[i]; break; } }
    if (!gym) return;
    G.selectedGym = gym;
    G._subType = 'monthly';
    
    document.getElementById('modalTitle').textContent = 'تقديم طلب';
    document.getElementById('modalBody').innerHTML = '<div style="text-align:center;"><i class="fas fa-dumbbell" style="font-size:50px;color:var(--primary);"></i><h3>' + gym.name + '</h3></div>' +
        '<div class="gender-radio-group"><div class="gender-radio selected" id="optMonthly" onclick="selSub(\'monthly\')"><i class="fas fa-calendar"></i> شهري<span style="display:block;font-size:11px;">' + (gym.monthlyPrice || 0) + ' ج.م</span></div>' +
        (gym.yearlyPrice ? '<div class="gender-radio" id="optYearly" onclick="selSub(\'yearly\')"><i class="fas fa-calendar-alt"></i> سنوي<span style="display:block;font-size:11px;">' + gym.yearlyPrice + ' ج.م</span></div>' : '') + '</div>' +
        '<div class="info-highlight" style="margin-top:12px;"><i class="fas fa-info-circle"></i> توجه للجيم للدفع</div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-primary" onclick="confirmApply()">تأكيد</button><button class="btn btn-outline" onclick="showGymDetail(\'' + gid + '\')">رجوع</button>';
    openModal('gymModal');
}

function selSub(t) { G._subType = t; var m = document.getElementById('optMonthly'); var y = document.getElementById('optYearly'); if (m) m.classList.toggle('selected', t === 'monthly'); if (y) y.classList.toggle('selected', t === 'yearly'); }

async function confirmApply() {
    var gym = G.selectedGym;
    if (!gym || !G.currentUser) return;
    await db.collection('requests').add({ gymId: gym.id, gymName: gym.name, name: G.currentUser.fullName, phone: G.currentUser.phone || '', email: G.currentUser.email || '', username: G.currentUser.username, subType: G._subType, status: 'pending', createdAt: new Date().toISOString() });
    closeModal('gymModal');
    T('تم إرسال الطلب', 'success');
}

// ==================== FAVORITES ====================
function loadFavorites() { try { G.favorites = JSON.parse(localStorage.getItem('gymawy_favorites') || '[]'); } catch (e) { G.favorites = []; } }
function saveFavorites() { localStorage.setItem('gymawy_favorites', JSON.stringify(G.favorites)); }
function isFavorite(gid) { return G.favorites.indexOf(gid) > -1; }
function showFavorites() {
    var fg = [];
    for (var i = 0; i < G.allGyms.length; i++) { if (G.favorites.indexOf(G.allGyms[i].id) > -1) fg.push(G.allGyms[i]); }
    if (!fg.length) {
        document.getElementById('modalTitle').textContent = 'المفضلة';
        document.getElementById('modalBody').innerHTML = '<div class="empty-state"><i class="fas fa-heart-broken"></i><h4>لا مفضلات</h4></div>';
        document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
        openModal('gymModal');
        return;
    }
    document.getElementById('modalTitle').textContent = 'المفضلة';
    document.getElementById('modalBody').innerHTML = '<div class="gym-grid" id="favGymsList"></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    openModal('gymModal');
    displayGymsInContainer('favGymsList', fg);
}
function displayGymsInContainer(cid, gyms) {
    var c = document.getElementById(cid); if (!c) return;
    var html = '';
    for (var i = 0; i < gyms.length; i++) {
        var g = gyms[i];
        html += '<div class="gym-card" onclick="showGymDetail(\'' + g.id + '\')" style="margin-bottom:12px;">' +
            '<div class="gym-card-header">' + (g.images && g.images.length ? '<img src="' + g.images[0] + '">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-dumbbell ph"></i></div>') + '<div class="gym-card-overlay">' + (g.governorate || '') + '</div></div>' +
            '<div class="gym-card-body"><div class="gym-card-title">' + g.name + '</div><div class="gym-card-prices"><div class="price-tag"><div class="price-value">' + (g.monthlyPrice || 0) + '</div><div class="price-label">ج.م/شهر</div></div></div></div></div>';
    }
    c.innerHTML = html;
}

// ==================== RECENTLY VIEWED ====================
function loadRecentlyViewed() { try { G.recentlyViewed = JSON.parse(localStorage.getItem('gymawy_recent') || '[]'); } catch (e) { G.recentlyViewed = []; } }
function saveRecentlyViewed() { localStorage.setItem('gymawy_recent', JSON.stringify(G.recentlyViewed)); }
function addToRecentlyViewed(gym) {
    G.recentlyViewed = G.recentlyViewed.filter(function(g) { return g.id !== gym.id; });
    G.recentlyViewed.unshift({ id: gym.id, name: gym.name, image: gym.images ? gym.images[0] : null, monthlyPrice: gym.monthlyPrice });
    if (G.recentlyViewed.length > 5) G.recentlyViewed = G.recentlyViewed.slice(0, 5);
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
            (x.image ? '<img src="' + x.image + '">' : '<div style="height:80px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:20px;"><i class="fas fa-dumbbell"></i></div>') +
            '<div class="info"><div class="name">' + x.name + '</div><div class="price">' + (x.monthlyPrice || 0) + ' ج.م</div></div></div>';
    }
    if (g) g.innerHTML = html;
}

// ==================== SHARE / QR ====================
function shareGym(gid, e) { if (e) e.stopPropagation(); var gym = null; for (var i = 0; i < G.allGyms.length; i++) { if (G.allGyms[i].id === gid) { gym = G.allGyms[i]; break; } } if (!gym) return; G.shareGym = gym; document.getElementById('shareGymName').textContent = gym.name; openModal('shareModal'); }
function shareViaWhatsApp() { if (!G.shareGym) return; window.open('https://wa.me/?text=' + encodeURIComponent('شوف جيم ' + G.shareGym.name + ' على Gymawy!')); closeModal('shareModal'); }
function shareViaFacebook() { if (!G.shareGym) return; window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.origin)); closeModal('shareModal'); }
function copyShareLink() { if (!G.shareGym) return; navigator.clipboard.writeText(window.location.origin + '/?gym=' + G.shareGym.id).then(function() { T('تم نسخ الرابط', 'success'); }); closeModal('shareModal'); }
function showQRCode(gid, gn, e) { if (e) e.stopPropagation(); var gym = null; for (var i = 0; i < G.allGyms.length; i++) { if (G.allGyms[i].id === gid) { gym = G.allGyms[i]; break; } } if (!gym) return; G.shareGym = gym; document.getElementById('qrGymName').textContent = gn; document.getElementById('qrCode').innerHTML = ''; new QRCode(document.getElementById('qrCode'), { text: window.location.origin + '/?gym=' + gid, width: 200, height: 200, colorDark: '#6C5CE7', colorLight: '#FFFFFF' }); openModal('qrModal'); }
function copyGymLink() { if (!G.shareGym) return; navigator.clipboard.writeText(window.location.origin + '/?gym=' + G.shareGym.id).then(function() { T('تم نسخ الرابط', 'success'); }); closeModal('qrModal'); }

// ==================== PROFILE ====================
async function loadProfile() {
    var c = document.getElementById('profileContent');
    if (!c) return;
    if (!G.currentUser) { c.innerHTML = '<div class="empty-state"><i class="fas fa-user"></i><h4>سجل دخولك أولاً</h4></div>'; return; }
    
    c.innerHTML = '<div class="profile-card"><div class="profile-avatar"><i class="fas fa-user"></i></div><h2>' + G.currentUser.fullName + '</h2><p>@' + G.currentUser.username + '</p><p><i class="fas fa-phone"></i> ' + (G.currentUser.phone || '') + '</p><p><i class="fas fa-envelope"></i> ' + (G.currentUser.email || '') + ' <span style="color:var(--success);">مفعل</span></p><div class="btn-group" style="margin-top:12px;"><button class="btn btn-outline btn-sm" onclick="logout()" style="color:var(--danger);"><i class="fas fa-sign-out-alt"></i> خروج</button></div></div>';
}

// ==================== SUPPORT ====================
function openSupportChat() {
    if (!G.currentUser) { T('سجل دخولك', 'warning'); return; }
    document.getElementById('modalTitle').innerHTML = '<i class="fas fa-headset"></i> خدمة العملاء';
    document.getElementById('modalBody').innerHTML = '<div style="text-align:center;"><i class="fas fa-headset" style="font-size:50px;color:var(--primary);"></i><h3>Gymawy Support</h3></div><div class="chat-messages" id="supportChatMessages"><div style="text-align:center;padding:20px;">جاري التحميل...</div></div><div style="display:flex;gap:8px;"><input type="text" id="supMsg" class="form-control" placeholder="اكتب رسالتك..."><button class="btn btn-primary btn-sm" onclick="sendSupMsg()"><i class="fas fa-paper-plane"></i></button></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    openModal('gymModal');
    loadSupMsgs();
}
async function sendSupMsg() { var m = document.getElementById('supMsg'); if (!m || !G.currentUser) return; var msg = m.value.trim(); if (!msg) return; await db.collection('support_messages').add({ chatId: G.currentUser.username, sender: G.currentUser.username, senderName: G.currentUser.fullName, message: msg, timestamp: new Date().toISOString(), read: false }); m.value = ''; loadSupMsgs(); T('تم الإرسال', 'success'); }
async function loadSupMsgs() {
    var c = document.getElementById('supportChatMessages'); if (!c) return;
    var s = await db.collection('support_messages').where('chatId', '==', G.currentUser.username).get();
    var msgs = []; s.forEach(function(doc) { msgs.push(doc.data()); });
    msgs.sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
    var html = '';
    if (msgs.length) for (var i = 0; i < msgs.length; i++) html += '<div class="chat-bubble ' + (msgs[i].sender === G.currentUser.username ? 'outgoing' : 'incoming') + '">' + msgs[i].message + '<div class="chat-time">' + formatDate(msgs[i].timestamp) + '</div></div>';
    else html = '<div style="text-align:center;padding:20px;"><p>اكتب رسالتك</p></div>';
    c.innerHTML = html;
}

// ==================== ABOUT ====================
function showAbout() {
    document.getElementById('modalTitle').textContent = 'عن التطبيق';
    document.getElementById('modalBody').innerHTML = '<div style="text-align:center;margin-bottom:20px;"><div style="width:80px;height:80px;background:linear-gradient(135deg,var(--primary),var(--secondary));border-radius:20px;display:inline-flex;align-items:center;justify-content:center;font-size:40px;color:white;"><i class="fas fa-dumbbell"></i></div><h2>Gymawy</h2><p style="color:var(--primary);">أول منصة جيمات ذكية في مصر</p></div><div class="info-section"><h4>هدفنا</h4><p>نساعد كل شخص يلاقي الجيم المناسب ليه بكل سهولة.</p></div><div class="info-section" style="background:var(--primary-bg);border-radius:12px;padding:14px;text-align:center;"><h4 style="color:var(--primary);">ملقتش جيم قريب منك؟</h4><p>لو ملقتش جيم في منطقتك، ففي <strong>أقرب وقت</strong> هنضيف جيمات جديدة.</p></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    openModal('gymModal');
}
function showPrivacy() {
    document.getElementById('modalTitle').textContent = 'سياسة الخصوصية';
    document.getElementById('modalBody').innerHTML = '<div class="info-section"><h4>خصوصيتك أمانة</h4><p>نلتزم بحماية بياناتك وعدم مشاركتها.</p></div><div class="info-section"><h4>حذف حسابك</h4><p>يحق لك طلب حذف حسابك من خلال خدمة العملاء.</p></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    openModal('gymModal');
}
function showWhoWeAre() {
    document.getElementById('modalTitle').textContent = 'من نحن';
    document.getElementById('modalBody').innerHTML = '<div class="info-section"><h4>Gymawy</h4><p>شركة مصرية ناشئة في التكنولوجيا الرياضية. مقرنا: مصر.</p></div><div class="info-section" style="background:var(--primary-bg);border-radius:12px;padding:14px;text-align:center;"><h4 style="color:var(--primary);">ملقتش جيم في منطقتك؟</h4><p>بنشتغل كل يوم عشان نضيف جيمات جديدة. في <strong>أقرب وقت</strong> هنوصل ليها.</p></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    openModal('gymModal');
}

// ==================== COACH REGISTRATION ====================
var coachReg = { step: 1, name: '', phone: '', email: '', governorate: '', city: '', gymName: '', idCard: null, plan: '', paymentImage: null };
function showCoachRegistration() {
    coachReg.step = 1;
    document.getElementById('modalTitle').textContent = 'سجل كصاحب جيم - الخطوة 1';
    var govOptions = '';
    var govs = Object.keys(EGYPT_LOCATIONS);
    for (var i = 0; i < govs.length; i++) govOptions += '<option value="' + govs[i] + '">' + govs[i] + '</option>';
    
    document.getElementById('modalBody').innerHTML = '<div class="form-row"><div class="form-group"><label>الاسم *</label><input type="text" id="crName" class="form-control"></div><div class="form-group"><label>الهاتف *</label><input type="tel" id="crPhone" class="form-control"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>البريد *</label><input type="email" id="crEmail" class="form-control"></div><div class="form-group"><label>عمر الجيم</label><input type="number" id="crGymAge" class="form-control"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>المحافظة *</label><select id="crGovernorate" class="form-control" onchange="updateCRCities()"><option value="">اختر...</option>' + govOptions + '</select></div><div class="form-group"><label>المدينة *</label><select id="crCity" class="form-control"><option value="">اختر...</option></select></div></div>' +
        '<div class="form-group"><label>اسم الجيم *</label><input type="text" id="crGymName" class="form-control"></div>' +
        '<div class="form-group"><label>سمعت عنا منين؟</label><select id="crHeardFrom" class="form-control"><option value="">اختر...</option><option value="facebook">فيسبوك</option><option value="instagram">انستجرام</option><option value="friend">صديق</option><option value="google">جوجل</option></select></div>' +
        '<div class="form-group"><label>صورة البطاقة *</label><input type="file" id="crIdCard" accept="image/*" class="form-control"></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-primary" onclick="coachRegStep2()">التالي</button><button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إلغاء</button>';
    openModal('gymModal');
}
function updateCRCities() { var g = document.getElementById('crGovernatore')?.value; var c = document.getElementById('crCity'); if (c) { var cities = EGYPT_LOCATIONS[g] || []; var html = '<option value="">اختر...</option>'; for (var i = 0; i < cities.length; i++) html += '<option value="' + cities[i] + '">' + cities[i] + '</option>'; c.innerHTML = html; } }
function coachRegStep2() {
    var n = document.getElementById('crName')?.value?.trim(), p = document.getElementById('crPhone')?.value?.trim(), e = document.getElementById('crEmail')?.value?.trim();
    var gov = document.getElementById('crGovernorate')?.value, city = document.getElementById('crCity')?.value, gn = document.getElementById('crGymName')?.value?.trim();
    var idf = document.getElementById('crIdCard')?.files[0];
    if (!n || !p || !e || !gov || !city || !gn || !idf) { T('اكمل البيانات', 'error'); return; }
    coachReg.name = n; coachReg.phone = p; coachReg.email = e; coachReg.governorate = gov; coachReg.city = city; coachReg.gymName = gn; coachReg.idCard = idf; coachReg.step = 2;
    document.getElementById('modalTitle').textContent = 'اختر الباقة - الخطوة 2';
    document.getElementById('modalBody').innerHTML = '<div style="text-align:center;"><i class="fas fa-crown" style="font-size:50px;color:#FFD700;"></i><h3>اختر الباقة</h3></div>' +
        '<div style="display:flex;flex-direction:column;gap:12px;"><div class="gender-radio selected" id="planMonthly" onclick="selectCoachPlan(\'monthly\')" style="text-align:right;display:block;padding:16px;"><div style="display:flex;justify-content:space-between;"><div><strong>الباقة الشهرية</strong></div><div style="font-size:24px;color:var(--primary);">200 ج.م</div></div></div>' +
        '<div class="gender-radio" id="planYearly" onclick="selectCoachPlan(\'yearly\')" style="text-align:right;display:block;padding:16px;"><div style="display:flex;justify-content:space-between;"><div><strong>الباقة السنوية</strong></div><div style="font-size:24px;color:var(--primary);">1,500 ج.م</div></div></div></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-primary" onclick="coachRegStep3()">التالي</button><button class="btn btn-outline" onclick="showCoachRegistration()">رجوع</button>';
    openModal('gymModal');
}
function selectCoachPlan(plan) { coachReg.plan = plan; var m = document.getElementById('planMonthly'); var y = document.getElementById('planYearly'); if (m) m.classList.toggle('selected', plan === 'monthly'); if (y) y.classList.toggle('selected', plan === 'yearly'); }
async function coachRegStep3() {
    if (!coachReg.plan) { T('اختر باقة', 'error'); return; }
    coachReg.step = 3;
    document.getElementById('modalTitle').textContent = 'إثبات الدفع - الخطوة 3';
    document.getElementById('modalBody').innerHTML = '<div style="text-align:center;"><i class="fas fa-credit-card" style="font-size:50px;color:var(--primary);"></i><h3>إثبات الدفع</h3><p>الباقة: <strong>' + (coachReg.plan === 'monthly' ? 'شهرية - 200 ج.م' : 'سنوية - 1,500 ج.م') + '</strong></p></div>' +
        '<div class="info-highlight" style="background:#FFF3CD;color:#856404;text-align:center;margin-bottom:12px;"><i class="fas fa-info-circle"></i> حول المبلغ على فودافون كاش وأرفق صورة التحويل</div>' +
        '<div style="background:var(--light);border-radius:12px;padding:16px;text-align:center;"><p style="font-weight:700;font-size:18px;">' + VODAFONE_CASH + '</p><p style="font-size:11px;">فودافون كاش</p></div>' +
        '<div class="form-group"><label>صورة الدفع *</label><input type="file" id="crPayment" accept="image/*" class="form-control"></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-success" onclick="submitCoachReg()">تقديم</button><button class="btn btn-outline" onclick="coachRegStep2()">رجوع</button>';
    openModal('gymModal');
}
async function submitCoachReg() {
    var pf = document.getElementById('crPayment')?.files[0]; if (!pf) { T('ارفع صورة الدفع', 'error'); return; }
    var fd = new FormData(); fd.append('file', pf); fd.append('upload_preset', 'gymawy_upload');
    var paymentUrl = '';
    try { var res = await fetch('https://api.cloudinary.com/v1_1/di5z4lzwv/image/upload', { method: 'POST', body: fd }); var data = await res.json(); paymentUrl = data.secure_url || ''; } catch (e) { T('فشل رفع الصورة', 'error'); return; }
    await db.collection('coach_applications').add({ name: coachReg.name, phone: coachReg.phone, email: coachReg.email, governorate: coachReg.governorate, city: coachReg.city, gymName: coachReg.gymName, plan: coachReg.plan, amount: coachReg.plan === 'monthly' ? 200 : 1500, paymentImage: paymentUrl, status: 'pending', createdAt: new Date().toISOString() });
    closeModal('gymModal'); T('تم تقديم الطلب', 'success');
    coachReg = { step: 1, name: '', phone: '', email: '', governorate: '', city: '', gymName: '', idCard: null, plan: '', paymentImage: null };
}

// ==================== FILTER MODAL ====================
function showFilterModal() {
    var govOptions = '';
    var govs = Object.keys(EGYPT_LOCATIONS);
    for (var i = 0; i < govs.length; i++) govOptions += '<option value="' + govs[i] + '">' + govs[i] + '</option>';
    document.getElementById('filterBody').innerHTML = '<div class="form-group"><label>المحافظة</label><select id="fg" class="form-control" onchange="updateCities()"><option value="">الكل</option>' + govOptions + '</select></div>' +
        '<div class="form-group"><label>المدينة</label><select id="fc" class="form-control"><option value="">الكل</option></select></div>' +
        '<div class="form-group"><label>النوع</label><select id="fgn" class="form-control"><option value="">الكل</option><option value="mixed">مختلط</option><option value="men">رجال</option><option value="women">سيدات</option></select></div>' +
        '<div class="form-group"><label>التقييم</label><select id="frt" class="form-control"><option value="0">الكل</option><option value="3">3+</option><option value="4">4+</option></select></div>';
    document.getElementById('filterFooter').innerHTML = '<button class="btn btn-primary" onclick="applyFilters()">تطبيق</button><button class="btn btn-outline" onclick="closeModal(\'filterModal\')">إلغاء</button>';
    openModal('filterModal');
}
function updateCities() { var g = document.getElementById('fg')?.value; var c = document.getElementById('fc'); if (c) { var cities = EGYPT_LOCATIONS[g] || []; var html = '<option value="">الكل</option>'; for (var i = 0; i < cities.length; i++) html += '<option value="' + cities[i] + '">' + cities[i] + '</option>'; c.innerHTML = html; } }
function applyFilters() { G.currentFilter.governorate = document.getElementById('fg')?.value || ''; G.currentFilter.city = document.getElementById('fc')?.value || ''; G.currentFilter.gender = document.getElementById('fgn')?.value || ''; G.currentFilter.minRating = parseFloat(document.getElementById('frt')?.value || 0); closeModal('filterModal'); filterAndDisplayGyms(); }

console.log('🏋️ Gymawy Ready');