/**
 * AI MatchPulse - Canlı Skor & Gerçek Maç Verisi Servisi (ESPN Live API)
 * Resmi, canlı ve biten futbol maç skorlarını gerçek zamanlı çeker.
 * Sıfır sahte simülasyon - %100 gerçek maç sonuçları ve canlı dakikalar.
 */

export const SUPPORTED_LEAGUES = [
  { code: 'uefa.champions', name: 'UEFA Şampiyonlar Ligi' },
  { code: 'uefa.europa', name: 'UEFA Avrupa Ligi' },
  { code: 'uefa.europa.conf', name: 'UEFA Konferans Ligi' },
  { code: 'uefa.nations', name: 'UEFA Uluslar Ligi' },
  { code: 'fifa.worldq.uefa', name: 'Dünya Kupası Elemeleri' },
  { code: 'eng.1', name: 'İngiltere Premier Lig' },
  { code: 'esp.1', name: 'İspanya La Liga' },
  { code: 'ita.1', name: 'İtalya Serie A' },
  { code: 'ger.1', name: 'Almanya Bundesliga' },
  { code: 'fra.1', name: 'Fransa Ligue 1' },
  { code: 'tur.1', name: 'Trendyol Süper Lig' },
  { code: 'ned.1', name: 'Hollanda Eredivisie' },
  { code: 'por.1', name: 'Portekiz Primeira Liga' },
  { code: 'bel.1', name: 'Belçika Pro Lig' },
  { code: 'sco.1', name: 'İskoçya Premiership' },
  { code: 'uefa.super_cup', name: 'UEFA Süper Kupa' },
  { code: 'eng.league_cup', name: 'İngiltere Lig Kupası (EFL Cup)' },
  { code: 'eng.fa', name: 'İngiltere FA Cup' },
  { code: 'esp.copa_del_rey', name: 'İspanya Kral Kupası' },
  { code: 'ita.coppa_italia', name: 'İtalya Kupası' },
  { code: 'ger.dfb_pokal', name: 'Almanya DFB-Pokal' },
  { code: 'fifa.friendly', name: 'Uluslararası Hazırlık Maçları' },
  { code: 'fifa.world', name: 'FIFA Dünya Kupası' },
  { code: 'uefa.euro', name: 'Avrupa Şampiyonası' }
];

export class LiveScoreService {
  constructor() {
    this.apiBase = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
    this.cache = new Map();
  }

  /**
   * Tarih stringini (YYYY-MM-DD veya Date) ESPN YYYYMMDD formatına çevir
   */
  formatDateParam(dateInput) {
    if (!dateInput) {
      const now = new Date();
      const y = now.getFullYear();
      const m = String(now.getMonth() + 1).padStart(2, '0');
      const d = String(now.getDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    }
    if (typeof dateInput === 'string') {
      const clean = dateInput.replace(/[^0-9]/g, '');
      if (clean.length === 8) return clean;
    }
    const dObj = new Date(dateInput);
    if (!isNaN(dObj.getTime())) {
      const y = dObj.getFullYear();
      const m = String(dObj.getMonth() + 1).padStart(2, '0');
      const d = String(dObj.getDate()).padStart(2, '0');
      return `${y}${m}${d}`;
    }
    return '';
  }

  /**
   * Takım ismini akıllı normalleştir ve takma adlarla eşleştir
   */
  normalizeTeamName(name) {
    if (!name) return '';
    let clean = name.trim();
    // Sıra numaraları, parantezler ve gereksiz işaretleri temizle
    clean = clean.replace(/^[\d\.\-\*\#\s\)]+/, '');
    // Ön ek ve son ek kulüp kısaltmalarını temizle
    clean = clean.replace(/^(fc|afc|as|ss|sc|vfb|rb|cf|sk|fk)\s+/i, '');
    clean = clean.replace(/\s+(fc|cf|sk|fk|as|sc|bb|rotterdam|cp|lisbon|lizbon)$/i, '');

    const lower = clean.toLowerCase()
      .replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u')
      .replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c')
      .replace(/[^a-z0-9]/g, ' ').trim();

    // Yaygın Takım Eşleştirme Sözlüğü
    const aliases = {
      'real madrid': 'real madrid', 'r madrid': 'real madrid', 'madrid': 'real madrid',
      'barcelona': 'barcelona', 'barca': 'barcelona',
      'atletico madrid': 'atletico madrid', 'atletico': 'atletico madrid',
      'manchester city': 'man city', 'man city': 'man city', 'mcfc': 'man city',
      'manchester united': 'man united', 'man utd': 'man united', 'mufc': 'man united',
      'arsenal': 'arsenal',
      'liverpool': 'liverpool',
      'chelsea': 'chelsea',
      'tottenham': 'tottenham', 'spurs': 'tottenham',
      'bayern munih': 'bayern munich', 'bayern munich': 'bayern munich', 'bayern': 'bayern munich',
      'dortmund': 'dortmund', 'borussia dortmund': 'dortmund', 'bvb': 'dortmund',
      'paris saint germain': 'psg', 'paris': 'psg', 'psg': 'psg',
      'inter': 'inter', 'inter milan': 'inter', 'internazionale': 'inter',
      'milan': 'milan', 'ac milan': 'milan',
      'juventus': 'juventus', 'juve': 'juventus',
      'napoli': 'napoli',
      'roma': 'as roma', 'as roma': 'as roma',
      'lazio': 'lazio',
      'galatasaray': 'galatasaray', 'gs': 'galatasaray', 'gala': 'galatasaray',
      'fenerbahce': 'fenerbahce', 'fb': 'fenerbahce', 'fener': 'fenerbahce',
      'besiktas': 'besiktas', 'bjk': 'besiktas',
      'trabzonspor': 'trabzonspor', 'ts': 'trabzonspor',
      'basaksehir': 'basaksehir',
      'sporting': 'sporting', 'sporting cp': 'sporting',
      'benfica': 'benfica',
      'porto': 'porto',
      'feyenoord': 'feyenoord',
      'ajax': 'ajax',
      'psv': 'psv eindhoven', 'psv eindhoven': 'psv eindhoven',
      'stuttgart': 'stuttgart', 'vfb stuttgart': 'stuttgart',
      'leipzig': 'rb leipzig', 'rb leipzig': 'rb leipzig',
      'leverkusen': 'bayer leverkusen',
      'bodo glimt': 'bodo glimt', 'bodo': 'bodo glimt',
      'shakhtar donetsk': 'shakhtar', 'shakhtar': 'shakhtar', 'sahtar': 'shakhtar',
      'slovan bratislava': 'slovan', 'slovan': 'slovan',
      'viking fk': 'viking', 'viking': 'viking'
    };

    for (const [k, v] of Object.entries(aliases)) {
      if (lower === k || lower.includes(k)) return v;
    }

    return lower;
  }

  /**
   * İki takım isminin aynı takımı temsil edip etmediğini doğrula
   */
  areTeamsMatching(nameA, nameB) {
    const normA = this.normalizeTeamName(nameA);
    const normB = this.normalizeTeamName(nameB);
    if (!normA || !normB) return false;
    if (normA === normB) return true;
    if (normA.includes(normB) || normB.includes(normA)) return true;

    // Kelime bazlı kesişim kontrolü (örn: "Shakhtar" ve "Shakhtar Donetsk")
    const wordsA = normA.split(' ').filter(w => w.length > 2);
    const wordsB = normB.split(' ').filter(w => w.length > 2);
    return wordsA.some(w => wordsB.includes(w));
  }

  /**
   * Belirtilen tarih aralığı için tüm liglerden resmi maç skorlarını çek (Date-Range & Timeout Korumalı)
   */
  async fetchScoreboardsForDateRange(startDateStr, endDateStr) {
    const rangeParam = (startDateStr && endDateStr) 
      ? (startDateStr === endDateStr ? startDateStr : `${startDateStr}-${endDateStr}`) 
      : (startDateStr || this.formatDateParam(new Date()));

    const fetchTasks = SUPPORTED_LEAGUES.map(league => {
      const url = `${this.apiBase}/${league.code}/scoreboard?dates=${rangeParam}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000); // 6s zaman aşımı koruması

      return fetch(url, { signal: controller.signal })
        .then(res => {
          clearTimeout(timeoutId);
          return res.ok ? res.json() : null;
        })
        .then(data => {
          if (!data || !data.events) return [];
          return data.events.map(ev => ({
            id: ev.id,
            league: league.name,
            leagueCode: league.code,
            name: ev.name,
            date: ev.date,
            status: ev.status,
            competitors: ev.competitions?.[0]?.competitors || []
          }));
        })
        .catch(() => {
          clearTimeout(timeoutId);
          return [];
        });
    });

    const results = await Promise.allSettled(fetchTasks);
    const allMatches = [];
    results.forEach(r => {
      if (r.status === 'fulfilled' && Array.isArray(r.value)) {
        allMatches.push(...r.value);
      }
    });

    return allMatches;
  }

  /**
   * Belirtilen tarihler için tüm liglerden resmi maç skorlarını çek (Geriye uyumluluk için)
   */
  async fetchScoreboardsForDates(datesArray = []) {
    const dates = datesArray.filter(Boolean);
    if (dates.length === 0) return this.fetchScoreboardsForDateRange();
    const sorted = [...dates].sort();
    return this.fetchScoreboardsForDateRange(sorted[0], sorted[sorted.length - 1]);
  }

  /**
   * Listedeki kullanıcı maçını ESPN gerçek maçları arasında ara
   */
  findRealMatch(userHome, userAway, realEventsList) {
    for (const ev of realEventsList) {
      const homeComp = ev.competitors.find(c => c.homeAway === 'home');
      const awayComp = ev.competitors.find(c => c.homeAway === 'away');
      if (!homeComp || !awayComp) continue;

      const realHomeNames = [
        homeComp.team?.displayName,
        homeComp.team?.name,
        homeComp.team?.shortDisplayName,
        homeComp.team?.abbreviation
      ].filter(Boolean);

      const realAwayNames = [
        awayComp.team?.displayName,
        awayComp.team?.name,
        awayComp.team?.shortDisplayName,
        awayComp.team?.abbreviation
      ].filter(Boolean);

      // 1. Düz eşleşme (Ev Sahibi vs Deplasman)
      const homeMatchNormal = realHomeNames.some(rName => this.areTeamsMatching(userHome, rName));
      const awayMatchNormal = realAwayNames.some(rName => this.areTeamsMatching(userAway, rName));
      if (homeMatchNormal && awayMatchNormal) {
        return {
          event: ev,
          homeComp,
          awayComp,
          isReversed: false
        };
      }

      // 2. Ters eşleşme (Kullanıcı Deplasman vs Ev Sahibi yazmışsa)
      const homeMatchReversed = realAwayNames.some(rName => this.areTeamsMatching(userHome, rName));
      const awayMatchReversed = realHomeNames.some(rName => this.areTeamsMatching(userAway, rName));
      if (homeMatchReversed && awayMatchReversed) {
        return {
          event: ev,
          homeComp,
          awayComp,
          isReversed: true
        };
      }
    }
    return null;
  }

  /**
   * ANA SENKRONİZASYON METODU:
   * Tablodaki tüm maçları gerçek ESPN maç skorlarıyla eşleştirir ve günceller.
   * Kesinlikle sahte skor simülasyonu yapmaz.
   */
  async syncMatchesWithRealScores(matchesData, selectedDateString) {
    const dObj = selectedDateString ? new Date(selectedDateString) : new Date();
    const baseDate = !isNaN(dObj.getTime()) ? dObj : new Date();

    // 3 günlük pencere: [Seçili Tarih - 1 gün] ile [Seçili Tarih + 1 gün]
    const startD = new Date(baseDate);
    startD.setDate(startD.getDate() - 1);
    const endD = new Date(baseDate);
    endD.setDate(endD.getDate() + 1);

    const now = new Date();
    const minDate = new Date(Math.min(startD.getTime(), now.getTime()));
    const maxDate = new Date(Math.max(endD.getTime(), now.getTime()));
    const diffDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24));

    let realEvents = [];
    if (diffDays <= 7) {
      realEvents = await this.fetchScoreboardsForDateRange(
        this.formatDateParam(minDate),
        this.formatDateParam(maxDate)
      );
    } else {
      const [evsTarget, evsToday] = await Promise.all([
        this.fetchScoreboardsForDateRange(this.formatDateParam(startD), this.formatDateParam(endD)),
        this.fetchScoreboardsForDateRange(this.formatDateParam(now), this.formatDateParam(now))
      ]);
      realEvents = [...evsTarget, ...evsToday];
    }

    let finishedCount = 0;
    let liveCount = 0;
    let upcomingCount = 0;
    let notFoundCount = 0;

    const updatedMatches = {};

    Object.entries(matchesData).forEach(([key, match]) => {
      const home = match.home;
      const away = match.away;

      const found = this.findRealMatch(home, away, realEvents);

      if (found) {
        const { event, homeComp, awayComp, isReversed } = found;
        const state = event.status?.type?.state; // 'pre', 'in', 'post'
        const isCompleted = event.status?.type?.completed || state === 'post';

        // Skorları yönüne göre ata
        const rawHomeScore = isReversed ? awayComp.score : homeComp.score;
        const rawAwayScore = isReversed ? homeComp.score : awayComp.score;
        const scoreStr = (rawHomeScore !== undefined && rawAwayScore !== undefined) 
          ? `${rawHomeScore} - ${rawAwayScore}` 
          : null;

        // Maçın başlama saatini Türkiye yerel saatine göre biçimlendir
        let kickoffTime = match.time || '21:45';
        if (event.date) {
          try {
            const evDate = new Date(event.date);
            if (!isNaN(evDate.getTime())) {
              kickoffTime = evDate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
              match.time = kickoffTime;
            }
          } catch (e) {}
        }

        if (isCompleted) {
          // 1. RESMİ OLARAK BİTEN MAÇ (MS)
          match.status = 'finished';
          match.currentScore = scoreStr || '0 - 0';
          match.minute = 90;
          match.displayStatus = 'MS';
          finishedCount++;
        } else if (state === 'in') {
          // 2. ŞU AN CANLI OYNANAN MAÇ
          match.status = 'live';
          match.currentScore = scoreStr || '0 - 0';
          const clockDetail = event.status?.displayClock || event.status?.type?.detail || "Canlı";
          match.displayStatus = clockDetail;
          const parsedMin = parseInt(clockDetail);
          match.minute = !isNaN(parsedMin) ? parsedMin : 45;
          liveCount++;
        } else {
          // 3. HENÜZ BAŞLAMAMIŞ RESMİ MAÇ (pre)
          // Kesinlikle skor veya puan atanmaz!
          match.status = 'upcoming';
          match.currentScore = null;
          match.minute = null;
          match.displayStatus = `⏰ ${kickoffTime} | Başlamadı`;
          upcomingCount++;
        }
      } else {
        // ESPN listesinde bulunamayan veya henüz oynanmamış maç:
        // Kesinlikle sahte skor üretilmez; başlamadı olarak korunur!
        notFoundCount++;
        if (!match.currentScore) {
          match.status = 'upcoming';
          match.currentScore = null;
          match.minute = null;
          match.displayStatus = match.time ? `⏰ ${match.time} | Başlamadı` : '⏰ Başlamadı';
        }
      }

      updatedMatches[key] = match;
    });

    return {
      updatedMatches,
      stats: {
        total: Object.keys(matchesData).length,
        finished: finishedCount,
        live: liveCount,
        upcoming: upcomingCount,
        notFound: notFoundCount,
        totalRealEventsFound: realEvents.length
      }
    };
  }

  /**
   * Takım adının sonundaki durum veya parantez kalıntılarını temizler
   */
  cleanTrailingStatus(str) {
    if (!str) return '';
    return str
      .replace(/[\(\[\{]?\b(\d{1,2}['’]|\d{1,2}\+\d{1,2}['’]|[iİıI][yY]|ht|ms|ft|b[iİıI]tt[iİıI]|full\s*time|canl[ıi]|live)[\)\]\}]?\s*$/i, '')
      .replace(/[\s\(\[\{]+(?:\d{1,2}['’]|ms|ft|[iİıI][yY]|ht|canl[ıi]|live|b[iİıI]tt[iİıI]|full\s*time|sonland[ıi])[\)\]\}]*$/i, '')
      .replace(/\s*[\(\[\{][^\)\]\}]*[\)\]\}]\s*$/, '')
      .trim();
  }

  /**
   * SofaScore, Flashscore, Mackolik veya kullanıcı metninden maç skorlarını ve durumlarını ayrıştırır
   */
  parseRawScoreText(rawText) {
    if (!rawText || typeof rawText !== 'string') return [];
    const lines = rawText.split(/\r?\n/);
    const parsed = [];

    for (let rawLine of lines) {
      let line = rawLine.trim();
      if (!line) continue;

      // Markdown formatlarını temizle
      line = line.replace(/\*\*/g, '').replace(/`/g, '').trim();

      let status = 'finished';
      let minute = 90;
      let displayStatus = 'MS';

      // 1. Durum Tespiti (Canlı / İY / Bitti / 68' vb.)
      const lowerTest = line.toLowerCase().replace(/ı/g, 'i').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ş/g, 's').replace(/ö/g, 'o').replace(/ç/g, 'c');
      if (/\b(canli|live)\b/.test(lowerTest) || /\b(\d{1,2})['’]\b/.test(line) || /\b(iy|ht|devre\s*arasi)\b/.test(lowerTest)) {
        status = 'live';
        const minMatch = line.match(/\b(\d{1,2})['’]\b/);
        if (minMatch) {
          minute = parseInt(minMatch[1]);
          displayStatus = `${minute}'`;
        } else if (/\b(iy|ht|devre\s*arasi)\b/.test(lowerTest)) {
          minute = 45;
          displayStatus = 'İY';
        } else {
          minute = 65;
          displayStatus = 'Canlı';
        }
      } else if (/\b(ms|ft|bitti|full\s*time|sonlandi)\b/.test(lowerTest)) {
        status = 'finished';
        minute = 90;
        displayStatus = 'MS';
      }

      // Satır başı/sonu durum belirteçlerini temizle
      let cleanLine = line
        .replace(/^(?:ms|ft|[iİıI][yY]|ht|canl[ıi]|live|b[iİıI]tt[iİıI])[\s:\-\.]+/i, '')
        .replace(/[\s\(\[\{]+(?:\d{1,2}['’]|ms|ft|[iİıI][yY]|ht|canl[ıi]|live|b[iİıI]tt[iİıI]|full\s*time|sonland[ıi])[\)\]\}]*$/i, '')
        .trim();

      // Format A: [Takım A] [Skor1] - [Skor2] [Takım B] (Örn: Barcelona 5 - 1 Feyenoord)
      let m = cleanLine.match(/^(.+?)\s+(\d{1,2})\s*[-–—:]\s*(\d{1,2})\s+(.+)$/);
      if (m) {
        const h = this.cleanTrailingStatus(m[1]);
        const a = this.cleanTrailingStatus(m[4]);
        if (h && a) {
          parsed.push({
            home: h,
            away: a,
            score: `${m[2]} - ${m[3]}`,
            status,
            minute,
            displayStatus
          });
          continue;
        }
      }

      // Format B: [Takım A] vs [Takım B] :? [Skor1] - [Skor2] (Örn: Barcelona vs Feyenoord: 5 - 1)
      m = cleanLine.match(/^(.+?)\s+(?:vs\.?|karşısında)\s+(.+?)[\s:\-]+(\d{1,2})\s*[-–—:]\s*(\d{1,2})$/i);
      if (m) {
        const h = this.cleanTrailingStatus(m[1]);
        const a = this.cleanTrailingStatus(m[2]);
        if (h && a) {
          parsed.push({
            home: h,
            away: a,
            score: `${m[3]} - ${m[4]}`,
            status,
            minute,
            displayStatus
          });
          continue;
        }
      }

      // Format C: Tab ile ayrılmış web tablosu (SofaScore / Flashscore kopyalaması)
      const tabs = line.split('\t').map(t => t.trim()).filter(Boolean);
      if (tabs.length >= 3) {
        const scoreIdx = tabs.findIndex(t => /^\d{1,2}\s*[-–—:]\s*\d{1,2}$/.test(t));
        if (scoreIdx > 0 && scoreIdx < tabs.length - 1) {
          const h = this.cleanTrailingStatus(tabs[scoreIdx - 1]);
          const a = this.cleanTrailingStatus(tabs[scoreIdx + 1]);
          const sc = tabs[scoreIdx].replace(/\s*[-–—:]\s*/, ' - ');
          if (h && a) {
            parsed.push({ home: h, away: a, score: sc, status, minute, displayStatus });
            continue;
          }
        }
      }
    }

    return parsed;
  }

  /**
   * Ayrıştırılan ham skorları tablodaki maçlarla eşleştirir ve günceller
   */
  matchAndApplyRawScores(matchesData, rawScoresList) {
    if (!matchesData || !rawScoresList || rawScoresList.length === 0) {
      return { updatedCount: 0, matchedKeys: [] };
    }

    let updatedCount = 0;
    const matchedKeys = [];

    rawScoresList.forEach(rawItem => {
      for (const [key, match] of Object.entries(matchesData)) {
        const isMatchNormal = this.areTeamsMatching(rawItem.home, match.home) && this.areTeamsMatching(rawItem.away, match.away);
        const isMatchReversed = this.areTeamsMatching(rawItem.home, match.away) && this.areTeamsMatching(rawItem.away, match.home);

        if (isMatchNormal || isMatchReversed) {
          let finalScore = rawItem.score;
          if (isMatchReversed) {
            const parts = rawItem.score.split('-').map(s => s.trim());
            if (parts.length === 2) {
              finalScore = `${parts[1]} - ${parts[0]}`;
            }
          }

          match.status = rawItem.status;
          match.currentScore = finalScore;
          match.minute = rawItem.minute;
          match.displayStatus = rawItem.displayStatus;
          matchedKeys.push(key);
          updatedCount++;
          break;
        }
      }
    });

    return { updatedMatches: matchesData, updatedCount, matchedKeys };
  }

  /**
   * Seçili tarihin resmi fikstürünü çekip metin olarak hazırla (Prompt üreticisi için)
   */
  async getOfficialFixturesText(selectedDateString) {
    const dateParam = this.formatDateParam(selectedDateString);
    const realEvents = await this.fetchScoreboardsForDates([dateParam]);

    if (realEvents.length === 0) return null;

    const lines = [];
    const seen = new Set();

    realEvents.forEach(ev => {
      const home = ev.competitors.find(c => c.homeAway === 'home')?.team?.displayName;
      const away = ev.competitors.find(c => c.homeAway === 'away')?.team?.displayName;
      if (home && away) {
        const pairKey = [home, away].sort().join('___');
        if (!seen.has(pairKey)) {
          seen.add(pairKey);
          let timeStr = '21:45';
          if (ev.date) {
            try {
              timeStr = new Date(ev.date).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });
            } catch (e) {}
          }
          lines.push(`• ${home} vs ${away} (Lig: ${ev.league}, Başlama Saati: ${timeStr})`);
        }
      }
    });

    return lines;
  }
}

export const liveScoreService = new LiveScoreService();
