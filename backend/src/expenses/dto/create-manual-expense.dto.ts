import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsIn,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateManualExpenseDto {
  @ApiProperty({ example: 'Compra de yuca' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'Materia prima' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  categoryId?: string;

  @ApiProperty({ example: 1000000, description: 'Amount in VES' })
  @IsNumber()
  @Min(0)
  amountVes: number;

  @ApiProperty({ enum: ['BCV', 'USDT'] })
  @IsIn(['BCV', 'USDT'])
  rateType: 'BCV' | 'USDT';

  @ApiPropertyOptional()
  @IsDateString()
  @IsOptional()
  expenseDate?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  paidAmount?: number;

  @ApiPropertyOptional()
  @IsString()
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
