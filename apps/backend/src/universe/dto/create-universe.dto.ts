import { IsBoolean, IsInt, IsNotEmpty, Min } from 'class-validator';

export class CreateUniverseDto {
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(1)
  speedFleet!: number;

  @IsInt()
  @Min(1)
  speedBuild!: number;

  @IsInt()
  @Min(1)
  speedResearch!: number;

  @IsInt()
  @Min(1)
  speedProduction!: number;

  @IsInt()
  @Min(1)
  maxSystems!: number;

  @IsInt()
  @Min(1)
  maxPositions!: number;

  @IsBoolean()
  isPeacefulDefault!: boolean;
}
