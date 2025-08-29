# Database Migration Guide

This guide explains how to use the Knex.js migration system for the Personal Finance Tracker backend.

## Overview

The migration system uses Knex.js to manage database schema changes, providing version control for your database structure. All migrations are written in TypeScript and support both up and down migrations.

## Migration Scripts

The following NPM scripts are available for managing migrations:

### Core Migration Commands
```bash
# Check migration status
npm run migrate:status

# Run all pending migrations
npm run migrate:latest

# Rollback last migration batch
npm run migrate:rollback

# Rollback all migrations
npm run migrate:rollback:all

# Create a new migration file
npm run migrate:make <migration_name>

# Run specific migration up/down
npm run migrate:up <migration_name>
npm run migrate:down <migration_name>
```

### Seed Commands
```bash
# Run all seed files
npm run seed:run

# Create a new seed file
npm run seed:make <seed_name>
```

### Combined Commands
```bash
# Run migrations and seeds
npm run db:setup

# Reset database: rollback all → migrate → seed
npm run db:reset

# Full reset: stop docker → clean volumes → start → migrate → seed
npm run db:fresh
```

### Test Environment
```bash
# Run migrations in test environment
npm run migrate:test

# Rollback test migrations
npm run migrate:test:rollback

# Run test seeds
npm run seed:test

# Setup test database
npm run db:test:setup

# Reset test database
npm run db:test:reset
```

## Migration File Structure

Migration files are located in `/src/database/migrations/` and follow the naming convention:
```
001_create_users_table.ts
002_create_accounts_table.ts
003_create_categories_table.ts
004_create_transactions_table.ts
005_create_budgets_table.ts
006_create_views_and_functions.ts
```

### Example Migration File

```typescript
import { Knex } from 'knex';
import {
  commonColumns,
  createIndexes,
  createUpdatedAtTrigger,
  addConstraints,
  withTransaction,
  validateMigration,
} from '../utils/migrationHelpers';

export async function up(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('📊 Creating example table...');
    
    // Validate migration
    validateMigration.validateTableName('example_table');
    
    // Create table
    await trx.schema.createTable('example_table', (table) => {
      // Primary key with UUID and default
      commonColumns.id(table, trx);
      
      // User reference
      commonColumns.userReference(table);
      
      // Custom columns
      table.string('name', 255).notNullable();
      table.text('description').nullable();
      
      // Timestamps
      commonColumns.timestamps(table);
    });
    
    // Add constraints
    await addConstraints(trx, 'example_table', [
      {
        name: 'example_name_length',
        check: 'char_length(name) >= 1'
      }
    ]);
    
    // Create indexes
    await createIndexes(trx, 'example_table', [
      { name: 'name', columns: 'name' },
      { name: 'user_id', columns: 'user_id' }
    ]);
    
    // Create updated_at trigger
    await createUpdatedAtTrigger(trx, 'example_table');
    
    console.log('✅ Example table created successfully');
  });
}

export async function down(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('📊 Rolling back example table...');
    
    // Drop trigger
    await trx.raw('DROP TRIGGER IF EXISTS update_example_table_updated_at ON example_table');
    
    // Drop table (automatically drops constraints and indexes)
    await trx.schema.dropTableIfExists('example_table');
    
    console.log('✅ Example table rollback completed');
  });
}
```

## Migration Helpers

The migration system includes helpful utilities in `/src/database/utils/migrationHelpers.ts`:

### Common Column Patterns
```typescript
// UUID primary key with default
commonColumns.id(table, trx);

// User reference foreign key
commonColumns.userReference(table);

// Created/updated timestamps
commonColumns.timestamps(table);

// Audit columns (created_by, updated_by, deleted_at)
commonColumns.auditColumns(table);
```

### Financial Data Types
```typescript
// Money field with 15,2 precision
financialTypes.money(table, 'amount');

// Currency code (3 chars, default USD)
financialTypes.currency(table);

// Percentage field
financialTypes.percentage(table, 'rate');
```

### Database Utilities
```typescript
// Create PostgreSQL enum
await createEnumIfNotExists(trx, 'status_type', ['active', 'inactive']);

// Create indexes
await createIndexes(trx, 'table_name', [
  { name: 'user_id', columns: 'user_id' },
  { name: 'unique_name', columns: 'name', unique: true },
  { name: 'partial_active', columns: 'status', partial: 'status = \'active\'' }
]);

// Add table constraints
await addConstraints(trx, 'table_name', [
  { name: 'positive_amount', check: 'amount > 0' }
]);

// Create updated_at trigger
await createUpdatedAtTrigger(trx, 'table_name');
```

## Seed File Structure

Seed files are located in `/src/database/seeds/` and run in order:
```
001_default_categories.ts
002_sample_data.ts
```

### Example Seed File

```typescript
import { Knex } from 'knex';

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Seeding example data...');
  
  try {
    // Clear existing data
    await knex('example_table').del();
    
    // Insert new data
    const data = [
      { name: 'Example 1', description: 'First example' },
      { name: 'Example 2', description: 'Second example' }
    ];
    
    await knex('example_table').insert(data);
    
    console.log(`✅ Successfully seeded ${data.length} example records`);
  } catch (error) {
    console.error('❌ Error seeding example data:', error);
    throw error;
  }
}
```

## Database Schema

The migration system creates the following tables:

### Core Tables
- **users** - User accounts and authentication
- **accounts** - Financial accounts (checking, savings, credit, etc.)
- **categories** - Transaction categories with hierarchical structure
- **transactions** - Financial transactions with full audit trail
- **budgets** - Budget definitions with period management

### System Tables
- **knex_migrations** - Migration tracking (managed by Knex)
- **knex_migrations_lock** - Migration locking (managed by Knex)

### Views
- **transaction_summary** - Denormalized transaction data with account/category names
- **account_balances** - Real-time account balance calculations

## Best Practices

### Migration Guidelines
1. **Always use transactions** - Wrap migration logic in `withTransaction()`
2. **Validate inputs** - Use validation helpers before creating resources
3. **Include rollback logic** - Every `up()` should have a corresponding `down()`
4. **Use helpers** - Leverage migration helpers for consistency
5. **Test rollbacks** - Always test that rollbacks work correctly

### Schema Design
1. **UUID primary keys** - Use `commonColumns.id(table, trx)` for all tables
2. **Proper timestamps** - Include `commonColumns.timestamps(table)`
3. **Foreign key constraints** - Use CASCADE/SET NULL appropriately
4. **Database constraints** - Validate data at the database level
5. **Proper indexing** - Index foreign keys and query patterns

### Financial Data
1. **Use DECIMAL(15,2)** - For all monetary amounts
2. **Store currencies** - Always include currency fields
3. **Validate precision** - Check for positive amounts and proper formats
4. **Audit trails** - Track who created/modified financial data

## Troubleshooting

### Common Issues

#### Migration Fails to Run
```bash
# Check migration status
npm run migrate:status

# Check database connection
npm run services:status
docker logs finance_tracker_postgres
```

#### UUID Generation Errors
Ensure tables have proper UUID defaults:
```sql
ALTER TABLE table_name ALTER COLUMN id SET DEFAULT uuid_generate_v4();
```

#### Permission Errors
Make sure PostgreSQL user has proper permissions:
```sql
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
```

#### Seed Data Issues
- Check that required tables exist before seeding
- Verify foreign key relationships are properly set up
- Ensure data formats match table constraints

### Recovery Commands

```bash
# Reset everything and start fresh
npm run db:fresh

# Rollback and re-run last migration
npm run migrate:rollback && npm run migrate:latest

# Check what's in the database
docker exec finance_tracker_postgres psql -U postgres -d finance_tracker -c "\dt"
docker exec finance_tracker_postgres psql -U postgres -d finance_tracker -c "\dv"
```

## Environment Configuration

Migration behavior can be controlled via environment variables:

```env
# Database connection
DB_HOST=localhost
DB_PORT=5433
DB_NAME=finance_tracker
DB_USER=postgres
DB_PASSWORD=password

# Debug settings
DEBUG_SQL=false
LOG_QUERIES=false

# Automatic migration/seeding
RUN_MIGRATIONS_ON_STARTUP=false
RUN_SEEDS_ON_STARTUP=false
```

## Production Deployment

For production deployments:

1. **Backup first** - Always backup before migrations
2. **Test migrations** - Run in staging environment first
3. **Use transactions** - Migrations run in transactions by default
4. **Monitor progress** - Watch logs during migration
5. **Have rollback plan** - Be prepared to rollback if needed

Example production migration:
```bash
# Backup database
pg_dump -h localhost -U postgres finance_tracker > backup_$(date +%Y%m%d_%H%M%S).sql

# Run migrations
NODE_ENV=production npm run migrate:latest

# Verify success
NODE_ENV=production npm run migrate:status
```

---

This migration system provides a robust foundation for managing database schema changes in the Personal Finance Tracker application.