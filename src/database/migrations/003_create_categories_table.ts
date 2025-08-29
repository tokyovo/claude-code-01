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
    console.log('📊 Creating categories table...');
    
    // Validate dependencies
    await validateMigration.requireTables(trx, ['users']);
    validateMigration.validateTableName('categories');
    
    // Create categories table
    await trx.schema.createTable('categories', (table) => {
      // Primary key with UUID
      commonColumns.id(table, trx);
      
      // User reference
      commonColumns.userReference(table);
      
      // Category details
      table.string('name', 255).notNullable();
      table.text('description').nullable();
      table.string('color', 7).nullable(); // Hex color code
      table.string('icon', 100).nullable();
      
      // Category settings
      table.boolean('is_active').defaultTo(true);
      table.boolean('is_system').defaultTo(false); // For default categories
      table.integer('display_order').defaultTo(0);
      
      // Parent category for hierarchical structure
      table.uuid('parent_id').nullable()
        .references('id').inTable('categories').onDelete('SET NULL');
      
      // Timestamps
      commonColumns.timestamps(table);
      
      // Metadata
      table.json('metadata').nullable();
    });
    
    // Add constraints
    await addConstraints(trx, 'categories', [
      {
        name: 'categories_name_length',
        check: 'char_length(name) >= 1'
      },
      {
        name: 'categories_color_format',
        check: `color IS NULL OR color ~* '^#[0-9A-Fa-f]{6}$'`
      },
      {
        name: 'categories_no_self_parent',
        check: 'parent_id IS NULL OR parent_id != id'
      }
    ]);
    
    // Create indexes
    await createIndexes(trx, 'categories', [
      { name: 'user_id', columns: 'user_id' },
      { name: 'is_active', columns: 'is_active' },
      { name: 'user_active', columns: ['user_id', 'is_active'] },
      { name: 'parent_id', columns: 'parent_id' },
      { name: 'is_system', columns: 'is_system' },
      { name: 'display_order', columns: 'display_order' }
    ]);
    
    // Create unique constraint for user + category name
    await trx.schema.raw(`
      CREATE UNIQUE INDEX idx_categories_user_name_unique 
      ON categories(user_id, name) 
      WHERE is_active = true
    `);
    
    // Create updated_at trigger
    await createUpdatedAtTrigger(trx, 'categories');
    
    console.log('✅ Categories table created successfully');
  });
}

export async function down(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('📊 Rolling back categories table...');
    
    // Drop trigger
    await trx.raw('DROP TRIGGER IF EXISTS update_categories_updated_at ON categories');
    
    // Drop table (this will also drop associated constraints and indexes)
    await trx.schema.dropTableIfExists('categories');
    
    console.log('✅ Categories table rollback completed');
  });
}