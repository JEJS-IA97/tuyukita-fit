import { IsString, IsOptional, IsNumber, IsEnum, IsArray, ValidateNested, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class SaleItemDto {
  @ApiProperty()
  @IsString()
  productId: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  flavorId?: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsNumber()
  unitPrice: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  unitProductionCost?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  totalProductionCost?: number;
}

export class CreateSaleDto {
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  saleDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiProperty({ enum: ['USD', 'VES'] })
  @IsEnum(['USD', 'VES'])
  currency: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  exchangeRateId?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  exchangeRateValue?: number;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  discount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  collectedAmount?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;

  @ApiProperty({ type: [SaleItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SaleItemDto)
  items: SaleItemDto[];
}
