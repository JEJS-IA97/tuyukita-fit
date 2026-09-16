import { Module } from '@nestjs/common';
import { ProductCostsService } from './product-costs.service';
import { ProductCostsController } from './product-costs.controller';

@Module({
  controllers: [ProductCostsController],
  providers: [ProductCostsService],
  exports: [ProductCostsService],
})
export class ProductCostsModule {}
