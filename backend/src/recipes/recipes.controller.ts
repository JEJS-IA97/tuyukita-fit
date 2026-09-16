import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { RecipesService } from './recipes.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('recipes')
@Controller('recipes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a recipe' })
  async create(@Body() dto: CreateRecipeDto) {
    return this.recipesService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all recipes' })
  async findAll() {
    return this.recipesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get recipe by ID' })
  async findById(@Param('id') id: string) {
    return this.recipesService.findById(id);
  }

  @Get(':id/cost')
  @ApiOperation({ summary: 'Calculate recipe cost breakdown' })
  async calculateCost(@Param('id') id: string) {
    return this.recipesService.calculateCost(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a recipe' })
  async update(@Param('id') id: string, @Body() dto: UpdateRecipeDto) {
    return this.recipesService.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate a recipe' })
  async deactivate(@Param('id') id: string) {
    return this.recipesService.deactivate(id);
  }
}
