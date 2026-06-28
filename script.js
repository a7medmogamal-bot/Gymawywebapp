var GYMS_DATA = [];

var EGYPT_LOCATIONS = {
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

var G = { currentFilter: { governorate: '', city: '', gender: '', searchQuery: '' }, quickFilter: 'all', favorites: [], shareGym: null };

document.addEventListener('DOMContentLoaded', function() {
    loadFavorites(); loadDarkMode(); setupAllListeners();
    document.getElementById('onboardingOverlay').style.display = 'none';
    checkOnboarding(); goTo('home'); loadGyms();
});

function T(m, t) { t = t || 'success'; var x = document.getElementById('toast'); if (!x) return; x.textContent = m; x.className = 'toast ' + t + ' show'; clearTimeout(x._t); x._t = setTimeout(function() { x.classList.remove('show'); }, 3000); }
function goTo(page) { var pages = document.querySelectorAll('.page'); for (var i = 0; i < pages.length; i++) pages[i].classList.remove('active'); var el = document.getElementById(page + 'Page'); if (el) el.classList.add('active'); if (page === 'home') loadGyms(); }
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
    document.getElementById('sidebarAbout').addEventListener('click', function() { showAbout(); closeSidebar(); });
    document.getElementById('sidebarPrivacy').addEventListener('click', function() { showPrivacy(); closeSidebar(); });
    document.getElementById('sidebarWhoWeAre').addEventListener('click', function() { showWhoWeAre(); closeSidebar(); });
    document.getElementById('sidebarFavorites').addEventListener('click', function() { showFavorites(); closeSidebar(); });
    document.getElementById('searchInput').addEventListener('input', function() { G.currentFilter.searchQuery = this.value; filterAndDisplayGyms(); });
    var filterTags = document.querySelectorAll('.filter-tag');
    for (var k = 0; k < filterTags.length; k++) { filterTags[k].addEventListener('click', function() { G.quickFilter = this.dataset.filter; var tags = document.querySelectorAll('.filter-tag'); for (var t = 0; t < tags.length; t++) tags[t].classList.remove('active'); this.classList.add('active'); filterAndDisplayGyms(); }); }
    var overlays = document.querySelectorAll('.modal-overlay'); for (var o = 0; o < overlays.length; o++) { overlays[o].addEventListener('click', function(e) { if (e.target === this) { this.classList.remove('active'); document.body.style.overflow = ''; } }); }
}

function loadGyms() { filterAndDisplayGyms(); }
function filterAndDisplayGyms() {
    var fl = GYMS_DATA.slice();
    if (G.quickFilter === 'mixed') fl = fl.filter(function(g) { return g.gender === 'mixed'; });
    if (G.quickFilter === 'men') fl = fl.filter(function(g) { return g.gender === 'men'; });
    if (G.quickFilter === 'women') fl = fl.filter(function(g) { return g.gender === 'women'; });
    if (G.currentFilter.gender) fl = fl.filter(function(g) { return g.gender === G.currentFilter.gender; });
    if (G.currentFilter.governorate) fl = fl.filter(function(g) { return g.governorate === G.currentFilter.governorate; });
    if (G.currentFilter.city) fl = fl.filter(function(g) { return g.city === G.currentFilter.city; });
    if (G.currentFilter.searchQuery) { var q = G.currentFilter.searchQuery.toLowerCase(); fl = fl.filter(function(g) { return (g.name||'').toLowerCase().indexOf(q) > -1 || (g.location||'').toLowerCase().indexOf(q) > -1 || (g.governorate||'').toLowerCase().indexOf(q) > -1 || (g.city||'').toLowerCase().indexOf(q) > -1; }); }
    displayGyms(fl);
}

function displayGyms(gyms) {
    var c = document.getElementById('gymsList');
    if (!gyms.length) { c.innerHTML = '<div class="empty-state"><i class="fas fa-dumbbell"></i><h4>لا جيمات في هذه المنطقة حالياً</h4><p>بنضيف جيمات جديدة كل يوم - قريباً هنوصل لمنطقتك</p></div>'; return; }
    var html = '';
    for (var i = 0; i < gyms.length; i++) {
        var g = gyms[i];
        html += '<div class="gym-card" onclick="showGymDetail(\'' + g.id + '\')">' +
            '<div class="gym-card-header">' + (g.images && g.images.length ? '<img src="' + g.images[0] + '">' : '<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#667eea,#764ba2);"><i class="fas fa-dumbbell" style="font-size:60px;color:rgba(255,255,255,0.3);"></i></div>') +
            (g.gender ? '<span class="badge badge-gender"><i class="fas fa-' + (g.gender==='men'?'male':g.gender==='women'?'female':'venus-mars') + '"></i> ' + (g.gender==='men'?'رجال':g.gender==='women'?'سيدات':'مختلط') + '</span>' : '') +
            '<button class="btn-favorite ' + (isFavorite(g.id)?'active':'') + '" onclick="event.stopPropagation();toggleFavorite(\'' + g.id + '\');this.classList.toggle(\'active\');"><i class="fas fa-heart"></i></button>' +
            '<button class="btn-share-card" onclick="event.stopPropagation();shareGym(\'' + g.id + '\',event);"><i class="fas fa-share-alt"></i></button>' +
            '<button class="badge badge-qr" onclick="event.stopPropagation();showQRCode(\'' + g.id + '\',\'' + (g.name||'').replace(/'/g,"\\'") + '\',event);"><i class="fas fa-qrcode"></i></button>' +
            '<div class="gym-card-overlay"><i class="fas fa-map-marker-alt"></i> ' + (g.governorate||'') + (g.city?' • '+g.city:'') + '</div></div>' +
            '<div class="gym-card-body"><div class="gym-card-title">' + g.name + '</div>' +
            '<div class="gym-card-location"><i class="fas fa-location-dot"></i> ' + (g.location||g.governorate||'') + '</div>' +
            '<div class="gym-card-prices"><div class="price-tag"><div class="price-value">' + (g.monthlyPrice||0) + ' ج.م</div><div class="price-label">شهري</div></div>' + (g.yearlyPrice?'<div class="price-tag"><div class="price-value">'+g.yearlyPrice+' ج.م</div><div class="price-label">سنوي</div></div>':'') + '<div class="price-tag"><div class="price-value">' + (g.sessionPrice||0) + ' ج.م</div><div class="price-label">حصة</div></div></div></div></div>';
    }
    c.innerHTML = html;
}

function showGymDetail(gid) {
    var gym = null; for (var i = 0; i < GYMS_DATA.length; i++) { if (GYMS_DATA[i].id === gid) { gym = GYMS_DATA[i]; break; } }
    if (!gym) return;
    document.getElementById('modalTitle').textContent = gym.name;
    var html = '';
    if (gym.images && gym.images.length) { html += '<div class="images-slider">'; for (var j = 0; j < gym.images.length; j++) html += '<img src="' + gym.images[j] + '">'; html += '</div>'; }
    html += '<div class="info-section"><h4><i class="fas fa-tag"></i> الأسعار</h4>' +
        '<div class="info-row"><span>شهري</span><span>' + (gym.monthlyPrice||0) + ' ج.م</span></div>' + (gym.yearlyPrice?'<div class="info-row"><span>سنوي</span><span>'+gym.yearlyPrice+' ج.م</span></div>':'') +
        '<div class="info-row"><span>حصة</span><span>' + (gym.sessionPrice||0) + ' ج.م</span></div></div>' +
        '<div class="info-section"><h4><i class="fas fa-info-circle"></i> معلومات</h4>' +
        '<div class="info-row"><span>النوع</span><span>' + (gym.gender==='men'?'رجال':gym.gender==='women'?'سيدات':'مختلط') + '</span></div>' +
        '<div class="info-row"><span>المحافظة</span><span>' + (gym.governorate||'--') + '</span></div>' +
        '<div class="info-row"><span>المدينة</span><span>' + (gym.city||'--') + '</span></div>' +
        '<div class="info-row"><span>العنوان</span><span>' + (gym.location||'--') + '</span></div></div>';
    if (gym.phones && gym.phones.length) { html += '<div class="info-section"><h4><i class="fas fa-phone"></i> تواصل</h4>'; for (var k = 0; k < gym.phones.length; k++) html += '<a href="tel:'+gym.phones[k]+'" style="display:inline-block;margin:4px;padding:10px 16px;background:var(--primary-bg);border-radius:50px;color:var(--primary);text-decoration:none;font-weight:600;">'+gym.phones[k]+'</a>'; html += '</div>'; }
    if (gym.mapLink) html += '<div class="info-section"><h4><i class="fas fa-map-marker-alt"></i> موقع</h4><a href="'+gym.mapLink+'" target="_blank" style="display:flex;align-items:center;gap:8px;padding:14px;background:var(--primary-bg);border-radius:12px;color:var(--primary);text-decoration:none;font-weight:600;"><i class="fas fa-map-marked-alt"></i> فتح في Google Maps</a></div>';
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>';
    openModal('gymModal');
}

function loadFavorites() { try { G.favorites = JSON.parse(localStorage.getItem('gymawy_favorites') || '[]'); } catch (e) { G.favorites = []; } }
function saveFavorites() { localStorage.setItem('gymawy_favorites', JSON.stringify(G.favorites)); }
function isFavorite(gid) { return G.favorites.indexOf(gid) > -1; }
function toggleFavorite(gid) { var idx = G.favorites.indexOf(gid); if (idx > -1) { G.favorites.splice(idx, 1); T('تمت الإزالة', 'info'); } else { G.favorites.push(gid); T('تمت الإضافة ❤️', 'success'); } saveFavorites(); }
function showFavorites() { var fg = []; for (var i = 0; i < GYMS_DATA.length; i++) { if (G.favorites.indexOf(GYMS_DATA[i].id) > -1) fg.push(GYMS_DATA[i]); } document.getElementById('modalTitle').textContent = 'المفضلة'; if (!fg.length) { document.getElementById('modalBody').innerHTML = '<div class="empty-state"><i class="fas fa-heart-broken"></i><h4>لا مفضلات</h4></div>'; document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; } else { document.getElementById('modalBody').innerHTML = '<div class="gym-grid" id="favGymsList"></div>'; document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; displayGymsInContainer('favGymsList', fg); } openModal('gymModal'); }
function displayGymsInContainer(cid, gyms) { var c = document.getElementById(cid); if (!c) return; var html = ''; for (var i = 0; i < gyms.length; i++) { var g = gyms[i]; html += '<div class="gym-card" onclick="showGymDetail(\''+g.id+'\')"><div class="gym-card-header">'+(g.images&&g.images.length?'<img src="'+g.images[0]+'">':'')+'</div><div class="gym-card-body"><div class="gym-card-title">'+g.name+'</div></div></div>'; } c.innerHTML = html; }

function showFilterModal() { var govOptions = '', govs = Object.keys(EGYPT_LOCATIONS); for (var i = 0; i < govs.length; i++) govOptions += '<option value="'+govs[i]+'">'+govs[i]+'</option>'; document.getElementById('filterBody').innerHTML = '<div class="form-group"><label>المحافظة</label><select id="fg" class="form-control" onchange="updateCities()"><option value="">الكل</option>'+govOptions+'</select></div><div class="form-group"><label>المدينة</label><select id="fc" class="form-control"><option value="">الكل</option></select></div><div class="form-group"><label>النوع</label><select id="fgn" class="form-control"><option value="">الكل</option><option value="mixed">مختلط</option><option value="men">رجال</option><option value="women">سيدات</option></select></div>'; document.getElementById('filterFooter').innerHTML = '<button class="btn btn-primary" onclick="applyFilters()">تطبيق</button><button class="btn btn-outline" onclick="closeModal(\'filterModal\')">إلغاء</button>'; openModal('filterModal'); }
function updateCities() { var g = document.getElementById('fg')?.value, c = document.getElementById('fc'); if (c) { var cities = EGYPT_LOCATIONS[g] || [], html = '<option value="">الكل</option>'; for (var i = 0; i < cities.length; i++) html += '<option value="'+cities[i]+'">'+cities[i]+'</option>'; c.innerHTML = html; } }
function applyFilters() { G.currentFilter.governorate = document.getElementById('fg')?.value || ''; G.currentFilter.city = document.getElementById('fc')?.value || ''; G.currentFilter.gender = document.getElementById('fgn')?.value || ''; closeModal('filterModal'); filterAndDisplayGyms(); }

function shareGym(gid, e) { if (e) e.stopPropagation(); var gym = null; for (var i = 0; i < GYMS_DATA.length; i++) { if (GYMS_DATA[i].id === gid) { gym = GYMS_DATA[i]; break; } } if (!gym) return; G.shareGym = gym; document.getElementById('shareGymName').textContent = gym.name; openModal('shareModal'); }
function shareViaWhatsApp() { if (!G.shareGym) return; window.open('https://wa.me/?text='+encodeURIComponent('شوف جيم '+G.shareGym.name+' على Gymawy!\n'+G.shareGym.location+'\nالسعر: '+(G.shareGym.monthlyPrice||0)+' ج.م/شهر')); closeModal('shareModal'); }
function shareViaFacebook() { if (!G.shareGym) return; window.open('https://www.facebook.com/sharer/sharer.php?u='+encodeURIComponent(window.location.origin)); closeModal('shareModal'); }
function copyShareLink() { if (!G.shareGym) return; navigator.clipboard.writeText(window.location.origin+'/?gym='+G.shareGym.id).then(function(){ T('تم النسخ', 'success'); }); closeModal('shareModal'); }
function showQRCode(gid, gn, e) { if (e) e.stopPropagation(); var gym = null; for (var i = 0; i < GYMS_DATA.length; i++) { if (GYMS_DATA[i].id === gid) { gym = GYMS_DATA[i]; break; } } if (!gym) return; G.shareGym = gym; document.getElementById('qrGymName').textContent = gn; document.getElementById('qrCode').innerHTML = ''; new QRCode(document.getElementById('qrCode'), { text: window.location.origin+'/?gym='+gid, width: 200, height: 200, colorDark: '#6C5CE7', colorLight: '#FFFFFF' }); openModal('qrModal'); }
function copyGymLink() { if (!G.shareGym) return; navigator.clipboard.writeText(window.location.origin+'/?gym='+G.shareGym.id).then(function(){ T('تم النسخ', 'success'); }); closeModal('qrModal'); }

function showAbout() {
    document.getElementById('modalTitle').textContent = 'عن جيماوي';
    document.getElementById('modalBody').innerHTML = 
        '<div style="text-align:center;margin-bottom:20px;"><div style="width:80px;height:80px;background:linear-gradient(135deg,var(--primary),var(--secondary));border-radius:20px;display:inline-flex;align-items:center;justify-content:center;font-size:40px;color:white;margin-bottom:12px;"><i class="fas fa-dumbbell"></i></div><h2 style="color:var(--primary);">Gymawy - جيماوي</h2><p>دليل الجيمات في مصر</p></div>' +
        '<div class="info-section"><h4><i class="fas fa-bullseye"></i> إحنا مين؟</h4><p>جيماوي هو دليل شامل للجيمات في مصر. بنجمع كل الجيمات في مكان واحد عشان تقدر تتصفح وتقارن بينهم بسهولة.</p></div>' +
        '<div class="info-section"><h4><i class="fas fa-clock"></i> لسه في البداية</h4><p>احنا لسه في مرحلة جمع الجيمات. بنضيف جيمات جديدة كل يوم من كل المحافظات. النسخة الكاملة هتنزل قريباً.</p></div>' +
        '<div class="info-section"><h4><i class="fas fa-gift"></i> مجاني</h4><p>الموقع مجاني بالكامل. هدفنا إننا نساعدك تلاقي الجيم المناسب ليك.</p></div>' +
        '<div class="info-section" style="background:var(--primary-bg);border-radius:12px;padding:16px;text-align:center;"><h4 style="color:var(--primary);"><i class="fas fa-map-marker-alt"></i> ملقتش جيم في منطقتك؟</h4><p>متقلقش! بنشتغل كل يوم عشان نوصل لكل المحافظات.</p></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; openModal('gymModal');
}
function showPrivacy() {
    document.getElementById('modalTitle').textContent = 'سياسة الخصوصية';
    document.getElementById('modalBody').innerHTML = 
        '<div class="info-section"><h4><i class="fas fa-lock"></i> خصوصيتك</h4><p>احنا مش بنطلب أي بيانات حساسة. الموقع مفتوح للكل بدون تسجيل.</p></div>' +
        '<div class="info-section"><h4><i class="fas fa-share-alt"></i> مشاركة البيانات</h4><p>احنا مش بنجمع أي بيانات شخصية. الموقع بيتصفح بدون ما تسجل دخول.</p></div>' +
        '<div class="info-section"><h4><i class="fas fa-cookie"></i> Cookies</h4><p>الموقع بيستخدم cookies بسيطة عشان يخلي تجربتك أحسن (زي تذكر المفضلة والوضع الليلي).</p></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; openModal('gymModal');
}
function showWhoWeAre() {
    document.getElementById('modalTitle').textContent = 'من نحن';
    document.getElementById('modalBody').innerHTML = 
        '<div style="text-align:center;margin-bottom:20px;"><div style="width:80px;height:80px;background:linear-gradient(135deg,var(--primary),var(--secondary));border-radius:20px;display:inline-flex;align-items:center;justify-content:center;font-size:40px;color:white;margin-bottom:12px;"><i class="fas fa-building"></i></div><h2 style="color:var(--primary);">Gymawy</h2></div>' +
        '<div class="info-section"><h4><i class="fas fa-rocket"></i> البداية</h4><p>بدأنا بفكرة بسيطة: نجمع كل الجيمات في مصر في دليل واحد. عشان أي حد يلاقي الجيم المناسب ليه بسهولة.</p></div>' +
        '<div class="info-section"><h4><i class="fas fa-eye"></i> رؤيتنا</h4><p>نفسنا نكون أكبر دليل للجيمات في مصر. بنضيف جيمات كل يوم عشان نوصل لكل المحافظات.</p></div>' +
        '<div class="info-section"><h4><i class="fas fa-map-marker-alt"></i> موقعنا</h4><p>مصر. بنخدم كل المحافظات.</p></div>';
    document.getElementById('modalFooter').innerHTML = '<button class="btn btn-outline" onclick="closeModal(\'gymModal\')">إغلاق</button>'; openModal('gymModal');
}

console.log('🏋️ Gymawy - دليل الجيمات في مصر');