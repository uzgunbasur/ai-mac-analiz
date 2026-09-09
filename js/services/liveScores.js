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
   * Belirtilen tarihler için tüm liglerden resmi maç skorlarını çek
   */
  async fetchScoreboardsForDates(datesArray = []) {
    const dates = datesArray.filter(Boolean);
    if (dates.length === 0) {
      dates.push(this.formatDateParam(new Date()));
    }

    const fetchTasks = [];
    dates.forEach(dStr => {
      SUPPORTED_LEAGUES.forEach(league => {
        const url = `${this.apiBase}/${league.code}/scoreboard?dates=${dStr}`;
        fetchTasks.push(
          fetch(url)
            .then(res => res.ok ? res.json() : null)
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
            .catch(() => [])
        );
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
   * Listedeki kullanıcı maçını ESPN gerçek maçları arasında ara
   */
  findRealMatch(userHome, userAway, realEventsList) {
    for (const ev of realEventsList) {
      const homeComp = ev.competitors.find(c => c.homeAway === 'home');
      const awayComp = ev.competitors.find(c => c.homeAway === 'away');
      if (!homeComp || !awayComp) continue;

      const realHomeName = homeComp.team?.displayName || homeComp.team?.name || '';
      const realAwayName = awayComp.team?.displayName || awayComp.team?.name || '';

      // 1. Düz eşleşme (Ev Sahibi vs Deplasman)
      if (this.areTeamsMatching(userHome, realHomeName) && this.areTeamsMatching(userAway, realAwayName)) {
        return {
          event: ev,
          homeComp,
          awayComp,
          isReversed: false
        };
      }

      // 2. Ters eşleşme (Kullanıcı Deplasman vs Ev Sahibi yazmışsa)
      if (this.areTeamsMatching(userHome, realAwayName) && this.areTeamsMatching(userAway, realHomeName)) {
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
    const targetDate = this.formatDateParam(selectedDateString);
    const today = this.formatDateParam(new Date());

    // Dün ve yarının tarihlerini de hazırla (saat farkları / gece maçları için)
    const yesterdayDate = new Date();
    yesterdayDate.setDate(yesterdayDate.getDate() - 1);
    const yesterday = this.formatDateParam(yesterdayDate);

    const datesToQuery = Array.from(new Set([targetDate, today, yesterday])).filter(Boolean);

    // ESPN'den resmi maçları çek
    const realEvents = await this.fetchScoreboardsForDates(datesToQuery);

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
          match.displayStatus = `⏰ ${kickoffTime}`;
          upcomingCount++;
        }
      } else {
        // ESPN listesinde bulunamayan maç
        notFoundCount++;
        if (!match.currentScore) {
          match.status = 'upcoming';
          match.displayStatus = match.time ? `⏰ ${match.time}` : '⏰ Başlamadı';
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
