import { create } from 'zustand';
import { registerSW } from 'virtual:pwa-register';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PwaState {
  updateReady: boolean;
  installEvent: BeforeInstallPromptEvent | null;
  installed: boolean;
  applyUpdate: () => void;
  install: () => Promise<void>;
}

let updateSW: ((reload?: boolean) => Promise<void>) | null = null;

export const isStandalone = (): boolean =>
  window.matchMedia('(display-mode: standalone)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export const isIosSafari = (): boolean => {
  const ua = navigator.userAgent;
  const ios = /iPad|iPhone|iPod/.test(ua) || (ua.includes('Mac') && navigator.maxTouchPoints > 1);
  return ios && /Safari/.test(ua) && !/CriOS|FxiOS|EdgiOS/.test(ua);
};

export const usePwa = create<PwaState>()((set, get) => ({
  updateReady: false,
  installEvent: null,
  installed: isStandalone(),
  applyUpdate: () => {
    void updateSW?.(true);
  },
  install: async () => {
    const event = get().installEvent;
    if (!event) return;
    await event.prompt();
    const { outcome } = await event.userChoice;
    if (outcome === 'accepted') set({ installEvent: null });
  },
}));

export function initPwa(): void {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    usePwa.setState({ installEvent: e as BeforeInstallPromptEvent });
  });
  window.addEventListener('appinstalled', () => {
    usePwa.setState({ installEvent: null, installed: true });
  });
  updateSW = registerSW({
    onNeedRefresh: () => usePwa.setState({ updateReady: true }),
  });
}
