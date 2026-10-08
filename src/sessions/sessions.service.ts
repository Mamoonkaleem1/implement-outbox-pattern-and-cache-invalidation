import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class SessionsService {
  constructor(private readonly prisma: PrismaService) {}

  async createSession(userId: string, expiresAt: Date) {
    const refreshToken = randomBytes(64).toString('hex');

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    const session = await this.prisma.session.create({
      data: {
        userId,
        refreshTokenHash,
        expiresAt,
      },
    });

    return {
      session,
      refreshToken,
    };
  }

  async findActiveSessionByRefreshToken(refreshToken: string) {
    const [sessionId, secret] = refreshToken.split('.');

    // Invalid token format
    if (!sessionId || !secret) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Find session
    const session = await this.prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        user: true,
      },
    });

    // Session doesn't exist
    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Session was revoked
    if (session.revokedAt) {
      throw new UnauthorizedException('Session has been revoked');
    }

    // Session expired
    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException('Refresh token expired');
    }

    // Compare provided secret with stored hash
    const isValid = await bcrypt.compare(secret, session.refreshTokenHash);

    if (!isValid) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    return session;
  }

  /**
   * Revoke a single session.
   */
  async revokeSession(sessionId: string) {
    return this.prisma.session.updateMany({
      where: {
        id: sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Revoke all active sessions belonging to a user.
   */
  async revokeAllSessions(userId: string) {
    return this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  /**
   * Get a session by ID.
   */
  async getSessionById(sessionId: string) {
    return this.prisma.session.findUnique({
      where: {
        id: sessionId,
      },
      include: {
        user: true,
      },
    });
  }

  /**
   * Generate a unique session ID.
   */
  private generateSessionId() {
    return randomBytes(32).toString('hex');
  }

  /**
   * Generate the secret portion of the refresh token.
   */
  private generateSecret() {
    return randomBytes(64).toString('hex');
  }
}
