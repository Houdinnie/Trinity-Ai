// Guest auth - generates a persistent anonymous ID for Firestore operations
// No login required, data persists in localStorage

const GUEST_ID_KEY = 'trinity_guest_id';
const GUEST_PROFILE_KEY = 'trinity_guest_profile';

function generateGuestId(): string {
  return 'guest_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

export function getGuestId(): string {
  let guestId = localStorage.getItem(GUEST_ID_KEY);
  if (!guestId) {
    guestId = generateGuestId();
    localStorage.setItem(GUEST_ID_KEY, guestId);
  }
  return guestId;
}

export function getGuestProfile(): any {
  const stored = localStorage.getItem(GUEST_PROFILE_KEY);
  if (stored) return JSON.parse(stored);
  
  const guestId = getGuestId();
  const profile = {
    uid: guestId,
    email: 'guest@trinity.local',
    displayName: 'Guest Trader',
    photoURL: '',
    createdAt: new Date().toISOString(),
    riskTolerance: 'MODERATE',
    experienceLevel: 'BEGINNER',
    tradingGoal: 'GROWTH',
    aiSettings: {
      breakoutSensitivity: 50,
      reversalSensitivity: 50,
      anomalySensitivity: 50
    }
  };
  localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(profile));
  return profile;
}

export function updateGuestProfile(updates: any) {
  const current = getGuestProfile();
  const updated = { ...current, ...updates };
  localStorage.setItem(GUEST_PROFILE_KEY, JSON.stringify(updated));
  return updated;
}

// Mock user object that mirrors Firebase User shape
export function getGuestUser() {
  return {
    uid: getGuestId(),
    email: 'guest@trinity.local',
    displayName: 'Guest Trader',
    photoURL: '',
    isGuest: true
  };
}
