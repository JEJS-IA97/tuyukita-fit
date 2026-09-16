import { IsString, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateExpenseDto {
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expenseDate?: string;

  @ApiProperty({ enum: ['INGREDIENTS', 'PACKAGING', 'PRODUCTION', 'TRANSPORTATION', 'ELECTRICITY', 'WATER', 'GAS', 'RENT', 'MARKETING', 'EQUIPMENT', 'MAINTENANCE', 'COMMISSIONS', 'TAXES', 'OTHER'] })
  @IsEnum(['INGREDIENTS', 'PACKAGING', 'PRODUCTION', 'TRANSPORTATION', 'ELECTRICITY', 'WATER', 'GAS', 'RENT', 'MARKETING', 'EQUIPMENT', 'MAINTENANCE', 'COMMISSIONS', 'TAXES', 'OTHER'])
  category: string;

  @ApiProperty({ example: 'Compra de yuca' })
  @IsString()
  description: string;

  @ApiProperty()
  @IsNumber()
  amount: number;

  @ApiPropertyOptional({ default: 0 })
  @IsNumber()
  @IsOptional()
  paidAmount?: number;

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

  @ApiPropertyOptional({ enum: ['CASH', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'ZELLE', 'BINANCE_USDT', 'CARD', 'OTHER'] })
  @IsEnum(['CASH', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'ZELLE', 'BINANCE_USDT', 'CARD', 'OTHER'])
  @IsOptional()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  supplierName?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
