import { IsString, IsOptional, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdatePackagingDto {
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
  unit?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  currentCost?: number;

  @ApiPropertyOptional({ enum: ['USD', 'VES'] })
  @IsEnum(['USD', 'VES'])
  @IsOptional()
  currency?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
