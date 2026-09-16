import { IsString, IsNumber, IsOptional, IsUUID, ValidateNested, IsArray } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RecipeIngredientDto, RecipePackagingDto } from './create-recipe.dto';

export class UpdateRecipeDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  yieldQuantity?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  yieldUnit?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  packageQuantity?: number;

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
