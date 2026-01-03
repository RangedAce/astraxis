import { IsEnum } from 'class-validator';
import { BuildingKey } from '@astraxis/shared';

export class StartBuildingDto {
  @IsEnum(BuildingKey)
  buildingKey!: BuildingKey;
}
