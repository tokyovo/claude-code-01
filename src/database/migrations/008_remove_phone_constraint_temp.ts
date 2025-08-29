import { Knex } from 'knex';
import { withTransaction } from '../utils/migrationHelpers';

export async function up(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('🔧 Temporarily removing users phone format constraint...');
    
    // Drop the phone constraint for now
    await trx.raw('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_format');
    
    console.log('✅ Phone format constraint removed successfully');
  });
}

export async function down(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('🔧 Adding back users phone format constraint...');
    
    // Add back a phone constraint
    await trx.raw(`
      ALTER TABLE users ADD CONSTRAINT users_phone_format 
      CHECK (phone IS NULL OR phone ~ '^\\+?[1-9][0-9]{7,14}$')
    `);
    
    console.log('✅ Phone format constraint added back successfully');
  });
}