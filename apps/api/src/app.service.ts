import { Injectable } from "@nestjs/common";
import { APP_NAME } from "@sario/shared";

@Injectable()
export class AppService {
  getInfo() {
    return { name: APP_NAME, version: "1.0.0" };
  }
}
