/* ==========================================================
   منطق الموقع - لا حاجة لتعديل هذا الملف.
   البيانات الآن تُقرأ من ملفات data/*.json، وتُعدَّل عبر لوحة
   التحكم على /admin بدل تعديل أي كود يدويًا.
   ========================================================== */

let SITE_CONFIG = {};
let CATEGORIES = [];
let STORES = [];
let OFFERS = [];
let COUPONS = [];

const state = {
  offerCategory: null,
  couponCategory: null,
  searchQuery: "",
  sort: "newest",
};

const FAVORITES_KEY = "saudi-offers-static:favorites";

function getFavorites() {
  try {
    return JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");
  } catch {
    return [];
  }
}

function toggleFavorite(id) {
  const favs = getFavorites();
  const exists = favs.includes(id);
  const updated = exists ? favs.filter((f) => f !== id) : [...favs, id];
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(updated));
  return !exists;
}

function findCategory(id) {
  return CATEGORIES.find((c) => c.id === id);
}

/* ---------------- Countdown ---------------- */
function updateCountdown() {
  const target = new Date(SITE_CONFIG.nationalDayDate).getTime();
  const now = Date.now();
  const diff = Math.max(0, target - now);

  const days = Math.floor(diff / 86400000);
  const hours = Math.floor((diff / 3600000) % 24);
  const minutes = Math.floor((diff / 60000) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  document.getElementById("cd-days").textContent = String(days).padStart(2, "0");
  document.getElementById("cd-hours").textContent = String(hours).padStart(2, "0");
  document.getElementById("cd-minutes").textContent = String(minutes).padStart(2, "0");
  document.getElementById("cd-seconds").textContent = String(seconds).padStart(2, "0");
}

/* ---------------- Categories ---------------- */
function renderCategories() {
  const grid = document.getElementById("categoriesGrid");
  const allCard = `
    <a href="#offers" class="category-card" onclick="filterByCategory(null)">
      <div class="icon">🗂️</div>
      <div class="name">الكل</div>
    </a>`;
  const categoryCards = CATEGORIES.map(
    (cat) => `
    <a href="#offers" class="category-card" onclick="filterByCategory('${cat.id}')">
      <div class="icon">${cat.icon}</div>
      <div class="name">${cat.name}</div>
    </a>`
  ).join("");
  grid.innerHTML = allCard + categoryCards;
}

function filterByCategory(catId) {
  state.offerCategory = catId;
  renderOfferFilters();
  renderOffers();
}

/* ---------------- Offer Filters ---------------- */
function renderOfferFilters() {
  const wrap = document.getElementById("offerFilters");
  const pills = [{ id: null, name: "الكل" }, ...CATEGORIES];
  wrap.innerHTML = pills
    .map(
      (c) => `
    <button class="filter-pill ${state.offerCategory === c.id ? "active" : ""}" onclick="setOfferCategory(${c.id ? `'${c.id}'` : "null"})">
      ${c.name}
    </button>`
    )
    .join("");
}
function setOfferCategory(id) {
  state.offerCategory = id;
  renderOfferFilters();
  renderOffers();
}

/* ---------------- Coupon Filters ---------------- */
function renderCouponFilters() {
  const wrap = document.getElementById("couponFilters");
  const pills = [{ id: null, name: "الكل" }, ...CATEGORIES];
  wrap.innerHTML = pills
    .map(
      (c) => `
    <button class="filter-pill ${state.couponCategory === c.id ? "active" : ""}" onclick="setCouponCategory(${c.id ? `'${c.id}'` : "null"})">
      ${c.name}
    </button>`
    )
    .join("");
}
function setCouponCategory(id) {
  state.couponCategory = id;
  renderCouponFilters();
  renderCoupons();
}

/* ---------------- Offers ---------------- */
function getFilteredOffers() {
  let list = [...OFFERS];

  if (state.offerCategory) {
    list = list.filter((o) => o.category === state.offerCategory);
  }
  if (state.searchQuery) {
    const q = state.searchQuery.toLowerCase();
    list = list.filter(
      (o) =>
        o.title.toLowerCase().includes(q) ||
        (o.storeName && o.storeName.toLowerCase().includes(q))
    );
  }

  if (state.sort === "discount") {
    list.sort((a, b) => (b.discountPercent || 0) - (a.discountPercent || 0));
  } else {
    list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  }

  return list;
}

function renderOffers() {
  const grid = document.getElementById("offersGrid");
  const emptyMsg = document.getElementById("offersEmpty");
  const list = getFilteredOffers();

  if (list.length === 0) {
    grid.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    return;
  }
  emptyMsg.classList.add("hidden");

  const favs = getFavorites();

  grid.innerHTML = list
    .map((offer) => {
      const category = findCategory(offer.category);
      const isFav = favs.includes(offer.id);
      return `
      <div class="offer-card">
        <div class="offer-img-wrap" onclick="openOfferDetail('${offer.id}')" style="cursor:pointer">
          <img src="${offer.image}" alt="${offer.title}" loading="lazy">
          ${offer.discountPercent ? `<span class="badge-discount">خصم ${offer.discountPercent}%</span>` : ""}
          ${offer.featured ? `<span class="badge-featured">مميز ⭐</span>` : ""}
        </div>
        <div class="offer-body">
          <div class="offer-meta"><span>${offer.storeName || ""}</span><span>${category ? category.name : ""}</span></div>
          <h3 class="offer-title">${offer.title}</h3>
          <p class="offer-desc">${offer.description || ""}</p>
          <div class="offer-footer">
            <a href="${offer.url}" target="_blank" rel="nofollow noopener" class="btn btn-primary">مشاهدة العرض</a>
            <button class="icon-btn" onclick="shareItem('${offer.title.replace(/'/g, "\\'")}')" title="مشاركة">🔗</button>
            <button class="icon-btn ${isFav ? "active" : ""}" onclick="handleFavoriteClick(this,'${offer.id}')" title="مفضلة">❤</button>
          </div>
        </div>
      </div>`;
    })
    .join("");
}

function handleFavoriteClick(btn, id) {
  const isFav = toggleFavorite(id);
  btn.classList.toggle("active", isFav);
}

function shareItem(title) {
  const url = window.location.href;
  if (navigator.share) {
    navigator.share({ title, url }).catch(() => {});
  } else {
    navigator.clipboard.writeText(url);
    alert("تم نسخ رابط الصفحة");
  }
}

function openOfferDetail(id) {
  const offer = OFFERS.find((o) => o.id === id);
  if (!offer) return;
  const category = findCategory(offer.category);

  document.getElementById("detailModalContent").innerHTML = `
    <button class="modal-close" onclick="closeDetailModal()">✕</button>
    <img src="${offer.image}" alt="${offer.title}" class="detail-img">
    <div class="detail-meta">${offer.storeName || ""} · ${category ? category.name : ""}${offer.expiryDate ? ` · ينتهي ${String(offer.expiryDate).slice(0, 10)}` : ""}</div>
    <h2 class="detail-title">${offer.title}</h2>
    <p class="detail-desc">${offer.description || ""}</p>
    <div class="detail-actions">
      ${offer.discountCode ? `<button class="btn btn-outline" style="border-color:var(--saudi-200);color:var(--saudi-700)" onclick="copyCode('${offer.discountCode}')">نسخ كود الخصم: ${offer.discountCode}</button>` : ""}
      ${offer.url ? `<a class="btn btn-primary" href="${offer.url}" target="_blank" rel="nofollow noopener">الانتقال إلى المتجر</a>` : ""}
    </div>
  `;
  document.getElementById("detailModal").classList.add("open");
}

function copyCode(code) {
  navigator.clipboard.writeText(code);
  alert("تم نسخ الكود: " + code);
}

function closeDetailModal() {
  document.getElementById("detailModal").classList.remove("open");
}

/* ---------------- Coupons ---------------- */
function getFilteredCoupons() {
  let list = [...COUPONS];
  if (state.couponCategory) {
    list = list.filter((c) => c.category === state.couponCategory);
  }
  list.sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0));
  return list;
}

function renderCoupons() {
  const grid = document.getElementById("couponsGrid");
  const emptyMsg = document.getElementById("couponsEmpty");
  const list = getFilteredCoupons();

  if (list.length === 0) {
    grid.innerHTML = "";
    emptyMsg.classList.remove("hidden");
    return;
  }
  emptyMsg.classList.add("hidden");

  grid.innerHTML = list
    .map((coupon) => {
      const category = findCategory(coupon.category);
      return `
      <div class="coupon-card">
        <div class="coupon-top">
          <img class="coupon-logo" src="${coupon.storeLogo}" alt="${coupon.storeName}">
          <div>
            <div class="coupon-store">${coupon.featured ? "⭐ " : ""}${coupon.storeName}</div>
            <div class="coupon-cat">${category ? category.name : ""}</div>
          </div>
        </div>
        <p class="coupon-desc">${coupon.description}</p>
        <div id="coupon-action-${coupon.id}">
          <button class="coupon-reveal-btn" onclick="revealCoupon('${coupon.id}')">إظهار الكود 🎁</button>
        </div>
      </div>`;
    })
    .join("");
}

function revealCoupon(id) {
  const coupon = COUPONS.find((c) => c.id === id);
  if (!coupon) return;
  const container = document.getElementById(`coupon-action-${id}`);
  container.innerHTML = `
    <div class="coupon-code-box">
      <span>${coupon.code}</span>
      <small>تم النسخ ✓</small>
    </div>`;
  navigator.clipboard.writeText(coupon.code).catch(() => {});
  window.open(coupon.url, "_blank", "noopener,noreferrer");
}

/* ---------------- Stores ---------------- */
function renderStores() {
  const grid = document.getElementById("storesGrid");
  grid.innerHTML = STORES.map(
    (store) => `
    <a href="${store.url}" target="_blank" rel="nofollow noopener" class="store-card">
      <img src="${store.logo}" alt="${store.name}">
      <div class="name">${store.name}</div>
    </a>`
  ).join("");
}

/* ---------------- Search & sort ---------------- */
document.getElementById("searchInput").addEventListener("input", (e) => {
  state.searchQuery = e.target.value.trim();
  renderOffers();
});

document.getElementById("sortSelect").addEventListener("change", (e) => {
  state.sort = e.target.value;
  renderOffers();
});

/* ---------------- Mobile menu ---------------- */
document.getElementById("menuToggle").addEventListener("click", () => {
  document.getElementById("mainNav").classList.toggle("open");
});

/* ---------------- Submit Offer Modal ---------------- */
const submitModal = document.getElementById("submitModal");
function openSubmitModal() {
  submitModal.classList.add("open");
}
document.getElementById("openSubmitBtn").addEventListener("click", openSubmitModal);
document.getElementById("heroSubmitBtn").addEventListener("click", openSubmitModal);
document.getElementById("closeSubmitModal").addEventListener("click", () => {
  submitModal.classList.remove("open");
  document.getElementById("submitOfferForm").classList.remove("hidden");
  document.getElementById("submitSuccessMsg").classList.add("hidden");
});

[submitModal, document.getElementById("detailModal")].forEach((modal) => {
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("open");
  });
});

document.getElementById("submitOfferForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const form = e.target;

  const formData = new FormData(form);

  fetch("/", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(formData).toString(),
  })
    .then(() => {
      form.classList.add("hidden");
      document.getElementById("submitSuccessMsg").classList.remove("hidden");
      form.reset();
    })
    .catch(() => {
      alert("حدث خطأ أثناء الإرسال، حاول مرة أخرى أو تواصل معنا مباشرة عبر الإيميل.");
    });
});

/* ---------------- Typewriter effect for search placeholder ---------------- */
function startSearchTypewriter() {
  const input = document.getElementById("searchInput");
  if (!input) return;
  const phrase = "ابحث عن عرض أو كود خصم أو متجر...";
  let index = 0;
  let deleting = false;

  function tick() {
    if (document.activeElement === input || input.value) {
      // لا تعبث بالـ placeholder إذا كان المستخدم يكتب أو الحقل مركّز عليه
      setTimeout(tick, 400);
      return;
    }

    input.placeholder = phrase.slice(0, index);

    if (!deleting && index < phrase.length) {
      index++;
      setTimeout(tick, 90);
    } else if (!deleting && index === phrase.length) {
      deleting = true;
      setTimeout(tick, 1600); // وقفة قبل المسح
    } else if (deleting && index > 0) {
      index--;
      setTimeout(tick, 40);
    } else {
      deleting = false;
      setTimeout(tick, 500); // وقفة قبل إعادة الكتابة
    }
  }

  tick();
}

/* ---------------- Init ---------------- */
async function loadJSON(path) {
  const res = await fetch(path, { cache: "no-store" });
  if (!res.ok) throw new Error("تعذّر تحميل " + path);
  return res.json();
}

async function init() {
  document.getElementById("year").textContent = new Date().getFullYear();

  try {
    const [config, categoriesData, storesData, offersData, couponsData] = await Promise.all([
      loadJSON("data/config.json"),
      loadJSON("data/categories.json"),
      loadJSON("data/stores.json"),
      loadJSON("data/offers.json"),
      loadJSON("data/coupons.json"),
    ]);

    SITE_CONFIG = config;
    CATEGORIES = categoriesData.items || [];
    STORES = storesData.items || [];
    OFFERS = offersData.items || [];
    COUPONS = couponsData.items || [];
  } catch (err) {
    console.error(err);
    document.body.innerHTML =
      '<p style="padding:60px;text-align:center;color:#c0392b">تعذّر تحميل بيانات الموقع. تأكد من رفع مجلد data كاملًا.</p>';
    return;
  }

  updateCountdown();
  setInterval(updateCountdown, 1000);

  document.getElementById("submitCategorySelect").innerHTML = CATEGORIES.map(
    (c) => `<option value="${c.name}">${c.name}</option>`
  ).join("");

  document.getElementById("footerContact").textContent = `${SITE_CONFIG.contactEmail}`;

  renderCategories();
  renderOfferFilters();
  renderCouponFilters();
  renderOffers();
  renderCoupons();
  renderStores();

  /* ---------------- Categories horizontal scroll buttons ---------------- */
  const catGrid = document.getElementById("categoriesGrid");
  document.getElementById("catScrollRight").addEventListener("click", () => {
    catGrid.scrollBy({ left: -220, behavior: "smooth" });
  });
  document.getElementById("catScrollLeft").addEventListener("click", () => {
    catGrid.scrollBy({ left: 220, behavior: "smooth" });
  });

  startSearchTypewriter();
}

init();
