import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from "@nestjs/platform-fastify";
import { ValidationPipe, VersioningType } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "@fastify/helmet";
import { AppModule } from "./app.module.js";

// BigInt fields (e.g. monthlyGmvPaise on Vendor) are not JSON-serializable by default.
// Serialize as string to avoid precision loss on large paise values.
(BigInt.prototype as unknown as { toJSON: () => string }).toJSON = function () {
  return this.toString();
};

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: true }),
  );

  // Security
  await app.register(helmet as never, { crossOriginResourcePolicy: false });
  app.enableCors({
    origin: process.env["ALLOWED_ORIGINS"]?.split(",") ?? ["http://localhost:3000"],
    credentials: true,
  });

  // Versioning
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: "1" });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Swagger (dev only)
  if (process.env["NODE_ENV"] !== "production") {
    const config = new DocumentBuilder()
      .setTitle("Sario API")
      .setDescription("Multi-vendor saree marketplace API")
      .setVersion("1.0")
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("docs", app, document);
  }

  const port = process.env["PORT"] ?? 4000;
  await app.listen(port, "0.0.0.0");
  console.log(`API running on http://localhost:${port}`);
  console.log(`Swagger docs: http://localhost:${port}/docs`);
}

bootstrap().catch(console.error);
