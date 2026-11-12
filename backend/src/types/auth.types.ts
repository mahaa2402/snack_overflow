import { Role } from '@prisma/client';

export interface JwtUserPayload {
  userId: string;
  role: Role;
  email: string;
}

export interface UserResponseDto {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}

export interface AuthResponseDto {
  user: UserResponseDto;
  token: string;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface SignupDto {
  name: string;
  email: string;
  password: string;
  role?: unknown; // Explicitly handled to prevent privilege escalation
}

