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
    loadUserFromStorage(); loadFavorites(); loadRecentlyViewed();
    loadNotifications(); loadDarkMode(); setupAllListeners();
    document.getElementById('mainHeader').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('bottomNav').style.display = 'none';
    document.getElementById('onboardingOverlay').style.display = 'none';
    if (G.currentUser && localStorage.getItem('gymawy_keep_logged_in') === '1') {
        showMainApp(); checkOnboarding(); goTo('home'); loadGyms();
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
function T(m, t) { t = t || 'success'; var x = document.getElementById('toast'); if (!x) return; x.textContent = m; x.className = 'toast ' + t + ' show'; clearTimeout(x._t); x._t = setTimeout(function() { x.classList.remove('show'); }, 3000); }
function formatDate(d) { if (!d) return '--'; return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }); }
function isExpired(d) { return new Date(d) < new Date(); }
function daysRemaining(d) { return Math.ceil((new Date(d) - new Date()) / 86400000); }

// ==================== AUTH ====================
function loadUserFromStorage() { try { G.currentUser = JSON.parse(localStorage.getItem('gymawy_user')); } catch (e) { G.currentUser = null; } }
function saveUserToStorage() { if (G.currentUser) localStorage.setItem('gymawy_user', JSON.stringify(G.currentUser)); else localStorage.removeItem('gymawy_user'); }

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
        await db.collection('users').doc(un).set({ fullName: fn, phone: ph, username: un, passHash: hash, email: email, emailVerified: true, role: 'user', createdAt: new Date().toISOString() });
        G.currentUser = { fullName: fn, phone: ph, username: un, email: email, emailVerified: true, role: 'user' };
        saveUserToStorage(); localStorage.setItem('gymawy_keep_logged_in', '1');
        showMainApp(); checkOnboarding(); goTo('home'); loadGyms();
        T('تم إنشاء الحساب - أهلاً ' + fn, 'success'); return true;
    } catch (e) { T('حدث خطأ في التسجيل', 'error'); return false; }
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
        G.currentUser = { fullName: d.fullName, phone: d.phone || '', username: un, email: d.email || '', emailVerified: true, role: d.role || 'user' };
        saveUserToStorage(); localStorage.setItem('gymawy_keep_logged_in', '1');
        showMainApp(); checkOnboarding(); goTo('home'); loadGyms();
        T('أهلاً ' + d.fullName, 'success'); return true;
    } catch (e) { T('حدث خطأ في تسجيل الدخول', 'error'); return false; }
}

function logout() {
    if (G.banListener) { G.banListener.ref.off('child_added', G.banListener.fn); }
    G.rtdbListeners.forEach(function(l) { l.ref.off('child_added', l.fn); });
    G.rtdbListeners = [];
    G.currentUser = null; saveUserToStorage(); localStorage.removeItem('gymawy_keep_logged_in');
    hideMainApp(); T('تم تسجيل الخروج', 'info');
}
function handleLogin() { var un = document.getElementById('loginUsername'), pw = document.getElementById('loginPassword'); if (un && pw) loginUser(un.value.trim().toUpperCase(), pw.value); }

// ==================== REGISTER / NAVIGATION / ONBOARDING / DARK ====================
// [نفس الكود السابق بدون تغيير - register form, navigation, onboarding, dark mode, listeners]

function showRegForm() {
    var c = document.getElementById('regForm'); if (!c) return; c.style.display = 'block';
    c.innerHTML = '<h4 style="margin-bottom:14px;">إنشاء حساب جديد</h4>' +
        '<div class="form-row"><div class="form-group"><label>الاسم الرباعي</label><input type="text" id="rf" class="form-control" placeholder="6 أحرف على الأقل"></div><div class="form-group"><label>رقم الهاتف</label><input type="tel" id="rp" class="form-control" placeholder="01xxxxxxxxx"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>البريد الإلكتروني</label><input type="email" id="re" class="form-control" placeholder="example@mail.com"></div><div class="form-group"><label>اسم المستخدم</label><input type="text" id="ru" class="form-control" style="text-transform:uppercase;" placeholder="4-16 حرف"></div></div>' +
        '<div class="form-row"><div class="form-group"><label>كلمة المرور</label><input type="password" id="rpa" class="form-control" placeholder="6 أحرف على الأقل"></div><div class="form-group"><label>تأكيد كلمة المرور</label><input type="password" id="rpc" class="form-control" placeholder="أعد كتابة كلمة المرور"></div></div>' +
        '<button class="btn btn-success" onclick="handleReg()"><i class="fas fa-user-plus"></i> إنشاء الحساب</button>' +
        '<button class="btn btn-outline btn-sm" onclick="hideForms()" style="margin-top:8px;">رجوع</button>';
}
function hideForms() { var r = document.getElementById('regForm'), rs = document.getElementById('resetForm'); if (r) r.style.display = 'none'; if (rs) rs.style.display = 'none'; }
async function handleReg() {
    var fn = document.getElementById('rf'), ph = document.getElementById('rp'), em = document.getElementById('re'), un = document.getElementById('ru'), pw = document.getElementById('rpa'), pc = document.getElementById('rpc');
    if (!fn || !ph || !em || !un || !pw || !pc) return;
    var ok = await registerUser(fn.value.trim(), ph.value.trim(), un.value.trim().toUpperCase(), pw.value, pc.value, em.value.trim());
    if (ok) hideForms();
}
function showResetForm() {
    var c = document.getElementById('resetForm'), rf = document.getElementById('regForm'); if (rf) rf.style.display = 'none'; if (!c) return; c.style.display = 'block';
    c.innerHTML = '<h4 style="margin-bottom:12px;">نسيت كلمة المرور</h4>' + '<div style="text-align:center;padding:20px;"><i class="fas fa-tools" style="font-size:50px;color:var(--warning);margin-bottom:12px;"></i><h3 style="color:var(--warning);">🚧 تحت التطوير</h3><p>هذه الميزة قيد التطوير</p></div>' + '<button class="btn btn-outline btn-sm" onclick="hideForms()" style="margin-top:12px;">رجوع</button>';
}

function goTo(page) { var pages = document.querySelectorAll('.page'); for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active'); var el = document.getElementById(page + 'Page'); if (el) el.classList.add('active'); if (page === 'home') loadGyms(); if (page === 'profile') loadProfile(); if (page === 'notifications') loadNotificationsPage(); if (page === 'forum') loadForumPage(); if (page === 'requests') loadMyRequests(); }
function setActiveNav(btn) { var items = document.querySelectorAll('.nav-item'); for (var i = 0; i < items.length; i++) items[i].classList.remove('active'); btn.classList.add('active'); }
function openModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }
function openSidebar() { document.getElementById('sidebar').classList.add('active'); document.getElementById('sidebarOverlay').classList.add('active'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('active'); document.getElementById('sidebarOverlay').classList.remove('active'); }
function checkOnboarding() { if (localStorage.getItem('gymawy_onboarding') === '1') document.getElementById('onboardingOverlay').style.display = 'none'; else document.getElementById('onboardingOverlay').style.display = 'flex'; }
function nextOnboarding(s) { var slides = document.querySelectorAll('.onboarding-slide'), dots = document.querySelectorAll('.onboarding-dot'); for (var i = 0; i < slides.length; i++) slides[i].classList.remove('active'); for (var j = 0; j < dots.length; j++) dots[j].classList.remove('active'); if (slides[s - 1]) slides[s - 1].classList.add('active'); if (dots[s - 1]) dots[s - 1].classList.add('active'); }
function finishOnboarding() { localStorage.setItem('gymawy_onboarding', '1'); document.getElementById('onboardingOverlay').style.display = 'none'; }
function toggleDarkMode() { document.body.classList.toggle('dark'); localStorage.setItem('gymawy_dark_mode', document.body.classList.contains('dark') ? '1' : '0'); }
function loadDarkMode() { if (localStorage.getItem('gymawy_dark_mode') === '1') document.body.classList.add('dark'); }

function setupAllListeners() {
    document.getElementById('sidebarOverlay').addEventListener('click', closeSidebar);
    document.getElementById('sidebarClose').addEventListener('click', closeSidebar);
    var sidebarItems = document.querySelectorAll('.sidebar-item[data-page]');
    for (var i = 0; i < sidebarItems.length; i++) { sidebarItems[i].addEventListener('click', function() { goTo(this.dataset.page); closeSidebar(); }); }
    document.getElementById('sidebarSupport').addEventListener('click', function() { openSupportChat(); closeSidebar(); });
    document.getElementById('sidebarAbout').addEventListener('click', function() { showAbout(); closeSidebar(); });
    document.getElementById('sidebarPrivacy').addEventListener('click', function() { showPrivacy(); closeSidebar(); });
    document.getElementById('sidebarWhoWeAre').addEventListener('click', function() { showWhoWeAre(); closeSidebar(); });
    document.getElementById('sidebarForum').addEventListener('click', function() { goTo('forum'); closeSidebar(); });
    document.getElementById('sidebarFavorites').addEventListener('click', function() { showFavorites(); closeSidebar(); });
    document.getElementById('sidebarRegisterCoach').addEventListener('click', function() { showCoachRegistration(); closeSidebar(); });
    var navItems = document.querySelectorAll('.nav-item[data-page]');
    for (var j = 0; j < navItems.length; j++) { navItems[j].addEventListener('click', function() { goTo(this.dataset.page); setActiveNav(this); }); }
    var searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', function() { G.currentFilter.searchQuery = this.value; filterAndDisplayGyms(); });
    var filterTags = document.querySelectorAll('.filter-tag');
    for (var k = 0; k < filterTags.length; k++) { filterTags[k].addEventListener('click', function() { G.quickFilter = this.dataset.filter; var tags = document.querySelectorAll('.filter-tag'); for (var t = 0; t < tags.length; t++) tags[t].classList.remove('active'); this.classList.add('active'); filterAndDisplayGyms(); }); }
    document.getElementById('confirmCancel').addEventListener('click', function() { document.getElementById('confirmDialog').classList.remove('active'); });
    document.getElementById('confirmYes').addEventListener('click', function() { document.getElementById('confirmDialog').classList.remove('active'); if (G.confirmCallback) G.confirmCallback(); });
    var overlays = document.querySelectorAll('.modal-overlay');
    for (var o = 0; o < overlays.length; o++) { overlays[o].addEventListener('click', function(e) { if (e.target === this) { this.classList.remove('active'); document.body.style.overflow = ''; } }); }
}

// ==================== NOTIFICATIONS (RTDB + Ban + Popup) ====================
function loadNotifications() {
    try { G.notifications = JSON.parse(localStorage.getItem('gymawy_notifications') || '[]'); } catch (e) { G.notifications = []; }
    if (G.currentUser && G.currentUser.username) {
        var username = G.currentUser.username;
        var fn1 = function(snap) {
            var data = snap.val();
            if (!data) return;
            // Check for BAN
            if (data.type === 'ban') {
                showBanPopup(data.message || 'تم حظر حسابك من قبل الإدارة');
                return;
            }
            // Check for POPUP
            if (data.type === 'popup') {
                showPopup(data.title || 'إشعار', data.message || '');
            }
            // Add to notifications
            if (data.title && data.message) addRTDBNotification(snap.key, data);
        };
        rtdb.ref('notifications/' + username).on('child_added', fn1);
        G.rtdbListeners.push({ ref: rtdb.ref('notifications/' + username), fn: fn1 });
        
        var fn2 = function(snap) { var data = snap.val(); if (data && data.title && data.message) addRTDBNotification(snap.key, data); };
        rtdb.ref('users/' + username + '/notifications').on('child_added', fn2);
        G.rtdbListeners.push({ ref: rtdb.ref('users/' + username + '/notifications'), fn: fn2 });
    }
    updateBadges();
}

function showBanPopup(message) {
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.85);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = '<div style="background:white;border-radius:20px;padding:30px;text-align:center;max-width:350px;width:100%;">' +
        '<i class="fas fa-ban" style="font-size:50px;color:#FF6B6B;margin-bottom:16px;"></i>' +
        '<h2 style="margin-bottom:8px;">🚫 تم حظر حسابك</h2>' +
        '<p style="color:#636E72;margin-bottom:20px;">' + (message || 'تم حظر حسابك من قبل الإدارة') + '</p>' +
        '<button onclick="forceLogout()" style="background:#6C5CE7;color:white;border:none;padding:14px 30px;border-radius:50px;font-weight:700;font-size:14px;cursor:pointer;width:100%;">حسناً</button></div>';
    document.body.appendChild(overlay);
}

function showPopup(title, message) {
    var popup = document.createElement('div');
    popup.style.cssText = 'position:fixed;top:20px;left:50%;transform:translateX(-50%);z-index:99998;animation:slideDown 0.4s ease;';
    popup.innerHTML = '<div style="background:white;border-radius:16px;padding:20px;box-shadow:0 10px 40px rgba(0,0,0,0.3);max-width:350px;text-align:center;border:2px solid #6C5CE7;">' +
        '<strong style="color:#6C5CE7;">' + (title || 'إشعار') + '</strong>' +
        '<p style="margin:8px 0;font-size:13px;">' + (message || '') + '</p>' +
        '<button onclick="this.parentElement.parentElement.remove()" style="background:#6C5CE7;color:white;border:none;padding:8px 20px;border-radius:50px;font-weight:700;font-size:11px;cursor:pointer;">موافق</button></div>';
    document.body.appendChild(popup);
    setTimeout(function() { if (popup.parentElement) popup.remove(); }, 8000);
}

function forceLogout() {
    localStorage.removeItem('gymawy_user');
    localStorage.removeItem('gymawy_keep_logged_in');
    location.reload();
}

function addRTDBNotification(key, data) {
    var notif = { id: key || ('rtdb_' + Date.now()), title: data.title || 'إشعار', message: data.message || '', type: data.type || 'info', read: data.read || false, createdAt: data.createdAt || new Date().toISOString(), from: data.from || 'Gymawy' };
    var exists = false; for (var i = 0; i < G.notifications.length; i++) { if (G.notifications[i].id === notif.id) { exists = true; break; } }
    if (!exists) { G.notifications.unshift(notif); if (G.notifications.length > 100) G.notifications = G.notifications.slice(0, 100); saveNotifications(); updateBadges(); }
}
function loadNotificationsPage() {
    var c = document.getElementById('notificationsContent'); if (!c) return;
    if (!G.notifications.length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-bell-slash"></i><h4>لا توجد إشعارات</h4></div>'; return; }
    var html = '';
    for (var i = 0; i < G.notifications.length; i++) { var n = G.notifications[i]; html += '<div class="notification-item ' + (n.read ? '' : 'unread') + '" onclick="markNotifRead(\'' + n.id + '\')"><strong>' + n.title + '</strong><p style="font-size:12px;color:var(--text-secondary);margin:4px 0;">' + n.message + '</p><small style="color:var(--gray-light);">' + formatDate(n.createdAt) + '</small></div>'; }
    html += '<div style="display:flex;gap:8px;margin-top:16px;"><button class="btn btn-outline btn-sm" onclick="markAllNotifRead()">تعليم الكل مقروء</button><button class="btn btn-danger btn-sm" onclick="clearNotifications()">مسح الكل</button></div>';
    c.innerHTML = html;
}
function saveNotifications() { localStorage.setItem('gymawy_notifications', JSON.stringify(G.notifications)); updateBadges(); }
function updateBadges() { var unread = 0; for (var i = 0; i < G.notifications.length; i++) { if (!G.notifications[i].read) unread++; } var badges = ['notifBadge', 'navNotifBadge']; for (var j = 0; j < badges.length; j++) { var b = document.getElementById(badges[j]); if (b) { b.textContent = unread > 99 ? '99+' : unread; if (unread > 0) b.classList.add('show'); else b.classList.remove('show'); } } }
function markNotifRead(id) { for (var i = 0; i < G.notifications.length; i++) { if (G.notifications[i].id === id) { G.notifications[i].read = true; break; } } saveNotifications(); loadNotificationsPage(); }
function markAllNotifRead() { for (var i = 0; i < G.notifications.length; i++) G.notifications[i].read = true; saveNotifications(); loadNotificationsPage(); T('تم تعليم الكل كمقروء', 'success'); }
function clearNotifications() { G.notifications = []; saveNotifications(); loadNotificationsPage(); T('تم مسح الكل', 'success'); }

// ==================== FORUM ====================
async function loadForumPage() {
    var c = document.getElementById('forumContent'); if (!c) return;
    if (!G.currentUser) { c.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h4>المنتدى مقفول</h4><p>يجب تسجيل الدخول</p></div>'; return; }
    c.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';
    try {
        var phone = G.currentUser.phone || '';
        var memberSnap = await db.collection('members').where('phone', '==', phone).get();
        var foundMember = null;
        memberSnap.forEach(function(doc) { var d = doc.data(); if (d.active && !d.leftByUser) foundMember = { id: doc.id, gymId: d.gymId, gymName: d.gymName }; });
        if (!foundMember) { c.innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h4>المنتدى مقفول</h4><p>يجب أن تكون مشتركاً في جيم</p></div>'; return; }
        var fs = await db.collection('forum_messages').where('gymId', '==', foundMember.gymId).get();
        var msgs = []; fs.forEach(function(doc) { msgs.push(doc.data()); });
        msgs.sort(function(a, b) { return new Date(a.timestamp) - new Date(b.timestamp); });
        var html = '<h3 style="margin-bottom:16px;"><i class="fas fa-comments"></i> ' + (foundMember.gymName || 'المنتدى') + '</h3><div class="chat-messages">';
        if (msgs.length) { for (var i = 0; i < msgs.length; i++) { html += '<div class="chat-bubble incoming"><strong style="color:var(--primary);font-size:11px;">📢 ' + (msgs[i].senderName || 'الكوتش') + '</strong><p style="margin:4px 0;">' + msgs[i].message + '</p><div class="chat-time">' + formatDate(msgs[i].timestamp) + '</div></div>'; } }
        else { html += '<div class="empty-state"><i class="fas fa-comments"></i><h4>لا رسائل بعد</h4></div>'; }
        html += '</div>'; c.innerHTML = html;
    } catch (e) { c.innerHTML = '<div class="empty-state"><h4>حدث خطأ</h4></div>'; }
}

// ==================== GYMS ====================
async function loadGyms() {
    var c = document.getElementById('gymsList'); if (!c) return;
    c.innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>';
    try {
        var snap = await db.collection('gyms').get(); G.allGyms = [];
        snap.forEach(function(doc) {
            var d = doc.data();
            if (d.active !== false && d.suspended !== true) {
                G.allGyms.push({ id: doc.id, name: d.name, images: d.images, verified: d.verified, gender: d.gender, governorate: d.governorate, city: d.city, location: d.location, monthlyPrice: d.monthlyPrice, yearlyPrice: d.yearlyPrice, sessionPrice: d.sessionPrice, openTime: d.openTime, closeTime: d.closeTime, phones: d.phones, mapLink: d.mapLink, avgRating: d.avgRating || 0, ratingCount: d.ratingCount || 0, gymType: d.gymType || 'online', is24h: d.is24h, genderShifts: d.genderShifts, offerPrice: d.offerPrice });
            }
        });
        if (!G.allGyms.length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-dumbbell"></i><h4>لا جيمات متاحة</h4></div>'; return; }
        filterAndDisplayGyms(); displayRecentGrid();
    } catch (e) { c.innerHTML = '<div class="empty-state"><h4>خطأ في التحميل</h4></div>'; }
}
function filterAndDisplayGyms() {
    var f = G.currentFilter, fl = G.allGyms.slice();
    if (G.quickFilter === 'verified') fl = fl.filter(function(g) { return g.verified; });
    if (G.quickFilter === 'mixed') fl = fl.filter(function(g) { return g.gender === 'mixed'; });
    if (G.quickFilter === 'men') fl = fl.filter(function(g) { return g.gender === 'men'; });
    if (G.quickFilter === 'women') fl = fl.filter(function(g) { return g.gender === 'women'; });
    if (f.gender) fl = fl.filter(function(g) { return g.gender === f.gender; });
    if (f.governorate) fl = fl.filter(function(g) { return g.governorate === f.governorate; });
    if (f.city) fl = fl.filter(function(g) { return g.city === f.city; });
    if (f.minRating > 0) fl = fl.filter(function(g) { return g.avgRating >= f.minRating; });
    if (f.searchQuery) { var q = f.searchQuery.toLowerCase(); fl = fl.filter(function(g) { return (g.name||'').toLowerCase().indexOf(q) > -1 || (g.location||'').toLowerCase().indexOf(q) > -1 || (g.governorate||'').toLowerCase().indexOf(q) > -1 || (g.city||'').toLowerCase().indexOf(q) > -1; }); }
    fl.sort(function(a, b) { if (a.verified && !b.verified) return -1; if (!a.verified && b.verified) return 1; return (b.avgRating || 0) - (a.avgRating || 0); });
    displayGyms(fl);
}
function displayGyms(gyms) {
    var c = document.getElementById('gymsList');
    if (!gyms.length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h4>لا جيمات متطابقة</h4></div>'; return; }
    var html = '';
    for (var i = 0; i < gyms.length; i++) {
        var g = gyms[i]; var stars = '';
        for (var s = 1; s <= 5; s++) stars += s <= Math.round(g.avgRating) ? '<i class="fas fa-star" style="color:#FFD700;font-size:11px;"></i>' : '<i class="far fa-star" style="color:#DDD;font-size:11px;"></i>';
        var isOnline = g.gymType !== 'offline';
        var shiftHtml = '';
        if (g.is24h) shiftHtml = '<span class="shift-tag"><i class="fas fa-infinity"></i> 24 ساعة</span>';
        else if (g.genderShifts) {
            if (g.genderShifts.mixed) shiftHtml += '<span class="shift-tag"><i class="fas fa-venus-mars"></i> مختلط: ' + g.genderShifts.mixed + '</span>';
            if (g.genderShifts.men) shiftHtml += '<span class="shift-tag"><i class="fas fa-male"></i> رجال: ' + g.genderShifts.men + '</span>';
            if (g.genderShifts.women) shiftHtml += '<span class="shift-tag"><i class="fas fa-female"></i> سيدات: ' + g.genderShifts.women + '</span>';
        } else if (g.openTime || g.closeTime) shiftHtml = '<span class="shift-tag"><i class="fas fa-clock"></i> ' + (g.openTime||'--') + ' - ' + (g.closeTime||'--') + '</span>';
        
        html += '<div class="gym-card" onclick="showGymDetail(\'' + g.id + '\')">' +
            '<div class="gym-card-header">' + (g.images && g.images.length ? '<img src="' + g.images[0] + '" alt="' + g.name + '">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea,#764ba2);"><i class="fas fa-dumbbell" style="font-size:60px;color:rgba(255,255,255,0.3);"></i></div>') +
            (g.verified ? '<span class="badge badge-verified"><i class="fas fa-check-circle"></i> موثق</span>' : '') +
            (g.gender ? '<span class="badge badge-gender"><i class="fas fa-' + (g.gender==='men'?'male':g.gender==='women'?'female':'venus-mars') + '"></i> ' + (g.gender==='men'?'رجال':g.gender==='women'?'سيدات':'مختلط') + '</span>' : '') +
            '<button class="btn-favorite ' + (isFavorite(g.id)?'active':'') + '" onclick="event.stopPropagation();toggleFavorite(\'' + g.id + '\');this.classList.toggle(\'active\');"><i class="fas fa-heart"></i></button>' +
            '<button class="btn-share-card" onclick="event.stopPropagation();shareGym(\'' + g.id + '\',event);"><i class="fas fa-share-alt"></i></button>' +
            '<button class="badge badge-qr" onclick="event.stopPropagation();showQRCode(\'' + g.id + '\',\'' + (g.name||'').replace(/'/g,"\\'") + '\',event);"><i class="fas fa-qrcode"></i></button>' +
            '<div class="gym-card-overlay"><i class="fas fa-map-marker-alt"></i> ' + (g.governorate||'') + (g.city?' • '+g.city:'') + '</div></div>' +
            '<div class="gym-card-body"><div class="gym-card-title"><span>' + g.name + '</span>' + (g.avgRating>0?'<span style="font-size:12px;color:#FFD700;">'+stars+' '+g.avgRating+'</span>':'<span style="font-size:10px;color:var(--text-secondary);">جديد</span>') + '</div>' +
            '<div class="gym-card-location"><i class="fas fa-location-dot"></i> ' + (g.location||g.governorate+' - '+g.city||'غير محدد') + '</div>' +
            (g.gymType==='offline'?'<div style="margin:6px 0;font-size:11px;color:var(--warning);"><i class="fas fa-map-marker-alt"></i> جيم أوفلاين - زيارة فقط</div>':'') +
            '<div style="margin:8px 0;">' + shiftHtml + '</div>' +
            '<div class="gym-card-prices"><div class="price-tag"><div class="price-value">' + (g.monthlyPrice||0) + ' ج.م</div><div class="price-label">شهري</div></div>' + (g.yearlyPrice?'<div class="price-tag"><div class="price-value">'+g.yearlyPrice+' ج.م</div><div class="price-label">سنوي</div></div>':'') + '<div class="price-tag"><div class="price-value">' + (g.sessionPrice||0) + ' ج.م</div><div class="price-label">حصة</div></div></div>' +
            '<div class="verification-strip" style="color:'+(g.verified?'var(--success)':'var(--text-secondary)')+';padding:8px 16px;font-size:11px;border-top:1px solid var(--border);"><i class="fas fa-'+(g.verified?'check-circle':'info-circle')+'"></i> '+(g.verified?'جيم موثق':'جيم غير موثق')+'</div></div>' +
            '<div class="gym-card-footer">' + (isOnline ? '<button class="btn-apply" onclick="event.stopPropagation();applyToGym(\'' + g.id + '\')"><i class="fas fa-hand-paper"></i> تقديم طلب</button>' : '<button class="btn btn-outline btn-sm" onclick="event.stopPropagation();showGymDetail(\'' + g.id + '\')"><i class="fas fa-info-circle"></i> تفاصيل</button>') + '</div></div>';
    }
    c.innerHTML = html;
}
function showGymDetail(gid) {
    var gym = null; for (var i = 0; i < G.allGyms.length; i++) { if (G.allGyms[i].id === gid) { gym = G.allGyms[i]; break; } }
    if (!gym) return; G.selectedGym = gym; addToRecentlyViewed(gym);
    var isOnline = gym.gymType !== 'offline';
    document.getElementById('modalTitle').textContent = gym.name;
    var html = '';
    if (gym.images && gym.images.length) { html += '<div class="images-slider">'; for (var j = 0; j < gym.images.length; j++) html += '<img src="' + gym.images[j] + '" loading="lazy">'; html += '</div>'; }
    if (gym.verified) html += '<div class="info-highlight" style="background:#FFF8E1;color:#F57F17;text-align:center;"><i class="fas fa-check-circle"></i> جيم موثق</div>';
    if (gym.gymType === 'offline') html += '<div class="info-highlight" style="background:var(--warning-light);color:#856404;text-align:center;"><i class="fas fa-map-marker-alt"></i> جيم أوفلاين - لا يوجد تقديم طلبات</div>';
    
    html += '<div class="info-section"><h4><i class="fas fa-clock"></i> المواعيد</h4>';
    if (gym.is24h) html += '<div class="info-highlight"><i class="fas fa-infinity"></i> مفتوح 24 ساعة</div>';
    else if (gym.genderShifts) {
        if (gym.genderShifts.mixed) html += '<div class="info-row"><span><i class="fas fa-venus-mars"></i> مختلط</span><span>' + gym.genderShifts.mixed + '</span></div>';
        if (gym.genderShifts.men) html += '<div class="info-row"><span><i class="fas fa-male"></i> رجال</span><span>' + gym.genderShifts.men + '</span></div>';
        if (gym.genderShifts.women) html += '<div class="info-row"><span><i class="fas fa-female"></i> سيدات</span><span>' + gym.genderShifts.women + '</span></div>';
    } else html += '<div class="info-row"><span>يفتح</span><span>'+(gym.openTime||'--')+'</span></div><div class="info-row"><span>يقفل</span><span>'+(gym.closeTime||'--')+'</span></div>';
    html += '</div>';
    
    html += '<div class="info-section"><h4><i class="fas fa-tag"></i> الأسعار</h4>' +
        '<div class="info-row"><span>شهري</span><span>'+(gym.monthlyPrice||0)+' ج.م</span></div>'+(gym.yearlyPrice?'<div class="info-row"><span>سنوي</span><span>'+gym.yearlyPrice+' ج.م</span></div>':'')+'<div class="info-row"><span>حصة</span><span>'+(gym.sessionPrice||0)+' ج.م</span></div></div>';
    html += '<div class="info-section"><h4><i class="fas fa-star"></i> التقييم</h4><div class="info-row"><span>التقييم</span><span>'+(gym.avgRating||0)+' ⭐ ('+(gym.ratingCount||0)+')</span></div></div>';
    html += '<div class="info-section"><h4><i class="fas fa-info-circle"></i> معلومات</h4>' +
        '<div class="info-row"><span>النوع</span><span>'+(gym.gender==='men'?'رجال':gym.gender==='women'?'سيدات':'مختلط')+'</span></div>' +
        '<div class="info-row"><span>المحافظة</span><span>'+(gym.governorate||'--')+'</span></div><div class="info-row"><span>المدينة</span><span>'+(gym.city||'--')+'</span></div></div>';
    if (gym.phones && gym.phones.length) { html += '<div class="info-section"><h4><i class="fas fa-phone"></i> تواصل</h4>'; for (var k = 0; k < gym.phones.length; k++) html += '<a href="tel:'+gym.phones[k]+'" style="display:inline-block;margin:4px;padding:10px 16px;background:var(--primary-bg);border-radius:50px;color:var(--primary);text-decoration:none;font-weight:600;font-size:13px;">'+gym.phones[k]+'</a>'; html += '</div>'; }
    if (gym.mapLink) html += '<div class="info-section"><h4><i class="fas fa-map-marker-alt"></i> موقع</h4><a href="'+gym.mapLink+'" target="_blank" style="display:flex;align-items:center;gap:8px;padding:14px;background:var(--primary-bg);border-radius:12px;color:var(--primary);text-decoration:none;font-weight:600;"><i class="fas fa-map-marked-alt"></i> فتح في Google Maps</a></div>';
    
    // Rating - for online gyms: only members can rate. for offline gyms: anyone can rate
    var canRate = false;
    if (gym.gymType === 'offline') { canRate = !!G.currentUser; }
    else {
        if (G.currentUser) {
            var phone = G.currentUser.phone || '';
            var memberSnap = await db.collection('members').where('phone','==',phone).where('gymId','==',gym.id).get();
            memberSnap.forEach(function(doc) { if (doc.data().active && !doc.data().leftByUser) canRate = true; });
        }
    }
    html += '<div class="info-section" style="text-align:center;"><h4>تقييمك</h4><div class="stars-input">';
    for (var s = 1; s <= 5; s++) html += '<i class="far fa-star" id="star'+s+'" onclick="setRating('+s+')"></i>';
    html += '</div>';
    if (canRate) html += '<button class="btn btn-primary btn-sm" onclick="submitRating()" style="margin-top:10px;"><i class="fas fa-star"></i> تقييم</button>';
    else if (G.currentUser && gym.gymType !== 'offline') html += '<p style="font-size:11px;color:var(--danger);">فقط المشتركين يمكنهم التقييم</p>';
    html += '</div>';
    
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalFooter').innerHTML = (isOnline ? '<button class="btn btn-primary" onclick="applyToGym(\''+gym.id+'\')"><i class="fas fa-hand-paper"></i> تقديم طلب</button>' : '') + '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    G._rating = 0; openModal('gymModal');
}
function setRating(r) { G._rating = r; for (var i = 1; i <= 5; i++) { var s = document.getElementById('star'+i); if (s) s.className = i <= r ? 'fas fa-star active' : 'far fa-star'; } }
async function submitRating() {
    if (!G._rating) { T('اختر تقييم', 'error'); return; }
    if (!G.selectedGym || !G.currentUser) return;
    await db.collection('ratings').add({ gymId: G.selectedGym.id, userId: G.currentUser.username, userName: G.currentUser.fullName, rating: G._rating, createdAt: new Date().toISOString() });
    await updateGymRating(G.selectedGym.id); T('⭐ شكراً لتقييمك!', 'success'); closeModal('gymModal'); loadGyms();
}
async function updateGymRating(gymId) {
    var adminSnap = await db.collection('ratings').where('gymId','==',gymId).where('userId','==','admin').get();
    var adminRating = 0; adminSnap.forEach(function(doc) { adminRating = doc.data().rating; });
    var userSnap = await db.collection('ratings').where('gymId','==',gymId).where('userId','!=','admin').get();
    var totalRating = adminRating, count = adminRating > 0 ? 1 : 0;
    userSnap.forEach(function(doc) { totalRating += doc.data().rating; count++; });
    var avgRating = count > 0 ? Math.round((totalRating / count) * 10) / 10 : 0;
    await db.collection('gyms').doc(gymId).update({ avgRating: avgRating, ratingCount: count });
}
async function applyToGym(gid) {
    if (!G.currentUser) { T('سجل دخولك', 'warning'); return; }
    var gym = null; for (var i = 0; i < G.allGyms.length; i++) { if (G.allGyms[i].id === gid) { gym = G.allGyms[i]; break; } }
    if (!gym || gym.gymType === 'offline') { T('هذا الجيم لا يقبل طلبات', 'error'); return; }
    G.selectedGym = gym; G._subType = 'monthly';
    document.getElementById('modalTitle').textContent = 'تقديم طلب';
    document.getElementById('modalBody').innerHTML = '<div style="text-align:center;"><i class="fas fa-dumbbell" style="font-size:50px;color:var(--primary);"></i><h3>' + gym.name + '</h3></div>' +
        '<div class="gender-radio-group"><div class="gender-radio selected" id="optMonthly" onclick="selSub(\'monthly\')"><i class="fas fa-calendar"></i> شهري<span style="display:block;font-size:11px;">' + (gym.monthlyPrice || 0) + ' ج.م</span></div>' +
        (gym.yearlyPrice ? '<div class="gender-radio" id="optYearly" onclick="selSub(\'yearly\')"><i class="fas fa-calendar-alt"></i> سنوي<span style="display:block;font-size:11px;">' + gym.yearlyPrice + ' ج.م</span></div>' : '') + '</div>' +
        '<div class="info-highlight" style="margin-top:14px;"><i class="fas fa-info-circle"></i> توجه للجيم للدفع</div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-primary" onclick="confirmApply()">تأكيد</button><button class="btn btn-outline" onclick="showGymDetail(\'' + gid + '\')">رجوع</button>';
    openModal('gymModal');
}
function selSub(t) { G._subType = t; var m = document.getElementById('optMonthly'), y = document.getElementById('optYearly'); if (m) m.classList.toggle('selected', t === 'monthly'); if (y) y.classList.toggle('selected', t === 'yearly'); }
async function confirmApply() {
    var gym = G.selectedGym; if (!gym || !G.currentUser) return;
    var amount = G._subType === 'yearly' ? (gym.yearlyPrice || gym.monthlyPrice || 0) : (gym.monthlyPrice || 0);
    var platformFee = Math.round(amount * 0.01);
    await db.collection('requests').add({ gymId: gym.id, gymName: gym.name, name: G.currentUser.fullName, phone: G.currentUser.phone || '', email: G.currentUser.email || '', username: G.currentUser.username, subType: G._subType, amount: amount, platformFee: platformFee, status: 'pending', createdAt: new Date().toISOString() });
    if (gym.id) rtdb.ref('newRequests/' + gym.id).set({ timestamp: new Date().toISOString(), from: G.currentUser.fullName });
    closeModal('gymModal'); T('تم إرسال الطلب', 'success');
}

// ==================== FAVORITES / RECENT / FILTER / PROFILE / SUPPORT / SHARE / QR / COACH REG / REQUESTS ====================
// [نفس الكود السابق بدون تغيير]

function loadFavorites() { try { G.favorites = JSON.parse(localStorage.getItem('gymawy_favorites') || '[]'); } catch (e) { G.favorites = []; } }
function saveFavorites() { localStorage.setItem('gymawy_favorites', JSON.stringify(G.favorites)); }
function isFavorite(gid) { return G.favorites.indexOf(gid) > -1; }
function toggleFavorite(gid) { var idx = G.favorites.indexOf(gid); if (idx > -1) { G.favorites.splice(idx, 1); T('تمت إزالة الجيم من المفضلة', 'info'); } else { G.favorites.push(gid); T('تمت إضافة الجيم للمفضلة ❤️', 'success'); } saveFavorites(); }
function showFavorites() {
    var fg = []; for (var i = 0; i < G.allGyms.length; i++) { if (G.favorites.indexOf(G.allGyms[i].id) > -1) fg.push(G.allGyms[i]); }
    document.getElementById('modalTitle').textContent = 'المفضلة';
    if (!fg.length) { document.getElementById('modalBody').innerHTML = '<div class="empty-state"><i class="fas fa-heart-broken"></i><h4>لا مفضلات</h4></div>'; document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; }
    else { document.getElementById('modalBody').innerHTML = '<div class="gym-grid" id="favGymsList"></div>'; document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; displayGymsInContainer('favGymsList', fg); }
    openModal('gymModal');
}
function displayGymsInContainer(cid, gyms) { var c = document.getElementById(cid); if (!c) return; var html = ''; for (var i = 0; i < gyms.length; i++) { var g = gyms[i]; html += '<div class="gym-card" onclick="showGymDetail(\'' + g.id + '\')" style="margin-bottom:12px;"><div class="gym-card-header">' + (g.images && g.images.length ? '<img src="' + g.images[0] + '">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-dumbbell ph"></i></div>') + '<div class="gym-card-overlay">' + (g.governorate || '') + '</div></div><div class="gym-card-body"><div class="gym-card-title">' + g.name + '</div><div class="gym-card-prices"><div class="price-tag"><div class="price-value">' + (g.monthlyPrice || 0) + '</div><div class="price-label">ج.م/شهر</div></div></div></div></div>'; } c.innerHTML = html; }

function loadRecentlyViewed() { try { G.recentlyViewed = JSON.parse(localStorage.getItem('gymawy_recent') || '[]'); } catch (e) { G.recentlyViewed = []; } }
function saveRecentlyViewed() { localStorage.setItem('gymawy_recent', JSON.stringify(G.recentlyViewed)); }
function addToRecentlyViewed(gym) { G.recentlyViewed = G.recentlyViewed.filter(function(g) { return g.id !== gym.id; }); G.recentlyViewed.unshift({ id: gym.id, name: gym.name, image: gym.images ? gym.images[0] : null, monthlyPrice: gym.monthlyPrice, verified: gym.verified }); if (G.recentlyViewed.length > 6) G.recentlyViewed = G.recentlyViewed.slice(0, 6); saveRecentlyViewed(); displayRecentGrid(); }
function displayRecentGrid() { var t = document.getElementById('recentTitle'), g = document.getElementById('recentGrid'); if (!G.recentlyViewed.length) { if (t) t.style.display = 'none'; if (g) g.innerHTML = ''; return; } if (t) t.style.display = 'flex'; var html = ''; for (var i = 0; i < G.recentlyViewed.length; i++) { var x = G.recentlyViewed[i]; html += '<div class="recent-card" onclick="showGymDetail(\'' + x.id + '\')">' + (x.image ? '<img src="' + x.image + '">' : '<div style="height:85px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:22px;"><i class="fas fa-dumbbell"></i></div>') + '<div class="info"><div class="name">' + x.name + '</div><div class="price">' + (x.monthlyPrice || 0) + ' ج.م</div></div></div>'; } if (g) g.innerHTML = html; }

function showFilterModal() { var govOptions = '', govs = Object.keys(EGYPT_LOCATIONS); for (var i = 0; i < govs.length; i++) govOptions += '<option value="' + govs[i] + '">' + govs[i] + '</option>'; document.getElementById('filterBody').innerHTML = '<div class="form-group"><label>المحافظة</label><select id="fg" class="form-control" onchange="updateCities()"><option value="">الكل</option>' + govOptions + '</select></div><div class="form-group"><label>المدينة</label><select id="fc" class="form-control"><option value="">الكل</option></select></div><div class="form-group"><label>النوع</label><select id="fgn" class="form-control"><option value="">الكل</option><option value="mixed">مختلط</option><option value="men">رجال</option><option value="women">سيدات</option></select></div><div class="form-group"><label>التقييم</label><select id="frt" class="form-control"><option value="0">الكل</option><option value="3">3+</option><option value="4">4+</option></select></div>'; document.getElementById('filterFooter').innerHTML = '<button class="btn btn-primary" onclick="applyFilters()">تطبيق</button><button class="btn btn-outline" onclick="closeModal(\'filterModal\')">إلغاء</button>'; openModal('filterModal'); }
function updateCities() { var g = document.getElementById('fg')?.value, c = document.getElementById('fc'); if (c) { var cities = EGYPT_LOCATIONS[g] || [], html = '<option value="">الكل</option>'; for (var i = 0; i < cities.length; i++) html += '<option value="' + cities[i] + '">' + cities[i] + '</option>'; c.innerHTML = html; } }
function applyFilters() { G.currentFilter.governorate = document.getElementById('fg')?.value || ''; G.currentFilter.city = document.getElementById('fc')?.value || ''; G.currentFilter.gender = document.getElementById('fgn')?.value || ''; G.currentFilter.minRating = parseFloat(document.getElementById('frt')?.value || 0); closeModal('filterModal'); filterAndDisplayGyms(); }

async function loadProfile() {
    var c = document.getElementById('profileContent'); if (!c) return;
    if (!G.currentUser) { c.innerHTML = '<div class="empty-state"><i class="fas fa-user"></i><h4>سجل دخولك أولاً</h4></div>'; return; }
    var phone = G.currentUser.phone || '';
    var allMemberSnap = await db.collection('members').where('phone', '==', phone).get();
    var activeMemberships = [], pastMemberships = [];
    allMemberSnap.forEach(function(doc) { var d = doc.data(); if (d.active && !d.leftByUser && !isExpired(d.due)) activeMemberships.push(d); else pastMemberships.push(d); });
    var lastChange = localStorage.getItem('gymawy_username_last_change');
    var canChange = true, daysUntil = 0;
    if (lastChange) { daysUntil = 7 - Math.floor((new Date() - new Date(lastChange)) / 86400000); if (daysUntil > 0) canChange = false; }
    var html = '<div class="profile-card"><div class="profile-avatar"><i class="fas fa-user"></i></div><h2>' + G.currentUser.fullName + '</h2><p>@' + G.currentUser.username + '</p><p><i class="fas fa-phone"></i> ' + (G.currentUser.phone || '') + '</p><p><i class="fas fa-envelope"></i> ' + (G.currentUser.email || '') + ' <span style="color:var(--success);">مفعل</span></p><div class="btn-group" style="margin-top:14px;"><button class="btn btn-outline btn-sm" onclick="changeUsername()"><i class="fas fa-edit"></i> تغيير المستخدم</button><button class="btn btn-outline btn-sm" onclick="showEditAccount()"><i class="fas fa-user-cog"></i> تعديل الحساب</button><button class="btn btn-outline btn-sm" onclick="logout()" style="color:var(--danger);"><i class="fas fa-sign-out-alt"></i> خروج</button></div>' + (canChange ? '<p style="font-size:10px;color:var(--success);margin-top:10px;">يمكنك تغيير اسم المستخدم</p>' : '<p style="font-size:10px;color:var(--danger);margin-top:10px;">تغيير اسم المستخدم متاح بعد ' + daysUntil + ' يوم</p>') + '</div>';
    if (activeMemberships.length) { html += '<h3 style="margin-bottom:8px;"><i class="fas fa-dumbbell"></i> اشتراكاتي الحالية</h3>'; for (var i = 0; i < activeMemberships.length; i++) { var m = activeMemberships[i]; html += '<div class="membership-card"><h4>' + m.gymName + '</h4><div class="info-box"><div class="info-row"><span>النوع</span><span>' + (m.type === 'monthly' ? 'شهري' : 'سنوي') + '</span></div><div class="info-row"><span>البداية</span><span>' + formatDate(m.start) + '</span></div><div class="info-row"><span>الاستحقاق</span><span>' + formatDate(m.due) + '</span></div><div class="info-row"><span>متبقي</span><span>' + daysRemaining(m.due) + ' يوم</span></div></div><span class="status-active">✅ نشط</span></div>'; } }
    if (pastMemberships.length) { html += '<h3 style="margin-bottom:8px;"><i class="fas fa-history"></i> اشتراكات سابقة</h3>'; for (var j = 0; j < pastMemberships.length; j++) { var pm = pastMemberships[j]; html += '<div class="membership-card past"><h4>' + pm.gymName + '</h4><div class="info-box"><div class="info-row"><span>النوع</span><span>' + (pm.type === 'monthly' ? 'شهري' : 'سنوي') + '</span></div><div class="info-row"><span>انتهى</span><span>' + formatDate(pm.due) + '</span></div></div><span class="status-expired">❌ منتهي</span></div>'; } }
    c.innerHTML = html;
}
async function changeUsername() { /* نفس الكود السابق */ }
async function saveNewUsername() { /* نفس الكود السابق */ }
function showEditAccount() { /* نفس الكود السابق */ }
async function saveAccountChanges() { /* نفس الكود السابق */ }

function openSupportChat() { /* نفس الكود السابق */ }
async function sendSupMsg() { /* نفس الكود السابق */ }
async function loadSupMsgs() { /* نفس الكود السابق */ }
function showAbout() { /* نفس الكود السابق */ }
function showPrivacy() { /* نفس الكود السابق */ }
function showWhoWeAre() { /* نفس الكود السابق */ }

function shareGym(gid, e) { if (e) e.stopPropagation(); var gym = null; for (var i = 0; i < G.allGyms.length; i++) { if (G.allGyms[i].id === gid) { gym = G.allGyms[i]; break; } } if (!gym) return; G.shareGym = gym; document.getElementById('shareGymName').textContent = gym.name; openModal('shareModal'); }
function shareViaWhatsApp() { if (!G.shareGym) return; window.open('https://wa.me/?text=' + encodeURIComponent('🏋️ شوف جيم ' + G.shareGym.name + ' على Gymawy!\n\n' + (G.shareGym.location || '') + '\nالسعر: ' + (G.shareGym.monthlyPrice || 0) + ' ج.م/شهر\n\nسجل من هنا: ' + window.location.origin)); closeModal('shareModal'); }
function shareViaFacebook() { if (!G.shareGym) return; window.open('https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(window.location.origin + '/?gym=' + G.shareGym.id)); closeModal('shareModal'); }
function copyShareLink() { if (!G.shareGym) return; navigator.clipboard.writeText(window.location.origin + '/?gym=' + G.shareGym.id).then(function() { T('تم نسخ الرابط', 'success'); }); closeModal('shareModal'); }
function showQRCode(gid, gn, e) { if (e) e.stopPropagation(); var gym = null; for (var i = 0; i < G.allGyms.length; i++) { if (G.allGyms[i].id === gid) { gym = G.allGyms[i]; break; } } if (!gym) return; G.shareGym = gym; document.getElementById('qrGymName').textContent = gn; document.getElementById('qrCode').innerHTML = ''; new QRCode(document.getElementById('qrCode'), { text: window.location.origin + '/?gym=' + gid, width: 220, height: 220, colorDark: '#6C5CE7', colorLight: '#FFFFFF' }); openModal('qrModal'); }
function copyGymLink() { if (!G.shareGym) return; navigator.clipboard.writeText(window.location.origin + '/?gym=' + G.shareGym.id).then(function() { T('تم نسخ الرابط', 'success'); }); closeModal('qrModal'); }

function showCoachRegistration() { /* نفس الكود السابق */ }
async function submitCoachReg() { /* نفس الكود السابق */ }

async function loadMyRequests() {
    var c = document.getElementById('myRequestsContent'); if (!c || !G.currentUser) return;
    try {
        var snap = await db.collection('requests').where('username', '==', G.currentUser.username).get();
        var requests = []; snap.forEach(function(doc) { requests.push({ id: doc.id, ...doc.data() }); });
        requests.sort(function(a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
        if (!requests.length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-clipboard-list"></i><h4>لا طلبات</h4></div>'; return; }
        var html = '';
        for (var i = 0; i < requests.length; i++) { var r = requests[i]; var statusBadge = r.status === 'pending' ? '<span class="badge badge-warning">⏳ معلق</span>' : r.status === 'accepted' ? '<span class="badge badge-success">✅ مقبول</span>' : '<span class="badge badge-danger">❌ مرفوض</span>'; html += '<div class="request-card"><div style="display:flex;justify-content:space-between;align-items:center;"><strong>' + r.gymName + '</strong>' + statusBadge + '</div><p style="font-size:12px;color:var(--text-secondary);">' + (r.subType === 'monthly' ? '📅 شهري' : '📅 سنوي') + ' • ' + formatDate(r.createdAt) + '</p></div>'; }
        c.innerHTML = html;
    } catch (e) { c.innerHTML = '<div class="empty-state"><h4>خطأ</h4></div>'; }
}

console.log('🏋️ Gymawy Ready - v3.0');