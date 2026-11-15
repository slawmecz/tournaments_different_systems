// Translations (Polish + English) with plural rules and date formatting.

const pl = {
  'brand.default': 'Niedzielna Liga',
  'nav.home': 'Start', 'nav.tournaments': 'Turnieje', 'nav.players': 'Gracze', 'nav.stats': 'Statystyki', 'nav.settings': 'Ustawienia',
  'nav.new': 'Nowy turniej', 'nav.newShort': 'Nowy',
  'footer.tagline': 'Niedzielne wieczory, piłka i przechwałki.',
  'footer.local': 'Dane zapisane lokalnie w tej przeglądarce',

  'home.eyebrow': 'Konsolowe turnieje piłkarskie',
  'home.title1': 'Każda niedziela.', 'home.title2': 'Nowy mistrz.',
  'home.lead': 'Twórz turnieje w kilka sekund, wpisuj wyniki na żywo i sprawdź, kto naprawdę rządzi na kanapie.',
  'home.ctaNew': 'Zacznij turniej', 'home.ctaPlayers': 'Dodaj graczy', 'home.ctaContinue': 'Wróć do turnieju',
  'home.live': 'Trwa teraz', 'home.continue': 'Kontynuuj', 'home.nextMatch': 'Następny mecz',
  'home.lastChampion': 'Ostatni mistrz', 'home.ranking': 'Ranking Elo', 'home.recent': 'Ostatnie wyniki', 'home.seeAll': 'Wszystko',
  'home.howItWorks': 'Jak to działa',
  'home.ob1.t': 'Dodaj ekipę', 'home.ob1.d': 'Imię, emoji i kolor — gotowe w 5 sekund.',
  'home.ob2.t': 'Wybierz system', 'home.ob2.d': 'Liga, puchar, szwajcar, grupy albo Król Kanapy.',
  'home.ob3.t': 'Grajcie i wpisujcie wyniki', 'home.ob3.d': 'Tabela, drabinka i statystyki liczą się same.',
  'home.demo': 'Wczytaj dane demo', 'home.demoHint': 'Zobacz stronę z kilkoma rozegranymi turniejami. Dane demo usuniesz jednym kliknięciem w ustawieniach.',
  'home.noChampion': 'Puchar wciąż czeka na pierwszego zwycięzcę.',
  'home.noResults': 'Brak wyników — czas zagrać!',
  'home.formats': 'Pięć systemów rozgrywek',
  'home.allDone': 'Wszystkie mecze rozegrane',

  'fmt.league': 'Liga', 'fmt.league.d': 'Każdy z każdym. Najbardziej sprawiedliwy system — wygrywa najrówniejszy.',
  'fmt.knockout': 'Puchar', 'fmt.knockout.d': 'Przegrany odpada. Drabinka, emocje i wielki finał. Remis? Karne.',
  'fmt.swiss': 'System szwajcarski', 'fmt.swiss.d': 'Kilka rund z rywalami o podobnym bilansie. Dużo meczów, zero powtórek.',
  'fmt.groups': 'Grupy + puchar', 'fmt.groups.d': 'Jak na mundialu: faza grupowa, a potem drabinka dla najlepszych.',
  'fmt.koth': 'Król Kanapy', 'fmt.koth.d': 'Zwycięzca zostaje, przegrany do kolejki. Kto pierwszy wygra kilka z rzędu?',
  'fmt.min': 'min. {n} graczy',

  'wiz.title': 'Nowy turniej', 'wiz.lead': 'Trzy kroki i gramy.',
  'wiz.step1': 'System rozgrywek', 'wiz.step2': 'Kto gra?', 'wiz.step3': 'Ustawienia',
  'wiz.selectAll': 'Wszyscy', 'wiz.clear': 'Wyczyść', 'wiz.selected': 'Wybrano: {n}',
  'wiz.quickAdd': 'Szybko dodaj gracza…', 'wiz.add': 'Dodaj',
  'wiz.name': 'Nazwa turnieju',
  'wiz.legs': 'Mecze', 'wiz.legs1': 'Jeden mecz', 'wiz.legs2': 'Mecz i rewanż',
  'wiz.seeding': 'Losowanie', 'wiz.seedRandom': 'Losowe', 'wiz.seedRanking': 'Wg rankingu Elo',
  'wiz.thirdPlace': 'Mecz o 3. miejsce',
  'wiz.rounds': 'Liczba rund', 'wiz.roundsHint': 'Zalecane: {n}. Maksymalnie: {m}.',
  'wiz.groups': 'Liczba grup', 'wiz.advance': 'Awans z każdej grupy', 'wiz.advanceOpt': 'Top {k}',
  'wiz.target': 'Wygrane z rzędu, by zostać królem',
  'wiz.create': 'Gramy!', 'wiz.openEnded': 'bez limitu meczów',
  'wiz.need': 'Wybierz co najmniej {n} graczy', 'wiz.noPlayers': 'Najpierw dodaj graczy — wystarczy imię.',
  'wiz.groupsNone': 'Dla tej liczby graczy grupy nie mają sensu — potrzeba min. 6 osób.',
  'wiz.time': '~{t}', 'wiz.noOptions': 'Brak dodatkowych ustawień dla tego systemu.',

  't.live': 'Na żywo', 't.finished': 'Zakończony', 't.nowPlaying': 'Teraz grają', 't.enterScore': 'Wpisz wynik', 't.upNext': 'Następnie',
  't.tab.table': 'Tabela', 't.tab.matches': 'Mecze', 't.tab.bracket': 'Drabinka', 't.tab.groups': 'Grupy', 't.tab.stats': 'Statystyki', 't.tab.queue': 'Kolejka',
  't.matchday': 'Kolejka {n}', 't.round': 'Runda {n}', 't.group': 'Grupa {g}', 't.match': 'Mecz {n}',
  't.ko.final': 'Finał', 't.ko.semi': 'Półfinał', 't.ko.quarter': 'Ćwierćfinał', 't.ko.r16': '1/8 finału', 't.ko.r32': '1/16 finału', 't.ko.rN': 'Runda {n}', 't.ko.third': 'Mecz o 3. miejsce',
  't.bye': 'wolny los', 't.tbd': 'czeka', 't.src': '{pos}. gr. {g}', 't.rest': 'Pauzuje', 't.restShort': 'pauza (+3 pkt)',
  't.pens': 'k. {h}:{a}', 't.progress': '{p} z {t} meczów', 't.champion': 'Mistrz', 't.runnerUp': '2. miejsce', 't.third': '3. miejsce',
  't.share': 'Udostępnij', 't.fullscreen': 'Pełny ekran', 't.more': 'Więcej',
  't.rename': 'Zmień nazwę', 't.delete': 'Usuń turniej', 't.end': 'Zakończ wieczór',
  't.endConfirm': 'Zakończyć turniej? Mistrzem zostanie gracz z największą liczbą wygranych.',
  't.deleteConfirm': 'Usunąć turniej „{name}”? Tego nie da się cofnąć.',
  't.notFound': 'Nie znaleziono turnieju', 't.deleted': 'Turniej usunięty',
  't.king': 'Król kanapy', 't.streak': 'Seria', 't.streakOf': '{n} z {t}', 't.queue': 'Kolejka oczekujących', 't.challenger': 'Pretendent',
  't.locked': 'Starsze wyniki w Królu Kanapy są zablokowane — można poprawić tylko ostatni.',
  't.newRound': 'Runda {n} rozlosowana!', 't.cleared': 'Zresetowano późniejsze wyniki: {n}',
  't.groupsPending': 'Drabinka wypełni się po zakończeniu fazy grupowej.', 't.qualify': 'Awans',
  't.statGoals': 'Gole', 't.statAvg': 'Średnio na mecz', 't.statBiggest': 'Najwyższe zwycięstwo', 't.statTopAttack': 'Najlepszy atak', 't.statDefense': 'Najlepsza obrona', 't.statWild': 'Najwięcej goli w meczu', 't.statDraws': 'Remisy',
  't.noStats': 'Statystyki pojawią się po pierwszym meczu.',
  't.finishedAt': 'Zakończony {d}', 't.created': 'Utworzony {d}',
  't.empty': 'Brak turniejów', 't.emptyD': 'Stwórz pierwszy turniej — zajmie to mniej czasu niż wybór drużyny w grze.',
  't.list': 'Turnieje', 't.listLead': 'Wszystkie wasze wieczory — trwające i zakończone.', 't.active': 'Trwające', 't.done': 'Zakończone',
  't.renamed': 'Nazwa zmieniona', 't.noUpcoming': 'Czekamy na wyniki, które odblokują kolejne mecze.',
  't.kothInfo': 'Wygraj {t} z rzędu, aby zostać Królem Kanapy.',
  't.resume': 'Wznów wieczór', 't.resumed': 'Wieczór wznowiony — gramy dalej!',

  'col.p': 'M', 'col.w': 'Z', 'col.d': 'R', 'col.l': 'P', 'col.goals': 'Bramki', 'col.gd': '+/-', 'col.pts': 'Pkt', 'col.form': 'Forma',
  'col.bh': 'Bh', 'col.elo': 'Elo', 'col.win': '% zw.', 'col.titles': 'Tytuły', 'col.best': 'Seria', 'col.player': 'Gracz',
  'col.bhInfo': 'Bh = Buchholz: suma punktów rywali (siła terminarza).',

  'sc.title': 'Wynik meczu', 'sc.save': 'Zapisz wynik', 'sc.clear': 'Usuń wynik', 'sc.home': 'Gospodarz', 'sc.away': 'Gość',
  'sc.pens': 'Remis — kto wygrał karne?', 'sc.pensErr': 'Wpisz wynik karnych (bez remisu).', 'sc.goalsErr': 'Wpisz liczbę goli (0–99).',
  'sc.warn': 'Ta zmiana zresetuje późniejsze wyniki w drabince: {n}.', 'sc.saved': 'Wynik zapisany', 'sc.removed': 'Wynik usunięty',

  'pl.title': 'Gracze', 'pl.lead': 'Twoja ekipa. Kliknij gracza, aby zobaczyć jego statystyki.',
  'pl.add': 'Dodaj gracza', 'pl.edit': 'Edytuj gracza', 'pl.name': 'Imię lub ksywka', 'pl.club': 'Ulubiony klub (opcjonalnie)',
  'pl.avatar': 'Awatar', 'pl.color': 'Kolor', 'pl.delete': 'Usuń gracza',
  'pl.cantDelete': 'Ten gracz ma historię turniejów, więc nie można go usunąć. Możesz zmienić mu imię.',
  'pl.deleteConfirm': 'Usunąć gracza {name}?', 'pl.deleted': 'Gracz usunięty', 'pl.saved': 'Gracz zapisany', 'pl.added': 'Dodano: {name}',
  'pl.nameRequired': 'Podaj imię', 'pl.empty': 'Brak graczy', 'pl.emptyD': 'Dodaj znajomych, z którymi gracie w niedziele.',
  'pl.matches': 'Mecze', 'pl.winRate': 'Skuteczność', 'pl.gpm': 'Gole na mecz', 'pl.titles': 'Tytuły', 'pl.rank': '#{n} w rankingu',
  'pl.form': 'Forma (ostatnie 10)', 'pl.elo': 'Historia Elo', 'pl.eloSub': 'Ranking po każdym meczu', 'pl.rivals': 'Rywale',
  'pl.nemesis': 'Zmora', 'pl.victim': 'Ulubiona ofiara', 'pl.h2h': 'Bilans z rywalami', 'pl.recent': 'Ostatnie mecze',
  'pl.cleanSheets': 'Czyste konta', 'pl.longestWin': 'Najdłuższa seria zwycięstw', 'pl.unbeaten': 'Najdłużej bez porażki', 'pl.peak': 'Najwyższe Elo',
  'pl.biggestWin': 'Najwyższa wygrana', 'pl.streak': 'Aktualna seria', 'pl.noMatches': 'Ten gracz jeszcze nie grał. Wrzuć go do turnieju!',
  'pl.wins': 'Wygrane', 'pl.draws': 'Remisy', 'pl.losses': 'Porażki', 'pl.notFound': 'Nie znaleziono gracza', 'pl.tournaments': 'Turnieje',
  'pl.goals': 'Bramki', 'pl.vsRecord': '{w}Z {d}R {p}P', 'pl.chartTip': 'po meczu z {opp}', 'pl.streakW': '{n} wygr. z rzędu', 'pl.streakD': '{n} remis(y) z rzędu', 'pl.streakL': '{n} porażk. z rzędu',
  'pl.initials': 'Aa', 'pl.compare': 'Porównaj', 'pl.scored': 'Strzelone', 'pl.conceded': 'Stracone',

  'st.title': 'Statystyki', 'st.lead': 'Wszystkie mecze, wszystkie turnieje. Liczby nie kłamią.',
  'st.ranking': 'Ranking', 'st.records': 'Rekordy', 'st.h2h': 'H2H', 'st.hof': 'Galeria sław',
  'st.empty': 'Rozegrajcie kilka meczów, a statystyki pojawią się tutaj.', 'st.hofEmpty': 'Galeria czeka na pierwszego mistrza.',
  'st.eloInfo': 'Elo: każdy zaczyna od 1000. Wysokie wygrane i niespodzianki dają więcej punktów, a karne liczą się jak remis.',
  'st.h2hPick': 'Wybierz dwóch graczy', 'st.h2hNone': 'Ci gracze jeszcze się nie spotkali.', 'st.meetings': 'Spotkania', 'st.goals': 'Gole',
  'st.h2hSame': 'Wybierz dwóch różnych graczy.',
  'rec.biggestWin': 'Najwyższe zwycięstwo', 'rec.mostGoals': 'Najwięcej goli w meczu', 'rec.longestWin': 'Najdłuższa seria zwycięstw',
  'rec.longestUnbeaten': 'Najdłuższa seria bez porażki', 'rec.mostTitles': 'Najwięcej tytułów', 'rec.bestAttack': 'Najlepszy atak',
  'rec.bestDefense': 'Najlepsza obrona', 'rec.mostMatches': 'Najwięcej meczów', 'rec.mostGoalsPlayer': 'Najwięcej strzelonych goli',
  'rec.cleanSheets': 'Najwięcej czystych kont', 'rec.peakElo': 'Najwyższe Elo w historii',
  'rec.perMatch': '{v} na mecz', 'rec.perMatchAgainst': '{v} straconych na mecz', 'rec.inARow': '{n} z rzędu', 'rec.minMatches': 'min. 3 mecze',

  'set.title': 'Ustawienia', 'set.crew': 'Nazwa ekipy', 'set.crewHint': 'Wyświetlana w logo. Zostaw puste, aby użyć domyślnej.',
  'set.language': 'Język', 'set.data': 'Dane i kopia zapasowa',
  'set.dataInfo': 'Wszystko zapisuje się w tej przeglądarce — bez kont i serwerów. Zrób kopię, aby przenieść dane na inne urządzenie.',
  'set.export': 'Eksportuj kopię', 'set.import': 'Importuj kopię',
  'set.importConfirm': 'Import zastąpi obecne dane ({p} graczy, {t} turniejów). Kontynuować?',
  'set.imported': 'Dane zaimportowane', 'set.importError': 'To nie jest prawidłowy plik kopii.',
  'set.demo': 'Wczytaj dane demo', 'set.removeDemo': 'Usuń dane demo', 'set.demoRemoved': 'Dane demo usunięte', 'set.demoLoaded': 'Dane demo wczytane',
  'set.reset': 'Usuń wszystkie dane', 'set.resetConfirm': 'Na pewno? Wszyscy gracze i turnieje zostaną usunięci z tej przeglądarki.', 'set.resetDone': 'Wszystkie dane usunięte',
  'set.storage': 'Zajęte miejsce', 'set.players': 'Gracze', 'set.tournaments': 'Turnieje', 'set.matches': 'Rozegrane mecze',
  'set.danger': 'Strefa zagrożenia', 'set.saved': 'Zapisano', 'set.install': 'Dodaj do ekranu głównego',
  'set.installHint': 'Na telefonie: menu przeglądarki → „Dodaj do ekranu głównego”. Strona działa wtedy jak aplikacja, także offline.',

  'sh.title': 'Udostępnij turniej', 'sh.text': 'Podsumowanie do wysłania', 'sh.link': 'Link tylko do podglądu',
  'sh.linkHint': 'Link zawiera kopię turnieju — znajomi zobaczą tabelę i wyniki na swoim telefonie. Po nowych wynikach wyślij nowy link.',
  'sh.copyText': 'Kopiuj tekst', 'sh.copyLink': 'Kopiuj link', 'sh.send': 'Wyślij…',
  'sh.banner': 'Podgląd udostępnionego turnieju', 'sh.bannerHint': 'To kopia tylko do odczytu, zapisana w linku.',
  'sh.import': 'Zapisz na tym urządzeniu', 'sh.imported': 'Turniej zapisany na tym urządzeniu', 'sh.invalid': 'Ten link jest uszkodzony lub niepełny.',
  'sh.exists': 'Ten turniej już jest na tym urządzeniu — zaktualizowano go.',
  'sh.standings': 'Tabela', 'sh.results': 'Wyniki', 'sh.champion': 'Mistrz',
  'sh.conflictTitle': 'Ten turniej już tu jest', 'sh.conflict': 'Twoja wersja ma wyników: {mine}, a wersja z linku: {link}. Zastąpić swoją wersję wersją z linku?',
  'sh.replace': 'Zastąp moją wersję', 'sh.keep': 'Zostaw moją',

  'c.cancel': 'Anuluj', 'c.confirm': 'Potwierdź', 'c.delete': 'Usuń', 'c.close': 'Zamknij', 'c.back': 'Wróć', 'c.save': 'Zapisz',
  'c.copied': 'Skopiowano do schowka', 'c.copyFail': 'Nie udało się skopiować', 'c.vs': 'vs', 'c.yes': 'Tak', 'c.no': 'Nie', 'c.edit': 'Edytuj',
  'c.storageError': 'Nie udało się zapisać danych w przeglądarce (brak miejsca lub tryb prywatny).',
  'c.notFound': 'Nie ma takiej strony', 'c.goHome': 'Wróć na start', 'c.today': 'dziś', 'c.yesterday': 'wczoraj', 'c.daysAgo': '{n} dni temu',
  'c.min': '{n} min', 'c.hm': '{h} godz. {m} min', 'c.h': '{h} godz.',
  'c.renderError': 'Coś poszło nie tak przy wyświetlaniu tej strony.',
  'c.loadProblem': 'Zapisane dane były uszkodzone — ich kopia została zachowana, a strona zaczęła od zera.',

  'form.W': 'Z', 'form.D': 'R', 'form.L': 'P', 'form.W.full': 'Zwycięstwo', 'form.D.full': 'Remis', 'form.L.full': 'Porażka',
  'n.match': ['mecz', 'mecze', 'meczów'], 'n.goal': ['gol', 'gole', 'goli'], 'n.round': ['runda', 'rundy', 'rund'],
  'n.tournament': ['turniej', 'turnieje', 'turniejów'], 'n.group': ['grupa', 'grupy', 'grup'], 'n.player': ['gracz', 'gracze', 'graczy'],
  'n.win': ['wygrana', 'wygrane', 'wygranych'], 'n.title': ['tytuł', 'tytuły', 'tytułów'],
};

const en = {
  'brand.default': 'Sunday League',
  'nav.home': 'Home', 'nav.tournaments': 'Tournaments', 'nav.players': 'Players', 'nav.stats': 'Stats', 'nav.settings': 'Settings',
  'nav.new': 'New tournament', 'nav.newShort': 'New',
  'footer.tagline': 'Sunday nights, football and bragging rights.',
  'footer.local': 'Data is stored locally in this browser',

  'home.eyebrow': 'Console football tournaments',
  'home.title1': 'Every Sunday.', 'home.title2': 'A new champion.',
  'home.lead': 'Set up a tournament in seconds, enter scores live and find out who really rules the couch.',
  'home.ctaNew': 'Start a tournament', 'home.ctaPlayers': 'Add players', 'home.ctaContinue': 'Back to the tournament',
  'home.live': 'Live now', 'home.continue': 'Continue', 'home.nextMatch': 'Next match',
  'home.lastChampion': 'Last champion', 'home.ranking': 'Elo ranking', 'home.recent': 'Latest results', 'home.seeAll': 'See all',
  'home.howItWorks': 'How it works',
  'home.ob1.t': 'Add your crew', 'home.ob1.d': 'Name, emoji and colour — done in 5 seconds.',
  'home.ob2.t': 'Pick a format', 'home.ob2.d': 'League, knockout, Swiss, groups or King of the Couch.',
  'home.ob3.t': 'Play and enter scores', 'home.ob3.d': 'Tables, brackets and stats update themselves.',
  'home.demo': 'Load demo data', 'home.demoHint': 'See the site with a few tournaments already played. Remove the demo data with one click in Settings.',
  'home.noChampion': 'The trophy is still waiting for its first winner.',
  'home.noResults': 'No results yet — time to play!',
  'home.formats': 'Five tournament formats',
  'home.allDone': 'All matches played',

  'fmt.league': 'League', 'fmt.league.d': 'Everyone plays everyone. The fairest format — consistency wins.',
  'fmt.knockout': 'Knockout', 'fmt.knockout.d': 'Lose and you are out. A bracket, drama and a grand final. Draw? Penalties.',
  'fmt.swiss': 'Swiss system', 'fmt.swiss.d': 'A few rounds against rivals with similar records. Lots of games, zero rematches.',
  'fmt.groups': 'Groups + knockout', 'fmt.groups.d': 'World Cup style: a group stage, then a bracket for the best.',
  'fmt.koth': 'King of the Couch', 'fmt.koth.d': 'Winner stays on, loser joins the queue. Who wins a few in a row first?',
  'fmt.min': 'min. {n} players',

  'wiz.title': 'New tournament', 'wiz.lead': 'Three steps and you are playing.',
  'wiz.step1': 'Format', 'wiz.step2': 'Who is playing?', 'wiz.step3': 'Settings',
  'wiz.selectAll': 'Everyone', 'wiz.clear': 'Clear', 'wiz.selected': 'Selected: {n}',
  'wiz.quickAdd': 'Quick-add a player…', 'wiz.add': 'Add',
  'wiz.name': 'Tournament name',
  'wiz.legs': 'Matches', 'wiz.legs1': 'Single match', 'wiz.legs2': 'Home and away',
  'wiz.seeding': 'Draw', 'wiz.seedRandom': 'Random', 'wiz.seedRanking': 'By Elo ranking',
  'wiz.thirdPlace': 'Third-place match',
  'wiz.rounds': 'Rounds', 'wiz.roundsHint': 'Recommended: {n}. Maximum: {m}.',
  'wiz.groups': 'Groups', 'wiz.advance': 'Qualify from each group', 'wiz.advanceOpt': 'Top {k}',
  'wiz.target': 'Wins in a row to be crowned',
  'wiz.create': 'Kick off!', 'wiz.openEnded': 'open-ended',
  'wiz.need': 'Pick at least {n} players', 'wiz.noPlayers': 'Add some players first — a name is enough.',
  'wiz.groupsNone': 'Groups need at least 6 players.',
  'wiz.time': '~{t}', 'wiz.noOptions': 'No extra settings for this format.',

  't.live': 'Live', 't.finished': 'Finished', 't.nowPlaying': 'Now playing', 't.enterScore': 'Enter score', 't.upNext': 'Up next',
  't.tab.table': 'Table', 't.tab.matches': 'Matches', 't.tab.bracket': 'Bracket', 't.tab.groups': 'Groups', 't.tab.stats': 'Stats', 't.tab.queue': 'Queue',
  't.matchday': 'Matchday {n}', 't.round': 'Round {n}', 't.group': 'Group {g}', 't.match': 'Match {n}',
  't.ko.final': 'Final', 't.ko.semi': 'Semi-final', 't.ko.quarter': 'Quarter-final', 't.ko.r16': 'Round of 16', 't.ko.r32': 'Round of 32', 't.ko.rN': 'Round {n}', 't.ko.third': 'Third place',
  't.bye': 'bye', 't.tbd': 'TBD', 't.src': '{g}{pos}', 't.rest': 'Rests', 't.restShort': 'rest (+3 pts)',
  't.pens': 'pens {h}–{a}', 't.progress': '{p} of {t} matches', 't.champion': 'Champion', 't.runnerUp': 'Runner-up', 't.third': 'Third',
  't.share': 'Share', 't.fullscreen': 'Fullscreen', 't.more': 'More',
  't.rename': 'Rename', 't.delete': 'Delete tournament', 't.end': 'End the night',
  't.endConfirm': 'End the tournament? The player with the most wins becomes champion.',
  't.deleteConfirm': 'Delete “{name}”? This cannot be undone.',
  't.notFound': 'Tournament not found', 't.deleted': 'Tournament deleted',
  't.king': 'King of the Couch', 't.streak': 'Streak', 't.streakOf': '{n} of {t}', 't.queue': 'Waiting queue', 't.challenger': 'Challenger',
  't.locked': 'Older King of the Couch results are locked — only the latest one can be corrected.',
  't.newRound': 'Round {n} pairings are ready!', 't.cleared': 'Later results reset: {n}',
  't.groupsPending': 'The bracket fills in once the group stage is finished.', 't.qualify': 'Qualifies',
  't.statGoals': 'Goals', 't.statAvg': 'Per match', 't.statBiggest': 'Biggest win', 't.statTopAttack': 'Best attack', 't.statDefense': 'Best defence', 't.statWild': 'Highest-scoring match', 't.statDraws': 'Draws',
  't.noStats': 'Stats appear after the first match.',
  't.finishedAt': 'Finished {d}', 't.created': 'Created {d}',
  't.empty': 'No tournaments yet', 't.emptyD': 'Create your first one — it takes less time than picking a team in the game.',
  't.list': 'Tournaments', 't.listLead': 'All your nights — live and finished.', 't.active': 'Live', 't.done': 'Finished',
  't.renamed': 'Renamed', 't.noUpcoming': 'Waiting for results that unlock the next matches.',
  't.kothInfo': 'Win {t} in a row to be crowned King of the Couch.',
  't.resume': 'Resume the night', 't.resumed': 'Night resumed — play on!',

  'col.p': 'P', 'col.w': 'W', 'col.d': 'D', 'col.l': 'L', 'col.goals': 'Goals', 'col.gd': 'GD', 'col.pts': 'Pts', 'col.form': 'Form',
  'col.bh': 'Bh', 'col.elo': 'Elo', 'col.win': 'Win %', 'col.titles': 'Titles', 'col.best': 'Best', 'col.player': 'Player',
  'col.bhInfo': 'Bh = Buchholz: total points of your opponents (strength of schedule).',

  'sc.title': 'Match result', 'sc.save': 'Save result', 'sc.clear': 'Clear result', 'sc.home': 'Home', 'sc.away': 'Away',
  'sc.pens': 'Draw — who won the shoot-out?', 'sc.pensErr': 'Enter the shoot-out score (no draw).', 'sc.goalsErr': 'Enter the goals (0–99).',
  'sc.warn': 'This change resets later bracket results: {n}.', 'sc.saved': 'Result saved', 'sc.removed': 'Result cleared',

  'pl.title': 'Players', 'pl.lead': 'Your crew. Tap a player to see their stats.',
  'pl.add': 'Add player', 'pl.edit': 'Edit player', 'pl.name': 'Name or nickname', 'pl.club': 'Favourite club (optional)',
  'pl.avatar': 'Avatar', 'pl.color': 'Colour', 'pl.delete': 'Delete player',
  'pl.cantDelete': 'This player has tournament history, so they cannot be deleted. You can rename them.',
  'pl.deleteConfirm': 'Delete {name}?', 'pl.deleted': 'Player deleted', 'pl.saved': 'Player saved', 'pl.added': 'Added: {name}',
  'pl.nameRequired': 'Enter a name', 'pl.empty': 'No players yet', 'pl.emptyD': 'Add the friends you play with on Sundays.',
  'pl.matches': 'Matches', 'pl.winRate': 'Win rate', 'pl.gpm': 'Goals per match', 'pl.titles': 'Titles', 'pl.rank': '#{n} in the ranking',
  'pl.form': 'Form (last 10)', 'pl.elo': 'Elo history', 'pl.eloSub': 'Rating after every match', 'pl.rivals': 'Rivals',
  'pl.nemesis': 'Nemesis', 'pl.victim': 'Favourite victim', 'pl.h2h': 'Head-to-head', 'pl.recent': 'Recent matches',
  'pl.cleanSheets': 'Clean sheets', 'pl.longestWin': 'Longest winning run', 'pl.unbeaten': 'Longest unbeaten run', 'pl.peak': 'Peak Elo',
  'pl.biggestWin': 'Biggest win', 'pl.streak': 'Current streak', 'pl.noMatches': 'This player has not played yet. Put them in a tournament!',
  'pl.wins': 'Wins', 'pl.draws': 'Draws', 'pl.losses': 'Losses', 'pl.notFound': 'Player not found', 'pl.tournaments': 'Tournaments',
  'pl.goals': 'Goals', 'pl.vsRecord': '{w}W {d}D {p}L', 'pl.chartTip': 'after the match vs {opp}', 'pl.streakW': '{n} wins in a row', 'pl.streakD': '{n} draws in a row', 'pl.streakL': '{n} losses in a row',
  'pl.initials': 'Aa', 'pl.compare': 'Compare', 'pl.scored': 'Scored', 'pl.conceded': 'Conceded',

  'st.title': 'Statistics', 'st.lead': 'Every match, every tournament. Numbers don’t lie.',
  'st.ranking': 'Ranking', 'st.records': 'Records', 'st.h2h': 'H2H', 'st.hof': 'Hall of fame',
  'st.empty': 'Play a few matches and the stats will show up here.', 'st.hofEmpty': 'The hall of fame awaits its first champion.',
  'st.eloInfo': 'Elo: everyone starts at 1000. Big wins and upsets earn more points; shoot-outs count as draws.',
  'st.h2hPick': 'Pick two players', 'st.h2hNone': 'These two have not met yet.', 'st.meetings': 'Meetings', 'st.goals': 'Goals',
  'st.h2hSame': 'Pick two different players.',
  'rec.biggestWin': 'Biggest win', 'rec.mostGoals': 'Most goals in a match', 'rec.longestWin': 'Longest winning streak',
  'rec.longestUnbeaten': 'Longest unbeaten run', 'rec.mostTitles': 'Most titles', 'rec.bestAttack': 'Best attack',
  'rec.bestDefense': 'Best defence', 'rec.mostMatches': 'Most matches', 'rec.mostGoalsPlayer': 'Most goals scored',
  'rec.cleanSheets': 'Most clean sheets', 'rec.peakElo': 'Highest Elo ever',
  'rec.perMatch': '{v} per match', 'rec.perMatchAgainst': '{v} conceded per match', 'rec.inARow': '{n} in a row', 'rec.minMatches': 'min. 3 matches',

  'set.title': 'Settings', 'set.crew': 'Crew name', 'set.crewHint': 'Shown in the logo. Leave empty for the default.',
  'set.language': 'Language', 'set.data': 'Data and backup',
  'set.dataInfo': 'Everything is saved in this browser — no accounts, no servers. Export a backup to move your data to another device.',
  'set.export': 'Export backup', 'set.import': 'Import backup',
  'set.importConfirm': 'Importing replaces the current data ({p} players, {t} tournaments). Continue?',
  'set.imported': 'Data imported', 'set.importError': 'That is not a valid backup file.',
  'set.demo': 'Load demo data', 'set.removeDemo': 'Remove demo data', 'set.demoRemoved': 'Demo data removed', 'set.demoLoaded': 'Demo data loaded',
  'set.reset': 'Delete all data', 'set.resetConfirm': 'Are you sure? All players and tournaments will be removed from this browser.', 'set.resetDone': 'All data deleted',
  'set.storage': 'Storage used', 'set.players': 'Players', 'set.tournaments': 'Tournaments', 'set.matches': 'Matches played',
  'set.danger': 'Danger zone', 'set.saved': 'Saved', 'set.install': 'Add to home screen',
  'set.installHint': 'On your phone: browser menu → “Add to Home screen”. It then works like an app, even offline.',

  'sh.title': 'Share tournament', 'sh.text': 'Summary to send', 'sh.link': 'View-only link',
  'sh.linkHint': 'The link contains a snapshot of the tournament — friends can see tables and results on their phones. Send a new link after new results.',
  'sh.copyText': 'Copy text', 'sh.copyLink': 'Copy link', 'sh.send': 'Send…',
  'sh.banner': 'Shared tournament snapshot', 'sh.bannerHint': 'A read-only copy stored in the link.',
  'sh.import': 'Save on this device', 'sh.imported': 'Tournament saved on this device', 'sh.invalid': 'This link is broken or incomplete.',
  'sh.exists': 'This tournament was already on this device — it has been updated.',
  'sh.standings': 'Standings', 'sh.results': 'Results', 'sh.champion': 'Champion',
  'sh.conflictTitle': 'You already have this tournament', 'sh.conflict': 'Your copy has {mine} results, the link has {link}. Replace your copy with the one from the link?',
  'sh.replace': 'Replace my copy', 'sh.keep': 'Keep mine',

  'c.cancel': 'Cancel', 'c.confirm': 'Confirm', 'c.delete': 'Delete', 'c.close': 'Close', 'c.back': 'Back', 'c.save': 'Save',
  'c.copied': 'Copied to clipboard', 'c.copyFail': 'Could not copy', 'c.vs': 'vs', 'c.yes': 'Yes', 'c.no': 'No', 'c.edit': 'Edit',
  'c.storageError': 'Could not save to browser storage (full or private mode).',
  'c.notFound': 'Page not found', 'c.goHome': 'Back to home', 'c.today': 'today', 'c.yesterday': 'yesterday', 'c.daysAgo': '{n} days ago',
  'c.min': '{n} min', 'c.hm': '{h} h {m} min', 'c.h': '{h} h',
  'c.renderError': 'Something went wrong while showing this page.',
  'c.loadProblem': 'Saved data was damaged — a raw copy was kept and the site started fresh.',

  'form.W': 'W', 'form.D': 'D', 'form.L': 'L', 'form.W.full': 'Win', 'form.D.full': 'Draw', 'form.L.full': 'Loss',
  'n.match': ['match', 'matches'], 'n.goal': ['goal', 'goals'], 'n.round': ['round', 'rounds'],
  'n.tournament': ['tournament', 'tournaments'], 'n.group': ['group', 'groups'], 'n.player': ['player', 'players'],
  'n.win': ['win', 'wins'], 'n.title': ['title', 'titles'],
};

const dicts = { pl, en };
let lang = 'en';
const warned = new Set();

export function setLang(l) {
  lang = dicts[l] ? l : 'en';
  document.documentElement.lang = lang;
}
export const getLang = () => lang;
export const detectLang = () => ((navigator.language || 'en').toLowerCase().startsWith('pl') ? 'pl' : 'en');

export function t(key, params) {
  let s = dicts[lang][key];
  if (s == null) s = dicts.en[key];
  if (s == null) {
    if (!warned.has(key)) { warned.add(key); console.warn('[i18n] missing key:', key); }
    return key;
  }
  if (params) s = s.replace(/\{(\w+)\}/g, (_, k) => (params[k] != null ? params[k] : ''));
  return s;
}

// Plural word only, e.g. tn('n.match', 5) -> "meczów"
export function tn(key, n) {
  const forms = dicts[lang][key] || dicts.en[key];
  if (!Array.isArray(forms)) return key;
  if (lang === 'pl') {
    const n10 = n % 10;
    const n100 = n % 100;
    if (n === 1) return forms[0];
    if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return forms[1];
    return forms[2];
  }
  return n === 1 ? forms[0] : forms[1];
}
// "5 meczów"
export const tc = (key, n) => `${n} ${tn(key, n)}`;

const locale = () => (lang === 'pl' ? 'pl-PL' : 'en-GB');

export function fmtDate(ts, opts = { day: 'numeric', month: 'short', year: 'numeric' }) {
  try { return new Intl.DateTimeFormat(locale(), opts).format(new Date(ts)); } catch { return new Date(ts).toDateString(); }
}

export function fmtRelative(ts) {
  const day = 86400000;
  const start = (d) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const diff = Math.round((start(Date.now()) - start(ts)) / day);
  if (diff === 0) return t('c.today');
  if (diff === 1) return t('c.yesterday');
  if (diff > 1 && diff < 7) return t('c.daysAgo', { n: diff });
  return fmtDate(ts);
}

export function fmtNum(v, digits = 0) {
  return new Intl.NumberFormat(locale(), { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v);
}

export function fmtDuration(min) {
  if (min < 60) return t('c.min', { n: Math.round(min) });
  const total = Math.round(min);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return m ? t('c.hm', { h, m }) : t('c.h', { h });
}

export function defaultTournamentName(ts = Date.now()) {
  const s = fmtDate(ts, { weekday: 'long', day: 'numeric', month: 'short' });
  return s.charAt(0).toUpperCase() + s.slice(1);
}
