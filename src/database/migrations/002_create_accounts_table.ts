import { Knex } from 'knex';
import {
  createEnumIfNotExists,
  createIndexes,
  createUpdatedAtTrigger,
  addConstraints,
  withTransaction,
  validateMigration,
  financialTypes,
} from '../utils/migrationHelpers';

export async function up(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('📊 Creating accounts table...');
    
    // Validate dependencies
    await validateMigration.requireTables(trx, ['users']);
    validateMigration.validateTableName('accounts');
    
    // Create account_type enum
    const accountTypes = ['checking', 'savings', 'credit', 'investment', 'cash', 'loan'];
    validateMigration.validateEnumValues(accountTypes);
    await createEnumIfNotExists(trx, 'account_type', accountTypes);
    
    // Create accounts table
    await trx.schema.createTable('accounts', (table) => {
      // Primary key with UUID
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      
      // User reference
      table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
      
      // Account details
      table.string('name', 255).notNullable();
      table.specificType('type', 'account_type').notNullable();
      table.text('description').nullable();
      
      // Financial information
      financialTypes.money(table, 'balance').defaultTo('0.00');
      financialTypes.currency(table, 'currency');
      financialTypes.money(table, 'credit_limit', true); // For credit accounts
      
      // Account settings
      table.boolean('is_active').defaultTo(true);
      table.boolean('include_in_net_worth').defaultTo(true);
      table.integer('display_order').defaultTo(0);
      
      // Institution details
      table.string('institution_name', 255).nullable();
      table.string('account_number', 50).nullable(); // Last 4 digits only for security
      table.string('routing_number', 20).nullable();
      
      // Timestamps
      table.timestamp('created_at', { useTz: true }).defaultTo(trx.raw('CURRENT_TIMESTAMP'));
      table.timestamp('updated_at', { useTz: true }).defaultTo(trx.raw('CURRENT_TIMESTAMP'));
      
      // Metadata
      table.json('metadata').nullable(); // For storing additional account info
    });
    
    // Add constraints
    await addConstraints(trx, 'accounts', [
      {
        name: 'accounts_positive_balance',
        check: `balance >= 0 OR type IN ('credit', 'loan')`
      },
      {
        name: 'accounts_currency_format',
        check: 'char_length(currency) = 3'
      },
      {
        name: 'accounts_name_length',
        check: 'char_length(name) >= 1'
      },
      {
        name: 'accounts_credit_limit',
        check: `credit_limit IS NULL OR (credit_limit > 0 AND type = 'credit')`
      },
      {
        name: 'accounts_account_number_format',
        check: `account_number IS NULL OR char_length(account_number) >= 4`
      }
    ]);
    
    // Create indexes
    await createIndexes(trx, 'accounts', [
      { name: 'user_id', columns: 'user_id' },
      { name: 'type', columns: 'type' },
      { name: 'is_active', columns: 'is_active' },
      { name: 'user_active', columns: ['user_id', 'is_active'] },
      { name: 'user_type', columns: ['user_id', 'type'] },
      { name: 'currency', columns: 'currency' },
      { name: 'display_order', columns: 'display_order' },
      { name: 'institution_name', columns: 'institution_name', partial: 'institution_name IS NOT NULL' }
    ]);
    
    // Create unique constraint for user + account name
    await trx.schema.raw(`
      CREATE UNIQUE INDEX idx_accounts_user_name_unique 
      ON accounts(user_id, name) 
      WHERE is_active = true
    `);
    
    // Create updated_at trigger
    await createUpdatedAtTrigger(trx, 'accounts');
    
    console.log('✅ Accounts table created successfully');
  });
}

export async function down(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('📊 Rolling back accounts table...');
    
    // Drop trigger
    await trx.raw('DROP TRIGGER IF EXISTS update_accounts_updated_at ON accounts');
    
    // Drop table (this will also drop associated constraints and indexes)
    await trx.schema.dropTableIfExists('accounts');
    
    // Drop enum type only if no other tables use it
    await trx.raw(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE data_type = 'USER-DEFINED' 
              AND udt_name = 'account_type' 
              AND table_name != 'accounts'
          ) THEN
              DROP TYPE IF EXISTS account_type;
          END IF;
      END $$;
    `);
    
    console.log('✅ Accounts table rollback completed');
  });
}