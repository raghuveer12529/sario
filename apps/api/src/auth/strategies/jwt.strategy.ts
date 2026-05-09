import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { PrismaService } from "../../prisma/prisma.service.js";
import type { JwtPayload } from "../auth.types.js";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_SECRET"),
    });
  }

  async validate(payload: JwtPayload) {
    if (payload.role === "admin") {
      const admin = await this.prisma.adminUser.findUnique({
        where: { id: payload.sub, deletedAt: null },
        select: { id: true, email: true, name: true, role: true },
      });
      if (!admin) throw new UnauthorizedException();
      return { ...admin, role: "admin" as const };
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, phone: true, name: true, isVerified: true },
    });

    if (!user) throw new UnauthorizedException();

    const vendor = await this.prisma.vendor.findUnique({
      where: { userId: user.id },
      select: { id: true, businessName: true, status: true },
    });

    return { ...user, vendor: vendor ?? undefined };
  }
}
