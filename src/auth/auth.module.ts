import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { AuthController } from './controllers/auth.controller';
import { FirebaseModule } from './firebase/firebase.module';
import { AuthService } from './services/auth.service';
import { SessionService } from './services/session.service';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [UsersModule, FirebaseModule],
  controllers: [AuthController],
  providers: [AuthService, SessionService, FirebaseAuthGuard, RolesGuard],
  exports: [
    AuthService,
    SessionService,
    FirebaseModule,
    FirebaseAuthGuard,
    RolesGuard,
    UsersModule,
  ],
})
export class AuthModule {}
