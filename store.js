(() => {
  const cfg = window.NOVEX_CONFIG || {};
  const status = document.getElementById("status");
  const grid = document.getElementById("products-grid");
  const search = document.getElementById("search");
  const dialog = document.getElementById("product-dialog");
  const money = n => new Intl.NumberFormat("ar-DZ").format(Number(n || 0)) + " دج";
  document.getElementById("year").textContent = new Date().getFullYear();

  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("PASTE_") && !cfg.SUPABASE_ANON_KEY.includes("PASTE_");
  if (!configured || !window.supabase) {
    status.innerHTML = '<strong>المتجر يحتاج إلى الإعداد.</strong><br>أضف بيانات Supabase في ملف config.js ثم انشر المشروع. راجع README_AR.md.';
    return;
  }
  const db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  let products = [];

  function productCard(p) {
    const article = document.createElement("article");
    article.className = "product-card";
    const image = document.createElement("img");
    image.className = "product-image";
    image.loading = "lazy";
    image.alt = p.name || "صورة المنتج";
    image.src = p.image_url || "assets/product-placeholder.svg";
    image.onerror = () => { image.src = "assets/product-placeholder.svg"; };
    const body = document.createElement("div"); body.className = "product-info";
    const title = document.createElement("h3"); title.textContent = p.name;
    const desc = document.createElement("p"); desc.textContent = p.description || "تواصل معنا لمعرفة التفاصيل.";
    const bottom = document.createElement("div"); bottom.className = "product-bottom";
    const price = document.createElement("strong"); price.textContent = money(p.price);
    const details = document.createElement("button"); details.className = "text-btn"; details.textContent = "التفاصيل ←";
    details.addEventListener("click", () => openProduct(p));
    bottom.append(price, details); body.append(title, desc, bottom); article.append(image, body);
    return article;
  }
  function openProduct(p) {
    document.getElementById("dialog-image").src = p.image_url || "assets/product-placeholder.svg";
    document.getElementById("dialog-title").textContent = p.name;
    document.getElementById("dialog-description").textContent = p.description || "لا يوجد وصف إضافي.";
    document.getElementById("dialog-price").textContent = money(p.price);
    const order = document.getElementById("dialog-order");
    const phone = (cfg.ORDER_PHONE || "0663569928").replace(/\D/g, "");
    const message = encodeURIComponent("السلام عليكم، أريد طلب المنتج: " + p.name + " بسعر " + money(p.price));
    order.href = "https://wa.me/213" + phone.replace(/^0/, "") + "?text=" + message;
    order.textContent = "اطلب عبر WhatsApp ↗";
    dialog.showModal();
  }
  function render() {
    const q = search.value.trim().toLocaleLowerCase();
    const filtered = products.filter(p => (p.name + " " + (p.description || "")).toLocaleLowerCase().includes(q));
    grid.replaceChildren();
    filtered.forEach(p => grid.appendChild(productCard(p)));
    status.classList.toggle("hidden", filtered.length > 0);
    if (!filtered.length) status.textContent = products.length ? "لا توجد نتائج مطابقة للبحث." : "لا توجد منتجات منشورة حالياً. عُد لاحقاً.";
  }
  async function load() {
    status.textContent = "جارٍ تحميل المنتجات…";
    const { data, error } = await db.from("products").select("id,name,description,price,image_url,created_at").eq("published", true).order("created_at", { ascending: false });
    if (error) { status.textContent = "تعذّر تحميل المنتجات. تحقق من إعداد Supabase واتصال الإنترنت."; console.error(error); return; }
    products = data || []; render();
  }
  search.addEventListener("input", render);
  document.getElementById("dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", e => { if (e.target === dialog) dialog.close(); });
  load();
})();
