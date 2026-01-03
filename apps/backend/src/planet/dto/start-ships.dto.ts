import { IsEnum, IsInt, Min } from 'class-validator';
import { ShipKey } from '@astraxis/shared';

export class StartShipsDto {
  @IsEnum(ShipKey)
  shipKey!: ShipKey;

  @IsInt()
  @Min(1)
  qty!: number;
}
