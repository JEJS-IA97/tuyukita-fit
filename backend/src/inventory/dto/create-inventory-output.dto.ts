import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateInventoryOutputDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  ingredientId: string;

  @ApiProperty({ example: 60, description: 'Quantity in the ingredient unit' })
  @IsNumber()
  @Min(0)
  quantity: number;

  @ApiProperty()
  @IsDateString()
  movementDate: string;

  @ApiProperty({ example: 'Produccion diaria' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
