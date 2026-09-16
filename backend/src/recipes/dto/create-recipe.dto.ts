import { IsString, IsNumber, IsOptional, IsUUID, ValidateNested, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RecipeIngredientDto {
  @ApiProperty()
  @IsUUID()
  ingredientId: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty()
  @IsString()
  unit: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  costSnapshot?: number;
}

export class RecipePackagingDto {
  @ApiProperty()
  @IsUUID()
  packagingItemId: string;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  costSnapshot?: number;
}

export class CreateRecipeDto {
  @ApiProperty({ example: 'Receta Arepa Natural' })
  @IsString()
  name: string;

  @ApiProperty({ example: 100 })
  @IsNumber()
  yieldQuantity: number;

  @ApiProperty({ example: 'units' })
  @IsString()
  yieldUnit: string;

  @ApiPropertyOptional({ example: 8 })
  @IsNumber()
  @IsOptional()
  packageQuantity?: number;

  @ApiProperty()
  @IsUUID()
  productId: string;

  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  flavorId?: string;

  @ApiPropertyOptional({ type: [RecipeIngredientDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipeIngredientDto)
  @IsOptional()
  ingredients?: RecipeIngredientDto[];

  @ApiPropertyOptional({ type: [RecipePackagingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecipePackagingDto)
  @IsOptional()
  packaging?: RecipePackagingDto[];
}
