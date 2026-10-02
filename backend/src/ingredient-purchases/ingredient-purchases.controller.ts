import { Body, Controller, Delete, Param, Patch, Post, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateIngredientPurchaseDto } from './dto/create-ingredient-purchase.dto';
import { UpdateIngredientPurchaseDto } from './dto/update-ingredient-purchase.dto';
import { IngredientPurchasesService } from './ingredient-purchases.service';

@ApiTags('ingredient-purchases')
@Controller('ingredient-purchases')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class IngredientPurchasesController {
  constructor(
    private readonly ingredientPurchasesService: IngredientPurchasesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Register a purchase with its linked expense and lot' })
  async register(@Body() dto: CreateIngredientPurchaseDto, @Request() req) {
    return this.ingredientPurchasesService.register(dto, req.user.sub);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Correct a purchase, its lot and its linked expense' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateIngredientPurchaseDto,
    @Request() req,
  ) {
    return this.ingredientPurchasesService.updatePurchase(id, dto, req.user.sub);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a purchase, annul its expense and recalculate' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.ingredientPurchasesService.removePurchase(id, req.user.sub);
  }
}
