"""READ-ONLY Postgres role. This service does not have write credentials to
the primary database, by design — a prompt injection cannot refund a sale
or edit stock, full stop.
"""
# TODO: asyncpg pool against DATABASE_URL_READONLY
