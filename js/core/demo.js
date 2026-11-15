// Demo data: real tournaments played through the engine with simulated (random) scores.
// Everything created here is flagged `demo: true` so it can be removed in one click.
import { createTournament, applyResult, upcomingMatches, needsWinner } from './formats.js';
import { commit, getDB } from './store.js';
import { defaultTournamentName } from './i18n.js';
import { uid } from './util.js';

const DEMO_PLAYERS = [
  { name: 'Kuba', emoji: '🦁', color: 4, club: 'Real Madrid', skill: 1.45 },
  { name: 'Bartek', emoji: '⚡', color: 3, club: 'FC Barcelona', skill: 1.3 },
  { name: 'Ola', emoji: '🦊', color: 2, club: 'Arsenal', skill: 1.25 },
  { name: 'Michał', emoji: '', color: 0, club: 'Legia Warszawa', skill: 1.1 },
  { name: 'Wojtek', emoji: '🐺', color: 7, club: 'Bayern', skill: 1.0 },
  { name: 'Kasia', emoji: '🔥', color: 6, club: 'Liverpool', skill: 0.95 },
  { name: 'Tomek', emoji: '🤖', color: 9, club: 'Inter', skill: 0.85 },
  { name: 'Piotrek', emoji: '', color: 1, club: 'Lech Poznań', skill: 0.8 },
];

function poisson(lambda) {
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function simulate(m, skill) {
  const sh = skill[m.home];
  const sa = skill[m.away];
  const r = { hg: Math.min(9, poisson(1.45 * (sh / sa))), ag: Math.min(9, poisson(1.25 * (sa / sh))) };
  if (needsWinner(m) && r.hg === r.ag) {
    const homeWins = Math.random() < sh / (sh + sa);
    const loserPens = 2 + Math.floor(Math.random() * 3);
    r.hp = homeWins ? loserPens + 1 : loserPens;
    r.ap = homeWins ? loserPens : loserPens + 1;
  }
  return r;
}

export function loadDemo() {
  const now = Date.now();
  const day = 86400000;
  const players = DEMO_PLAYERS.map((p) => ({ id: uid('p'), name: p.name, emoji: p.emoji, color: p.color, club: p.club, createdAt: now - 40 * day, demo: true }));
  const skill = Object.fromEntries(players.map((p, i) => [p.id, DEMO_PLAYERS[i].skill]));
  const ids = players.map((p) => p.id);
  const tours = [];
  const play = (format, pids, opts, start, limit = Infinity) => {
    const tour = createTournament({ name: defaultTournamentName(start), format, playerIds: pids, opts, now: start });
    tour.demo = true;
    for (let k = 0; k < limit; k++) {
      const m = upcomingMatches(tour)[0];
      if (!m) break;
      applyResult(tour, m.id, simulate(m, skill), start + (k + 1) * 12 * 60000);
    }
    tours.push(tour);
  };
  const sunday = (weeksAgo) => {
    const d = new Date(now - weeksAgo * 7 * day);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(19, 0, 0, 0);
    return d.getTime();
  };
  play('league', ids.slice(0, 6), { legs: 1 }, sunday(4));
  play('knockout', ids, { thirdPlace: true, seeding: 'random' }, sunday(3));
  play('groups', ids, { groups: 2, advance: 2, legs: 1, thirdPlace: false }, sunday(2));
  play('swiss', ids.slice(0, 7), { rounds: 4 }, sunday(1));
  // Tonight: a league in progress.
  play('league', [ids[0], ids[1], ids[2], ids[4], ids[5], ids[7]], { legs: 1 }, now - 2 * 3600000, 8);
  commit((d) => { d.players.push(...players); d.tournaments.push(...tours); }, { type: 'demo' });
}

export const hasDemo = () => getDB().players.some((p) => p.demo) || getDB().tournaments.some((x) => x.demo);

export function removeDemo() {
  commit((d) => {
    d.tournaments = d.tournaments.filter((x) => !x.demo);
    const used = new Set(d.tournaments.flatMap((x) => x.players));
    d.players = d.players.filter((p) => !p.demo || used.has(p.id));
  }, { type: 'demo-remove' });
}
