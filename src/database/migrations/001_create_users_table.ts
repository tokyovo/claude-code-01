import { Knex } from 'knex';
import {
  createExtensions,
  createEnumIfNotExists,
  createIndexes,
  createUpdatedAtTrigger,
  addConstraints,
  withTransaction,
  validateMigration,
} from '../utils/migrationHelpers';

export async function up(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('📊 Creating users table with extensions and constraints...');
    
    // Validate migration
    validateMigration.validateTableName('users');
    
    // Create required extensions
    await createExtensions(trx);
    
    // Create user_status enum
    const statusValues = ['active', 'inactive', 'suspended'];
    validateMigration.validateEnumValues(statusValues);
    await createEnumIfNotExists(trx, 'user_status', statusValues);
    
    // Create users table
    await trx.schema.createTable('users', (table) => {
      // Primary key with UUID
      table.uuid('id').primary().defaultTo(trx.raw('uuid_generate_v4()'));
      
      // User identification
      table.specificType('email', 'citext').unique().notNullable();
      table.string('password_hash', 255).notNullable();
      table.string('first_name', 100).notNullable();
      table.string('last_name', 100).notNullable();
      
      // User status and verification
      table.specificType('status', 'user_status').defaultTo('active');
      table.boolean('email_verified').defaultTo(false);
      table.timestamp('last_login', { useTz: true }).nullable();
      
      // Timestamps
      table.timestamp('created_at', { useTz: true }).defaultTo(trx.raw('CURRENT_TIMESTAMP'));
      table.timestamp('updated_at', { useTz: true }).defaultTo(trx.raw('CURRENT_TIMESTAMP'));
      
      // Optional profile fields
      table.string('phone', 20).nullable();
      table.text('avatar_url').nullable();
      table.json('preferences').nullable();
    });
    
    // Add constraints
    await addConstraints(trx, 'users', [
      {
        name: 'users_email_format',
        check: "email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'"
      },
      {
        name: 'users_name_length',
        check: 'char_length(first_name) >= 1 AND char_length(last_name) >= 1'
      },
      {
        name: 'users_phone_format',
        check: "phone IS NULL OR phone ~* '^\\+?[1-9]\\d{1,14}$'"
      }
    ]);
    
    // Create indexes
    await createIndexes(trx, 'users', [
      { name: 'email', columns: 'email', unique: true },
      { name: 'status', columns: 'status' },
      { name: 'email_verified', columns: 'email_verified' },
      { name: 'last_login', columns: 'last_login' },
      { name: 'created_at', columns: 'created_at' },
      { name: 'phone', columns: 'phone', partial: 'phone IS NOT NULL' }
    ]);
    
    // Create updated_at trigger
    await createUpdatedAtTrigger(trx, 'users');
    
    console.log('✅ Users table created successfully');
  });
}

export async function down(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('📊 Rolling back users table...');
    
    // Drop trigger
    await trx.raw('DROP TRIGGER IF EXISTS update_users_updated_at ON users');
    
    // Drop table (this will also drop associated constraints and indexes)
    await trx.schema.dropTableIfExists('users');
    
    // Drop enum type only if no other tables use it
    await trx.raw(`
      DO $$ 
      BEGIN
          IF NOT EXISTS (
              SELECT 1 FROM information_schema.columns 
              WHERE data_type = 'USER-DEFINED' 
              AND udt_name = 'user_status' 
              AND table_name != 'users'
          ) THEN
              DROP TYPE IF EXISTS user_status;
          END IF;
      END $$;
    `);
    
    console.log('✅ Users table rollback completed');
  });
}