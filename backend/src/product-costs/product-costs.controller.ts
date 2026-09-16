import { Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ProductCostsService } from './product-costs.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('product-costs')
@Controller('product-costs')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ProductCostsController {
  constructor(private readonly productCostsService: ProductCostsService) {}

  @Get(':productId')
  @ApiOperation({ summary: 'Get cost breakdown for a product' })
  async getCostByProduct(@Param('productId') productId: string) {
    return this.productCostsService.getCostByProduct(productId);
  }

  @Get(':productId/:flavorId')
  @ApiOperation({ summary: 'Get cost snapshots for product and flavor' })
  async getCostByProductAndFlavor(
    @Param('productId') productId: string,
    @Param('flavorId') flavorId: string,
  ) {
    return this.productCostsService.getCostByProductAndFlavor(productId, flavorId);
  }

  @Post('recalculate/:productId')
  @ApiOperation({ summary: 'Recalculate product cost snapshots' })
  async recalculate(@Param('productId') productId: string) {
    return this.productCostsService.recalculate(productId);
  }
}
