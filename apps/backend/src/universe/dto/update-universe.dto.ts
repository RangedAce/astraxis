import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class UpdateUniverseDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  speedFleet?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  speedBuild?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  speedResearch?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  speedProduction?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxSystems?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  maxPositions?: number;

  @IsOptional()
  @IsBoolean()
  isPeacefulDefault?: boolean;
}
