import { Knex } from 'knex';
import {
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
    console.log('📊 Creating budgets table...');
    
    // Validate dependencies
    await validateMigration.requireTables(trx, ['users', 'categories']);
    validateMigration.validateTableName('budgets');
    
    // Create budgets table
    await trx.schema.createTable('budgets', (table) => {
      // Primary key with UUID
      commonColumns.id(table, trx);
      
      // User reference
      commonColumns.userReference(table);
      
      // Category reference
      table.uuid('category_id').notNullable()
        .references('id').inTable('categories').onDelete('CASCADE');
      
      // Budget details
      table.string('name', 255).notNullable();
      table.text('description').nullable();
      
      // Financial information
      financialTypes.money(table, 'amount');
      financialTypes.currency(table, 'currency');
      financialTypes.money(table, 'spent_amount').defaultTo('0.00');
      
      // Budget period
      table.date('period_start').notNullable();
      table.date('period_end').notNullable();
      
      // Budget settings
      table.boolean('is_active').defaultTo(true);
      table.boolean('rollover_unused').defaultTo(false);
      table.decimal('alert_threshold', 5, 4).defaultTo(0.8000); // 80% threshold
      
      // Timestamps
      commonColumns.timestamps(table);
      
      // Metadata
      table.json('metadata').nullable();
    });
    
    // Add constraints
    await addConstraints(trx, 'budgets', [
      {
        name: 'budgets_positive_amount',
        check: 'amount > 0'
      },
      {
        name: 'budgets_valid_period',
        check: 'period_end > period_start'
      },
      {
        name: 'budgets_name_length',
        check: 'char_length(name) >= 1'
      },
      {
        name: 'budgets_currency_format',
        check: 'char_length(currency) = 3'
      },
      {
        name: 'budgets_spent_amount_positive',
        check: 'spent_amount >= 0'
      },
      {
        name: 'budgets_valid_alert_threshold',
        check: 'alert_threshold > 0 AND alert_threshold <= 1'
      }
    ]);
    
    // Create indexes
    await createIndexes(trx, 'budgets', [
      { name: 'user_id', columns: 'user_id' },
      { name: 'category_id', columns: 'category_id' },
      { name: 'period', columns: ['period_start', 'period_end'] },
      { name: 'is_active', columns: 'is_active' },
      { name: 'user_active', columns: ['user_id', 'is_active'] },
      { name: 'user_category', columns: ['user_id', 'category_id'] },
      { name: 'period_start', columns: 'period_start' },
      { name: 'period_end', columns: 'period_end' }
    ]);
    
    // Create unique constraint for user + category + period overlap prevention
    await trx.schema.raw(`
      CREATE UNIQUE INDEX idx_budgets_user_category_period 
      ON budgets(user_id, category_id, period_start, period_end) 
      WHERE is_active = true
    `);
    
    // Create updated_at trigger
    await createUpdatedAtTrigger(trx, 'budgets');
    
    console.log('✅ Budgets table created successfully');
  });
}

export async function down(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('📊 Rolling back budgets table...');
    
    // Drop trigger
    await trx.raw('DROP TRIGGER IF EXISTS update_budgets_updated_at ON budgets');
    
    // Drop table (this will also drop associated constraints and indexes)
    await trx.schema.dropTableIfExists('budgets');
    
    console.log('✅ Budgets table rollback completed');
  });
}