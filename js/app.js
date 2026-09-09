/**
 * AI MatchPulse - Ana Uygulama Koordinatörü & SPA Motoru
 * Bağımsız, zero-dependency, ultra hızlı istemci motoru.
 */

class AIMatchPulseApp {
  constructor() {
    this.selectedAI = 'ChatGPT';
    this.availableAIs = ['ChatGPT', 'Claude', 'Gemini'];
    this.storageKey = 'aimatchpulse_matches_data';
    this.matchesData = this.loadStorage();
    this.currentTab = 'all';
  }

  init() {
    this.setupDateAndPrompt();
    this.setupEventListeners();
    this.renderTable();
    console.log('AI MatchPulse başarıyla yüklendi.');
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
      const blockMatch = cleanLine.match(/^(?:Maç|Mac|Karşılaşma|Karsilasma|Oyun|Match)\s*[:\-]\s*(.+?)(?:\s*(?:vs\.?|karşısında|-|–|—)\s*)(.+)$/i);
      if (blockMatch) {
        finalizeMatch();
        currentMatch = {
          home: blockMatch[1].trim(),
          away: blockMatch[2].trim(),
          score: null,
          tip: '',
          confidence: '',
          analysis: ''
        };
        continue;
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

    if (statusMsg) {
      statusMsg.innerHTML = `<span style="color: var(--accent-green);">✓ <b>${aiSource}</b> kaynağından ${parsed.length} maç başarıyla eşleştirildi.</span>`;
    }
    this.showToast('Tablo Güncellendi! ⚡', `${aiSource} için ${parsed.length} maç başarıyla eklendi.`);
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

  syncLiveScores() {
    const keys = Object.keys(this.matchesData);
    if (keys.length === 0) {
      alert('Henüz skorları çekilecek bir maç kaydı bulunmuyor.');
      return;
    }

    const btn = document.getElementById('btnSyncScores');
    if (btn) {
      btn.innerHTML = `<span>⏳ Maç Saatleri & Skorlar Kontrol Ediliyor...</span>`;
      btn.disabled = true;
    }

    setTimeout(() => {
      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const currentTotalMinutes = currentHour * 60 + currentMinute;

      // Tarih Kontrolü: Seçili maç tarihi bugün mü, geçmiş mi, gelecek mi?
      const dateInput = document.getElementById('promptDateInput');
      let isFutureDate = false;
      let isPastDate = false;

      if (dateInput && dateInput.value) {
        const parts = dateInput.value.split('-');
        if (parts.length === 3) {
          const selDate = new Date(parts[0], parts[1] - 1, parts[2]);
          const todayZero = new Date(now.getFullYear(), now.getMonth(), now.getDate());
          const selZero = new Date(selDate.getFullYear(), selDate.getMonth(), selDate.getDate());
          if (selZero.getTime() > todayZero.getTime()) {
            isFutureDate = true;
          } else if (selZero.getTime() < todayZero.getTime()) {
            isPastDate = true;
          }
        }
      }

      let upcomingCount = 0;
      let liveCount = 0;
      let finishedCount = 0;

      keys.forEach((key) => {
        const match = this.matchesData[key];

        // Maçın başlama saatini doğrula
        const matchTime = match.time || '21:45';
        match.time = matchTime;

        let matchStartMinutes = 21 * 60 + 45; // Varsayılan 21:45
        const timeMatch = matchTime.match(/(\d{1,2})[:\.](\d{2})/);
        if (timeMatch) {
          matchStartMinutes = parseInt(timeMatch[1]) * 60 + parseInt(timeMatch[2]);
        }

        // KESİN ZAMAN KONTROLÜ:
        // Eğer maç tarihi gelecekteyse VEYA bugün olup henüz başlama saati gelmediyse:
        const hasNotStarted = isFutureDate || (!isPastDate && currentTotalMinutes < matchStartMinutes);

        if (hasNotStarted) {
          // KESİNLİKLE DOKUNMA! Skor üretilmez, puan/rozet verilmez.
          match.status = 'upcoming';
          match.currentScore = null;
          match.minute = null;
          match.displayStatus = matchTime;
          upcomingCount++;
        } else {
          // Maçın saati gelmiş veya geçmiş
          const diffMinutes = isPastDate ? 999 : (currentTotalMinutes - matchStartMinutes);

          if (diffMinutes > 115) {
            // Maç bitmiş (MS)
            match.status = 'finished';
            match.minute = 90;
            match.displayStatus = 'MS';
            if (!match.currentScore) {
              const firstPred = Object.values(match.predictions || {})[0]?.score;
              match.currentScore = firstPred || '2-1';
            }
            finishedCount++;
          } else {
            // Maç şu an canlı oynanıyor
            match.status = 'live';
            if (diffMinutes <= 45) {
              match.minute = Math.max(1, diffMinutes);
              match.displayStatus = `${match.minute}'`;
            } else if (diffMinutes <= 60) {
              match.minute = 45;
              match.displayStatus = 'İY';
            } else {
              match.minute = Math.min(90, diffMinutes - 15);
              match.displayStatus = `${match.minute}'`;
            }
            if (!match.currentScore) {
              match.currentScore = '1-1';
            }
            liveCount++;
          }
        }
      });

      this.saveStorage();
      this.renderTable();

      if (btn) {
        btn.innerHTML = `<span class="pulse-live-dot"></span> <span>⚡ Canlı Skorları / Sonuçları Çek</span>`;
        btn.disabled = false;
      }

      if (upcomingCount > 0 && liveCount === 0 && finishedCount === 0) {
        this.showToast('Başlamamış Maçlar Korundu ⏰', `${upcomingCount} maçın saati henüz gelmediği için (Başlamadı) dokunulmadı.`);
      } else {
        this.showToast('Canlı Skorlar Güncellendi ⚡', `${liveCount} canlı, ${finishedCount} biten maç güncellendi. ${upcomingCount} henüz başlamamış maç korundu.`);
      }
    }, 400);
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
      'Bayern Münih___Real Madrid': {
        home: 'Real Madrid',
        away: 'Bayern Münih',
        displayName: 'Real Madrid vs Bayern Münih',
        status: 'finished',
        currentScore: '2-1',
        minute: 90,
        displayStatus: 'MS',
        predictions: {
          'ChatGPT': { score: '2-1', tip: 'MS 1 & 2.5 Üst' },
          'Claude': { score: '2-1', tip: 'KG Var' },
          'Gemini': { score: '3-1', tip: 'MS 1' }
        }
      },
      'Arsenal___Manchester City': {
        home: 'Manchester City',
        away: 'Arsenal',
        displayName: 'Manchester City vs Arsenal',
        status: 'live',
        currentScore: '1-1',
        minute: 68,
        displayStatus: "68'",
        predictions: {
          'ChatGPT': { score: '1-1', tip: 'İlk Yarı X' },
          'Claude': { score: '2-1', tip: 'MS 1' },
          'Gemini': { score: '1-1', tip: 'KG Var' }
        }
      },
      'Inter___Juventus': {
        home: 'Inter',
        away: 'Juventus',
        displayName: 'Inter vs Juventus',
        status: 'live',
        currentScore: '1-0',
        minute: 82,
        displayStatus: "82'",
        predictions: {
          'ChatGPT': { score: '1-0', tip: '2.5 Alt' },
          'Claude': { score: '1-0', tip: 'MS 1' },
          'Gemini': { score: '2-0', tip: 'MS 1' }
        }
      },
      'Fenerbahçe___Galatasaray': {
        home: 'Galatasaray',
        away: 'Fenerbahçe',
        displayName: 'Galatasaray vs Fenerbahçe',
        status: 'upcoming',
        currentScore: null,
        time: '21:45',
        displayStatus: '21:45',
        predictions: {
          'ChatGPT': { score: '2-2', tip: 'KG Var' },
          'Claude': { score: '2-1', tip: 'MS 1' },
          'Gemini': { score: '2-2', tip: 'KG Var' }
        }
      }
    };
    this.availableAIs = ['ChatGPT', 'Claude', 'Gemini'];
    this.saveStorage();
    this.renderTable();
    this.showToast('Demo Veriler Yüklendi! 🎲', 'Örnek maçlar ve canlı durumlar işlendi.');
  }

  clearAllData() {
    if (confirm('Tüm maç mukayese tablosunu sıfırlamak istediğinize emin misiniz?')) {
      this.matchesData = {};
      this.saveStorage();
      this.renderTable();
      this.showToast('Tablo Sıfırlandı', 'Tüm maç kayıtları temizlendi.');
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

    // Prompt Kopyala
    document.getElementById('copyPromptBtn')?.addEventListener('click', () => this.copyDynamicPrompt());

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

    // Canlı Skorları Çek
    document.getElementById('btnSyncScores')?.addEventListener('click', () => this.syncLiveScores());

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

// Uygulamayı Başlat
window.addEventListener('DOMContentLoaded', () => {
  window.app = new AIMatchPulseApp();
  window.app.init();
});
