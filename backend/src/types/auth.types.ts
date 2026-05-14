import { Role } from '@prisma/client';

export interface JwtPayload {
  id: string;
  email: string;
  role: Role;
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
  role?: Role;
  packageId?: string;
}

export interface LoginBody {
  email: string;
  password: string;
}
