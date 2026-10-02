import { Module } from '@nestjs/common';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { InventoryModule } from '../inventory/inventory.module';
import { AuditModule } from '../audit/audit.module';
import { IngredientPurchasesController } from './ingredient-purchases.controller';
import { IngredientPurchasesService } from './ingredient-purchases.service';

@Module({
  imports: [ExchangeRatesModule, InventoryModule, AuditModule],
  controllers: [IngredientPurchasesController],
  providers: [IngredientPurchasesService],
  exports: [IngredientPurchasesService],
})
export class IngredientPurchasesModule {}
