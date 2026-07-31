import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { TerminusModule } from "@nestjs/terminus";
import { ScheduleModule } from "@nestjs/schedule";
import { AppController } from "./app.controller.js";
import { AppService } from "./app.service.js";
import { PrismaModule } from "./prisma/prisma.module.js";
import { RedisModule } from "./redis/redis.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { VendorModule } from "./vendor/vendor.module.js";
import { CatalogModule } from "./catalog/catalog.module.js";
import { StorefrontModule } from "./storefront/storefront.module.js";
import { CartModule } from "./cart/cart.module.js";
import { CheckoutModule } from "./checkout/checkout.module.js";
import { OrderModule } from "./order/order.module.js";
import { ReturnsModule } from "./returns/returns.module.js";
import { NotificationModule } from "./notification/notification.module.js";
import { AdminModule } from "./admin/admin.module.js";
import { AdminProductController } from "./catalog/admin-product.controller.js";
import { QueueModule } from "./queue/queue.module.js";
import { validateEnv } from "./config/env.validation.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnv }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TerminusModule,
    PrismaModule,
    RedisModule,
    NotificationModule,
    AuthModule,
    VendorModule,
    CatalogModule,
    StorefrontModule,
    CartModule,
    CheckoutModule,
    OrderModule,
    ReturnsModule,
    AdminModule,
    QueueModule,
  ],
  controllers: [AppController, AdminProductController],
  providers: [
    AppService,
    // Global rate limiting (100 req/min default). Tighter per-route limits live on
    // auth/checkout/refund handlers via @Throttle.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
