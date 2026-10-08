import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { error } from 'console';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private logger = new Logger(JwtAuthGuard.name);
  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Authorization header missing.');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization header....');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);
      // this.logger.log('payload ...', payload);

      const session = await this.prisma.session.findUnique({
        where: {
          id: payload.sessionId,
        },
        include: {
          user: true,
        },
      });

      if (!session) {
        throw new UnauthorizedException('Session not found.');
      }

      if (session.revokedAt) {
        throw new UnauthorizedException('Session revoked.');
      }

      if (session.expiresAt < new Date()) {
        throw new UnauthorizedException('Session expired.');
      }

      if (!session.user.isActive) {
        throw new UnauthorizedException('User is inactive.');
      }

      request.user = {
        id: session.user.id,
        email: session.user.email,
        sessionId: session.id,
      };

      return true;
    } catch (error) {
      this.logger.log('err in validating token..', error);
      throw new UnauthorizedException('Invalid access token.');
    }
  }
}
