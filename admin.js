(() => {
  const cfg = window.NOVEX_CONFIG || {};
  const $ = id => document.getElementById(id);
  const configured = cfg.SUPABASE_URL && cfg.SUPABASE_ANON_KEY &&
    !cfg.SUPABASE_URL.includes("PASTE_") && !cfg.SUPABASE_ANON_KEY.includes("PASTE_");
  if (!configured || !window.supabase) {
    $("login-message").textContent = "أكمل إعداد Supabase في config.js ثم نفّذ ملف supabase.sql. التفاصيل في README_AR.md.";
    $("login-message").classList.add("error");
    $("login-form").addEventListener("submit", e => e.preventDefault());
    return;
  }
  const db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  const money = n => new Intl.NumberFormat("ar-DZ").format(Number(n || 0)) + " دج";
  let editingImageUrl = null;

  function message(id, text, error=false) {
    $(id).textContent = text; $(id).classList.toggle("error", error);
  }
  function setLoggedIn(user) {
    $("login-panel").classList.toggle("hidden", !!user);
    $("dashboard").classList.toggle("hidden", !user);
  }
  async function checkSession() {
    const { data } = await db.auth.getSession();
    setLoggedIn(data.session?.user || null);
    if (data.session?.user) await loadAdminProducts();
  }
  $("login-form").addEventListener("submit", async e => {
    e.preventDefault(); message("login-message", "جارٍ التحقق…");
    const { error } = await db.auth.signInWithPassword({ email: $("email").value.trim(), password: $("password").value });
    if (error) { message("login-message", "فشل تسجيل الدخول: تحقق من بيانات الحساب وإعدادات Supabase.", true); console.error(error); return; }
    const { data } = await db.auth.getSession();
    setLoggedIn(data.session?.user || null);
    await loadAdminProducts();
  });
  $("logout").addEventListener("click", async () => { await db.auth.signOut(); setLoggedIn(null); });
  $("cancel-edit").addEventListener("click", resetForm);
  $("product-form").addEventListener("submit", saveProduct);

  function resetForm() {
    $("product-form").reset(); $("product-id").value = ""; editingImageUrl = null;
    $("form-title").textContent = "إضافة منتج جديد"; $("save-product").textContent = "حفظ المنتج";
    $("cancel-edit").classList.add("hidden"); message("form-message", "");
  }
  async function uploadImage(file) {
    if (!file) return editingImageUrl;
    if (!["image/jpeg","image/png","image/webp"].includes(file.type)) throw new Error("نوع الصورة غير مدعوم.");
    if (file.size > 5 * 1024 * 1024) throw new Error("حجم الصورة أكبر من 5MB.");
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = crypto.randomUUID() + "." + ext;
    const { error } = await db.storage.from("products").upload(path, file, { contentType: file.type, upsert: false });
    if (error) throw error;
    const { data } = db.storage.from("products").getPublicUrl(path);
    return data.publicUrl;
  }
  async function saveProduct(e) {
    e.preventDefault();
    const { data: sessionData } = await db.auth.getSession();
    if (!sessionData.session) { message("form-message", "انتهت الجلسة. سجّل الدخول مجدداً.", true); setLoggedIn(null); return; }
    const id = $("product-id").value;
    const name = $("product-name").value.trim();
    const price = Number($("product-price").value);
    if (!name || !Number.isFinite(price) || price < 0) { message("form-message", "أدخل اسمًا وسعرًا صحيحين.", true); return; }
    $("save-product").disabled = true; message("form-message", "جارٍ حفظ المنتج…");
    try {
      const imageUrl = await uploadImage($("product-image").files[0]);
      const record = { name, price, description: $("product-description").value.trim(), image_url: imageUrl, published: true, updated_at: new Date().toISOString() };
      const result = id ? await db.from("products").update(record).eq("id", id).select().single() : await db.from("products").insert(record).select().single();
      if (result.error) throw result.error;
      resetForm(); message("form-message", "تم حفظ المنتج بنجاح."); await loadAdminProducts();
    } catch (err) {
      console.error(err); message("form-message", "تعذّر الحفظ. تحقق من صلاحيات قاعدة البيانات والتخزين، ثم حاول مجدداً.", true);
    } finally { $("save-product").disabled = false; }
  }
  async function loadAdminProducts() {
    const { data, error } = await db.from("products").select("*").order("created_at", { ascending: false });
    if (error) { $("admin-products").textContent = "تعذر تحميل المنتجات. تأكد من تنفيذ سياسات RLS في ملف supabase.sql."; console.error(error); return; }
    const container = $("admin-products"); container.replaceChildren();
    if (!data.length) { container.textContent = "لم تضف أي منتج بعد."; return; }
    data.forEach(p => {
      const row = document.createElement("div"); row.className = "admin-product-row";
      const img = document.createElement("img"); img.src = p.image_url || "assets/product-placeholder.svg"; img.alt = "";
      const info = document.createElement("div"); info.className = "admin-product-info";
      const name = document.createElement("strong"); name.textContent = p.name;
      const price = document.createElement("span"); price.textContent = money(p.price);
      const state = document.createElement("small"); state.textContent = p.published ? "منشور" : "مخفي";
      info.append(name, price, state);
      const actions = document.createElement("div"); actions.className = "row-actions";
      const edit = document.createElement("button"); edit.className = "secondary-btn"; edit.textContent = "تعديل";
      edit.addEventListener("click", () => {
        $("product-id").value = p.id; $("product-name").value = p.name; $("product-price").value = p.price;
        $("product-description").value = p.description || ""; $("form-title").textContent = "تعديل المنتج";
        $("save-product").textContent = "حفظ التعديلات"; $("cancel-edit").classList.remove("hidden");
        editingImageUrl = p.image_url || null; window.scrollTo({top:0,behavior:"smooth"});
      });
      const del = document.createElement("button"); del.className = "danger-btn"; del.textContent = "حذف";
      del.addEventListener("click", async () => {
        if (!confirm("هل تريد حذف هذا المنتج نهائياً؟")) return;
        const { error } = await db.from("products").delete().eq("id", p.id);
        if (error) { alert("تعذر الحذف. تحقق من صلاحيات المالك."); console.error(error); return; }
        await loadAdminProducts();
      });
      actions.append(edit, del); row.append(img, info, actions); container.append(row);
    });
  }
  db.auth.onAuthStateChange((_event, session) => { setLoggedIn(session?.user || null); });
  checkSession();
})();
