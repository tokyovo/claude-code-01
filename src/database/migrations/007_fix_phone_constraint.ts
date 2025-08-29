import { Knex } from 'knex';
import { withTransaction } from '../utils/migrationHelpers';

export async function up(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('🔧 Updating users phone format constraint...');
    
    // Drop the old constraint
    await trx.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_format');
    
    // Add the updated constraint with more flexible phone format
    await trx.raw(`
      ALTER TABLE users ADD CONSTRAINT users_phone_format 
      CHECK (phone IS NULL OR phone ~ '^\\+?[1-9][0-9]{7,14}$')
    `);
    
    console.log('✅ Phone format constraint updated successfully');
  });
}

export async function down(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('🔧 Reverting users phone format constraint...');
    
    // Drop the new constraint
    await trx.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_format');
    
    // Add back the original constraint
    await trx.raw(`
      ALTER TABLE users ADD CONSTRAINT users_phone_format 
      CHECK (phone IS NULL OR phone ~* '^\\+?[1-9]\\d{1,14}$')
    `);
    
    console.log('✅ Phone format constraint reverted successfully');
  });
}