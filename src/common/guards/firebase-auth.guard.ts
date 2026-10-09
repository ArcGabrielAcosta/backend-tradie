import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FirebaseAuthService } from '../../auth/firebase/firebase-auth.service';
import { SessionService } from '../../auth/services/session.service';
import { UsersService } from '../../users/services/users.service';
import { UserStatus } from '../../users/enums/user-status.enum';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthenticatedUser } from '../interfaces/authenticated-request.interface';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly firebaseAuth: FirebaseAuthService,
    private readonly sessionService: SessionService,
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<{
      headers: { authorization?: string };
      user?: AuthenticatedUser;
    }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const idToken = header.slice('Bearer '.length).trim();
    if (!idToken) {
      throw new UnauthorizedException('Missing bearer token');
    }

    const verified = await this.firebaseAuth.verifyIdToken(idToken);
    let user = await this.sessionService.getCachedSession(verified.uid);

    if (!user) {
      const entity = await this.usersService.findByFirebaseUid(verified.uid);
      if (!entity) {
        throw new UnauthorizedException('User is not registered in Tradie');
      }
      await this.sessionService.cacheUserSession(entity);
      user = {
        id: String(entity.id),
        firebaseUid: entity.firebaseUid ?? verified.uid,
        email: entity.email,
        role: entity.role,
        status: entity.status,
        fullName: entity.fullName,
      };
    }

    if (user.status === UserStatus.SUSPENDIDO) {
      throw new ForbiddenException({
        message: 'Account suspended',
        code: 'ACCOUNT_SUSPENDED',
      });
    }

    if (user.status === UserStatus.BLOQUEADO) {
      throw new ForbiddenException({
        message: 'Account locked',
        code: 'ACCOUNT_LOCKED',
      });
    }

    request.user = user;
    return true;
  }
}
