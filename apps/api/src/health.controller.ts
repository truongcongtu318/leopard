import { Controller, Get } from "@nestjs/common";
import { roles } from "@leopard/shared";

@Controller("health")
export class HealthController {
  @Get()
  check() {
    return {
      status: "ok",
      service: "leopard-api",
      roles
    };
  }
}
