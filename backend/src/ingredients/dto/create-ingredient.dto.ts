import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIngredientDto {
  @ApiProperty({ example: 'Yuca' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'kg' })
  @IsString()
  unit: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  currentCost?: number;

  @ApiPropertyOptional({ enum: ['USD', 'VES'], default: 'USD' })
  @IsEnum(['USD', 'VES'])
  @IsOptional()
  currency?: string;
}
