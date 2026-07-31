import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ACCESS_TOKEN_TTL } from "@sario/shared";
import { AuthController } from "./auth.controller.js";
import { MeController } from "./me.controller.js";
import { AuthService } from "./auth.service.js";
import { PrismaModule } from "../prisma/prisma.module.js";
import { JwtStrategy } from "./strategies/jwt.strategy.js";
import { Msg91Module } from "../msg91/msg91.module.js";
import { RedisModule } from "../redis/redis.module.js";

@Module({
  imports: [
    PassportModule,
    Msg91Module,
    RedisModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>("JWT_SECRET"),
        signOptions: { expiresIn: ACCESS_TOKEN_TTL },
      }),
    }),
  ],
  controllers: [AuthController, MeController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
