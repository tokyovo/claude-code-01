import { Knex } from 'knex';
import {
  createEnumIfNotExists,
  commonColumns,
  createIndexes,
  createUpdatedAtTrigger,
  addConstraints,
  withTransaction,
  validateMigration,
  financialTypes,
} from '../utils/migrationHelpers';

export async function up(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('📊 Creating transactions table...');
    
    // Validate dependencies
    await validateMigration.requireTables(trx, ['users', 'accounts', 'categories']);
    validateMigration.validateTableName('transactions');
    
    // Create transaction_type enum
    const transactionTypes = ['income', 'expense', 'transfer'];
    validateMigration.validateEnumValues(transactionTypes);
    await createEnumIfNotExists(trx, 'transaction_type', transactionTypes);
    
    // Create transactions table
    await trx.schema.createTable('transactions', (table) => {
      // Primary key with UUID
      commonColumns.id(table, trx);
      
      // User reference
      commonColumns.userReference(table);
      
      // Account reference
      table.uuid('account_id').notNullable()
        .references('id').inTable('accounts').onDelete('CASCADE');
      
      // Category reference (nullable for transfers)
      table.uuid('category_id').nullable()
        .references('id').inTable('categories').onDelete('SET NULL');
      
      // Transaction type
      table.specificType('type', 'transaction_type').notNullable();
      
      // Financial information
      financialTypes.money(table, 'amount');
      financialTypes.currency(table, 'currency');
      
      // Transaction details
      table.text('description').notNullable();
      table.date('transaction_date').notNullable();
      
      // For transfer transactions
      table.uuid('transfer_account_id').nullable()
        .references('id').inTable('accounts').onDelete('SET NULL');
      table.uuid('transfer_transaction_id').nullable()
        .references('id').inTable('transactions').onDelete('SET NULL');
      
      // Additional metadata
      table.specificType('tags', 'text[]').nullable();
      table.text('receipt_url').nullable();
      table.text('notes').nullable();
      table.string('reference_number', 100).nullable(); // Check number, confirmation, etc.
      table.boolean('is_recurring').defaultTo(false);
      table.uuid('recurring_group_id').nullable(); // Group recurring transactions
      
      // Location data
      table.string('merchant_name', 255).nullable();
      table.decimal('latitude', 10, 8).nullable();
      table.decimal('longitude', 11, 8).nullable();
      
      // Timestamps
      commonColumns.timestamps(table);
      
      // Metadata for additional transaction info
      table.json('metadata').nullable();
    });
    
    // Add constraints
    await addConstraints(trx, 'transactions', [
      {
        name: 'transactions_positive_amount',
        check: 'amount > 0'
      },
      {
        name: 'transactions_currency_format',
        check: 'char_length(currency) = 3'
      },
      {
        name: 'transactions_description_length',
        check: 'char_length(description) >= 1'
      },
      {
        name: 'transactions_transfer_consistency',
        check: `(type != 'transfer') OR (type = 'transfer' AND transfer_account_id IS NOT NULL)`
      },
      {
        name: 'transactions_no_self_transfer',
        check: 'transfer_account_id IS NULL OR transfer_account_id != account_id'
      },
      {
        name: 'transactions_valid_coordinates',
        check: `(latitude IS NULL AND longitude IS NULL) OR (latitude IS NOT NULL AND longitude IS NOT NULL AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180)`
      }
    ]);
    
    // Create indexes
    await createIndexes(trx, 'transactions', [
      { name: 'user_id', columns: 'user_id' },
      { name: 'account_id', columns: 'account_id' },
      { name: 'category_id', columns: 'category_id' },
      { name: 'type', columns: 'type' },
      { name: 'transaction_date', columns: 'transaction_date' },
      { name: 'amount', columns: 'amount' },
      { name: 'created_at', columns: 'created_at' },
      { name: 'user_date', columns: ['user_id', 'transaction_date'] },
      { name: 'account_date', columns: ['account_id', 'transaction_date'] },
      { name: 'category_date', columns: ['category_id', 'transaction_date'] },
      { name: 'transfer_account_id', columns: 'transfer_account_id' },
      { name: 'transfer_transaction_id', columns: 'transfer_transaction_id' },
      { name: 'is_recurring', columns: 'is_recurring' },
      { name: 'recurring_group_id', columns: 'recurring_group_id' },
      { name: 'merchant_name', columns: 'merchant_name', partial: 'merchant_name IS NOT NULL' }
    ]);
    
    // Create GIN index for tags array
    await trx.schema.raw('CREATE INDEX IF NOT EXISTS idx_transactions_tags_gin ON transactions USING GIN (tags)');
    
    // Create updated_at trigger
    await createUpdatedAtTrigger(trx, 'transactions');
    
    console.log('✅ Transactions table created successfully');
  });
}

export async function down(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('📊 Rolling back transactions table...');
    
    // Drop trigger
    await trx.raw('DROP TRIGGER IF EXISTS update_transactions_updated_at ON transactions');
    
    // Drop table (this will also drop associated constraints and indexes)
    await trx.schema.dropTableIfExists('transactions');
    
    // Drop enum type only if no other tables use it
    await trx.raw(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE data_type = 'USER-DEFINED' 
              AND udt_name = 'transaction_type' 
              AND table_name != 'transactions'
          ) THEN
              DROP TYPE IF EXISTS transaction_type;
          END IF;
      END $$;
    `);
    
    console.log('✅ Transactions table rollback completed');
  });
}