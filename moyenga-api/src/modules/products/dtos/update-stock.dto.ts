import { IsIn, IsInt, Min } from 'class-validator';

export type StockOperation = 'increment' | 'decrement' | 'set';

export class UpdateStockDto {
  @IsInt()
  @Min(0)
  quantity: number;

  @IsIn(['increment', 'decrement', 'set'], {
    message: "operation doit être 'increment', 'decrement' ou 'set'",
  })
  operation: StockOperation;
}
