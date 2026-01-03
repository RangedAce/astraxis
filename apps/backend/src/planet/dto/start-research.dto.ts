import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ResearchKey } from '@astraxis/shared';

export class StartResearchDto {
  @IsEnum(ResearchKey)
  techKey!: ResearchKey;

  @IsOptional()
  @IsString()
  planetId?: string;
}
