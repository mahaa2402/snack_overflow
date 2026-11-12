import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service';
import { sendSuccess } from '../utils/apiResponse';
import { config } from '../config/env';

// Cookie options for secure token storage
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: config.nodeEnv === 'production',
  sameSite: (config.nodeEnv === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in ms
  path: '/',
};

export class AuthController {
  /**
   * POST /auth/login
   */
  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.login(req.body);

      // Set HttpOnly cookie for enhanced security
      res.cookie('token', result.token, COOKIE_OPTIONS);

      sendSuccess(res, result, 'Login successful', 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/signup
   */
  public signup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await authService.signup(req.body);

      // Automatically sign in the user by setting the token cookie
      res.cookie('token', result.token, COOKIE_OPTIONS);

      sendSuccess(res, result, 'Account created successfully', 201);
    } catch (error) {
      next(error);
    }
  };

  /**
   * POST /auth/logout
   */
  public logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.clearCookie('token', {
        httpOnly: true,
        secure: config.nodeEnv === 'production',
        sameSite: (config.nodeEnv === 'production' ? 'strict' : 'lax') as 'strict' | 'lax',
        path: '/',
      });

      sendSuccess(res, null, 'Logged out successfully', 200);
    } catch (error) {
      next(error);
    }
  };

  /**
   * GET /auth/me
   */
  public getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const user = await authService.getCurrentUser(req.user!.userId);
      sendSuccess(res, { user }, 'User profile retrieved', 200);
    } catch (error) {
      next(error);
    }
  };
}

export const authController = new AuthController();

