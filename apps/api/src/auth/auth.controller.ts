import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth, ApiProperty } from "@nestjs/swagger";
import { Throttle } from "@nestjs/throttler";
import { IsEmail, IsString, MinLength } from "class-validator";
import { AuthService } from "./auth.service.js";
import { LoginDto } from "./dto/login.dto.js";
import { RegisterDto } from "./dto/register.dto.js";
import { RefreshDto } from "./dto/refresh.dto.js";
import { UpdateProfileDto } from "./dto/update-profile.dto.js";
import { JwtAuthGuard } from "./guards/jwt-auth.guard.js";
import { CurrentUser, type CurrentUserPayload } from "./decorators/current-user.decorator.js";

// OTP_DISABLED — imports kept for when OTP is re-enabled
// import { RequestOtpDto } from "./dto/request-otp.dto.js";
// import { VerifyOtpDto } from "./dto/verify-otp.dto.js";

class AdminLoginDto {
  @ApiProperty({ example: "admin@sario.in" })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: "Admin@sario1" })
  @IsString()
  @MinLength(6)
  password!: string;
}

class DevLoginDto {
  @ApiProperty({ example: "+919876543210" })
  @IsString()
  phone!: string;
}

@ApiTags("Auth")
@Controller({ path: "auth", version: "1" })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current user profile" })
  getMe(@CurrentUser() user: CurrentUserPayload) {
    return this.authService.getMe(user.id);
  }

  @Patch("me")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update current user profile" })
  updateMe(@CurrentUser() user: CurrentUserPayload, @Body() dto: UpdateProfileDto) {
    return this.authService.updateMe(user.id, dto);
  }

  @Post("register")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Customer registration — email + password" })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password);
  }

  @Post("login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Customer email + password login" })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto.email, dto.password);
  }

  @Post("vendor/login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Vendor email + password login — requires existing vendor record" })
  vendorLogin(@Body() dto: LoginDto) {
    return this.authService.vendorLogin(dto.email, dto.password);
  }

  @Post("admin/login")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Admin email + password login — returns JWT with SUPER_ADMIN or SUPPORT role" })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto.email, dto.password);
  }

  @Post("refresh")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exchange a refresh token for a new token pair" })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Revoke the current refresh token" })
  logout(@CurrentUser() user: CurrentUserPayload, @Body() dto: RefreshDto) {
    return this.authService.logout(user.id, dto.refreshToken);
  }

  @Post("dev")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "[DEV ONLY] Instantly get tokens for a phone — no OTP required" })
  devLogin(@Body() dto: DevLoginDto) {
    return this.authService.devLogin(dto.phone);
  }

  // OTP_DISABLED — uncomment to re-enable OTP flow
  // @Post("otp/request")
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: "Request an OTP to the given phone number" })
  // requestOtp(@Body() dto: RequestOtpDto) {
  //   return this.authService.requestOtp(dto.phone, dto.purpose);
  // }

  // @Post("otp/verify")
  // @HttpCode(HttpStatus.OK)
  // @ApiOperation({ summary: "Verify OTP and receive access + refresh tokens" })
  // verifyOtp(@Body() dto: VerifyOtpDto) {
  //   return this.authService.verifyOtp(dto.phone, dto.otp, dto.purpose);
  // }
}
