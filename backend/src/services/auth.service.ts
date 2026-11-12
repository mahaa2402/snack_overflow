import { Role, User } from '@prisma/client';
import prisma from '../config/database';
import { AuthResponseDto, LoginDto, SignupDto, UserResponseDto } from '../types/auth.types';
import { AppError } from '../utils/customError';
import { generateToken } from '../utils/jwt';
import { comparePassword, hashPassword } from '../utils/password';

export class AuthService {
  /**
   * Helper to strip sensitive fields (such as hashed password) from User entity
   */
  public sanitizeUser(user: User): UserResponseDto {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    };
  }

  /**
   * Register a new MEMBER user
   * Role is strictly enforced to MEMBER; public ADMIN registration is strictly disallowed.
   */
  public async signup(dto: SignupDto): Promise<AuthResponseDto> {
    const { name, email, password } = dto;

    // Input validations
    if (!name || typeof name !== 'string' || name.trim().length < 2) {
      throw new AppError('Name must be at least 2 characters long', 400, 'VALIDATION_ERROR');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim())) {
      throw new AppError('A valid email address is required', 400, 'VALIDATION_ERROR');
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      throw new AppError('Password must be at least 6 characters long', 400, 'VALIDATION_ERROR');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Check for duplicate email
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError('Email is already registered', 409, 'EMAIL_ALREADY_EXISTS');
    }

    // Hash password with bcrypt
    const hashedPassword = await hashPassword(password);

    // Enforce MEMBER role - Never allow public selection of ADMIN role
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        role: Role.MEMBER, // ALWAYS MEMBER
      },
    });

    // Generate JWT token
    const token = generateToken({
      userId: newUser.id,
      role: newUser.role,
      email: newUser.email,
    });

    return {
      user: this.sanitizeUser(newUser),
      token,
    };
  }

  /**
   * Login user with email and password
   */
  public async login(dto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = dto;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      throw new AppError('Email and password are required', 400, 'VALIDATION_ERROR');
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Find user in database
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      // Use uniform message for security to prevent account enumeration
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Verify password hash
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
    }

    // Generate JWT token
    const token = generateToken({
      userId: user.id,
      role: user.role,
      email: user.email,
    });

    return {
      user: this.sanitizeUser(user),
      token,
    };
  }

  /**
   * Get current authenticated user profile
   */
  public async getCurrentUser(userId: string): Promise<UserResponseDto> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('User not found', 404, 'USER_NOT_FOUND');
    }

    return this.sanitizeUser(user);
  }
}

export const authService = new AuthService();

