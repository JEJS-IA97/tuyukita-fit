import { IsNumber, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RegisterPurchaseDto {
  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  unitCost: number;

  @ApiProperty({ enum: ['USD', 'VES'] })
  @IsEnum(['USD', 'VES'])
  currency: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  exchangeRateId?: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  purchaseDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
