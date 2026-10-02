import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: 'Materia prima' })
  @IsString()
  @IsNotEmpty()
  name: string;
}
