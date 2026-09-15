/**
 * netlify/functions/submission-created.js
 * =========================================================
 * Netlify يستدعي هذا الملف تلقائيًا بعد كل إرسال ناجح لأي نموذج
 * بالموقع (بما فيها نموذج "أضف عرضك"). هذا اسم خاص يتعرف عليه
 * Netlify تلقائيًا - لا حاجة لأي إعداد إضافي لربطه بالنموذج.
 *
 * الوظيفة تاخذ بيانات العرض المُرسل وتضيفه مباشرة داخل ملف
 * data/offers.json على GitHub بحالة "غير منشور" (published: false)،
 * فيظهر داخل لوحة التحكم (/admin -> العروض) جاهزًا للمراجعة -
 * الأدمن بس يفتحه، يتأكد من البيانات، يفعّل "منشور بالموقع؟"،
 * ويضغط Publish.
 *
 * يتطلب متغيرات بيئة في Netlify (Site configuration -> Environment
 * variables):
 *   GITHUB_TOKEN  -> Personal Access Token بصلاحية repo
 *   GITHUB_REPO   -> مثال: "losho700/saudi-offers"
 *   GITHUB_BRANCH -> اختياري، افتراضيًا "main"
 * =========================================================
 */

const GITHUB_API = "https://api.github.com";
const FILE_PATH = "data/offers.json";
const CATEGORIES_PATH = "data/categories.json";

function slugifyId(text) {
  return (
    "offer-" +
    text
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^\u0600-\u06FFa-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .slice(0, 40) +
    "-" +
    Date.now().toString(36)
  );
}

async function githubGetFile(repo, path, branch, token) {
  const res = await fetch(
    `${GITHUB_API}/repos/${repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
      },
    }
  );
  if (!res.ok) {
    throw new Error(`تعذّر جلب الملف ${path} من GitHub: ${res.status}`);
  }
  const json = await res.json();
  const content = Buffer.from(json.content, "base64").toString("utf-8");
  return { content: JSON.parse(content), sha: json.sha };
}

async function githubPutFile(repo, path, branch, token, newContentObj, sha, message) {
  const body = {
    message,
    content: Buffer.from(
      JSON.stringify(newContentObj, null, 2),
      "utf-8"
    ).toString("base64"),
    sha,
    branch,
  };

  const res = await fetch(`${GITHUB_API}/repos/${repo}/contents/${path}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`فشل حفظ التعديل على GitHub: ${res.status} - ${errText}`);
  }
  return res.json();
}

exports.handler = async (event) => {
  try {
    const token = process.env.GITHUB_TOKEN;
    const repo = process.env.GITHUB_REPO;
    const branch = process.env.GITHUB_BRANCH || "main";

    if (!token || !repo) {
      console.error(
        "[submission-created] GITHUB_TOKEN أو GITHUB_REPO غير مُعرّفين في متغيرات البيئة."
      );
      return { statusCode: 200, body: "Missing env vars, skipped." };
    }

    const payload = JSON.parse(event.body).payload;

    // نتعامل فقط مع نموذج إضافة العروض
    if (!payload || payload.form_name !== "submit-offer") {
      return { statusCode: 200, body: "Not the submit-offer form, skipped." };
    }

    const data = payload.data || {};

    // Netlify يستبدل حقل الملف المرفوع برابط مباشر للصورة تلقائيًا
    const imageUrl =
      data.image && typeof data.image === "string" && data.image.trim()
        ? data.image
        : "https://via.placeholder.com/600x450/0b7a3e/ffffff?text=%D8%A8%D8%A7%D9%86%D8%AA%D8%B8%D8%A7%D8%B1+%D8%A7%D9%84%D8%B5%D9%88%D8%B1%D8%A9";

    // تحويل اسم القسم (اللي اختاره المُرسل) إلى معرّف القسم (id)
    const { content: categoriesData } = await githubGetFile(
      repo,
      CATEGORIES_PATH,
      branch,
      token
    );
    const matchedCategory = (categoriesData.items || []).find(
      (c) => c.name === data.category
    );
    const categoryId = matchedCategory ? matchedCategory.id : "online";

    const newOffer = {
      id: slugifyId(data.title || data.storeName || "offer"),
      title: data.title || "عرض جديد بدون عنوان",
      description: data.description || "",
      image: imageUrl,
      storeName: data.storeName || "",
      category: categoryId,
      url: data.offerUrl || "",
      discountPercent: null,
      discountCode: data.discountCode || "",
      expiryDate: "",
      featured: false,
      published: false, // بانتظار مراجعة الأدمن
      submitterContact: data.contact || "",
    };

    const { content: offersData, sha } = await githubGetFile(
      repo,
      FILE_PATH,
      branch,
      token
    );

    offersData.items = offersData.items || [];
    offersData.items.push(newOffer);

    await githubPutFile(
      repo,
      FILE_PATH,
      branch,
      token,
      offersData,
      sha,
      `عرض جديد بانتظار المراجعة: ${newOffer.title}`
    );

    return { statusCode: 200, body: "Offer added as pending review." };
  } catch (err) {
    console.error("[submission-created] خطأ:", err);
    return { statusCode: 500, body: String(err) };
  }
};
