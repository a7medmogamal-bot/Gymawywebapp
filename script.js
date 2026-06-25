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
db.enablePersistence().catch(() => {});

const VODAFONE_CASH = "01016212814";

const EGYPT_LOCATIONS = {
    "القاهرة": ["مدينة نصر","مصر الجديدة","المعادي","الزمالك","الشيخ زايد","6 أكتوبر"],
    "الجيزة": ["الدقي","المهندسين","فيصل","الهرم"],
    "الإسكندرية": ["سموحة","سبورتنج","محطة الرمل","المنتزه"],
    "الشرقية": ["الزقازيق","العاشر من رمضان","بلبيس","أبو حماد","منيا القمح","فاقوس","أبو كبير"],
    "الدقهلية": ["المنصورة","طلخا","ميت غمر"],
    "الغربية": ["طنطا","المحلة الكبرى"],
    "القليوبية": ["بنها","شبرا الخيمة","العبور"],
    "بورسعيد": ["بورسعيد"],"السويس": ["السويس"],"الإسماعيلية": ["الإسماعيلية"],
    "دمياط": ["دمياط"],"كفر الشيخ": ["كفر الشيخ"],"الفيوم": ["الفيوم"],
    "بني سويف": ["بني سويف"],"المنيا": ["المنيا"],"أسيوط": ["أسيوط"],
    "سوهاج": ["سوهاج"],"قنا": ["قنا"],"الأقصر": ["الأقصر"],"أسوان": ["أسوان"]
};

const G = {
    currentUser: null, allGyms: [], selectedGym: null,
    currentFilter: { governorate: '', city: '', gender: '', minRating: 0, searchQuery: '' },
    quickFilter: 'all', notifications: [], favorites: [], recentlyViewed: [],
    shareGym: null, confirmCallback: null, _rating: 0, _subType: 'monthly'
};

// ==================== INIT ====================
document.addEventListener('DOMContentLoaded', () => {
    loadUserFromStorage(); loadFavorites(); loadRecentlyViewed();
    loadNotifications(); loadDarkMode(); setupAllListeners();
    document.getElementById('mainHeader').style.display = 'none';
    document.getElementById('mainContainer').style.display = 'none';
    document.getElementById('bottomNav').style.display = 'none';
    document.getElementById('onboardingOverlay').style.display = 'none';
    if (G.currentUser) { showMainApp(); checkOnboarding(); goTo('home'); loadGyms(); }
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
function T(m, t = 'success') { const x = document.getElementById('toast'); if (!x) return; x.textContent = m; x.className = 'toast ' + t + ' show'; clearTimeout(x._t); x._t = setTimeout(() => x.classList.remove('show'), 3000); }
function formatDate(d) { if (!d) return '--'; return new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }); }
function isExpired(d) { return new Date(d) < new Date(); }
function daysRemaining(d) { return Math.ceil((new Date(d) - new Date()) / 86400000); }
function getStarsHTML(r) { let h = ''; for (let i = 1; i <= 5; i++) h += i <= r ? '<i class="fas fa-star" style="color:#FFD700;font-size:11px;"></i>' : '<i class="far fa-star" style="color:#DDD;font-size:11px;"></i>'; return h; }

// ==================== AUTH ====================
function loadUserFromStorage() { try { G.currentUser = JSON.parse(localStorage.getItem('gymawy_user')); } catch (e) { G.currentUser = null; } }
function saveUserToStorage() { G.currentUser ? localStorage.setItem('gymawy_user', JSON.stringify(G.currentUser)) : localStorage.removeItem('gymawy_user'); }

async function registerUser(fn, ph, un, pw, pwc, email) {
    if (!fn || fn.length < 6) { T('الاسم 6 أحرف على الأقل', 'error'); return false; }
    if (!un || un.length < 4) { T('اسم المستخدم 4 أحرف على الأقل', 'error'); return false; }
    if (!ph || ph.length < 10) { T('رقم الهاتف غير صحيح', 'error'); return false; }
    if (!pw || pw.length < 6) { T('كلمة المرور 6 أحرف على الأقل', 'error'); return false; }
    if (pw !== pwc) { T('كلمتا المرور غير متطابقتين', 'error'); return false; }
    if (!email || !email.includes('@')) { T('بريد صحيح مطلوب', 'error'); return false; }
    try {
        const uSnap = await db.collection('users').doc(un).get();
        if (uSnap.exists) { T('اسم المستخدم مستخدم بالفعل', 'error'); return false; }
        const hash = CryptoJS.SHA256(pw).toString();
        await db.collection('users').doc(un).set({ fullName: fn, phone: ph, username: un, passHash: hash, email: email, emailVerified: true, createdAt: new Date().toISOString() });
        G.currentUser = { fullName: fn, phone: ph, username: un, email: email, emailVerified: true };
        saveUserToStorage(); showMainApp(); checkOnboarding(); goTo('home'); loadGyms();
        T('تم إنشاء الحساب بنجاح', 'success'); return true;
    } catch (e) { T('حدث خطأ', 'error'); return false; }
}

async function loginUser(un, pw) {
    if (!un) { T('أدخل اسم المستخدم', 'error'); return false; }
    if (!pw) { T('أدخل كلمة المرور', 'error'); return false; }
    try {
        const snap = await db.collection('users').doc(un).get();
        if (!snap.exists) { T('اسم المستخدم غير موجود', 'error'); return false; }
        const d = snap.data();
        if (d.banned) { T('الحساب محظور', 'error'); return false; }
        if (CryptoJS.SHA256(pw).toString() !== d.passHash) { T('كلمة المرور غير صحيحة', 'error'); return false; }
        G.currentUser = { fullName: d.fullName, phone: d.phone || '', username: un, email: d.email || '', emailVerified: true };
        saveUserToStorage(); showMainApp(); checkOnboarding(); goTo('home'); loadGyms();
        T('أهلاً ' + d.fullName, 'success'); return true;
    } catch (e) { T('حدث خطأ', 'error'); return false; }
}

function logout() { G.currentUser = null; saveUserToStorage(); hideMainApp(); T('تم تسجيل الخروج', 'info'); }

function handleLogin() { loginUser(document.getElementById('loginUsername')?.value?.trim()?.toUpperCase(), document.getElementById('loginPassword')?.value); }

function showRegForm() {
    const c = document.getElementById('regForm'); if (!c) return; c.style.display = 'block';
    c.innerHTML = `<h4>إنشاء حساب جديد</h4>
        <div class="form-row"><div class="form-group"><label>الاسم الرباعي</label><input type="text" id="rf" class="form-control" placeholder="6 أحرف"></div><div class="form-group"><label>رقم الهاتف</label><input type="tel" id="rp" class="form-control" placeholder="01xxxxxxxxx"></div></div>
        <div class="form-row"><div class="form-group"><label>البريد</label><input type="email" id="re" class="form-control" placeholder="example@mail.com"></div><div class="form-group"><label>اسم المستخدم</label><input type="text" id="ru" class="form-control" style="text-transform:uppercase;" placeholder="4-16 حرف"></div></div>
        <div class="form-row"><div class="form-group"><label>كلمة المرور</label><input type="password" id="rpa" class="form-control" placeholder="6 أحرف"></div><div class="form-group"><label>تأكيد</label><input type="password" id="rpc" class="form-control"></div></div>
        <button class="btn btn-success" onclick="handleReg()">إنشاء الحساب</button><button class="btn btn-outline btn-sm" onclick="hideForms()" style="margin-top:8px;">رجوع</button>`;
}

function hideForms() { const r = document.getElementById('regForm'), rs = document.getElementById('resetForm'); if (r) r.style.display = 'none'; if (rs) rs.style.display = 'none'; }

async function handleReg() {
    const fn = document.getElementById('rf')?.value?.trim(), ph = document.getElementById('rp')?.value?.trim();
    const em = document.getElementById('re')?.value?.trim(), un = document.getElementById('ru')?.value?.trim()?.toUpperCase();
    const pw = document.getElementById('rpa')?.value, pc = document.getElementById('rpc')?.value;
    if (!fn || fn.length < 6) { T('الاسم 6 أحرف', 'error'); return; }
    if (!ph || ph.length < 10) { T('رقم الهاتف غير صحيح', 'error'); return; }
    if (!em || !em.includes('@')) { T('بريد صحيح مطلوب', 'error'); return; }
    if (!un || un.length < 4) { T('اسم المستخدم 4 أحرف', 'error'); return; }
    if (!pw || pw.length < 6) { T('كلمة المرور 6 أحرف', 'error'); return; }
    if (pw !== pc) { T('كلمتا المرور غير متطابقتين', 'error'); return; }
    const ok = await registerUser(fn, ph, un, pw, pc, em); if (ok) hideForms();
}

function showResetForm() {
    const c = document.getElementById('resetForm'); if (!c) return; c.style.display = 'block';
    c.innerHTML = `<h4>استعادة كلمة المرور</h4><p style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;">تواصل مع خدمة العملاء</p><button class="btn btn-primary" onclick="openSupportChat()">خدمة العملاء</button><button class="btn btn-outline btn-sm" onclick="hideForms()" style="margin-top:8px;">رجوع</button>`;
}

// ==================== NAVIGATION ====================
function goTo(page) { document.querySelectorAll('.page').forEach(p => p.classList.remove('active')); const el = document.getElementById(page + 'Page'); if (el) el.classList.add('active'); if (page === 'home') loadGyms(); if (page === 'profile') loadProfile(); }
function setActiveNav(btn) { document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active')); btn.classList.add('active'); }
function openModal(id) { document.getElementById(id).classList.add('active'); document.body.style.overflow = 'hidden'; }
function closeModal(id) { document.getElementById(id).classList.remove('active'); document.body.style.overflow = ''; }
function openSidebar() { document.getElementById('sidebar').classList.add('active'); document.getElementById('sidebarOverlay').classList.add('active'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('active'); document.getElementById('sidebarOverlay').classList.remove('active'); }
function showConfirm(t, m, cb) { document.getElementById('confirmTitle').textContent = t; document.getElementById('confirmBody').textContent = m; document.getElementById('confirmDialog').classList.add('active'); G.confirmCallback = cb; }
function closeConfirm() { document.getElementById('confirmDialog').classList.remove('active'); }

// ==================== ONBOARDING / DARK ====================
function checkOnboarding() { if (localStorage.getItem('gymawy_onboarding') === '1') document.getElementById('onboardingOverlay').style.display = 'none'; else document.getElementById('onboardingOverlay').style.display = 'flex'; }
function nextOnboarding(s) { document.querySelectorAll('.onboarding-slide').forEach(x => x.classList.remove('active')); document.querySelectorAll('.onboarding-dot').forEach(x => x.classList.remove('active')); const slides = document.querySelectorAll('.onboarding-slide'); if (slides[s - 1]) slides[s - 1].classList.add('active'); const dots = document.querySelectorAll('.onboarding-dot'); if (dots[s - 1]) dots[s - 1].classList.add('active'); }
function finishOnboarding() { localStorage.setItem('gymawy_onboarding', '1'); document.getElementById('onboardingOverlay').style.display = 'none'; }
function toggleDarkMode() { document.body.classList.toggle('dark'); localStorage.setItem('gymawy_dark_mode', document.body.classList.contains('dark') ? '1' : '0'); }
function loadDarkMode() { if (localStorage.getItem('gymawy_dark_mode') === '1') document.body.classList.add('dark'); }

// ==================== LISTENERS ====================
function setupAllListeners() {
    document.getElementById('sidebarOverlay')?.addEventListener('click', closeSidebar);
    document.getElementById('sidebarClose')?.addEventListener('click', closeSidebar);
    document.querySelectorAll('.sidebar-item[data-page]').forEach(i => i.addEventListener('click', function () { goTo(this.dataset.page); closeSidebar(); }));
    const sb = { 'sidebarSupport': () => { openSupportChat(); closeSidebar(); }, 'sidebarAbout': () => { showAbout(); closeSidebar(); }, 'sidebarPrivacy': () => { showPrivacy(); closeSidebar(); }, 'sidebarWhoWeAre': () => { showWhoWeAre(); closeSidebar(); }, 'sidebarForum': () => { openUserForum(); closeSidebar(); }, 'sidebarFavorites': () => { showFavorites(); closeSidebar(); }, 'sidebarRegisterCoach': () => { showCoachRegistration(); closeSidebar(); } };
    Object.entries(sb).forEach(([id, fn]) => { const b = document.getElementById(id); if (b) { b.onclick = fn; b.addEventListener('click', fn); } });
    document.querySelectorAll('.nav-item[data-page]').forEach(i => i.addEventListener('click', function () { const p = this.dataset.page; if (p === 'notifications') showNotifications(); else if (p === 'forum') openUserForum(); else goTo(p); setActiveNav(this); }));
    document.getElementById('searchInput')?.addEventListener('input', debounce(() => { G.currentFilter.searchQuery = document.getElementById('searchInput').value; filterAndDisplayGyms(); }, 400));
    document.querySelectorAll('.filter-tag').forEach(t => t.addEventListener('click', function () { setQuickFilter(this.dataset.filter, this); }));
    document.getElementById('confirmCancel')?.addEventListener('click', closeConfirm);
    document.getElementById('confirmYes')?.addEventListener('click', () => { closeConfirm(); if (G.confirmCallback) G.confirmCallback(); });
    document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', function (e) { if (e.target === this) { this.classList.remove('active'); document.body.style.overflow = ''; } }));
}
function debounce(fn, d = 300) { let t; return function (...a) { clearTimeout(t); t = setTimeout(() => fn.apply(this, a), d); }; }

// ==================== GYMS ====================
async function loadGyms() {
    const c = document.getElementById('gymsList'); if (!c) return;
    try {
        const s = await db.collection('gyms').get(); G.allGyms = [];
        s.forEach(doc => { const d = doc.data(); if (d.active !== false && d.suspended !== true) G.allGyms.push({ id: doc.id, ...d }); });
        if (!G.allGyms.length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-dumbbell"></i><h4>لا توجد جيمات</h4></div>'; return; }
        filterAndDisplayGyms(); displayRecentGrid();
    } catch (e) { c.innerHTML = '<div class="empty-state"><h4>خطأ</h4></div>'; }
}
function filterAndDisplayGyms() {
    const f = G.currentFilter; let fl = [...G.allGyms];
    switch (G.quickFilter) { case 'verified': fl = fl.filter(g => g.verified); break; case 'mixed': fl = fl.filter(g => g.gender === 'mixed'); break; case 'men': fl = fl.filter(g => g.gender === 'men'); break; case 'women': fl = fl.filter(g => g.gender === 'women'); break; case 'offers': fl = fl.filter(g => g.offerPrice); break; }
    if (f.gender) fl = fl.filter(g => g.gender === f.gender);
    if (f.governorate) fl = fl.filter(g => g.governorate === f.governorate);
    if (f.city) fl = fl.filter(g => g.city === f.city);
    if (f.minRating > 0) fl = fl.filter(g => g.avgRating >= f.minRating);
    if (f.searchQuery) { const q = f.searchQuery.toLowerCase(); fl = fl.filter(g => (g.name || '').toLowerCase().includes(q) || (g.location || '').toLowerCase().includes(q)); }
    fl.sort((a, b) => { if (a.verified && !b.verified) return -1; if (!a.verified && b.verified) return 1; return (b.avgRating || 0) - (a.avgRating || 0); });
    displayGyms(fl);
}
function displayGyms(gyms) {
    const c = document.getElementById('gymsList');
    if (!gyms.length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><h4>لا جيمات</h4></div>'; return; }
    c.innerHTML = gyms.map(g => `<div class="gym-card" onclick="showGymDetail('${g.id}')"><div class="gym-card-header">${g.images?.length ? `<img src="${g.images[0]}" alt="${g.name}">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-dumbbell ph"></i></div>`}${g.verified ? '<span class="badge badge-verified"><i class="fas fa-check-circle"></i> موثق</span>' : ''}${g.offerPrice ? `<span class="badge badge-offer">عرض ${g.offerPrice} ج.م</span>` : ''}${g.gender ? `<span class="badge badge-gender"><i class="fas fa-${g.gender === 'men' ? 'male' : g.gender === 'women' ? 'female' : 'venus-mars'}"></i> ${g.gender === 'men' ? 'رجال' : g.gender === 'women' ? 'سيدات' : 'مختلط'}</span>` : ''}<button class="btn-favorite ${isFavorite(g.id) ? 'active' : ''}" onclick="toggleFavorite('${g.id}',event)"><i class="fas fa-heart"></i></button><button class="btn-share-card" onclick="shareGym('${g.id}',event)"><i class="fas fa-share-alt"></i></button><button class="badge badge-qr" onclick="showQRCode('${g.id}','${g.name}',event)"><i class="fas fa-qrcode"></i></button><div class="gym-card-overlay">${g.governorate || ''} ${g.city ? '• ' + g.city : ''}</div></div><div class="gym-card-body"><div class="gym-card-title"><span>${g.name}</span>${g.avgRating > 0 ? `<span style="font-size:12px;color:#FFD700;">${getStarsHTML(Math.round(g.avgRating))} ${g.avgRating}</span>` : ''}</div><div class="gym-card-location"><i class="fas fa-map-marker-alt"></i> ${g.location || 'غير محدد'}</div><div class="gym-card-prices"><div class="price-tag"><div class="price-value">${g.monthlyPrice || 0}</div><div class="price-label">ج.م/شهر</div></div>${g.yearlyPrice ? `<div class="price-tag"><div class="price-value">${g.yearlyPrice}</div><div class="price-label">ج.م/سنة</div></div>` : ''}<div class="price-tag"><div class="price-value">${g.sessionPrice || 0}</div><div class="price-label">ج.م/حصة</div></div></div></div><div class="gym-card-footer"><button class="btn-apply" onclick="event.stopPropagation();applyToGym('${g.id}')"><i class="fas fa-hand-paper"></i> تقديم طلب</button></div></div>`).join('');
}
function setQuickFilter(f, el) { G.quickFilter = f; document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active')); el.classList.add('active'); filterAndDisplayGyms(); }
function resetFilters() { G.currentFilter = { governorate: '', city: '', gender: '', minRating: 0, searchQuery: '' }; G.quickFilter = 'all'; document.querySelectorAll('.filter-tag').forEach((t, i) => t.classList.toggle('active', i === 0)); filterAndDisplayGyms(); }

// ==================== GYM DETAIL ====================
function showGymDetail(gid) {
    const gym = G.allGyms.find(g => g.id === gid); if (!gym) return; G.selectedGym = gym; addToRecentlyViewed(gym);
    document.getElementById('modalTitle').textContent = gym.name;
    document.getElementById('modalBody').innerHTML = `${gym.images?.length ? `<div class="images-slider">${gym.images.map(i => `<img src="${i}">`).join('')}</div>` : ''}${gym.verified ? '<div class="info-highlight" style="background:#FFF8E1;color:#F57F17;text-align:center;"><i class="fas fa-check-circle"></i> موثق</div>' : ''}<div style="display:flex;gap:8px;margin-bottom:12px;"><button class="btn btn-sm ${isFavorite(gym.id) ? 'btn-danger' : 'btn-outline'}" onclick="toggleFavorite('${gym.id}')"><i class="fas fa-heart"></i> ${isFavorite(gym.id) ? 'إزالة' : 'مفضلة'}</button><button class="btn btn-outline btn-sm" onclick="shareGym('${gym.id}')"><i class="fas fa-share-alt"></i> مشاركة</button><button class="btn btn-outline btn-sm" onclick="showQRCode('${gym.id}','${gym.name}')"><i class="fas fa-qrcode"></i> QR</button></div><div class="info-section"><h4><i class="fas fa-tag"></i> الأسعار</h4><div class="info-row"><span>شهري</span><span>${gym.monthlyPrice || 0} ج.م</span></div>${gym.yearlyPrice ? `<div class="info-row"><span>سنوي</span><span>${gym.yearlyPrice} ج.م</span></div>` : ''}<div class="info-row"><span>حصة</span><span>${gym.sessionPrice || 0} ج.م</span></div></div><div class="info-section"><h4><i class="fas fa-clock"></i> مواعيد</h4><div class="info-row"><span>يفتح</span><span>${!gym.openTime && !gym.closeTime ? '24 ساعة' : gym.openTime || '--'}</span></div><div class="info-row"><span>يقفل</span><span>${!gym.openTime && !gym.closeTime ? '24 ساعة' : gym.closeTime || '--'}</span></div></div><div class="info-section"><h4><i class="fas fa-info-circle"></i> معلومات</h4><div class="info-row"><span>النوع</span><span>${gym.gender === 'men' ? 'رجال' : gym.gender === 'women' ? 'سيدات' : 'مختلط'}</span></div><div class="info-row"><span>المحافظة</span><span>${gym.governorate || '--'}</span></div></div>${gym.phones?.length ? `<div class="info-section"><h4><i class="fas fa-phone"></i> تواصل</h4>${gym.phones.map(p => `<a href="tel:${p}" style="display:inline-block;margin:4px;padding:8px 14px;background:var(--primary-bg);border-radius:50px;color:var(--primary);text-decoration:none;font-weight:600;font-size:13px;">${p}</a>`).join('')}</div>` : ''}${gym.mapLink ? `<div class="info-section"><h4><i class="fas fa-map-marker-alt"></i> موقع</h4><a href="${gym.mapLink}" target="_blank" style="display:flex;align-items:center;gap:8px;padding:12px;background:var(--primary-bg);border-radius:12px;color:var(--primary);text-decoration:none;font-weight:600;"><i class="fas fa-map-marked-alt"></i> فتح في Google Maps</a></div>` : ''}<div class="info-section" style="text-align:center;"><h4>تقييم</h4><div class="stars-input">${[1, 2, 3, 4, 5].map(i => `<i class="far fa-star" id="star${i}" onclick="setRating(${i})"></i>`).join('')}</div><p style="font-size:11px;">${gym.ratingCount || 0} تقييم • ${gym.avgRating || 0}</p>${G.currentUser?.emailVerified ? `<button class="btn btn-primary btn-sm" onclick="submitRating()" style="margin-top:8px;">تقييم</button>` : '<p style="font-size:11px;color:var(--danger);">فعّل بريدك للتقييم</p>'}</div>`;
    document.getElementById('modalFooter').innerHTML = `<button class="btn btn-primary" onclick="applyToGym('${gym.id}')"><i class="fas fa-hand-paper"></i> تقديم طلب</button><button class="btn btn-outline" onclick="closeModal('gymModal')">إغلاق</button>`;
    G._rating = 0; openModal('gymModal');
}
function setRating(r) { G._rating = r; for (let i = 1; i <= 5; i++) { const s = document.getElementById('star' + i); if (s) s.className = i <= r ? 'fas fa-star active' : 'far fa-star'; } }
async function submitRating() { if (!G._rating) { T('اختر تقييم', 'error'); return; } if (!G.currentUser?.emailVerified) { T('فعّل بريدك', 'warning'); return; } const gym = G.selectedGym; if (!gym) return; await db.collection('ratings').add({ gymId: gym.id, userId: G.currentUser.username, userName: G.currentUser.fullName, rating: G._rating, createdAt: new Date().toISOString() }); T('شكراً لتقييمك', 'success'); closeModal('gymModal'); loadGyms(); }

// ==================== APPLY ====================
async function applyToGym(gid) { if (!G.currentUser?.emailVerified) { closeModal('gymModal'); T('سجل دخولك', 'warning'); return; } const gym = G.allGyms.find(g => g.id === gid); if (!gym) return; G.selectedGym = gym; G._subType = 'monthly'; document.getElementById('modalTitle').textContent = 'تقديم طلب'; document.getElementById('modalBody').innerHTML = `<div style="text-align:center;margin-bottom:16px;"><i class="fas fa-dumbbell" style="font-size:50px;color:var(--primary);"></i><h3>${gym.name}</h3></div><div class="gender-radio-group"><div class="gender-radio selected" id="optMonthly" onclick="selSub('monthly')"><i class="fas fa-calendar"></i> شهري<span style="display:block;font-size:11px;">${gym.monthlyPrice || 0} ج.م</span></div>${gym.yearlyPrice ? `<div class="gender-radio" id="optYearly" onclick="selSub('yearly')"><i class="fas fa-calendar-alt"></i> سنوي<span style="display:block;font-size:11px;">${gym.yearlyPrice} ج.م</span></div>` : ''}</div><div class="info-highlight" style="margin-top:12px;"><i class="fas fa-info-circle"></i> توجه للجيم للدفع</div>`; document.getElementById('modalFooter').innerHTML = `<button class="btn btn-primary" onclick="confirmApply()">تأكيد</button><button class="btn btn-outline" onclick="showGymDetail('${gid}')">رجوع</button>`; openModal('gymModal'); }
function selSub(t) { G._subType = t; document.getElementById('optMonthly')?.classList.toggle('selected', t === 'monthly'); document.getElementById('optYearly')?.classList.toggle('selected', t === 'yearly'); }
async function confirmApply() { const gym = G.selectedGym; if (!gym || !G.currentUser) return; await db.collection('requests').add({ gymId: gym.id, gymName: gym.name, name: G.currentUser.fullName, phone: G.currentUser.phone || '', email: G.currentUser.email || '', username: G.currentUser.username, subType: G._subType, status: 'pending', createdAt: new Date().toISOString() }); await rtdb.ref('newRequests/' + gym.id).set({ time: Date.now(), from: G.currentUser.fullName }); closeModal('gymModal'); T('تم إرسال الطلب', 'success'); }

// ==================== FAVORITES / RECENT / SHARE / QR ====================
function loadFavorites() { try { G.favorites = JSON.parse(localStorage.getItem('gymawy_favorites') || '[]'); } catch (e) { G.favorites = []; } }
function saveFavorites() { localStorage.setItem('gymawy_favorites', JSON.stringify(G.favorites)); }
function toggleFavorite(gid, e) { if (e) e.stopPropagation(); const i = G.favorites.indexOf(gid); if (i > -1) { G.favorites.splice(i, 1); T('تم إزالة من المفضلة', 'info'); } else { G.favorites.push(gid); T('تم إضافة للمفضلة', 'success'); } saveFavorites(); loadGyms(); }
function isFavorite(gid) { return G.favorites.includes(gid); }
function showFavorites() { const fg = G.allGyms.filter(g => G.favorites.includes(g.id)); if (!fg.length) { document.getElementById('modalTitle').textContent = 'المفضلة'; document.getElementById('modalBody').innerHTML = '<div class="empty-state"><i class="fas fa-heart-broken"></i><h4>لا مفضلات</h4></div>'; document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; openModal('gymModal'); return; } document.getElementById('modalTitle').textContent = 'المفضلة'; document.getElementById('modalBody').innerHTML = '<div class="gym-grid" id="favGymsList"></div>'; document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; openModal('gymModal'); displayGymsInContainer('favGymsList', fg); }
function loadRecentlyViewed() { try { G.recentlyViewed = JSON.parse(localStorage.getItem('gymawy_recent') || '[]'); } catch (e) { G.recentlyViewed = []; } }
function saveRecentlyViewed() { localStorage.setItem('gymawy_recent', JSON.stringify(G.recentlyViewed)); }
function addToRecentlyViewed(gym) { G.recentlyViewed = G.recentlyViewed.filter(g => g.id !== gym.id); G.recentlyViewed.unshift({ id: gym.id, name: gym.name, image: gym.images?.[0], monthlyPrice: gym.monthlyPrice }); if (G.recentlyViewed.length > 5) G.recentlyViewed = G.recentlyViewed.slice(0, 5); saveRecentlyViewed(); displayRecentGrid(); }
function displayRecentGrid() { const t = document.getElementById('recentTitle'), g = document.getElementById('recentGrid'); if (!G.recentlyViewed.length) { if (t) t.style.display = 'none'; if (g) g.innerHTML = ''; return; } if (t) t.style.display = 'flex'; if (g) g.innerHTML = G.recentlyViewed.map(x => `<div class="recent-card" onclick="showGymDetail('${x.id}')">${x.image ? `<img src="${x.image}">` : `<div style="height:80px;background:linear-gradient(135deg,#667eea,#764ba2);display:flex;align-items:center;justify-content:center;color:white;font-size:20px;"><i class="fas fa-dumbbell"></i></div>`}<div class="info"><div class="name">${x.name}</div><div class="price">${x.monthlyPrice || 0} ج.م</div></div></div>`).join(''); }
function displayGymsInContainer(cid, gyms) { const c = document.getElementById(cid); if (!c) return; if (!gyms.length) { c.innerHTML = '<div class="empty-state"><h4>لا جيمات</h4></div>'; return; } c.innerHTML = gyms.map(g => `<div class="gym-card" onclick="showGymDetail('${g.id}')" style="margin-bottom:12px;"><div class="gym-card-header">${g.images?.length ? `<img src="${g.images[0]}">` : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;"><i class="fas fa-dumbbell ph"></i></div>`}<div class="gym-card-overlay">${g.governorate || ''} ${g.city ? '• ' + g.city : ''}</div></div><div class="gym-card-body"><div class="gym-card-title">${g.name}</div><div class="gym-card-prices"><div class="price-tag"><div class="price-value">${g.monthlyPrice || 0}</div><div class="price-label">ج.م/شهر</div></div></div></div></div>`).join(''); }
function shareGym(gid, e) { if (e) e.stopPropagation(); const gym = G.allGyms.find(g => g.id === gid); if (!gym) return; G.shareGym = gym; document.getElementById('shareGymName').textContent = gym.name; openModal('shareModal'); }
function shareViaWhatsApp() { if (!G.shareGym) return; window.open(`https://wa.me/?text=${encodeURIComponent('شوف جيم ' + G.shareGym.name + ' على Gymawy!')}`); closeModal('shareModal'); }
function shareViaFacebook() { if (!G.shareGym) return; window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.origin)}`); closeModal('shareModal'); }
function copyShareLink() { if (!G.shareGym) return; navigator.clipboard.writeText(`${window.location.origin}/?gym=${G.shareGym.id}`).then(() => T('تم نسخ الرابط', 'success')); closeModal('shareModal'); }
function showQRCode(gid, gn, e) { if (e) e.stopPropagation(); const gym = G.allGyms.find(g => g.id === gid); if (!gym) return; G.shareGym = gym; document.getElementById('qrGymName').textContent = gn; document.getElementById('qrCode').innerHTML = ''; new QRCode(document.getElementById('qrCode'), { text: `${window.location.origin}/?gym=${gid}`, width: 200, height: 200, colorDark: '#6C5CE7', colorLight: '#FFFFFF' }); openModal('qrModal'); }
function copyGymLink() { if (!G.shareGym) return; navigator.clipboard.writeText(`${window.location.origin}/?gym=${G.shareGym.id}`).then(() => T('تم نسخ الرابط', 'success')); closeModal('qrModal'); }

// ==================== NOTIFICATIONS ====================
function loadNotifications() { try { G.notifications = JSON.parse(localStorage.getItem('gymawy_notifications') || '[]'); } catch (e) { G.notifications = []; } updateBadges(); }
function saveNotifications() { localStorage.setItem('gymawy_notifications', JSON.stringify(G.notifications)); updateBadges(); }
function updateBadges() { const u = G.notifications.filter(n => !n.read).length; ['notifBadge', 'navNotifBadge'].forEach(id => { const b = document.getElementById(id); if (b) { b.textContent = u > 99 ? '99+' : u; if (u > 0) b.classList.add('show'); else b.classList.remove('show'); } }); }
function showNotifications() { document.getElementById('modalTitle').innerHTML = '<i class="fas fa-bell"></i> الإشعارات'; document.getElementById('modalBody').innerHTML = G.notifications.length ? G.notifications.map(n => `<div class="notification-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')"><strong>${n.title}</strong><p style="font-size:12px;">${n.message}</p></div>`).join('') : '<div class="empty-state"><i class="fas fa-bell-slash"></i><h4>لا إشعارات</h4></div>'; document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; openModal('gymModal'); }
function markNotifRead(id) { const n = G.notifications.find(x => x.id === id); if (n) { n.read = true; saveNotifications(); } }

// ==================== PROFILE ====================
async function loadProfile() { const c = document.getElementById('profileContent'); if (!c) return; if (!G.currentUser) { c.innerHTML = '<div class="empty-state"><i class="fas fa-user"></i><h4>سجل دخولك أولاً</h4></div>'; return; } const mSnap = await db.collection('members').where('phone', '==', G.currentUser.phone || '').get(); const active = [], hist = []; mSnap.forEach(doc => { const d = doc.data(); if (d.active && !d.leftByUser) active.push({ id: doc.id, ...d }); else hist.push({ id: doc.id, ...d }); }); c.innerHTML = `<div class="profile-card"><div class="profile-avatar"><i class="fas fa-user"></i></div><h2>${G.currentUser.fullName}</h2><p>@${G.currentUser.username}</p><p><i class="fas fa-phone"></i> ${G.currentUser.phone || ''}</p><p><i class="fas fa-envelope"></i> ${G.currentUser.email || ''} <span style="color:var(--success);">مفعل</span></p><div class="btn-group" style="margin-top:12px;"><button class="btn btn-outline btn-sm" onclick="logout()" style="color:var(--danger);">خروج</button></div></div><h3>اشتراكاتي</h3>${active.length ? active.map(m => { const ok = m.paid && !isExpired(m.due); return `<div class="membership-card"><div style="font-size:18px;font-weight:800;">${m.gymName}</div><div class="info-box"><div class="info-row"><span>بدء</span><span>${formatDate(m.start)}</span></div><div class="info-row"><span>استحقاق</span><span>${formatDate(m.due)}</span></div></div><span class="${ok ? 'status-active' : 'status-expired'}">${ok ? 'نشط' : 'منتهي'}</span></div>`; }).join('') : '<div class="empty-state"><i class="fas fa-dumbbell"></i><h4>لا اشتراكات</h4></div>'}`; }

// ==================== FILTER MODAL ====================
function showFilterModal() { document.getElementById('filterBody').innerHTML = `<div class="form-group"><label>المحافظة</label><select id="fg" class="form-control" onchange="updateCities()"><option value="">الكل</option>${Object.keys(EGYPT_LOCATIONS).map(g => `<option value="${g}">${g}</option>`).join('')}</select></div><div class="form-group"><label>المدينة</label><select id="fc" class="form-control"><option value="">الكل</option></select></div><div class="form-group"><label>النوع</label><select id="fgn" class="form-control"><option value="">الكل</option><option value="mixed">مختلط</option><option value="men">رجال</option><option value="women">سيدات</option></select></div><div class="form-group"><label>التقييم</label><select id="frt" class="form-control"><option value="0">الكل</option><option value="3">3+</option><option value="4">4+</option></select></div>`; document.getElementById('filterFooter').innerHTML = `<button class="btn btn-primary" onclick="applyFilters()">تطبيق</button><button class="btn btn-outline" onclick="closeModal('filterModal')">إلغاء</button>`; openModal('filterModal'); }
function updateCities() { const g = document.getElementById('fg')?.value; const c = document.getElementById('fc'); if (c) { c.innerHTML = '<option value="">الكل</option>' + (EGYPT_LOCATIONS[g] || []).map(x => `<option value="${x}">${x}</option>`).join(''); } }
function applyFilters() { G.currentFilter.governorate = document.getElementById('fg')?.value || ''; G.currentFilter.city = document.getElementById('fc')?.value || ''; G.currentFilter.gender = document.getElementById('fgn')?.value || ''; G.currentFilter.minRating = parseFloat(document.getElementById('frt')?.value || 0); closeModal('filterModal'); filterAndDisplayGyms(); }

// ==================== SUPPORT / FORUM / ABOUT ====================
function openSupportChat() { if (!G.currentUser) { T('سجل دخولك', 'warning'); return; } document.getElementById('modalTitle').innerHTML = '<i class="fas fa-headset"></i> خدمة العملاء'; document.getElementById('modalBody').innerHTML = `<div style="text-align:center;"><i class="fas fa-headset" style="font-size:50px;color:var(--primary);"></i><h3>Gymawy Support</h3></div><div class="chat-messages" id="supportChatMessages"><div style="text-align:center;">جاري التحميل...</div></div><div style="display:flex;gap:8px;"><input type="text" id="supMsg" class="form-control" placeholder="اكتب رسالتك..."><button class="btn btn-primary btn-sm" onclick="sendSupMsg()"><i class="fas fa-paper-plane"></i></button></div>`; document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; openModal('gymModal'); loadSupMsgs(); }
async function sendSupMsg() { const m = document.getElementById('supMsg')?.value?.trim(); if (!m || !G.currentUser) return; await db.collection('support_messages').add({ chatId: G.currentUser.username, sender: G.currentUser.username, senderName: G.currentUser.fullName, message: m, timestamp: new Date().toISOString(), read: false }); document.getElementById('supMsg').value = ''; loadSupMsgs(); T('تم الإرسال', 'success'); }
async function loadSupMsgs() { const c = document.getElementById('supportChatMessages'); if (!c) return; const s = await db.collection('support_messages').where('chatId', '==', G.currentUser.username).get(); const msgs = []; s.forEach(doc => msgs.push(doc.data())); msgs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp)); c.innerHTML = msgs.length ? msgs.map(m => `<div class="chat-bubble ${m.sender === G.currentUser.username ? 'outgoing' : 'incoming'}">${m.message}<div class="chat-time">${formatDate(m.timestamp)}</div></div>`).join('') : '<div style="text-align:center;padding:20px;"><p>اكتب رسالتك</p></div>'; }

function openUserForum() { if (!G.currentUser) { T('سجل دخولك', 'warning'); return; } document.getElementById('modalTitle').textContent = 'المنتدى'; document.getElementById('modalBody').innerHTML = '<div class="loading-spinner"><i class="fas fa-spinner"></i></div>'; document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; openModal('gymModal'); loadForumMsgs(); }
async function loadForumMsgs() { const s = await db.collection('members').where('phone', '==', G.currentUser.phone || '').get(); let gid = null; s.forEach(doc => { const d = doc.data(); if (d.active && !d.leftByUser) gid = d.gymId; }); if (!gid) { document.getElementById('modalBody').innerHTML = '<div class="empty-state"><i class="fas fa-lock"></i><h4>المنتدى مقفول</h4><p>يجب أن تكون مشتركاً في جيم</p></div>'; return; } const fs = await db.collection('forum_messages').where('gymId', '==', gid).get(); const msgs = []; fs.forEach(doc => msgs.push(doc.data())); msgs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); document.getElementById('modalBody').innerHTML = msgs.length ? `<div class="chat-messages">${msgs.map(m => `<div class="chat-bubble incoming"><strong>${m.senderName || 'الكوتش'}</strong><p>${m.message}</p><div class="chat-time">${formatDate(m.timestamp)}</div></div>`).join('')}</div>` : '<div class="empty-state"><i class="fas fa-comments"></i><h4>لا رسائل</h4></div>'; }

function showAbout() { document.getElementById('modalTitle').textContent = 'عن التطبيق'; document.getElementById('modalBody').innerHTML = `<div style="text-align:center;"><div style="width:80px;height:80px;background:linear-gradient(135deg,var(--primary),var(--secondary));border-radius:20px;display:inline-flex;align-items:center;justify-content:center;font-size:40px;color:white;"><i class="fas fa-dumbbell"></i></div><h2>Gymawy</h2><p>أول منصة جيمات ذكية في مصر</p></div>`; document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; openModal('gymModal'); }
function showPrivacy() { document.getElementById('modalTitle').textContent = 'سياسة الخصوصية'; document.getElementById('modalBody').innerHTML = `<div class="info-section"><h4>خصوصيتك أمانة</h4><p>نلتزم بحماية بياناتك وعدم مشاركتها.</p></div><div class="info-section"><h4>البيانات</h4><p>الاسم، الهاتف، البريد.</p></div>`; document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; openModal('gymModal'); }
function showWhoWeAre() { document.getElementById('modalTitle').textContent = 'من نحن'; document.getElementById('modalBody').innerHTML = `<div class="info-section"><h4>Gymawy</h4><p>شركة مصرية ناشئة في التكنولوجيا الرياضية.</p></div>`; document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; openModal('gymModal'); }

// ==================== COACH REGISTRATION ====================
let coachReg = { step: 1, name: '', phone: '', email: '', governorate: '', city: '', gymName: '', heardFrom: '', idCard: null, plan: '', paymentImage: null };
function showCoachRegistration() { coachReg.step = 1; document.getElementById('modalTitle').textContent = 'سجل كصاحب جيم - الخطوة 1'; document.getElementById('modalBody').innerHTML = `<div class="form-row"><div class="form-group"><label>الاسم الرباعي *</label><input type="text" id="crName" class="form-control"></div><div class="form-group"><label>رقم الهاتف *</label><input type="tel" id="crPhone" class="form-control"></div></div><div class="form-row"><div class="form-group"><label>البريد *</label><input type="email" id="crEmail" class="form-control"></div><div class="form-group"><label>عمر الجيم</label><input type="number" id="crGymAge" class="form-control"></div></div><div class="form-row"><div class="form-group"><label>المحافظة *</label><select id="crGovernorate" class="form-control" onchange="updateCRCities()"><option value="">اختر...</option>${Object.keys(EGYPT_LOCATIONS).map(g => `<option value="${g}">${g}</option>`).join('')}</select></div><div class="form-group"><label>المدينة *</label><select id="crCity" class="form-control"><option value="">اختر...</option></select></div></div><div class="form-group"><label>اسم الجيم *</label><input type="text" id="crGymName" class="form-control"></div><div class="form-group"><label>سمعت عنا منين؟</label><select id="crHeardFrom" class="form-control"><option value="">اختر...</option><option value="facebook">فيسبوك</option><option value="instagram">انستجرام</option><option value="friend">صديق</option><option value="google">جوجل</option></select></div><div class="form-group"><label>صورة البطاقة *</label><input type="file" id="crIdCard" accept="image/*" class="form-control"></div>`; document.getElementById('modalFooter').innerHTML = `<button class="btn btn-primary" onclick="coachRegStep2()">التالي</button><button class="btn btn-outline" onclick="closeModal('gymModal')">إلغاء</button>`; openModal('gymModal'); }
function updateCRCities() { const g = document.getElementById('crGovernorate')?.value; const c = document.getElementById('crCity'); if (c) { c.innerHTML = '<option value="">اختر...</option>' + (EGYPT_LOCATIONS[g] || []).map(x => `<option value="${x}">${x}</option>`).join(''); } }
function coachRegStep2() { const n = document.getElementById('crName')?.value?.trim(), p = document.getElementById('crPhone')?.value?.trim(), e = document.getElementById('crEmail')?.value?.trim(), gov = document.getElementById('crGovernorate')?.value, city = document.getElementById('crCity')?.value, gn = document.getElementById('crGymName')?.value?.trim(), idf = document.getElementById('crIdCard')?.files[0]; if (!n || !p || !e || !gov || !city || !gn || !idf) { T('اكمل البيانات', 'error'); return; } coachReg = { ...coachReg, step: 2, name: n, phone: p, email: e, governorate: gov, city: city, gymName: gn, idCard: idf }; document.getElementById('modalTitle').textContent = 'اختر الباقة - الخطوة 2'; document.getElementById('modalBody').innerHTML = `<div style="text-align:center;margin-bottom:16px;"><i class="fas fa-crown" style="font-size:50px;color:#FFD700;"></i><h3>اختر الباقة</h3></div><div style="display:flex;flex-direction:column;gap:12px;"><div class="gender-radio selected" id="planMonthly" onclick="selectCoachPlan('monthly')" style="text-align:right;display:block;padding:16px;"><div style="display:flex;justify-content:space-between;"><div><strong>الباقة الشهرية</strong><p style="font-size:11px;">تجدد كل 30 يوم</p></div><div style="font-size:24px;font-weight:900;color:var(--primary);">200 ج.م</div></div></div><div class="gender-radio" id="planYearly" onclick="selectCoachPlan('yearly')" style="text-align:right;display:block;padding:16px;"><div style="display:flex;justify-content:space-between;"><div><strong>الباقة السنوية</strong><p style="font-size:11px;color:var(--success);">وفر 900 ج.م</p></div><div style="font-size:24px;font-weight:900;color:var(--primary);">1,500 ج.م</div></div></div></div>`; document.getElementById('modalFooter').innerHTML = `<button class="btn btn-primary" onclick="coachRegStep3()">التالي</button><button class="btn btn-outline" onclick="showCoachRegistration()">رجوع</button>`; openModal('gymModal'); }
function selectCoachPlan(plan) { coachReg.plan = plan; document.getElementById('planMonthly')?.classList.toggle('selected', plan === 'monthly'); document.getElementById('planYearly')?.classList.toggle('selected', plan === 'yearly'); }
async function coachRegStep3() { if (!coachReg.plan) { T('اختر باقة', 'error'); return; } coachReg.step = 3; document.getElementById('modalTitle').textContent = 'إثبات الدفع - الخطوة 3'; document.getElementById('modalBody').innerHTML = `<div style="text-align:center;margin-bottom:16px;"><i class="fas fa-credit-card" style="font-size:50px;color:var(--primary);"></i><h3>إثبات الدفع</h3><p>الباقة: <strong>${coachReg.plan === 'monthly' ? 'شهرية - 200 ج.م' : 'سنوية - 1,500 ج.م'}</strong></p></div><div class="info-highlight" style="background:#FFF3CD;color:#856404;text-align:center;margin-bottom:12px;"><i class="fas fa-info-circle"></i> حول المبلغ على فودافون كاش وأرفق صورة التحويل</div><div style="background:var(--light);border-radius:12px;padding:16px;text-align:center;margin-bottom:12px;"><p style="font-weight:700;font-size:18px;">${VODAFONE_CASH}</p><p style="font-size:11px;">فودافون كاش</p></div><div class="form-group"><label>صورة إثبات الدفع *</label><input type="file" id="crPayment" accept="image/*" class="form-control"></div>`; document.getElementById('modalFooter').innerHTML = `<button class="btn btn-success" onclick="submitCoachReg()">تقديم الطلب</button><button class="btn btn-outline" onclick="coachRegStep2()">رجوع</button>`; openModal('gymModal'); }
async function submitCoachReg() { const pf = document.getElementById('crPayment')?.files[0]; if (!pf) { T('ارفع صورة الدفع', 'error'); return; } const fd = new FormData(); fd.append('file', pf); fd.append('upload_preset', 'gymawy_upload'); let paymentUrl = ''; try { const res = await fetch('https://api.cloudinary.com/v1_1/di5z4lzwv/image/upload', { method: 'POST', body: fd }); const data = await res.json(); paymentUrl = data.secure_url || ''; } catch (e) { T('فشل رفع الصورة', 'error'); return; } await db.collection('coach_applications').add({ name: coachReg.name, phone: coachReg.phone, email: coachReg.email, governorate: coachReg.governorate, city: coachReg.city, gymName: coachReg.gymName, plan: coachReg.plan, amount: coachReg.plan === 'monthly' ? 200 : 1500, paymentImage: paymentUrl, status: 'pending', createdAt: new Date().toISOString() }); closeModal('gymModal'); T('تم تقديم الطلب - سنرد عليك خلال 24 ساعة', 'success'); coachReg = { step: 1, name: '', phone: '', email: '', governorate: '', city: '', gymName: '', heardFrom: '', idCard: null, plan: '', paymentImage: null }; }

console.log('Gymawy Ready');