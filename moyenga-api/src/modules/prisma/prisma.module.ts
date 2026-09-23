import { Module } from "@nestjs/common";
import { PrismaService } from "./services/prisma/prisma.service.js";


@Module({
  providers: [PrismaService]
})
export class PrismaModule {}
