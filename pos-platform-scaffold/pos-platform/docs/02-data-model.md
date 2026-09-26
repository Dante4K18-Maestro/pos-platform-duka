# Data model

Every table: tenant_id, created_at, updated_at, deleted_at. Client-written tables also carry client_id (unique) for idempotent sync. Full table list: tenants/stores/registers, users/roles/permissions, products/variants/modifiers/categories, tax_rates/price_lists, inventory_levels (derived cache, never source of truth), stock_movements (append-only ledger), suppliers/purchase_orders/po_items, customers/customer_notes, sales/sale_items, payments, refunds/refund_items/store_credits, cash_sessions/cash_movements, custom_field_defs/custom_field_values, audit_log, daily_sales_rollup.
