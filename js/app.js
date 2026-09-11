/**
 * AI MatchPulse - Ana Uygulama Koordinatörü & SPA Motoru
 * Cloud Firestore Gerçek Zamanlı Bulut Senkronizasyonu & Çift Yönlü İstemci Motoru.
 */

import { firebaseService } from './services/firebase.js';
import { liveScoreService } from './services/liveScores.js';

class AIMatchPulseApp {
  constructor() {
    this.selectedAI = 'ChatGPT';
    this.availableAIs = ['ChatGPT', 'Claude', 'Gemini'];
    this.storageKey = 'aimatchpulse_matches_data';
    this.matchesData = this.loadStorage();
    this.currentTab = 'all';
    this.isCloudConnected = false;
    this.currentCouponStrategy = 'banko';
    this.couponVariationIndex = 0;
    this.generatedCoupons = null;
    window.app = this;
  }

  init() {
    this.setupDateAndPrompt();
    this.setupEventListeners();
    this.renderTable();
    this.initFirebaseSync();
    console.log('AI MatchPulse (v4.0 Bulut) başarıyla yüklendi.');
  }

  /**
   * Firebase Cloud Firestore Gerçek Zamanlı Eşitleme (onSnapshot)
   */
  initFirebaseSync() {
    firebaseService.onConnectionChange((isOnline, error) => {
      this.isCloudConnected = isOnline;
      this.updateCloudBadge(isOnline, error);
    });

    const initialized = firebaseService.init();
    if (initialized) {
      // 1. Gerçek Zamanlı Maç ve Skor Dinleyicisi
      firebaseService.subscribeToMatches((cloudMatches) => {
        const cloudCount = Object.keys(cloudMatches || {}).length;
        const localCount = Object.keys(this.matchesData || {}).length;

        if (cloudCount > 0) {
          // Bulutta maçlar var -> doğrudan buluttaki ortak gerçeğe senkronize ol
          this.matchesData = cloudMatches;
          this.refreshAvailableAIsFromMatches();
          this.saveStorage();
          this.renderTable();
          console.log(`☁️ Buluttan ${cloudCount} maç gerçek zamanlı güncellendi.`);
        } else if (localCount > 0) {
          // Bulut henüz boş fakat yerel hafızada veri var -> yereldeki verileri ilk kez buluta aktar
          console.log(`☁️ Yereldeki ${localCount} maç ilk kez buluta yükleniyor...`);
          firebaseService.saveMatchesBatch(this.matchesData);
          firebaseService.saveAvailableAIs(this.availableAIs);
        } else {
          this.matchesData = {};
          this.saveStorage();
          this.renderTable();
        }
      }, (err) => {
        console.warn('Bulut senkronizasyon dinleyicisi uyarısı:', err);
      });

      // 2. Yapay Zeka Kaynakları ve Ayar Dinleyicisi
      firebaseService.subscribeToConfig((config) => {
        if (config && Array.isArray(config.availableAIs) && config.availableAIs.length > 0) {
          let hasNew = false;
          config.availableAIs.forEach(ai => {
            if (!this.availableAIs.includes(ai)) {
              this.availableAIs.push(ai);
              hasNew = true;
            }
          });
          if (hasNew) this.renderTable();
        }
      });
    }
  }

  /**
   * Maçlardaki tüm AI kaynaklarını otomatik keşfet ve listeye ekle
   */
  refreshAvailableAIsFromMatches() {
    Object.values(this.matchesData).forEach(m => {
      if (m && m.predictions) {
        Object.keys(m.predictions).forEach(ai => {
          if (!this.availableAIs.includes(ai)) {
            this.availableAIs.push(ai);
          }
        });
      }
    });
  }

  /**
   * Header'daki Bulut Bağlantı Rozetini Güncelle
   */
  updateCloudBadge(isOnline, error) {
    const statusEl = document.getElementById('cloudSyncStatus');
    if (!statusEl) return;
    if (isOnline) {
      statusEl.innerHTML = `
        <span class="pulse-live-dot" style="background: #10b981; box-shadow: 0 0 8px #10b981;"></span>
        <span style="color: var(--accent-green); font-weight: 600;">Canlı Bulut Senkronizasyonu Aktif</span>
      `;
      statusEl.title = 'Google Cloud Firestore bağlı. Tüm değişiklikler eşzamanlı olarak diğer kullanıcılara yansır.';
    } else {
      statusEl.innerHTML = `
        <span style="width: 8px; height: 8px; border-radius: 50%; background: #f59e0b; display: inline-block;"></span>
        <span style="color: var(--accent-yellow); font-weight: 600;">Yerel Mod (Çevrimdışı)</span>
      `;
      statusEl.title = error || 'Bulut bağlantısı sağlanamadı. Değişiklikler tarayıcıda saklanıyor.';
    }
  }

  loadStorage() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.availableAIs && Array.isArray(parsed.availableAIs)) {
          this.availableAIs = parsed.availableAIs;
        }
        return parsed.matches || {};
      }
    } catch (e) {
      console.warn('Storage yükleme hatası:', e);
    }
    return {};
  }

  saveStorage() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify({
        availableAIs: this.availableAIs,
        matches: this.matchesData
      }));
    } catch (e) {
      console.warn('Storage kayıt hatası:', e);
    }
  }

  getTurkishFormattedDate(dateObj) {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return `${dateObj.getDate()} ${months[dateObj.getMonth()]} ${dateObj.getFullYear()}, ${days[dateObj.getDay()]}`;
  }

  setupDateAndPrompt() {
    const dateInput = document.getElementById('promptDateInput');
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    if (dateInput) {
      dateInput.value = `${yyyy}-${mm}-${dd}`;
    }
    this.updateDynamicPrompt();
  }

  updateDynamicPrompt() {
    const dateInput = document.getElementById('promptDateInput');
    const dateVal = dateInput ? dateInput.value : '';
    const parts = dateVal ? dateVal.split('-') : [];
    const dateObj = parts.length === 3 ? new Date(parts[0], parts[1] - 1, parts[2]) : new Date();
    const formattedDate = this.getTurkishFormattedDate(dateObj);
    const dayStr = String(dateObj.getDate()).padStart(2, '0');
    const monthStr = String(dateObj.getMonth() + 1).padStart(2, '0');
    const yearStr = dateObj.getFullYear();
    const numericDate = `${dayStr}.${monthStr}.${yearStr}`;

    const badge = document.getElementById('currentDateBadge');
    if (badge) badge.innerText = `${numericDate} (${formattedDate})`;

    const optRealFixture = document.getElementById('optRealFixture')?.checked ?? true;
    const optOdds = document.getElementById('optOdds')?.checked;
    const optSurprise = document.getElementById('optSurprise')?.checked;
    const optScore = document.getElementById('optScore')?.checked;
    const optStandart = document.getElementById('optStandart')?.checked;

    let prompt = `Merhaba! Bugünün (${numericDate} - ${formattedDate}) oynanacak en önemli futbol maçlarını analiz etmeni ve net skor tahminlerini sunmanı istiyorum.\n\n`;

    if (optRealFixture) {
      prompt += `🚨 'YALNIZCA GERÇEK FİKSTÜR KURALI' (HAYALİ MAÇ UYDURMAK KESİNLİKLE YASAKTIR):\n`;
      prompt += `1. Bugünün gerçek tarihinde (${numericDate}) UEFA Şampiyonlar Ligi veya dünyada oynanacak GERÇEK RESMİ MAÇLARI baz alacaksın.\n`;
      prompt += `2. Gerekirse web arama veya güncel veri motorunu kullanarak bugünün (${numericDate}) resmi fikstürünü teyit et.\n`;
      prompt += `3. ASLA VE ASLA hayali, geçmişte kalmış veya o gün takvimde oynamayacak maçlar (Türkiye vs İskoçya, Brezilya vs Arjantin vb.) UYDURMAYACAKSIN.\n`;
      prompt += `4. Eğer o gün oynanan resmi üst düzey maç yoksa, bunu açıkça belirt ve sadece o tarihte gerçekten oynanacak resmi fikstürdeki maçları listele.\n\n`;
    }

    prompt += `ANALİZ ODAK NOKTALARI:\n`;
    prompt += `1. Bugünün (${numericDate}) öne çıkan resmi fikstür maçlarını seç.\n`;

    if (optOdds) {
      prompt += `2. Takımların form durumları, hücum/savunma dengesi ve maçın favorisini belirt.\n`;
    }
    if (optSurprise) {
      prompt += `3. Sürpriz ihtimallerini, KG Var/Yok ve 2.5 Alt/Üst alternatif trendlerini değerlendir.\n`;
    }
    if (optScore) {
      prompt += `4. Her maç için mutlaka 'NET SKOR TAHMİNİ' ve güven oranını (%...) paylaş.\n`;
    }

    if (optStandart) {
      prompt += `\n═══════════════════════════════════════════════════════════════\n`;
      prompt += `⛔ ÇOK KATI ÇIKTI KURALI (OUTPUT FORMAT) - KESİNLİKLE UYULMALIDIR:\n`;
      prompt += `═══════════════════════════════════════════════════════════════\n`;
      prompt += `1. Giriş, selamlama, kapanış veya sohbet cümleleri (örn: "İşte bugünün maçları...", "Bol şanslar!") KESİNLİKLE KURMA. Lafı hiç uzatma.\n`;
      prompt += `2. TÜM YANITINI YALNIZCA TEK BİR MARKDOWN KOD BLOĞU (\`\`\`text ... \`\`\`) İÇİNDE VER. Kod bloğunun dışında tek bir kelime dahi yazma.\n`;
      prompt += `   (Bu sayede yanıtının sağ üst köşesindeki 'Copy' butonuna basarak tek tıkla kopyalayabileceğim).\n`;
      prompt += `3. Kod bloğunun içinde HER MAÇI istisnasız aşağıdaki 5 satırlık şablona birebir uyarak yaz ve maçların arasına '---' ayırıcısını koy:\n\n`;
      prompt += `\`\`\`text\n`;
      prompt += `Maç: [Ev Sahibi] vs [Deplasman]\n`;
      prompt += `Skor: [X - Y]\n`;
      prompt += `Tercih: [MS 1 / X / 2 - 2.5 Üst / KG Var vb.]\n`;
      prompt += `Güven: [%XX]\n`;
      prompt += `Analiz: [1-2 cümlelik kısa özet]\n`;
      prompt += `---\n`;
      prompt += `Maç: [Ev Sahibi] vs [Deplasman]\n`;
      prompt += `Skor: [X - Y]\n`;
      prompt += `Tercih: [MS 1 / X / 2 - 2.5 Üst / KG Var vb.]\n`;
      prompt += `Güven: [%XX]\n`;
      prompt += `Analiz: [1-2 cümlelik kısa özet]\n`;
      prompt += `\`\`\`\n\n`;
      prompt += `4. Şablondaki etiketleri (Maç:, Skor:, Tercih:, Güven:, Analiz:) harfi harfine koru. Asla kalınlaştırma (**), yıldız (*) veya altçizgi (_) kullanma, düz metin olarak kod bloğuna yerleştir.\n\n`;
      prompt += `Şimdi doğrudan tek bir markdown kod bloğu içinde yukarıdaki şablona tam uyarak bugünün (${numericDate}) GERÇEK maçlarını ve tahminlerini sırala:`;
    } else {
      prompt += `\nDoğrudan bugünün (${numericDate}) gerçek maç listesi ve tahminlere geçebilirsin. Teşekkürler!`;
    }

    const txtArea = document.getElementById('promptTextArea');
    if (txtArea) txtArea.value = prompt;
  }

  copyDynamicPrompt() {
    const txtArea = document.getElementById('promptTextArea');
    if (!txtArea) return;

    navigator.clipboard.writeText(txtArea.value).then(() => {
      this.showToast('✓ Prompt Kopyalandı!', 'Günün maç tahmin promptu panoya aktarıldı.');
      const btn = document.getElementById('copyBtnText');
      if (btn) {
        btn.innerText = 'Kopyalandı! ✓';
        setTimeout(() => { btn.innerText = 'Promptu Kopyala'; }, 2000);
      }
    });
  }

  normalizeTeamName(name) {
    if (!name) return '';
    let clean = name.trim();
    clean = clean.replace(/^[\d\.\-\*\#\s\)]+/, '');
    clean = clean.replace(/^(fc|afc|as|ss|sc)\s+/i, '');
    clean = clean.replace(/\s+(fc|cf|sk|fk|as|sc)$/i, '');

    const lower = clean.toLowerCase()
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, ' ').trim();

    if (lower.includes('real madrid') || lower === 'r madrid' || lower === 'madrid') return 'Real Madrid';
    if (lower.includes('barcelona') || lower === 'barca') return 'Barcelona';
    if (lower.includes('atletico madrid') || lower === 'atletico') return 'Atlético Madrid';
    if (lower.includes('manchester city') || lower === 'man city' || lower === 'mcfc') return 'Manchester City';
    if (lower.includes('manchester united') || lower === 'man utd' || lower === 'mufc') return 'Manchester United';
    if (lower.includes('arsenal')) return 'Arsenal';
    if (lower.includes('liverpool')) return 'Liverpool';
    if (lower.includes('chelsea')) return 'Chelsea';
    if (lower.includes('tottenham') || lower === 'spurs') return 'Tottenham';
    if (lower.includes('bayern') || lower.includes('munih') || lower.includes('munich')) return 'Bayern Münih';
    if (lower.includes('dortmund') || lower.includes('borussia')) return 'B. Dortmund';
    if (lower.includes('paris') || lower.includes('psg')) return 'PSG';
    if (lower.includes('inter') && !lower.includes('miami')) return 'Inter';
    if (lower.includes('milan') && !lower.includes('inter')) return 'Milan';
    if (lower.includes('juventus') || lower === 'juve') return 'Juventus';
    if (lower.includes('napoli')) return 'Napoli';
    if (lower.includes('galatasaray') || lower === 'gs' || lower === 'gala') return 'Galatasaray';
    if (lower.includes('fenerbahce') || lower === 'fb' || lower === 'fener') return 'Fenerbahçe';
    if (lower.includes('besiktas') || lower === 'bjk') return 'Beşiktaş';
    if (lower.includes('trabzonspor') || lower === 'ts') return 'Trabzonspor';

    return clean.charAt(0).toUpperCase() + clean.slice(1);
  }

  createMatchKey(teamA, teamB) {
    const normA = this.normalizeTeamName(teamA);
    const normB = this.normalizeTeamName(teamB);
    return [normA, normB].sort().join('___');
  }

  parseRawText(text) {
    const lines = text.split(/\r?\n/);
    const results = [];
    let currentMatch = null;

    const finalizeMatch = () => {
      if (currentMatch && currentMatch.home && currentMatch.away && currentMatch.score) {
        results.push({ ...currentMatch });
      }
      currentMatch = null;
    };

    for (let i = 0; i < lines.length; i++) {
      let rawLine = lines[i].trim();
      if (!rawLine) continue;

      // 1. Markdown kod bloğu sınırlarını yok say (```, ```text, ```markdown vb.)
      if (rawLine.startsWith('```')) continue;

      // 2. Ayırıcı çizgiler (--- veya ___ veya ***)
      if (/^[\-\_\*]{3,}$/.test(rawLine)) {
        finalizeMatch();
        continue;
      }

      // 3. Satırdaki markdown kalınlaştırma (**), italik (*, _) ve backtick (`) temizliği
      let cleanLine = rawLine.replace(/\*\*/g, '').replace(/__/g, '').replace(/`/g, '').trim();

      // 4. Maç Satırı Tespiti (Maç: Ev Sahibi vs Deplasman)
      const prefixMatch = cleanLine.match(/^(?:Maç|Mac|Karşılaşma|Karsilasma|Oyun|Match)\s*[:\-]\s*(.+)$/i);
      if (prefixMatch) {
        const lineContent = prefixMatch[1].trim();
        let homeTeam = '';
        let awayTeam = '';

        // Öncelikle 'vs', 'karşısında' gibi açık ayırıcıları ara
        const vsSplit = lineContent.split(/\s+(?:vs\.?|v\.?|karşısında)\s+/i);
        if (vsSplit.length >= 2) {
          homeTeam = vsSplit[0].trim();
          awayTeam = vsSplit.slice(1).join(' vs ').trim();
        } else {
          // 'vs' yoksa tire/en-dash/em-dash ile ayır
          const dashSplit = lineContent.split(/\s+[-–—]\s+/);
          if (dashSplit.length >= 2) {
            homeTeam = dashSplit[0].trim();
            awayTeam = dashSplit.slice(1).join(' - ').trim();
          }
        }

        if (homeTeam && awayTeam) {
          finalizeMatch();
          currentMatch = {
            home: homeTeam,
            away: awayTeam,
            score: null,
            tip: '',
            confidence: '',
            analysis: ''
          };
          continue;
        }
      }

      // 5. Eğer bir maç bloğunun içindeysek diğer özellikleri topla
      if (currentMatch) {
        // Saat Tespiti (Örn: Saat: 22:00 veya Zaman: 21:45)
        const timeMatch = cleanLine.match(/^(?:Saat|Zaman|Time|Kickoff)\s*[:\-]\s*(\d{1,2}[:\.]\d{2})/i);
        if (timeMatch) {
          currentMatch.time = timeMatch[1].replace('.', ':');
          continue;
        }

        // Skor Tespiti: Skor: 2 - 1 veya 2-1
        const scoreMatch = cleanLine.match(/^(?:Skor|Skor Tahmini|Tahmini Skor|Sonuç|Score)\s*[:\-]\s*(\d{1,2})\s*[-–—:]\s*(\d{1,2})/i);
        if (scoreMatch) {
          currentMatch.score = `${scoreMatch[1]}-${scoreMatch[2]}`;
          continue;
        }

        // Tercih Tespiti
        const tipMatch = cleanLine.match(/^(?:Tercih|Tahmin|Öneri|Bahis|Tip)\s*[:\-]\s*(.+)/i);
        if (tipMatch) {
          currentMatch.tip = tipMatch[1].trim();
          continue;
        }

        // Güven Tespiti
        const confMatch = cleanLine.match(/^(?:Güven|Guven|Güven Oranı|Guven Orani|Confidence)\s*[:\-]\s*(.+)/i);
        if (confMatch) {
          currentMatch.confidence = confMatch[1].trim();
          continue;
        }

        // Analiz Tespiti
        const analysisMatch = cleanLine.match(/^(?:Analiz|Yorum|Açıklama|Aciklama|Özet|Ozet|Analysis)\s*[:\-]\s*(.+)/i);
        if (analysisMatch) {
          currentMatch.analysis = analysisMatch[1].trim();
          continue;
        }
      }

      // 6. Tek Satır Formatı (Fallback: "Real Madrid vs Barcelona: 2-1 (KG Var)")
      const singleLineMatch = cleanLine.match(/(?:[\d\.\-\*\#\)]+\s*)?([A-Za-z0-9çğıöşüÇĞİÖŞÜ\s\.]+?)\s*(?:vs\.?|karşısında|-|–|—)\s*([A-Za-z0-9çğıöşüÇĞİÖŞÜ\s\.]+?)(?:[\:\-–\|]|\s+skor\s*[:\-]?\s*)\s*(\d{1,2})\s*[-–—:]\s*(\d{1,2})(.*)$/i);
      if (singleLineMatch) {
        finalizeMatch();
        results.push({
          home: singleLineMatch[1].trim(),
          away: singleLineMatch[2].trim(),
          score: `${singleLineMatch[3]}-${singleLineMatch[4]}`,
          tip: singleLineMatch[5] ? singleLineMatch[5].replace(/^[\(\[\:\s\-–\|]+/, '').replace(/[\)\]\s]+$/, '').trim() : '',
          confidence: '',
          analysis: ''
        });
        continue;
      }

      // 7. Genel Fallback: Satırda takım vs takım ve X-Y skoru varsa
      const scorePattern = /\b(\d{1,2})\s*[-–:]\s*(\d{1,2})\b/;
      const foundScore = cleanLine.match(scorePattern);
      if (foundScore && (cleanLine.includes(' vs ') || cleanLine.includes(' - ') || cleanLine.includes(' – '))) {
        const parts = cleanLine.split(foundScore[0]);
        const teamsPart = parts[0].replace(/^[\d\.\-\*\#\s\)]+/, '').trim();
        const teamSplit = teamsPart.split(/\s+(?:vs\.?|-|–|—)\s+/i);
        if (teamSplit.length >= 2) {
          finalizeMatch();
          results.push({
            home: teamSplit[0].trim(),
            away: teamSplit[1].trim(),
            score: `${foundScore[1]}-${foundScore[2]}`,
            tip: parts[1] ? parts[1].replace(/^[\(\[\:\s\-–\|]+/, '').replace(/[\)\]\s]+$/, '').trim() : '',
            confidence: '',
            analysis: ''
          });
        }
      }
    }

    finalizeMatch();
    return results;
  }

  processRawText() {
    const rawInput = document.getElementById('rawTextInput');
    const customAIInput = document.getElementById('customAIName');
    const text = rawInput ? rawInput.value.trim() : '';
    const aiSource = (customAIInput && customAIInput.value.trim()) ? customAIInput.value.trim() : this.selectedAI;

    if (!text) {
      alert('Lütfen yapay zekadan aldığınız tahmin metnini yapıştırın.');
      return;
    }

    if (!this.availableAIs.includes(aiSource)) {
      this.availableAIs.push(aiSource);
    }

    const parsed = this.parseRawText(text);
    const statusMsg = document.getElementById('parseStatusText');

    if (parsed.length === 0) {
      if (statusMsg) {
        statusMsg.innerHTML = `<span style="color: var(--accent-yellow);">⚠️ Skorlu maç tespit edilemedi. Kod bloğunu eksiksiz yapıştırdığınızdan emin olun.</span>`;
      }
      return;
    }

    parsed.forEach(item => {
      const homeNorm = this.normalizeTeamName(item.home);
      const awayNorm = this.normalizeTeamName(item.away);
      const key = this.createMatchKey(homeNorm, awayNorm);

      if (!this.matchesData[key]) {
        const defaultTime = item.time || '21:45';
        this.matchesData[key] = {
          id: 'm_' + Math.random().toString(36).substr(2, 9),
          home: homeNorm,
          away: awayNorm,
          displayName: `${homeNorm} vs ${awayNorm}`,
          status: 'upcoming',
          time: defaultTime,
          currentScore: null,
          minute: null,
          displayStatus: defaultTime,
          predictions: {}
        };
      } else if (item.time) {
        this.matchesData[key].time = item.time;
        if (this.matchesData[key].status === 'upcoming') {
          this.matchesData[key].displayStatus = item.time;
        }
      }

      this.matchesData[key].predictions[aiSource] = {
        score: item.score,
        tip: item.tip,
        confidence: item.confidence || '',
        analysis: item.analysis || ''
      };
    });

    this.saveStorage();
    if (rawInput) rawInput.value = '';

    // Bulut Senkronizasyonu: Yeni eklenen/güncellenen maçları Firestore'a aktar
    const cloudBatch = {};
    parsed.forEach(item => {
      const homeNorm = this.normalizeTeamName(item.home);
      const awayNorm = this.normalizeTeamName(item.away);
      const key = this.createMatchKey(homeNorm, awayNorm);
      if (this.matchesData[key]) {
        cloudBatch[key] = this.matchesData[key];
      }
    });
    firebaseService.saveMatchesBatch(cloudBatch);
    firebaseService.saveAvailableAIs(this.availableAIs);

    if (statusMsg) {
      statusMsg.innerHTML = `<span style="color: var(--accent-green);">✓ <b>${aiSource}</b> kaynağından ${parsed.length} maç başarıyla eşleştirildi (Buluta Yazıldı).</span>`;
    }
    this.showToast('Tablo Güncellendi! ⚡', `${aiSource} için ${parsed.length} maç buluta ve ekrana işlendi.`);
    this.renderTable();
  }

  evaluatePrediction(predictedScore, match) {
    if (!match || match.status === 'upcoming' || !match.currentScore) {
      return null;
    }

    const predParts = String(predictedScore).split(/[-–:]/).map(n => parseInt(n.trim()));
    const realParts = String(match.currentScore).split(/[-–:]/).map(n => parseInt(n.trim()));

    if (predParts.length < 2 || realParts.length < 2 || isNaN(predParts[0]) || isNaN(realParts[0])) {
      return null;
    }

    const [pH, pA] = predParts;
    const [rH, rA] = realParts;

    // 1. TAM SKOR İSABETİ (3 Puan)
    if (pH === rH && pA === rA) {
      return {
        type: 'exact',
        points: 3,
        label: '🎯 Tam İsabet! (+3P)',
        badgeClass: 'tag-green glow-emerald'
      };
    }

    // 2. MAÇ SONUCU İSABETİ (1, X, 2) (1 Puan)
    const pOutcome = pH > pA ? '1' : (pH < pA ? '2' : 'X');
    const rOutcome = rH > rA ? '1' : (rH < rA ? '2' : 'X');

    if (pOutcome === rOutcome) {
      return {
        type: 'outcome',
        points: 1,
        label: '✓ Sonuç Bildi (+1P)',
        badgeClass: 'tag-blue'
      };
    }

    // 3. ISKA
    return {
      type: 'miss',
      points: 0,
      label: '❌ Iska',
      badgeClass: 'tag-subtle'
    };
  }

  calculateLeaderboard() {
    const stats = {};
    this.availableAIs.forEach(ai => {
      stats[ai] = { name: ai, points: 0, exact: 0, outcome: 0, total: 0 };
    });

    let anyEvaluated = false;
    Object.values(this.matchesData).forEach(match => {
      if (match.status && match.status !== 'upcoming' && match.currentScore) {
        this.availableAIs.forEach(ai => {
          const pred = match.predictions?.[ai];
          if (pred && pred.score) {
            const ev = this.evaluatePrediction(pred.score, match);
            if (ev) {
              anyEvaluated = true;
              stats[ai].total++;
              stats[ai].points += ev.points;
              if (ev.type === 'exact') stats[ai].exact++;
              if (ev.type === 'outcome') stats[ai].outcome++;
            }
          }
        });
      }
    });

    if (!anyEvaluated) return null;
    return Object.values(stats).sort((a, b) => b.points - a.points);
  }

  async syncLiveScores() {
    const keys = Object.keys(this.matchesData);
    if (keys.length === 0) {
      alert('Henüz skorları çekilecek bir maç kaydı bulunmuyor.');
      return;
    }

    const btn = document.getElementById('btnSyncScores');
    if (btn) {
      btn.innerHTML = `<span class="pulse-live-dot"></span> <span>⏳ Gerçek Maç Skorları Çekiliyor (ESPN Veri Akışı)...</span>`;
      btn.disabled = true;
    }

    try {
      const dateInput = document.getElementById('promptDateInput');
      const selectedDate = dateInput ? dateInput.value : '';

      // ESPN Live API üzerinden tüm liglerden gerçek maç sonuçlarını çek ve eşleştir
      const result = await liveScoreService.syncMatchesWithRealScores(this.matchesData, selectedDate);
      this.matchesData = result.updatedMatches;

      // Yerel ve Bulut (Firestore) kaydı
      this.saveStorage();
      this.renderTable();
      firebaseService.saveMatchesBatch(this.matchesData);

      const { finished, live, upcoming, notFound, total, totalRealEventsFound } = result.stats;

      let toastTitle = 'Gerçek Skorlar Güncellendi ⚡';
      let toastMsg = `${total} maçın gerçek durumları kontrol edildi (${totalRealEventsFound} resmi maç tarandı).`;

      if (finished > 0 || live > 0) {
        toastMsg = `✅ ${finished} maç bitti (MS), ${live} maç canlı. ${upcoming} maç henüz başlamadı.`;
      } else if (upcoming > 0 && notFound === 0) {
        toastTitle = 'Maçlar Henüz Başlamadı ⏰';
        toastMsg = `${upcoming} maçın saati henüz gelmediği için korundu, sahte skor atanmadı.`;
      } else if (notFound > 0 && finished === 0 && live === 0) {
        toastMsg = `${upcoming} maç henüz başlamadı. ${notFound} maç resmi lig fikstüründe bulunamadı (elle skor girebilirsiniz).`;
      }

      this.showToast(toastTitle, toastMsg);
    } catch (err) {
      console.error('Canlı skor çekme hatası:', err);
      this.showToast('Bağlantı Uyarısı ⚠️', 'Gerçek skorlar çekilirken bir hata oluştu: ' + (err.message || 'Bilinmeyen hata'));
    } finally {
      if (btn) {
        btn.innerHTML = `<span class="pulse-live-dot"></span> <span>⚡ Canlı Skorları / Sonuçları Çek</span>`;
        btn.disabled = false;
      }
    }
  }

  /**
   * 🎯 AI AKILLI KUPON MOTORU (v6.1 - Tam Kapsam & Gerçek Zamanlı Varyasyon)
   * Tablodaki tüm geçerli maçları stratejiye göre filtreler, oranlandırır ve harmanlar.
   * Maç sayısını 3-4 ile sınırlamaz; tablodaki tüm analiz edilmiş maçları kupona dahil eder.
   */
  generateAICoupons(variationSeed = 0) {
    const matches = Object.values(this.matchesData || {});
    if (matches.length === 0) return null;

    const analyzedMatches = [];

    matches.forEach(m => {
      if (!m || !m.home || !m.away) return;
      const preds = Object.entries(m.predictions || {}).filter(([ai, p]) => p && (p.score || p.tip));
      if (preds.length === 0) return;

      const outcomes = []; // '1', 'X', '2'
      const goals = []; // 'over', 'under'
      const kgList = []; // 'yes', 'no'
      const confidences = [];
      const tips = [];
      const scores = [];
      const aiAnalyses = [];

      preds.forEach(([ai, p]) => {
        // Güven ayrıştırma (örn: "%85" -> 85)
        let confNum = 75;
        if (p.confidence) {
          const numMatch = String(p.confidence).match(/\d{1,3}/);
          if (numMatch) {
            confNum = Math.min(100, Math.max(10, parseInt(numMatch[0])));
          }
        }
        confidences.push(confNum);

        // Skor ve sonuç analizi
        if (p.score) {
          scores.push(p.score);
          const parts = p.score.split(/[-–:]/).map(n => parseInt(n.trim()));
          if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            const [h, a] = parts;
            if (h > a) outcomes.push('1');
            else if (h < a) outcomes.push('2');
            else outcomes.push('X');

            if (h + a >= 3) goals.push('over');
            else goals.push('under');

            if (h > 0 && a > 0) kgList.push('yes');
            else kgList.push('no');
          }
        }

        if (p.tip) tips.push({ ai, tip: p.tip });
        if (p.analysis) aiAnalyses.push({ ai, text: p.analysis, conf: confNum });
      });

      const avgConfidence = Math.round(confidences.reduce((a, b) => a + b, 0) / confidences.length);

      // En çok oylanan sonuç (1, X, 2)
      const outcomeCounts = outcomes.reduce((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {});
      const topOutcomeEntry = Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1])[0];
      const topOutcome = topOutcomeEntry ? topOutcomeEntry[0] : '1';
      const outcomeVoteCount = topOutcomeEntry ? topOutcomeEntry[1] : 1;
      const consensusRate = Math.round((outcomeVoteCount / preds.length) * 100);

      // En popüler skor
      const scoreCounts = scores.reduce((acc, s) => { acc[s] = (acc[s] || 0) + 1; return acc; }, {});
      const topScore = Object.entries(scoreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '2 - 1';

      // En iyi analiz metni
      const bestAnalysis = aiAnalyses.sort((a, b) => b.conf - a.conf)[0]?.text || 'Yapay zeka modelleri bu karşılaşmada ortak eğilim gösteriyor.';

      // Gol & KG eğilimleri
      const overVotes = goals.filter(g => g === 'over').length;
      const underVotes = goals.filter(g => g === 'under').length;
      const kgYesVotes = kgList.filter(k => k === 'yes').length;

      // 1. BANKO TERCİHLERİ (En sağlam, düşük riskli tercihler | Hedef Kombine: ~3.00 - 3.40 Oran)
      let bankoTip = '';
      const bankoOddsPool = [1.42, 1.45, 1.48, 1.50, 1.38, 1.44, 1.46, 1.52];
      const bankoOddNum = bankoOddsPool[(analyzedMatches.length + variationSeed) % bankoOddsPool.length];

      if (topOutcome === '1') {
        bankoTip = (variationSeed % 2 === 1 && overVotes >= 2) ? '1.5 Üst & 1X Çifte Şans' : 'MS 1 (Ev Sahibi Galibiyeti)';
      } else if (topOutcome === '2') {
        bankoTip = (variationSeed % 2 === 1) ? 'X2 Çifte Şans' : 'MS 2 (Deplasman Galibiyeti)';
      } else {
        bankoTip = '1X Çifte Şans (Dengeli)';
      }

      // 2. İDEAL / GOL TERCİHLERİ (Dengeli oran & gol kombinasyonları | Hedef Kombine: ~6.50 - 8.00 Oran)
      let idealTip = '';
      const idealOddsPool = [1.85, 1.90, 1.98, 2.05, 1.82, 1.88, 1.92, 2.10];
      const idealOddNum = idealOddsPool[(analyzedMatches.length + variationSeed) % idealOddsPool.length];

      if (variationSeed % 3 === 0) {
        if (overVotes >= preds.length / 2) {
          idealTip = '2.5 Üst Gol';
        } else if (kgYesVotes >= 2) {
          idealTip = 'KG Var (Karşılıklı Gol)';
        } else {
          idealTip = topOutcome === '1' ? 'MS 1 & 1.5 Üst Gol' : '2-3 Toplam Gol';
        }
      } else if (variationSeed % 3 === 1) {
        if (kgYesVotes >= 1) {
          idealTip = 'KG Var (Karşılıklı Gol)';
        } else {
          idealTip = topOutcome === '1' ? 'MS 1 (Ev Sahibi)' : '2.5 Üst Gol';
        }
      } else {
        idealTip = (overVotes >= 2) ? '2.5 Üst Gol' : '2-3 Toplam Gol';
      }

      // 3. SÜRPRİZ / DEĞER TERCİHLERİ (Yüksek getiri, beraberlik, sürpriz deplasman | Hedef Kombine: 10+ Oran Garantili!)
      let surprizTip = '';
      let surprizScore = 75;
      let surprizOddNum = 3.50;

      if (topOutcome === 'X') {
        surprizTip = (variationSeed % 2 === 0) ? 'MS X (Beraberlik Sürprizi)' : 'İY 0 / MS X (Kilit Maç)';
        surprizOddNum = (variationSeed % 2 === 0) ? 3.45 : 4.40;
        surprizScore = 95;
      } else if (topOutcome === '2') {
        surprizTip = (variationSeed % 2 === 0) ? 'MS 2 & 2.5 Üst (Deplasman Zaferi)' : 'MS 2 & KG Var';
        surprizOddNum = (variationSeed % 2 === 0) ? 3.80 : 4.20;
        surprizScore = 90;
      } else if (kgYesVotes >= 2 && overVotes >= 2) {
        surprizTip = (variationSeed % 2 === 0) ? 'KG Var & 3.5 Üst Gol' : '3.5 Üst Gol & Karşılıklı Skor';
        surprizOddNum = (variationSeed % 2 === 0) ? 3.50 : 3.75;
        surprizScore = 85;
      } else {
        surprizTip = (variationSeed % 2 === 0) ? 'İlk Yarı X / Maç Sonu 1' : 'Handikap 0 (Tek Farklı Galibiyet)';
        surprizOddNum = (variationSeed % 2 === 0) ? 4.10 : 3.65;
        surprizScore = 80;
      }

      analyzedMatches.push({
        key: [m.home, m.away].sort().join('___'),
        home: m.home,
        away: m.away,
        time: m.time || '21:45',
        status: m.status || 'upcoming',
        currentScore: m.currentScore,
        displayStatus: m.displayStatus,
        totalAIs: preds.length,
        outcomeVoteCount,
        topOutcome,
        consensusRate,
        avgConfidence,
        topScore,
        bestAnalysis,
        contributingAIs: preds.map(([ai]) => ai),
        agreementScore: (consensusRate * 0.6) + (avgConfidence * 0.4),
        surprizScore,
        bankoTip,
        bankoOddNum,
        idealTip,
        idealOddNum,
        surprizTip,
        surprizOddNum
      });
    });

    if (analyzedMatches.length === 0) return null;

    // TÜM GEÇERLİ MAÇLARI DAHİL ET & ORANLARI ÇARPARAK KUPON TOPLAMINI HESAPLA:
    // 1. BANKO: Tüm geçerli maçlar, en yüksek uyum ve güven sırasıyla (3'lü Kombine ~3.00 - 3.40 Oran)
    const bankoMatches = [...analyzedMatches]
      .sort((a, b) => b.agreementScore - a.agreementScore)
      .map(m => ({
        ...m,
        selectedTip: m.bankoTip,
        oddNum: m.bankoOddNum,
        tipType: 'banko',
        confidenceBadge: `%${m.avgConfidence} Güven`,
        oddBadge: `Oran: ${m.bankoOddNum.toFixed(2)}`,
        reason: `${m.outcomeVoteCount}/${m.totalAIs} AI Modeli (${m.contributingAIs.join(', ')}) bu tercihte ortaklaştı. Skor konsensüsü: ${m.topScore}`
      }));
    const bankoCoreCount = Math.min(3, bankoMatches.length);
    const bankoCore = bankoMatches.slice(0, bankoCoreCount);
    const bankoTotalOdds = Number(bankoCore.reduce((acc, m) => acc * m.oddNum, 1).toFixed(2));

    // 2. İDEAL: Tüm geçerli maçlar, gol ve form dengesi sırasıyla (3'lü Kombine ~6.50 - 8.00 Oran)
    const idealMatches = [...analyzedMatches]
      .sort((a, b) => (b.avgConfidence * 0.7 + b.consensusRate * 0.3) - (a.avgConfidence * 0.7 + a.consensusRate * 0.3))
      .map(m => ({
        ...m,
        selectedTip: m.idealTip,
        oddNum: m.idealOddNum,
        tipType: 'ideal',
        confidenceBadge: `%${m.avgConfidence} Güven`,
        oddBadge: `Oran: ${m.idealOddNum.toFixed(2)}`,
        reason: m.bestAnalysis
      }));
    const idealCoreCount = Math.min(3, idealMatches.length);
    const idealCore = idealMatches.slice(0, idealCoreCount);
    const idealTotalOdds = Number(idealCore.reduce((acc, m) => acc * m.oddNum, 1).toFixed(2));

    // 3. SÜRPRİZ / DEĞER: Tüm geçerli maçlar, getiri ve sürpriz potansiyeli sırasıyla (10+ Oran Garantili Kombine!)
    const surprizMatches = [...analyzedMatches]
      .sort((a, b) => b.surprizScore - a.surprizScore)
      .map(m => ({
        ...m,
        selectedTip: m.surprizTip,
        oddNum: m.surprizOddNum,
        tipType: 'surpriz',
        confidenceBadge: `%${Math.max(60, m.avgConfidence - 8)} Değer Güveni`,
        oddBadge: `🔥 Oran: ${m.surprizOddNum.toFixed(2)}`,
        reason: (m.topOutcome === 'X' ? 'Beraberlik ve kilitlenme olasılığı yüksek değer maçı.' : m.bestAnalysis)
      }));
    const surprizCoreCount = Math.min(2, surprizMatches.length);
    const surprizCore = surprizMatches.slice(0, surprizCoreCount);
    const surprizTotalOdds = Number(surprizCore.reduce((acc, m) => acc * m.oddNum, 1).toFixed(2));

    return {
      banko: {
        title: '🟢 Günün Banko AI Kuponu',
        badge: '🟢 En Yüksek Güven & Sağlam Seçimler',
        strategy: 'banko',
        strategyTag: '🟢 BANKO KUPON (~3.10 ORAN)',
        totalOdds: bankoTotalOdds,
        totalOddsFormatted: bankoTotalOdds.toFixed(2),
        oddsTargetText: `~${bankoTotalOdds.toFixed(2)} Oran (Kasa Kombini)`,
        coreMatchesCount: bankoCoreCount,
        matches: bankoMatches,
        avgConfidence: Math.round(bankoMatches.reduce((s, m) => s + m.avgConfidence, 0) / bankoMatches.length),
        totalMatches: bankoMatches.length
      },
      ideal: {
        title: '🟡 Günün İdeal / Gol AI Kuponu',
        badge: '🟡 Dengeli Oran & Trend Tercihler',
        strategy: 'ideal',
        strategyTag: '🟡 İDEAL KUPON (~7.00 ORAN)',
        totalOdds: idealTotalOdds,
        totalOddsFormatted: idealTotalOdds.toFixed(2),
        oddsTargetText: `~${idealTotalOdds.toFixed(2)} Oran (Dengeli Kombin)`,
        coreMatchesCount: idealCoreCount,
        matches: idealMatches,
        avgConfidence: Math.round(idealMatches.reduce((s, m) => s + m.avgConfidence, 0) / idealMatches.length),
        totalMatches: idealMatches.length
      },
      surpriz: {
        title: '🔥 Günün Sürpriz / Değer AI Kuponu',
        badge: '🔥 Yüksek Getiri Potansiyeli (10+ Oran)',
        strategy: 'surpriz',
        strategyTag: '🔥 SÜRPRİZ BOMBA (10+ ORAN)',
        totalOdds: surprizTotalOdds,
        totalOddsFormatted: surprizTotalOdds.toFixed(2),
        oddsTargetText: `10+ Bomba Oran (~${surprizTotalOdds.toFixed(2)})`,
        coreMatchesCount: surprizCoreCount,
        matches: surprizMatches,
        avgConfidence: Math.round(surprizMatches.reduce((s, m) => s + m.avgConfidence, 0) / surprizMatches.length),
        totalMatches: surprizMatches.length
      }
    };
  }

  openCouponModal() {
    this.generatedCoupons = this.generateAICoupons(this.couponVariationIndex || 0);
    if (!this.generatedCoupons) {
      this.showToast('Veri Bulunamadı ⚠️', 'Kupon üretmek için tablonuzda en az bir yapay zeka tahmini bulunmalıdır. Demo veri yükleyebilir veya tahmin yapıştırabilirsiniz.');
      return;
    }

    const modal = document.getElementById('aiCouponModal');
    if (modal) {
      modal.style.display = 'flex';
      this.switchCouponTab(this.currentCouponStrategy || 'banko');
    }
  }

  closeCouponModal() {
    const modal = document.getElementById('aiCouponModal');
    if (modal) modal.style.display = 'none';
  }

  switchCouponTab(strategy) {
    if (!strategy) strategy = 'banko';
    this.currentCouponStrategy = strategy;

    // Sekme butonlarını anında güncelle
    document.querySelectorAll('.coupon-tab-btn').forEach(btn => {
      const btnStrat = btn.dataset.strategy || (btn.id.includes('Banko') ? 'banko' : (btn.id.includes('Ideal') ? 'ideal' : 'surpriz'));
      btn.classList.toggle('active', btnStrat === strategy);
    });

    // İlgili kupon görünümünü çiz
    this.renderCouponView(strategy);
  }

  renderCouponView(strategy) {
    if (!strategy) strategy = 'banko';
    if (!this.generatedCoupons || !this.generatedCoupons[strategy]) {
      this.generatedCoupons = this.generateAICoupons(this.couponVariationIndex || 0);
    }
    const coupon = this.generatedCoupons?.[strategy];
    if (!coupon) return;

    // Header badge
    const badgeEl = document.getElementById('couponStrategyBadge');
    if (badgeEl) {
      badgeEl.innerText = coupon.badge;
      badgeEl.className = `notion-tag ${strategy === 'banko' ? 'tag-green' : (strategy === 'ideal' ? 'tag-blue' : 'tag-yellow')}`;
    }

    // Stats Bar: Toplam Kupon Oranı'nı devasa ve dikkat çekici göster
    const statsEl = document.getElementById('couponStatsBar');
    if (statsEl) {
      const varNumber = (this.couponVariationIndex || 0) + 1;
      const isBanko = strategy === 'banko';
      const isIdeal = strategy === 'ideal';
      const isSurpriz = strategy === 'surpriz';

      const totalOddsBg = isBanko
        ? 'rgba(16, 185, 129, 0.12)'
        : (isIdeal ? 'rgba(59, 130, 246, 0.12)' : 'rgba(245, 158, 11, 0.16)');
      const totalOddsBorder = isBanko
        ? 'rgba(16, 185, 129, 0.35)'
        : (isIdeal ? 'rgba(59, 130, 246, 0.35)' : 'rgba(245, 158, 11, 0.45)');
      const totalOddsColor = isBanko
        ? 'var(--accent-green)'
        : (isIdeal ? 'var(--accent-blue)' : 'var(--accent-yellow)');

      statsEl.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 12px; flex-wrap: wrap;">
            <div style="display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 8px; background: ${totalOddsBg}; border: 1px solid ${totalOddsBorder}; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">
              <span style="font-size: 11px; font-weight: 700; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">${isSurpriz ? '🔥 BOMBA KUPON ORANI:' : '🎯 TOPLAM KUPON ORANI:'}</span>
              <span style="font-size: 17px; font-weight: 800; font-family: var(--font-mono); color: ${totalOddsColor};">${coupon.totalOddsFormatted}</span>
              <span style="font-size: 11px; font-weight: 600; color: ${totalOddsColor}; opacity: 0.95;">(${coupon.oddsTargetText})</span>
            </div>
            <span style="font-size: 12px; color: var(--text-secondary);">
              📋 <b>${coupon.coreMatchesCount} Maçlık Kombine</b> <span style="color: var(--text-muted); font-size: 11px;">(Tablodaki ${coupon.totalMatches} Maç İncelendi)</span>
            </span>
            <span style="font-size: 12px; color: var(--text-secondary);">
              ⚡ Ortalama Güven: <b style="color: var(--accent-green); font-family: var(--font-mono); font-size: 13px;">%${coupon.avgConfidence}</b>
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="notion-tag tag-subtle" style="font-size: 10.5px; font-family: var(--font-mono);">🎲 Varyasyon #${varNumber}</span>
            <span class="notion-tag ${isBanko ? 'tag-green' : (isIdeal ? 'tag-blue' : 'tag-yellow')}" style="font-size: 10.5px; font-weight: 700;">${coupon.strategyTag}</span>
          </div>
        </div>
      `;
    }

    // Cards container
    const container = document.getElementById('couponMatchesContainer');
    if (!container) return;

    // Renk stilleri
    const tipColor = strategy === 'banko' ? 'var(--accent-green)' : (strategy === 'ideal' ? 'var(--accent-blue)' : 'var(--accent-yellow)');
    const oddBorder = strategy === 'banko' ? 'rgba(16, 185, 129, 0.3)' : (strategy === 'ideal' ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)');
    const coreBg = strategy === 'banko' ? 'rgba(16, 185, 129, 0.08)' : (strategy === 'ideal' ? 'rgba(59, 130, 246, 0.08)' : 'rgba(245, 158, 11, 0.08)');

    container.innerHTML = coupon.matches.map((m, idx) => {
      const isCore = idx < coupon.coreMatchesCount;
      const coreBadge = isCore
        ? `<span class="notion-tag" style="background: ${coreBg}; border-color: ${tipColor}; color: ${tipColor}; font-weight: 700; font-size: 10.5px;">⭐ Kupon Kombinesinde (#${idx + 1})</span>`
        : `<span class="notion-tag tag-subtle" style="font-size: 10.5px;">💡 Alternatif / Sistem Tercihi</span>`;

      return `
      <div class="coupon-match-card" style="border-left: 3px solid ${tipColor}; ${isCore ? 'background: rgba(255, 255, 255, 0.02);' : 'opacity: 0.9;'}">
        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="width: 24px; height: 24px; border-radius: 50%; background: rgba(255, 255, 255, 0.08); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; color: var(--text-primary);">
              ${idx + 1}
            </span>
            <span style="font-weight: 700; font-size: 14px; color: var(--text-primary);">
              ${m.home} vs ${m.away}
            </span>
            ${coreBadge}
          </div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 11.5px; color: var(--text-muted); font-family: var(--font-mono);">
              ⏰ ${m.time}
            </span>
            <span class="notion-tag" style="border-color: ${oddBorder}; font-family: var(--font-mono); font-size: 11.5px; font-weight: 700; color: ${tipColor}; background: rgba(255, 255, 255, 0.04);">
              ${m.oddBadge}
            </span>
            <span class="notion-tag tag-subtle" style="font-family: var(--font-mono); font-size: 11px; font-weight: 600;">
              ${m.confidenceBadge}
            </span>
          </div>
        </div>

        <div style="display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; padding: 8px 12px; background: rgba(255, 255, 255, 0.03); border-radius: var(--radius-sm); border: 1px solid var(--border-subtle);">
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 11.5px; color: var(--text-muted);">Önerilen Tercih:</span>
            <span style="font-weight: 700; font-size: 13.5px; color: ${tipColor};">
              🎯 ${m.selectedTip}
            </span>
          </div>
          <div style="font-size: 11.5px; color: var(--text-secondary); font-family: var(--font-mono);">
            Skor Konsensüsü: <span style="font-weight: 700; color: var(--text-primary);">${m.topScore}</span>
          </div>
        </div>

        <div style="font-size: 11.5px; color: var(--text-muted); line-height: 1.4; display: flex; align-items: flex-start; gap: 6px;">
          <span>💡</span>
          <span><b>Konsensüs & Analiz:</b> ${m.reason}</span>
        </div>
      </div>
      `;
    }).join('');
  }

  regenerateCoupon() {
    this.couponVariationIndex = (this.couponVariationIndex || 0) + 1;
    this.generatedCoupons = this.generateAICoupons(this.couponVariationIndex);
    this.renderCouponView(this.currentCouponStrategy || 'banko');
    this.showToast('Yeni Varyasyon Hazırlandı 🎲', `Alternatif AI tahminleri harmanlandı (Varyasyon #${this.couponVariationIndex + 1}).`);
  }

  copyCouponText() {
    const coupon = this.generatedCoupons?.[this.currentCouponStrategy || 'banko'];
    if (!coupon) return;

    const isSurpriz = this.currentCouponStrategy === 'surpriz';
    let text = `🎯 AI MATCHPULSE - ${coupon.title.toUpperCase()}\n`;
    text += `⚡ Strateji: ${coupon.badge}\n`;
    text += `${isSurpriz ? '🔥 BOMBA KUPON ORANI:' : '🎯 TOPLAM KUPON ORANI:'} ~${coupon.totalOddsFormatted} (${coupon.oddsTargetText})\n`;
    text += `📊 Ortalama Güven: %${coupon.avgConfidence} | ${coupon.coreMatchesCount} Maçlık Kombine (Toplam ${coupon.totalMatches} Karşılaşma)\n`;
    text += `🎲 Varyasyon: #${(this.couponVariationIndex || 0) + 1}\n`;
    text += `════════════════════════════════════\n\n`;

    text += `⭐ KUPON KOMBİNESİ (TOPLAM ORAN: ~${coupon.totalOddsFormatted}):\n`;
    coupon.matches.slice(0, coupon.coreMatchesCount).forEach((m, idx) => {
      text += `${idx + 1}. ${m.home} vs ${m.away} (⏰ ${m.time})\n`;
      text += `   • Tercih: ${m.selectedTip}\n`;
      text += `   • ${m.oddBadge} | ${m.confidenceBadge} | Skor: ${m.topScore}\n`;
      text += `   • Analiz: ${m.reason}\n\n`;
    });

    if (coupon.matches.length > coupon.coreMatchesCount) {
      text += `💡 DİĞER ALTERNATİF / SİSTEM TERCİHLERİ:\n`;
      coupon.matches.slice(coupon.coreMatchesCount).forEach((m, idx) => {
        text += `${coupon.coreMatchesCount + idx + 1}. ${m.home} vs ${m.away} (⏰ ${m.time})\n`;
        text += `   • Tercih: ${m.selectedTip} (${m.oddBadge})\n`;
        text += `   • Skor: ${m.topScore} | Analiz: ${m.reason}\n\n`;
      });
    }

    text += `════════════════════════════════════\n`;
    text += `🤖 ChatGPT, Claude, Gemini & Grok Çoklu AI Konsensüsü\n`;
    text += `🔗 https://uzgunbasur.github.io/ai-mac-analiz/`;

    navigator.clipboard.writeText(text).then(() => {
      this.showToast('Kupon Kopyalandı! 📋', 'Günün AI kuponu ve toplam oranı panoya aktarıldı (WhatsApp / Notlar uyumlu).');
      const btn = document.getElementById('btnCopyCoupon');
      if (btn) {
        const old = btn.innerHTML;
        btn.innerHTML = `<span>✓ Kopyalandı!</span>`;
        setTimeout(() => { btn.innerHTML = old; }, 2000);
      }
    });
  }

  calculateConsensus(predictions) {
    const scores = [];
    const outcomes = [];

    Object.entries(predictions).forEach(([ai, data]) => {
      if (data && data.score) {
        scores.push(data.score);
        const parts = data.score.split('-');
        if (parts.length === 2) {
          const h = parseInt(parts[0]);
          const a = parseInt(parts[1]);
          if (h > a) outcomes.push('1');
          else if (h < a) outcomes.push('2');
          else outcomes.push('X');
        }
      }
    });

    if (scores.length === 0) return { badge: '-', badgeClass: 'tag-subtle' };

    const outcomeCounts = outcomes.reduce((acc, curr) => { acc[curr] = (acc[curr] || 0) + 1; return acc; }, {});
    const topOutcome = Object.entries(outcomeCounts).sort((a, b) => b[1] - a[1])[0];

    const scoreCounts = scores.reduce((acc, curr) => { acc[curr] = (acc[curr] || 0) + 1; return acc; }, {});
    const topScore = Object.entries(scoreCounts).sort((a, b) => b[1] - a[1])[0];

    const totalAIs = Object.keys(predictions).length;

    if (topScore && topScore[1] > 1) {
      return {
        badge: `🔥 Skor: ${topScore[0]} (${topScore[1]}/${totalAIs})`,
        badgeClass: 'tag-green'
      };
    }

    if (topOutcome && topOutcome[1] > 1) {
      const outLabel = topOutcome[0] === '1' ? 'MS 1' : (topOutcome[0] === '2' ? 'MS 2' : 'MS X');
      return {
        badge: `⚡ Trend: ${outLabel} (${topOutcome[1]}/${totalAIs})`,
        badgeClass: 'tag-blue'
      };
    }

    return {
      badge: `Çelişkili (${scores.join(', ')})`,
      badgeClass: 'tag-yellow'
    };
  }

  renderTable() {
    const tbody = document.getElementById('tableBody');
    const headerRow = document.getElementById('tableHeaderRow');
    const countBadge = document.getElementById('matchCountBadge');
    const lbBar = document.getElementById('leaderboardBar');
    const keys = Object.keys(this.matchesData);

    if (countBadge) countBadge.innerText = `${keys.length} Maç Eşleşti`;

    // Leaderboard Render
    const leaderboard = this.calculateLeaderboard();
    if (lbBar) {
      if (leaderboard && leaderboard.length > 0) {
        lbBar.style.display = 'flex';
        lbBar.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 16px;">🏆</span>
            <div>
              <strong style="font-size: 13px; color: var(--text-primary);">AI Başarı & İsabet Sıralaması:</strong>
              <span style="font-size: 11px; color: var(--text-muted); margin-left: 4px;">Canlı ve biten maçlara göre anlık puanlar</span>
            </div>
          </div>
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${leaderboard.map((item, idx) => {
              const medal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : ''));
              return `
                <div class="ai-rank-pill">
                  <span class="rank-num">${medal} #${idx + 1}</span>
                  <span class="rank-name">${item.name}</span>
                  <span class="rank-pts">${item.points} Puan</span>
                  <span style="font-size: 10.5px; color: var(--text-muted); font-family: var(--font-mono);">(${item.exact} Tam Skor, ${item.outcome} Taraf)</span>
                </div>
              `;
            }).join('')}
          </div>
        `;
      } else {
        lbBar.style.display = 'none';
      }
    }

    if (keys.length === 0) {
      if (headerRow) {
        headerRow.innerHTML = `
          <th style="width: 65px; text-align: center;">
            <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
              <input type="checkbox" id="selectAllMatches" disabled style="opacity: 0.5;">
              <span style="font-size: 11px; color: var(--text-muted);">Seç</span>
            </div>
          </th>
          <th style="min-width: 170px;">Maç / Karşılaşma</th>
          <th style="text-align: center; color: var(--accent-red); min-width: 130px;">Canlı Skor & Durum</th>
          <th style="text-align: center; color: var(--accent-green);">ChatGPT</th>
          <th style="text-align: center; color: #818cf8;">Claude</th>
          <th style="text-align: center; color: #60a5fa;">Gemini</th>
          <th style="text-align: center; color: var(--accent-yellow);">Konsensüs / Trend</th>
        `;
      }
      if (tbody) {
        tbody.innerHTML = `
          <tr id="emptyRow">
            <td colspan="8" style="padding: 40px 16px; text-align: center; color: var(--text-muted);">
              <div style="display: flex; flex-direction: column; align-items: center; gap: 8px;">
                <span style="font-size: 28px;">📋</span>
                <p style="font-size: 13.5px; font-weight: 500;">Henüz maç tahmini eklenmedi.</p>
                <p style="font-size: 12px; color: var(--text-muted);">
                  Yukarıdaki promptu kopyalayıp AI yanıtlarını yapıştırın veya
                  <button onclick="window.app.loadDemoData()" style="color: var(--accent-green); background: none; border: none; text-decoration: underline; cursor: pointer; font-weight: 600;">Demo Veri Yükleyin</button>.
                </p>
              </div>
            </td>
          </tr>
        `;
      }
      this.updateSelectedCount();
      return;
    }

    // Dynamic Headers
    if (headerRow) {
      let hHtml = `
        <th style="width: 65px; text-align: center;">
          <div style="display: inline-flex; align-items: center; justify-content: center; gap: 4px;">
            <input type="checkbox" id="selectAllMatches" title="Tümünü Seç / Bırak" style="accent-color: var(--accent-green); cursor: pointer; width: 14px; height: 14px;">
            <span style="font-size: 11px; color: var(--text-muted);">Seç</span>
          </div>
        </th>
        <th style="min-width: 170px;">Maç / Karşılaşma</th>
        <th style="text-align: center; color: var(--accent-red); min-width: 130px;">Canlı Skor & Durum</th>
      `;

      this.availableAIs.forEach(ai => {
        let color = 'var(--accent-green)';
        if (ai.toLowerCase().includes('claude')) color = '#818cf8';
        else if (ai.toLowerCase().includes('gemini')) color = '#60a5fa';
        else if (ai.toLowerCase().includes('deepseek')) color = '#22d3ee';
        hHtml += `<th style="text-align: center; color: ${color}; min-width: 130px;">${ai}</th>`;
      });

      hHtml += `<th style="text-align: center; color: var(--accent-yellow); min-width: 150px;">Konsensüs / Trend</th>`;
      headerRow.innerHTML = hHtml;
    }

    // Rows
    if (tbody) {
      let rHtml = '';
      keys.forEach((key, index) => {
        const match = this.matchesData[key];
        const consensus = this.calculateConsensus(match.predictions);

        // Canlı Skor & Durum
        let statusHtml = '';
        if (match.status === 'live') {
          statusHtml = `
            <div onclick="window.app.editScore('${key}')" class="live-score-cell" title="Skoru düzenlemek için tıklayın">
              <span style="display: inline-flex; align-items: center; gap: 5px; font-size: 11px; color: var(--accent-red); font-weight: 700;">
                <span class="pulse-live-dot"></span> Dakika ${match.minute || "68'"}
              </span>
              <span style="font-family: var(--font-mono); font-size: 14px; font-weight: 800; color: #ffffff; letter-spacing: 1px;">
                ${match.currentScore || '0 - 0'}
              </span>
            </div>
          `;
        } else if (match.status === 'finished') {
          statusHtml = `
            <div onclick="window.app.editScore('${key}')" class="live-score-cell" title="Skoru düzenlemek için tıklayın">
              <span style="font-size: 10px; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">
                🏁 Maç Bitti (MS)
              </span>
              <span style="font-family: var(--font-mono); font-size: 13.5px; font-weight: 800; color: var(--accent-green); letter-spacing: 1px;">
                ${match.currentScore}
              </span>
            </div>
          `;
        } else {
          statusHtml = `
            <div onclick="window.app.editScore('${key}')" class="live-score-cell" title="Canlı skor eklemek için tıklayın">
              <span style="font-size: 11px; color: var(--text-muted); font-weight: 500;">
                ⏰ ${match.time || '21:45'}
              </span>
              <span style="font-size: 10px; color: var(--text-muted); opacity: 0.65;">
                Başlamadı
              </span>
            </div>
          `;
        }

        rHtml += `
          <tr class="ma-row" data-match="${match.displayName.toLowerCase()}">
            <td style="text-align: center; width: 80px; padding: 6px 4px;">
              <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
                <input type="checkbox" class="match-select-chk" data-key="${key}" style="accent-color: var(--accent-green); cursor: pointer; width: 15px; height: 15px;" title="Bu maçı seç">
                <button type="button" onclick="window.app.deleteMatch('${key}')" class="notion-btn notion-btn-xs" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); cursor: pointer; padding: 2px 7px; border-radius: 4px; color: #ef4444; font-size: 11px; font-weight: 600; display: inline-flex; align-items: center; gap: 2px;" title="'${match.displayName}' maçını tablodan sil">
                  🗑️ Sil
                </button>
              </div>
            </td>
            <td style="font-weight: 600; color: var(--text-primary);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="width: 6px; height: 6px; border-radius: 50%; background: var(--accent-green);"></span>
                <span>${match.displayName}</span>
              </div>
            </td>
            <td style="text-align: center;">
              ${statusHtml}
            </td>
        `;

        this.availableAIs.forEach(ai => {
          const pred = match.predictions[ai];
          if (pred && pred.score) {
            const evalResult = this.evaluatePrediction(pred.score, match);
            let badgeHtml = '';
            if (evalResult) {
              badgeHtml = `
                <span class="notion-tag ${evalResult.badgeClass}" style="font-size: 10px; font-weight: 600; padding: 2px 6px; margin-top: 3px;">
                  ${evalResult.label}
                </span>
              `;
            }

            const tipParts = [];
            if (pred.tip) tipParts.push(pred.tip);
            if (pred.confidence) tipParts.push(pred.confidence);
            const tipText = tipParts.join(' • ');
            const safeAnalysis = (pred.analysis || '').replace(/"/g, '&quot;');
            const cellTitle = safeAnalysis ? `title="Analiz: ${safeAnalysis}"` : (tipText ? `title="${tipText}"` : '');

            rHtml += `
              <td style="text-align: center;" ${cellTitle}>
                <div style="display: inline-flex; flex-direction: column; align-items: center; gap: 2px;">
                  <span style="background: var(--bg-secondary); padding: 3px 8px; border-radius: 6px; font-family: var(--font-mono); font-weight: bold; font-size: 12px; border: 1px solid var(--border-color); color: var(--text-primary);">
                    ${pred.score}
                  </span>
                  ${tipText ? `<span style="font-size: 10px; color: var(--text-muted); max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${tipText}</span>` : ''}
                  ${badgeHtml}
                </div>
              </td>
            `;
          } else {
            rHtml += `
              <td style="text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 12px; opacity: 0.35;">-</td>
            `;
          }
        });

        rHtml += `
            <td style="text-align: center;">
              <span class="notion-tag ${consensus.badgeClass}" style="font-size: 11px; padding: 3px 8px;">
                ${consensus.badge}
              </span>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = rHtml;
      this.updateSelectedCount();
    }
  }

  editScore(key) {
    const match = this.matchesData[key];
    if (!match) return;

    const newScore = prompt(`'${match.displayName}' için skor belirleyin (Örn: 2-1 veya boş bırakıp iptal edin):`, match.currentScore || '');
    if (newScore !== null) {
      const trimmed = newScore.trim();
      if (trimmed === '') {
        match.status = 'upcoming';
        match.currentScore = null;
        match.minute = null;
      } else {
        const isFinished = confirm("Maç bitti mi (MS)?\n\nTamam = Bitti (MS)\nİptal = Canlı Devam Ediyor");
        if (isFinished) {
          match.status = 'finished';
          match.currentScore = trimmed;
          match.minute = 90;
          match.displayStatus = 'MS';
        } else {
          const min = prompt("Anlık dakika (Örn: 68):", match.minute || '68');
          match.status = 'live';
          match.currentScore = trimmed;
          match.minute = parseInt(min) || 68;
          match.displayStatus = `${match.minute}'`;
        }
      }
      this.saveStorage();
      this.renderTable();
      firebaseService.saveMatch(key, match);
      this.showToast('Skor Güncellendi ⚽', `${match.displayName} güncellendi.`);
    }
  }

  deleteMatch(key) {
    const match = this.matchesData[key];
    if (!match) return;
    const name = match.displayName || key;
    if (confirm(`"${name}" karşılaşmasını tablodan silmek istediğinize emin misiniz?`)) {
      delete this.matchesData[key];
      this.saveStorage();
      this.renderTable();
      firebaseService.deleteMatch(key);
      this.showToast('Maç Silindi 🗑️', `"${name}" tablodan kaldırıldı.`);
    }
  }

  deleteSelectedMatches() {
    const checkedBoxes = document.querySelectorAll('.match-select-chk:checked');
    const keysToDelete = Array.from(checkedBoxes).map(cb => cb.dataset.key).filter(Boolean);
    if (keysToDelete.length === 0) return;

    if (confirm(`İşaretlenen ${keysToDelete.length} maçı tablodan silmek istediğinize emin misiniz?`)) {
      keysToDelete.forEach(k => {
        delete this.matchesData[k];
      });
      this.saveStorage();
      this.renderTable();
      firebaseService.deleteMatchesBatch(keysToDelete);
      this.showToast('Seçilenler Silindi 🗑️', `${keysToDelete.length} maç tablodan temizlendi.`);
    }
  }

  toggleSelectAll(checked) {
    document.querySelectorAll('.match-select-chk').forEach(cb => {
      cb.checked = checked;
    });
    this.updateSelectedCount();
  }

  updateSelectedCount() {
    const checkedBoxes = document.querySelectorAll('.match-select-chk:checked');
    const count = checkedBoxes.length;
    const delBtn = document.getElementById('btnDeleteSelected');
    const countSpan = document.getElementById('selectedCount');
    const allBox = document.getElementById('selectAllMatches');

    if (countSpan) countSpan.innerText = count;
    if (delBtn) {
      delBtn.style.display = 'inline-flex';
      if (count > 0) {
        delBtn.disabled = false;
        delBtn.style.opacity = '1';
        delBtn.style.cursor = 'pointer';
        delBtn.style.pointerEvents = 'auto';
        delBtn.style.background = 'rgba(239, 68, 68, 0.2)';
        delBtn.style.borderColor = '#ef4444';
        delBtn.style.color = '#ffffff';
        delBtn.style.boxShadow = '0 0 12px rgba(239, 68, 68, 0.4)';
      } else {
        delBtn.disabled = true;
        delBtn.style.opacity = '0.5';
        delBtn.style.cursor = 'not-allowed';
        delBtn.style.pointerEvents = 'none';
        delBtn.style.background = 'rgba(239, 68, 68, 0.08)';
        delBtn.style.borderColor = 'rgba(239, 68, 68, 0.25)';
        delBtn.style.color = 'var(--accent-red)';
        delBtn.style.boxShadow = 'none';
      }
    }

    const totalBoxes = document.querySelectorAll('.match-select-chk');
    if (allBox && totalBoxes.length > 0) {
      allBox.checked = count === totalBoxes.length;
      allBox.indeterminate = count > 0 && count < totalBoxes.length;
    } else if (allBox) {
      allBox.checked = false;
      allBox.indeterminate = false;
    }
  }

  copyHtmlTable() {
    const table = document.getElementById('comparisonTable');
    if (!table) return;

    const clone = table.cloneNode(true);
    // Export edilen HTML'de buton ve checkbox yerine temiz sıra numarası # koy
    const thFirst = clone.querySelector('th:first-child');
    if (thFirst) {
      thFirst.innerHTML = '#';
      thFirst.style.width = '35px';
    }
    let rowIndex = 1;
    clone.querySelectorAll('tbody tr').forEach(row => {
      if (row.id === 'emptyRow') return;
      const tdFirst = row.querySelector('td:first-child');
      if (tdFirst) {
        tdFirst.innerHTML = String(rowIndex++);
        tdFirst.style.width = '35px';
        tdFirst.style.textAlign = 'center';
      }
    });

    const cleanHtml = `
<table border="1" cellpadding="8" cellspacing="0" style="width:100%; border-collapse:collapse; font-family:-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size:13px; text-align:left; background:#0d0d0d; color:#ededed; border:1px solid rgba(255,255,255,0.1);">
  ${clone.innerHTML}
</table>`.trim();

    navigator.clipboard.writeText(cleanHtml).then(() => {
      this.showToast('HTML Kopyalandı! 📋', 'Notion / Vercel uyumlu temiz tablo panoda.');
    });
  }

  loadDemoData() {
    this.matchesData = {
      'Barcelona___Feyenoord': {
        home: 'Barcelona',
        away: 'Feyenoord Rotterdam',
        displayName: 'Barcelona vs Feyenoord',
        status: 'finished',
        currentScore: '5-1',
        minute: 90,
        displayStatus: 'MS',
        predictions: {
          'ChatGPT': { score: '3-1', tip: 'MS 1 & 2.5 Üst', confidence: '%85', analysis: 'Barcelona evinde mutlak favori.' },
          'Claude': { score: '4-1', tip: 'MS 1 & KG Var', confidence: '%80', analysis: 'Feyenoord gol bulabilir ama Barca kazanır.' },
          'Gemini': { score: '3-0', tip: 'MS 1', confidence: '%82', analysis: 'Farklı Barcelona galibiyeti.' }
        }
      },
      'Liverpool___Atlético Madrid': {
        home: 'Liverpool',
        away: 'Atlético Madrid',
        displayName: 'Liverpool vs Atlético Madrid',
        status: 'finished',
        currentScore: '2-1',
        minute: 90,
        displayStatus: 'MS',
        predictions: {
          'ChatGPT': { score: '2-1', tip: 'MS 1', confidence: '%75', analysis: 'Anfield faktörü galibiyeti getirir.' },
          'Claude': { score: '1-1', tip: 'İlk Yarı X', confidence: '%70', analysis: 'Atletico sert savunmasıyla maçı kilitler.' },
          'Gemini': { score: '2-0', tip: 'MS 1', confidence: '%78', analysis: 'Tempolu Liverpool üstün çıkar.' }
        }
      },
      'Arsenal___Napoli': {
        home: 'Arsenal',
        away: 'Napoli',
        displayName: 'Arsenal vs Napoli',
        status: 'finished',
        currentScore: '1-0',
        minute: 90,
        displayStatus: 'MS',
        predictions: {
          'ChatGPT': { score: '1-0', tip: '2.5 Alt', confidence: '%72', analysis: 'Taktik savaşı, az gollü geçer.' },
          'Claude': { score: '1-1', tip: 'KG Var', confidence: '%68', analysis: 'İki takım da birbirini tartacaktır.' },
          'Gemini': { score: '2-1', tip: 'MS 1', confidence: '%74', analysis: 'Arsenal ev sahibi avantajıyla önde.' }
        }
      },
      'Galatasaray___Sporting': {
        home: 'Sporting CP',
        away: 'Galatasaray',
        displayName: 'Sporting vs Galatasaray',
        status: 'finished',
        currentScore: '3-1',
        minute: 90,
        displayStatus: 'MS',
        predictions: {
          'ChatGPT': { score: '2-2', tip: 'KG Var', confidence: '%75', analysis: 'Gollü ve çekişmeli bir Avrupa maçı.' },
          'Claude': { score: '2-1', tip: 'MS 1', confidence: '%72', analysis: 'Sporting Lizbon sahasında baskın.' },
          'Gemini': { score: '1-2', tip: 'KG Var & ÇŞ 0-2', confidence: '%65', analysis: 'Galatasaray deplasmanda puan kovalayacak.' }
        }
      },
      'Fenerbahçe___Roma': {
        home: 'Fenerbahçe',
        away: 'AS Roma',
        displayName: 'Fenerbahçe vs AS Roma',
        status: 'upcoming',
        currentScore: null,
        time: '19:45',
        displayStatus: '⏰ 19:45',
        predictions: {
          'ChatGPT': { score: '2-1', tip: 'KG Var & MS 1', confidence: '%70', analysis: 'Kadıköy atmosferinde çekişmeli maç.' },
          'Claude': { score: '1-1', tip: 'İlk Yarı X', confidence: '%65', analysis: 'Dengeli başlangıç bekleniyor.' },
          'Gemini': { score: '2-2', tip: '2.5 Üst', confidence: '%72', analysis: 'Hızlı geçiş hücumları bol pozisyon üretir.' }
        }
      }
    };
    this.availableAIs = ['ChatGPT', 'Claude', 'Gemini'];
    this.saveStorage();
    this.renderTable();
    firebaseService.saveMatchesBatch(this.matchesData);
    firebaseService.saveAvailableAIs(this.availableAIs);
    this.showToast('Resmi Demo Veriler Yüklendi! 🎲', 'UEFA Şampiyonlar Ligi gerçek maçları yüklendi.');
  }

  async fetchAndInsertOfficialFixtures() {
    const dateInput = document.getElementById('promptDateInput');
    const selectedDate = dateInput ? dateInput.value : '';
    const btn = document.getElementById('btnFetchOfficialFixtures');
    if (btn) {
      btn.innerText = '⏳ Fikstür Çekiliyor...';
      btn.disabled = true;
    }

    try {
      const fixtures = await liveScoreService.getOfficialFixturesText(selectedDate);
      const txtArea = document.getElementById('promptTextArea');
      if (fixtures && fixtures.length > 0 && txtArea) {
        let currentPrompt = txtArea.value;
        const fixturesBlock = `\n\n🚨 BUGÜNÜN RESMİ FİKSTÜR MAÇLARI (ESPN Doğrulanmış Liste):\n` + fixtures.join('\n') + `\n\nYukarıdaki resmi maçlar haricinde başka maç tahmin etme. Yalnızca bu maçları analiz et.`;
        txtArea.value = currentPrompt + fixturesBlock;
        this.showToast('Resmi Fikstür Eklendi! 🌐', `${fixtures.length} gerçek maç prompt metnine eklendi.`);
      } else {
        this.showToast('Fikstür Bulunamadı', 'Seçili tarihte üst liglerde resmi maç bulunamadı veya ağ bağlantısı yok.');
      }
    } catch (e) {
      console.error(e);
      this.showToast('Hata', 'Fikstür çekilemedi.');
    } finally {
      if (btn) {
        btn.innerText = '🌐 Gerçek Fikstürü Prompta Ekle';
        btn.disabled = false;
      }
    }
  }

  clearAllData() {
    if (confirm('Tüm maç mukayese tablosunu sıfırlamak istediğinize emin misiniz?\n\n(Buluttaki tüm ortak maçlar da silinecektir)')) {
      this.matchesData = {};
      this.saveStorage();
      this.renderTable();
      firebaseService.clearAllMatches();
      this.showToast('Tablo Sıfırlandı', 'Tüm ortak maç kayıtları buluttan temizlendi.');
    }
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    const sections = {
      prompt: document.getElementById('section-prompt'),
      input: document.getElementById('section-input'),
      table: document.getElementById('section-table')
    };

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.remove('active', 'notion-btn-primary');
    });

    const activeBtn = document.getElementById(`tab-${tabId}`);
    if (activeBtn) activeBtn.classList.add('active', 'notion-btn-primary');

    if (tabId === 'all') {
      Object.values(sections).forEach(s => s && (s.style.display = 'block'));
    } else {
      Object.entries(sections).forEach(([key, s]) => {
        if (s) s.style.display = key === tabId ? 'block' : 'none';
      });
    }
  }

  showToast(title, message) {
    let toast = document.getElementById('notion-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'notion-toast';
      toast.className = 'notion-toast';
      document.body.appendChild(toast);
    }

    toast.innerHTML = `
      <span style="font-size: 16px;">⚡</span>
      <div>
        <div style="font-weight: 600; font-size: 13px;">${title}</div>
        <div style="font-size: 11.5px; color: var(--text-muted);">${message}</div>
      </div>
    `;
    toast.classList.add('show');

    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  setupEventListeners() {
    // Tarih Değişimi & Parametreler
    document.getElementById('promptDateInput')?.addEventListener('change', () => this.updateDynamicPrompt());
    document.getElementById('optRealFixture')?.addEventListener('change', () => this.updateDynamicPrompt());
    document.getElementById('optOdds')?.addEventListener('change', () => this.updateDynamicPrompt());
    document.getElementById('optSurprise')?.addEventListener('change', () => this.updateDynamicPrompt());
    document.getElementById('optScore')?.addEventListener('change', () => this.updateDynamicPrompt());
    document.getElementById('optStandart')?.addEventListener('change', () => this.updateDynamicPrompt());

    // Prompt Kopyala & Resmi Fikstürü Getir
    document.getElementById('copyPromptBtn')?.addEventListener('click', () => this.copyDynamicPrompt());
    document.getElementById('btnFetchOfficialFixtures')?.addEventListener('click', () => this.fetchAndInsertOfficialFixtures());

    // AI Seçim Butonları
    document.querySelectorAll('.ai-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedAI = btn.dataset.ai;
        document.querySelectorAll('.ai-btn').forEach(b => b.classList.remove('active', 'notion-btn-primary'));
        btn.classList.add('active', 'notion-btn-primary');
        const custom = document.getElementById('customAIName');
        if (custom) custom.value = '';
      });
    });

    document.getElementById('customAIName')?.addEventListener('input', (e) => {
      if (e.target.value.trim() !== '') {
        this.selectedAI = e.target.value.trim();
        document.querySelectorAll('.ai-btn').forEach(b => b.classList.remove('active', 'notion-btn-primary'));
      }
    });

    // Ham Metin Ekle
    document.getElementById('btnProcessRaw')?.addEventListener('click', () => this.processRawText());

    // Canlı Skorları Çek (Resmi API)
    document.getElementById('btnSyncScores')?.addEventListener('click', () => this.syncLiveScores());

    // 🎯 AI Akıllı Kupon Oluşturucu & Modal Butonları
    document.getElementById('btnGenerateCoupon')?.addEventListener('click', () => this.openCouponModal());
    document.getElementById('btnRegenerateCoupon')?.addEventListener('click', () => this.regenerateCoupon());
    document.getElementById('btnCopyCoupon')?.addEventListener('click', () => this.copyCouponText());
    document.querySelectorAll('.modal-close-btn, #btnCloseCouponModal').forEach(el => {
      el.addEventListener('click', () => this.closeCouponModal());
    });

    // Kupon Strateji Sekmeleri (Banko / İdeal / Sürpriz)
    document.querySelectorAll('.coupon-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const strat = btn.dataset.strategy || (btn.id.includes('Banko') ? 'banko' : (btn.id.includes('Ideal') ? 'ideal' : 'surpriz'));
        this.switchCouponTab(strat);
      });
    });

    // Modal Dışına Tıklama ve Escape Tuşu ile Kapatma
    document.getElementById('aiCouponModal')?.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'aiCouponModal') this.closeCouponModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeCouponModal();
    });

    // Arama
    document.getElementById('tableSearch')?.addEventListener('input', (e) => this.filterTable(e.target.value));

    // HTML Kopyala
    document.getElementById('btnCopyHtml')?.addEventListener('click', () => this.copyHtmlTable());

    // Seçilenleri Sil & Satır Seçimleri
    document.getElementById('btnDeleteSelected')?.addEventListener('click', () => this.deleteSelectedMatches());
    document.addEventListener('change', (e) => {
      if (e.target && e.target.id === 'selectAllMatches') {
        this.toggleSelectAll(e.target.checked);
      } else if (e.target && e.target.classList.contains('match-select-chk')) {
        this.updateSelectedCount();
      }
    });

    // Demo & Sıfırla
    document.getElementById('btnLoadDemo')?.addEventListener('click', () => this.loadDemoData());
    document.getElementById('btnClearData')?.addEventListener('click', () => this.clearAllData());

    // Sekmeler
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-tab');
        if (tab) this.switchTab(tab);
      });
    });

    // Tema Değiştirici
    document.getElementById('themeToggleBtn')?.addEventListener('click', () => {
      const html = document.documentElement;
      const nextTheme = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
      html.setAttribute('data-theme', nextTheme);
      document.getElementById('themeToggleBtn').innerText = nextTheme === 'light' ? '🌙' : '☀️';
    });
  }
}

// Global pencereye bağla (inline HTML onclick erişimleri için)
window.AIMatchPulseApp = AIMatchPulseApp;
window.firebaseService = firebaseService;
window.liveScoreService = liveScoreService;

// Uygulama örneğini oluştur ve başlat
const app = new AIMatchPulseApp();
window.app = app;

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => app.init());
} else {
  app.init();
}
