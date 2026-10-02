import { IsString, IsNumber, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateExpenseDto {
  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expenseDate?: string;

  @ApiPropertyOptional({ enum: ['INGREDIENTS', 'PACKAGING', 'PRODUCTION', 'TRANSPORTATION', 'ELECTRICITY', 'WATER', 'GAS', 'RENT', 'MARKETING', 'EQUIPMENT', 'MAINTENANCE', 'COMMISSIONS', 'TAXES', 'OTHER'] })
  @IsEnum(['INGREDIENTS', 'PACKAGING', 'PRODUCTION', 'TRANSPORTATION', 'ELECTRICITY', 'WATER', 'GAS', 'RENT', 'MARKETING', 'EQUIPMENT', 'MAINTENANCE', 'COMMISSIONS', 'TAXES', 'OTHER'])
  @IsOptional()
  category?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  amount?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  paidAmount?: number;

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
