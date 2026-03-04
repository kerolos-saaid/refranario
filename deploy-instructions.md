# نشر Refranario على GitHub Pages

## الخطوات:

### 1. إنشاء repository على GitHub
1. روح على https://github.com/new
2. اكتب اسم الـ repo: `refranario`
3. اختار Public
4. اضغط Create repository

### 2. رفع الملفات على GitHub
في terminal في مجلد المشروع:

```bash
git init
git add .
git commit -m "Initial commit - Refranario PWA"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/refranario.git
git push -u origin main
```

### 3. تفعيل GitHub Pages
1. روح على Settings في الـ repo
2. اضغط على Pages من القائمة الجانبية
3. تحت Source، اختار `main` branch
4. اضغط Save

### 4. انتظر دقيقة واحدة
GitHub هيبني الموقع ويديك URL زي:
```
https://YOUR_USERNAME.github.io/refranario/
```

### 5. افتح من الموبايل
افتح الـ URL ده من الموبايل ودلوقتي التثبيت هيشتغل!

---

## ملاحظة مهمة:
لو استخدمت GitHub Pages، هتحتاج تعدل الـ paths في manifest.json:

```json
{
  "start_url": "/refranario/",
  "scope": "/refranario/"
}
```

أو الأسهل: خلي الـ repo name يكون `YOUR_USERNAME.github.io` عشان يكون الـ URL:
```
https://YOUR_USERNAME.github.io/
```
وساعتها مش هتحتاج تعدل حاجة!
