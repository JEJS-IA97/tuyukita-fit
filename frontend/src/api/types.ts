export type Role = 'OPERATOR' | 'ADMIN' | 'MANAGER' | 'OWNER';

export type AuthUser = {
  id: string;
  name: string;
  username: string;
  role: Role;
};

export type Tokens = {
  accessToken: string;
  refreshToken: string;
};

export type LoginResponse = {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
};

export type RateType = 'BCV' | 'USDT';

export type RateDto = {
  id: string;
  rateType: RateType;
  valueVesPerUsd: number;
  source: string;
  effectiveDate: string;
  fetchedAt: string;
};

export type LatestRates = {
  bcv: RateDto | null;
  usdt: RateDto | null;
};

export type Ingredient = {
  id: string;
  name: string;
  normalizedName: string;
  description: string | null;
  unit: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CreateIngredientInput = {
  name: string;
  description?: string;
  unit: string;
  currentCost?: number;
  currency?: 'USD' | 'VES';
};

export type UpdateIngredientInput = Partial<CreateIngredientInput> & {
  isActive?: boolean;
};

export type ExpenseCategory = {
  id: string;
  name: string;
  normalizedName: string;
  isActive: boolean;
  createdById: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID';

export type Expense = {
  id: string;
  expenseNumber: string;
  expenseDate: string;
  category: string;
  categoryId: string | null;
  description: string;
  amount: string;
  paidAmount: string;
  pendingAmount: string;
  currency: string;
  amountVesMinor: number;
  amountUsdMinor: number;
  exchangeRateId: string | null;
  exchangeRateValue: number;
  exchangeRateType: RateType;
  exchangeRateSource: string;
  exchangeRateDate: string;
  paymentStatus: PaymentStatus;
  paymentMethod: string | null;
  supplierName: string | null;
  notes: string | null;
  isActive: boolean;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type Paginated<T> = {
  data: T[];
  pagination: Pagination;
};

export type CreateManualExpenseInput = {
  description: string;
  category: string;
  categoryId?: string;
  amountVes: number;
  rateType: RateType;
  expenseDate?: string;
  paidAmount?: number;
  paymentMethod?: string;
  supplierName?: string;
  notes?: string;
};

export type UpdateExpenseInput = Partial<CreateManualExpenseInput>;

export type IngredientPurchase = {
  id: string;
  ingredientId: string;
  ingredient?: Ingredient;
  quantityMinor: number;
  quantity: number;
  totalCostVesMinor: number;
  totalCostVes: number;
  totalCostUsdMinor: number;
  rateId: string;
  rateValueVesPerUsd: number;
  purchaseDate: string;
  supplierName: string | null;
  invoiceNumber: string | null;
  notes: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateIngredientPurchaseInput = {
  ingredientId: string;
  quantity: number;
  totalCostVes: number;
  rateType: RateType;
  purchaseDate?: string;
  supplierName?: string;
  invoiceNumber?: string;
  notes?: string;
};

export type UpdateIngredientPurchaseInput =
  Partial<CreateIngredientPurchaseInput>;

export type StockItem = {
  ingredientId: string;
  name: string;
  unit: string;
  isActive: boolean;
  availableQuantityMinor: number;
  availableQuantity: number;
};

export type InventoryMovementType = 'IN' | 'OUT';

export type InventoryMovement = {
  id: string;
  ingredientId: string;
  type: InventoryMovementType;
  quantityMinor: number;
  costUsdMinor: number;
  reason: string | null;
  movementDate: string;
  purchaseId: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
};

export type InventoryLot = {
  id: string;
  ingredientId: string;
  lotDate: string;
  initialQuantityMinor: number;
  remainingQuantityMinor: number;
  purchaseId: string;
};

export type InventoryConsumption = {
  id: string;
  movementId: string;
  lotId: string;
  quantityMinor: number;
  costUsdMinor: number;
  lot?: {
    id: string;
    lotDate: string;
    purchaseId: string;
    initialQuantityMinor: number;
  };
};

export type InventoryOutput = InventoryMovement & {
  consumptions: InventoryConsumption[];
};

export type CreateInventoryOutputInput = {
  ingredientId: string;
  quantity: number;
  movementDate?: string;
  reason?: string;
};

export type UpdateInventoryOutputInput = Partial<{
  quantity: number;
  movementDate: string;
  reason: string;
}>;

export type ExpenseSummary = {
  totalManualExpensesVes: number;
  totalPurchasesVes: number;
  totalVes: number;
  totalUsd: number;
};
