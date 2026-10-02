import { IsString, IsOptional, IsNumber, IsDateString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateInventoryOutputDto {
  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  movementDate?: string;

  @ApiPropertyOptional({ example: 'Produccion diaria' })
  @IsString()
  @IsOptional()
  reason?: string;
}
