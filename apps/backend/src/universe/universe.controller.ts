import { Body, Controller, Get, Headers, Param, Post, Put, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UniverseService } from './universe.service';
import { CreateUniverseDto } from './dto/create-universe.dto';
import { UpdateUniverseDto } from './dto/update-universe.dto';

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

  @Put(':id')
  updateUniverse(
    @Headers('x-admin-token') token: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateUniverseDto
  ) {
    const adminToken = this.configService.get<string>('adminToken');
    if (!adminToken || token !== adminToken) {
      throw new UnauthorizedException('Unauthorized');
    }
    return this.universeService.updateUniverse(id, dto);
  }
}
