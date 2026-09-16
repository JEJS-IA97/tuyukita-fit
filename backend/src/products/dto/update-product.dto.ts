import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional({ enum: ['USD', 'VES'] })
  @IsEnum(['USD', 'VES'])
  @IsOptional()
  defaultCurrency?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  packageQuantity?: number;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
