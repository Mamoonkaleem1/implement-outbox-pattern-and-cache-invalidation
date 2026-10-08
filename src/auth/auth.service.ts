import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

import { SessionsService } from '../sessions/sessions.service';
import { UsersService } from '../users/users.service';

import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterDto } from './dto/register.dto';

import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly sessionsService: SessionsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}
  async register(registerDto: RegisterDto) {
    const existingUser = await this.usersService.findByEmail(registerDto.email);

    if (existingUser) {
      throw new ConflictException('Email already exists.');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 12);

    const user = await this.usersService.create({
      ...registerDto,
      password: hashedPassword,
    });

    const { password: _password, ...safeUser } = user;

    return {
      success: true,
      message: 'User registered successfully.',
      data: {
        user: safeUser,
      },
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.usersService.findByEmail(loginDto.email);

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const { password: _password, ...safeUser } = user;

    const refreshTokenExpiresAt = this.getRefreshTokenExpiry();

    // Create session first
    const { session, refreshToken } = await this.sessionsService.createSession(
      user.id,
      refreshTokenExpiresAt,
    );

    // Generate access token with sessionId
    const accessToken = await this.generateAccessToken(
      user.id,
      user.email,
      session.id,
    );

    return {
      success: true,
      message: 'Login successful.',
      data: {
        user: safeUser,
        accessToken,
        refreshToken,
      },
    };
  }
  async refresh(refreshTokenDto: RefreshTokenDto) {
    const session = await this.sessionsService.findActiveSessionByRefreshToken(
      refreshTokenDto.refreshToken,
    );

    if (!session) {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }

    await this.sessionsService.revokeSession(session.id);

    /*
     * Create a completely new refresh token/session.
     */
    const refreshTokenExpiresAt = this.getRefreshTokenExpiry();

    const newRefreshToken = await this.sessionsService.createSession(
      session.userId,
      refreshTokenExpiresAt,
    );

    /*
     * Generate new access token.
     */
    const accessToken = await this.generateAccessToken(
      session.user.id,
      session.user.email,
      session.id,
    );

    const { password: _password, ...safeUser } = session.user;

    return {
      success: true,
      message: 'Tokens refreshed successfully.',
      data: {
        user: safeUser,
        accessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  // =========================================================
  // LOGOUT
  // =========================================================

  async logout(refreshTokenDto: RefreshTokenDto) {
    const session = await this.sessionsService.findActiveSessionByRefreshToken(
      refreshTokenDto.refreshToken,
    );

    if (!session) {
      throw new NotFoundException('Session not found.');
    }

    await this.sessionsService.revokeSession(session.id);

    return {
      success: true,
      message: 'Logged out successfully.',
      data: null,
    };
  }

  // =========================================================
  // LOGOUT ALL DEVICES
  // =========================================================

  async logoutAll(userId: string) {
    await this.sessionsService.revokeAllSessions(userId);

    return {
      success: true,
      message: 'All sessions revoked successfully.',
      data: null,
    };
  }

  // =========================================================
  // ACCESS TOKEN
  // =========================================================

  private async generateAccessToken(
    userId: string,
    email: string,
    sessionId: string,
  ) {
    const payload: JwtPayload = {
      sub: userId,
      email,
      sessionId,
    };

    return this.jwtService.signAsync(payload, {
      secret:
        this.configService.get<string>('JWT_ACCESS_SECRET') ?? 'access-secret',

      expiresIn: (this.configService.get<string>('JWT_ACCESS_EXPIRES_IN') ??
        '15m') as never,
    });
  }

  // =========================================================
  // REFRESH TOKEN EXPIRATION
  // =========================================================

  private getRefreshTokenExpiry() {
    const expiresIn =
      this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d';

    /*
     * For now our default is 7 days.
     *
     * We can improve this later and parse values like:
     * 7d, 30d, 12h, etc.
     */
    if (expiresIn === '7d') {
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }

    return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  }
}
