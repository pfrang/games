import type { Player, Lobby } from '@games/db/types';
export type PlayerCookie = Player & Pick<Lobby, 'roomCode'>;
