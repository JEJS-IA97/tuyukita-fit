import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsIn,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIngredientPurchaseDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ example: 500, description: 'Quantity in the ingredient unit' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty({ example: 50000, description: 'Total cost in VES' })
  @IsNumber()
  @Min(0)
  totalCostVes: number;

  @ApiProperty({ enum: ['BCV', 'USDT'] })
  @IsIn(['BCV', 'USDT'])
  rateType: 'BCV' | 'USDT';

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
