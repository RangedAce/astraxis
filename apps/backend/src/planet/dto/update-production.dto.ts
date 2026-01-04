import { IsEnum, IsInt, Max, Min } from 'class-validator';
import { BuildingKey } from '@astraxis/shared';

export class UpdateProductionDto {
  @IsEnum(BuildingKey)
  buildingKey!: BuildingKey;

  @IsInt()
  @Min(0)
  @Max(100)
  factor!: number;
}
