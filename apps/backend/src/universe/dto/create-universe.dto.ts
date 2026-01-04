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

  @IsBoolean()
  isPeacefulDefault!: boolean;
}
