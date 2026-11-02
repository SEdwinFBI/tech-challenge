import { randomBytes } from 'node:crypto';

const VIDA_MS = 30_000;
const tickets = new Map<string, number>();

export function issueStreamTicket(now = Date.now()): { ticket: string; expiraEnSegundos: number } {
  for (const [ticket, expira] of tickets) {
    if (expira <= now) tickets.delete(ticket);
  }
  const ticket = randomBytes(24).toString('hex');
  tickets.set(ticket, now + VIDA_MS);
  return { ticket, expiraEnSegundos: VIDA_MS / 1000 };
}

export function consumeStreamTicket(ticket: string, now = Date.now()): boolean {
  const expira = tickets.get(ticket);
  tickets.delete(ticket);
  return expira !== undefined && expira > now;
}
