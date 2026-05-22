import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service.js";
import { RedisService } from "../../redis/redis.service.js";
import type { JwtPayload } from "../auth.types.js";

const USER_CACHE_TTL_S = 300;

type CachedPayload = Record<string, unknown>;

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
    if (payload.role === "SUPER_ADMIN" || payload.role === "SUPPORT") {
      const cacheKey = `jwt:admin:${payload.sub}`;

      let cached: string | null = null;
      try { cached = await this.redis.get(cacheKey); } catch { /* Redis down */ }
      if (cached) {
        try { return JSON.parse(cached) as CachedPayload; } catch { /* corrupt */ }
      }

      const admin = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, email: true, name: true, role: true },
      });
      if (!admin) throw new UnauthorizedException();
      const result = { ...admin, role: payload.role };
      try { await this.redis.setex(cacheKey, USER_CACHE_TTL_S, JSON.stringify(result)); } catch { /* non-fatal */ }
      return result;
    }

    // CUSTOMER or VENDOR
    const cacheKey = `jwt:user:${payload.sub}`;

    let cached: string | null = null;
    try { cached = await this.redis.get(cacheKey); } catch { /* Redis down */ }
    if (cached) {
      try { return JSON.parse(cached) as CachedPayload; } catch { /* corrupt */ }
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, email: true, phone: true, name: true, isVerified: true },
    });
    if (!user) throw new UnauthorizedException();

    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
      select: { id: true, businessName: true, status: true },
    });

    const result = { ...user, vendor: vendor ?? undefined, role: payload.role };
    try { await this.redis.setex(cacheKey, USER_CACHE_TTL_S, JSON.stringify(result)); } catch { /* non-fatal */ }
    return result;
  }
}
