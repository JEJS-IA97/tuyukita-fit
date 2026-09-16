import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { ExchangeRatesModule } from './exchange-rates/exchange-rates.module';
import { ProductsModule } from './products/products.module';
import { FlavorsModule } from './flavors/flavors.module';
import { IngredientsModule } from './ingredients/ingredients.module';
import { PackagingModule } from './packaging/packaging.module';
import { RecipesModule } from './recipes/recipes.module';
import { ProductCostsModule } from './product-costs/product-costs.module';
import { SalesModule } from './sales/sales.module';
import { ExpensesModule } from './expenses/expenses.module';
import { CashFlowModule } from './cash-flow/cash-flow.module';
import { ReportsModule } from './reports/reports.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    DashboardModule,
    ExchangeRatesModule,
    ProductsModule,
    FlavorsModule,
    IngredientsModule,
    PackagingModule,
    RecipesModule,
    ProductCostsModule,
    SalesModule,
    ExpensesModule,
    CashFlowModule,
    ReportsModule,
    SettingsModule,
  ],
})
export class AppModule {}
