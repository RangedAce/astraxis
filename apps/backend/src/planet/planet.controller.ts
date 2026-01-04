import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PlanetService } from './planet.service';
import { StartBuildingDto } from './dto/start-building.dto';
import { StartShipsDto } from './dto/start-ships.dto';
import { StartResearchDto } from './dto/start-research.dto';
import { UpdateProductionDto } from './dto/update-production.dto';

@Controller()
export class PlanetController {
  constructor(private readonly planetService: PlanetService) {}

  @UseGuards(JwtAuthGuard)
  @Get('universe/:universeId/planet/:planetId/overview')
  overview(@Param('planetId') planetId: string, @Req() req: any) {
    const playerId = req.user.playerId as string;
    return this.planetService.getOverview(playerId, planetId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('planet/:planetId/buildings/start')
  startBuilding(@Param('planetId') planetId: string, @Req() req: any, @Body() dto: StartBuildingDto) {
    const playerId = req.user.playerId as string;
    return this.planetService.startBuilding(playerId, planetId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('planet/:planetId/ships/start')
  startShips(@Param('planetId') planetId: string, @Req() req: any, @Body() dto: StartShipsDto) {
    const playerId = req.user.playerId as string;
    return this.planetService.startShips(playerId, planetId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('planet/:planetId/production')
  updateProduction(
    @Param('planetId') planetId: string,
    @Req() req: any,
    @Body() dto: UpdateProductionDto
  ) {
    const playerId = req.user.playerId as string;
    return this.planetService.updateProductionFactor(playerId, planetId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Post('player/research/start')
  startResearch(@Req() req: any, @Body() dto: StartResearchDto) {
    const playerId = req.user.playerId as string;
    const userId = req.user.userId as string;
    return this.planetService.startResearch(userId, playerId, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('planet/:planetId/queue')
  queue(@Param('planetId') planetId: string, @Req() req: any) {
    const playerId = req.user.playerId as string;
    return this.planetService.listQueue(planetId, playerId);
  }
}
