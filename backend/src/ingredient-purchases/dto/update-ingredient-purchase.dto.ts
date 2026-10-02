import { IsNumber, IsOptional, IsString, IsDateString, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateIngredientPurchaseDto {
  @ApiPropertyOptional({ example: 400 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: 44000, description: 'Total cost in VES' })
  @IsNumber()
  @Min(0)
  @IsOptional()
  totalCostVes?: number;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
