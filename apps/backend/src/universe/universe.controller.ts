import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UniverseService } from './universe.service';
import { CreateUniverseDto } from './dto/create-universe.dto';

@Controller('universes')
export class UniverseController {
  constructor(
    private readonly universeService: UniverseService,
    private readonly configService: ConfigService
  ) {}

  @Get()
  listUniverses() {
    return this.universeService.listUniverses();
  }

  @Post()
  createUniverse(@Headers('x-admin-token') token: string | undefined, @Body() dto: CreateUniverseDto) {
    const adminToken = this.configService.get<string>('adminToken');
    if (!adminToken || token !== adminToken) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.universeService.createUniverse(dto);
  }
}
