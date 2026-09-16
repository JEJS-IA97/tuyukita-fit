import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { IngredientsService } from './ingredients.service';
import { CreateIngredientDto } from './dto/create-ingredient.dto';
import { UpdateIngredientDto } from './dto/update-ingredient.dto';
import { RegisterPurchaseDto } from './dto/register-purchase.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('ingredients')
@Controller('ingredients')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IngredientsController {
  constructor(private readonly ingredientsService: IngredientsService) {}

  @Post()
  @ApiOperation({ summary: 'Create an ingredient' })
  async create(@Body() dto: CreateIngredientDto) {
    return this.ingredientsService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all ingredients' })
  async findAll() {
    return this.ingredientsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ingredient by ID' })
  async findById(@Param('id') id: string) {
    return this.ingredientsService.findById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an ingredient' })
  async update(@Param('id') id: string, @Body() dto: UpdateIngredientDto) {
    return this.ingredientsService.update(id, dto);
  }

  @Post(':id/purchases')
  @ApiOperation({ summary: 'Register ingredient purchase' })
  async registerPurchase(@Param('id') id: string, @Body() dto: RegisterPurchaseDto) {
    return this.ingredientsService.registerPurchase(id, dto);
  }

  @Get(':id/purchases')
  @ApiOperation({ summary: 'Get ingredient purchases' })
  async getPurchases(@Param('id') id: string) {
    return this.ingredientsService.getPurchases(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate an ingredient' })
  async deactivate(@Param('id') id: string) {
    return this.ingredientsService.deactivate(id);
  }
}
