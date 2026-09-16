import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePackagingDto {
  @ApiProperty({ example: 'Bolsa para arepas' })
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: 'unit' })
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
