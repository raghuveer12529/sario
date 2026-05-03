import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerModule } from "@nestjs/throttler";
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
import { AdminProductController } from "./catalog/admin-product.controller.js";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
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
  ],
  controllers: [AppController, AdminProductController],
  providers: [AppService],
})
export class AppModule {}
