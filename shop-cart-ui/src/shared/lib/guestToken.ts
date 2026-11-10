import { newUuid } from './uuid';

const GUEST_TOKEN_KEY = 'shopcart_guest_token';

export function getGuestToken(): string {
  let token = localStorage.getItem(GUEST_TOKEN_KEY);
  if (!token) {
    token = newUuid();
    localStorage.setItem(GUEST_TOKEN_KEY, token);
  }
  return token;
}

export function clearGuestToken(): void {
  localStorage.removeItem(GUEST_TOKEN_KEY);
}
