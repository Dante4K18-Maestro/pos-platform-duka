// Categories business rules live here, and only here.
import type { CategoryListItem, CreateCategoryInput } from "@pos/contracts";
import { CategoriesRepository, type CategoriesRepositoryLike } from "./categories.repository";

export class CategoryValidationError extends Error {
  constructor(
    message: string,
    readonly code: string,
  ) {
    super(message);
  }

  readonly statusCode = 400;
}

export class CategoriesService {
  constructor(private readonly repo: CategoriesRepositoryLike = new CategoriesRepository()) {}

  async list(tenantId: string): Promise<CategoryListItem[]> {
    return this.repo.list(tenantId);
  }

  async create(tenantId: string, input: CreateCategoryInput): Promise<{ id: string }> {
    // A parent must belong to the same tenant and be live — a category can
    // never hang off a row from another shop or a deleted one.
    if (input.parentId) {
      const parent = await this.repo.findById(tenantId, input.parentId);
      if (!parent) {
        throw new CategoryValidationError("parent category not found", "PARENT_NOT_FOUND");
      }
    }
    return this.repo.create(tenantId, input);
  }
}
