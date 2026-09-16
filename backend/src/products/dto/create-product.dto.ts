import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Arepas de Yuca' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ enum: ['USD', 'VES'], default: 'USD' })
  @IsEnum(['USD', 'VES'])
  @IsOptional()
  defaultCurrency?: string;

  @ApiPropertyOptional({ default: 8 })
  @IsNumber()
  @IsOptional()
  packageQuantity?: number;
}
