import { Role } from '../../prisma/prisma-client.js'

export interface JwtPayload {
  sub: string; // id de l'utilisateur
  role: Role;
}
