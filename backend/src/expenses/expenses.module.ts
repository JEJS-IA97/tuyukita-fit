import { Module } from '@nestjs/common';
import { ExpensesService } from './expenses.service';
import { ExpensesController } from './expenses.controller';
import { ExchangeRatesModule } from '../exchange-rates/exchange-rates.module';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [ExchangeRatesModule, AuditModule],
  controllers: [ExpensesController],
  providers: [ExpensesService],
  exports: [ExpensesService],
})
export class ExpensesModule {}
