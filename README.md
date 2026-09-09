# ⚽ AI MatchPulse - Çoklu Yapay Zeka Maç Tahmin, Mukayese & Canlı Skor Paneli

Apple & Vercel estetiğinde geliştirilmiş, tamamen bağımsız (standalone) ve istemci taraflı (zero-dependency) tek sayfalık web uygulaması (SPA).

---

## 🚀 Öne Çıkan Özellikler

1. **Günün Maç Tahmini Prompt Üreticisi**:
   - Günün gerçek tarihini (örn. *9 Eylül 2026, Çarşamba*) otomatik tespit eder.
   - Oran analizi, sürpriz tespiti, net skor ve standart çıktı şablonunu tek tıkla kopyalama olanağı sunar.
2. **Akıllı Ham Metin Ayrıştırma (Smart Matching)**:
   - ChatGPT, Claude, Gemini, DeepSeek, Grok gibi farklı yapay zekalardan gelen yanıtlardaki maçları ve skorları format fark etmeksizin algılar.
   - Takım adlarını ve kısaltmalarını (*Man City -> Manchester City*, *GS -> Galatasaray*) otomatik normalize eder.
3. **Yan Yana Mukayese Tablosu**:
   - Maçları standart sırada listeler ve yapay zekaların tahminlerini yan yana sütunlarda kıyaslar.
   - Ortak skor (*🔥 Skor: 2-1*) veya ortak sonuç trendlerini (*⚡ Trend: MS 1*) vurgular.
4. **Canlı Skorlar & Maç Durumu Eşitleme (Killer Feature)**:
   - **Devam Eden Maçlar**: Canlı maç dakikası (örn. `🔴 Dakika 68'`) ve anlık skor `1 - 1`.
   - **Biten Maçlar**: Resmi nihai skor `🏁 2 - 1 (MS)`.
   - **Başlamamış Maçlar**: `⏰ 21:45 | Başlamadı`.
   - Skor hücresine tıklayarak manuel anlık skor/dakika düzenleme desteği.
5. **AI Başarı & İsabet Rozetleri**:
   - **🎯 Tam İsabet! (+3 Puan)**: Skoru tam tutturan yapay zekaya parlayan yeşil rozet.
   - **✓ Sonuç Bildi (+1 Puan)**: Maç sonucunu (1, X, 2) doğru bilen yapay zekaya mavi rozet.
   - **❌ Iska**: Yanılan tahminlere nötr rozet.
6. **🏆 AI Başarı Sıralaması (Leaderboard)**:
   - Tablonun üzerinde hangi yapay zekanın kaç puan topladığını podyum formatında gösterir.
7. **Veri Kalıcılığı (LocalStorage)**:
   - Tüm maçlar, tahminler ve durumlar tarayıcınızda saklanır, sayfa yenilendiğinde silinmez.

---

## 📦 Proje Dosya Yapısı

```
ai-mac-analiz/
├── index.html            # Ana SPA arayüzü
├── css/
│   └── style.css         # Vercel & Apple minimalist stil sistemi
├── js/
│   └── app.js            # Ayrıştırma motoru, canlı skor & durum yönetimi
├── .nojekyll             # GitHub Pages Jekyll bypass dosyası
├── deploy_github.bat     # Otomatik GitHub Pages dağıtım scripti
└── README.md             # Dokümantasyon
```

---

## ⚡ Canlıya Dağıtım (GitHub Pages)

Projeyi yeni bir GitHub deposuna aktarıp canlıya almak için:

1. `deploy_github.bat` dosyasını çift tıklayarak çalıştırın.
2. GitHub depo adresinizi girin (veya varsayılan adresi onaylayın).
3. Script otomatik olarak `git init`, `commit` ve `push` işlemlerini tamamlar.
4. GitHub üzerinde deponuzun **Settings -> Pages** sekmesine gidin ve kaynak olarak `main` dalını seçip kaydedin.
5. 1-2 dakika içinde siteniz tüm dünyaya açık olarak yayına girecektir!
