import { IsNumber, IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty()
  @IsNumber()
  amount: number;

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

  @ApiProperty({ enum: ['CASH', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'ZELLE', 'BINANCE_USDT', 'CARD', 'OTHER'] })
  @IsEnum(['CASH', 'BANK_TRANSFER', 'MOBILE_PAYMENT', 'ZELLE', 'BINANCE_USDT', 'CARD', 'OTHER'])
  paymentMethod: string;

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  paymentDate?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  cashAccountId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
