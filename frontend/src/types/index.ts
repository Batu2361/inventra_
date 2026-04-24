export type ProductCategory   = 'ELECTRONICS' | 'CLOTHING' | 'FOOD' | 'TOOLS' | 'OTHER'
export type MovementType      = 'INBOUND' | 'OUTBOUND' | 'ADJUSTMENT'
export type StorageStrategy   = 'FIFO' | 'LIFO'
export type ProductStatus     = 'AVAILABLE' | 'BLOCKED' | 'RESERVED'

export interface Product {
  id:              string
  sku:             string
  name:            string
  description:     string | null
  category:        ProductCategory
  price:           number
  currentStock:    number
  minStock:        number
  lowStock:        boolean

  // Logistics master data
  widthCm:         number | null
  heightCm:        number | null
  depthCm:         number | null
  weightKg:        number | null
  storageStrategy: StorageStrategy | null
  status:          ProductStatus
  barcode:         string | null

  createdAt:       string
  updatedAt:       string
}

export interface StockMovement {
  id:            string
  productId:     string
  productSku:    string
  quantity:      number
  type:          MovementType
  userReference: string
  timestamp:     string
  comment:       string | null
  warehouseId:   string | null
  warehouseName: string | null
}

export interface Warehouse {
  id:          string
  code:        string
  name:        string
  location:    string | null
  description: string | null
  capacity:    number | null
  active:      boolean
  totalStock:  number
}

export interface WarehouseStock {
  productId:   string
  productSku:  string
  productName: string
  quantity:    number
  lowStock:    boolean
}

export interface KpiData {
  totalProducts:        number
  totalStockValue:      number
  lowStockCount:        number
  outOfStockCount:      number
  movementsToday:       number
  movementsThisWeek:    number
  topMovedProducts:     { sku: string; name: string; totalMoved: number }[]
  warehouseUtilization: {
    warehouseId:    string
    name:           string
    totalProducts:  number
    totalQuantity:  number
    capacityPct:    number | null
  }[]
  categoryStats: {
    category:     ProductCategory
    productCount: number
    totalValue:   number
  }[]
  mostValuableStock: {
    sku:        string
    name:       string
    price:      number
    stock:      number
    totalValue: number
  }[]
  reorderCandidates: {
    sku:          string
    name:         string
    currentStock: number
    minStock:     number
  }[]
}

export interface TrendPoint {
  date:       string
  inbound:    number
  outbound:   number
  adjustment: number
}

export interface Page<T> {
  content:       T[]
  page:          number
  size:          number
  totalElements: number
  totalPages:    number
  first:         boolean
  last:          boolean
}

export interface ProblemDetail {
  type:    string
  title:   string
  status:  number
  detail:  string
  errors?: Record<string, string>
}
