// Shared by TeamAccordionSection.tsx (homepage) and AboutTeamSection.tsx
// (About page). Mock data, not `useTeam()` — Team.avatarUrl always goes
// through the backend's `getSecureDownloadUrl()` signing step
// (teamMember.controller.ts), which for LocalStorageProvider always
// rewrites to a `/uploads/...` path regardless of the stored value, and
// that route is closed off server-side (known, undocumented-fix backend
// bug). These 9 portraits live in `frontend/public/` and are served
// directly from the frontend's own origin, so referencing them here avoids
// that broken path entirely without touching backend code.
export interface TeamMember {
  id: string;
  name: string;
  role: string;
  file: string;
}

// Fezail is kept at the exact center (index 4 of 9) — see TeamAccordionSection.
export const TEAM: TeamMember[] = [
  { id: 'abdurrahman', name: 'Abdurrahman Mustafa', role: 'Qrafik Dizayner', file: 'Abdurrahman.png' },
  { id: 'fatime', name: 'Fatimə Məmmədli', role: 'Kontent Menecer', file: 'Fatime.png' },
  { id: 'firuze', name: 'Firuzə Zəkəriyyə', role: 'Əsas Dizayner', file: 'Firuze.png' },
  { id: 'mahir', name: 'Mahir Əzizov', role: 'Çəkiliş Rəhbəri', file: 'Mahir.png' },
  { id: 'fezail', name: 'Fəzail Zəkəriyyə', role: 'Kontent Rəhbəri', file: 'Fezail.png' },
  { id: 'nermin', name: 'Nərmin Zeynalova', role: 'Menecer', file: 'Nermin.png' },
  { id: 'nurlan', name: 'Nurlan Əhmədov', role: 'Qrafik Dizayner', file: 'Nurlan.png' },
  { id: 'sura', name: 'Şura Ağabəyli', role: 'Video Redaktor', file: 'Sura.png' },
  { id: 'xan', name: 'Xan Cəlilov', role: 'Videoqraf', file: 'Xan.png' },
];
