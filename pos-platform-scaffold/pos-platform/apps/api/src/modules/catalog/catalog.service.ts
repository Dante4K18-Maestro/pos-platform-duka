// Catalog business rules live here, and only here.
import type { CatalogProduct } from "@pos/contracts";
import { CatalogRepository, type CatalogRepositoryLike } from "./catalog.repository";

export interface CatalogPayload {
  products: CatalogProduct[];
  taxRateBasisPoints: number;
}

export class CatalogService {
  constructor(private readonly repo: CatalogRepositoryLike = new CatalogRepository()) {}

  async getRegisterCatalog(tenantId: string): Promise<CatalogPayload> {
    const [products, taxRateBasisPoints] = await Promise.all([
      this.repo.listProducts(tenantId),
      this.repo.resolveTaxRateBasisPoints(tenantId),
    ]);

    return { products, taxRateBasisPoints };
  }
}
