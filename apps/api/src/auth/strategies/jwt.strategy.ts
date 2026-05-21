import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RedisService } from "../../redis/redis.service.js";
import type { JwtPayload } from "../auth.types.js";

const USER_CACHE_TTL_S = 300;

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.role === "admin") {
      const cacheKey = `jwt:admin:${payload.sub}`;
      const cached = await this.redis.get(cacheKey);
      if (cached) return JSON.parse(cached) as object;

      const admin = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, email: true, name: true, role: true },
      });
      if (!admin) throw new UnauthorizedException();
      const result = { ...admin, role: "admin" as const };
      await this.redis.setex(cacheKey, USER_CACHE_TTL_S, JSON.stringify(result));
      return result;
    }

    const cacheKey = `jwt:user:${payload.sub}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as object;

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, phone: true, name: true, isVerified: true },
    });
    if (!user) throw new UnauthorizedException();

    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
      select: { id: true, businessName: true, status: true },
    });

    const result = { ...user, vendor: vendor ?? undefined };
    await this.redis.setex(cacheKey, USER_CACHE_TTL_S, JSON.stringify(result));
    return result;
  }
}
