import { Knex } from 'knex';

/**
 * Create login_attempts table for tracking failed login attempts and account lockouts
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('login_attempts', (table) => {
    // Primary key
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    
    // User identification (can be user_id or email for non-existent users)
    table.uuid('user_id').nullable().references('id').inTable('users').onDelete('CASCADE');
    table.string('email').notNullable();
    table.string('ip_address', 45).notNullable(); // Support both IPv4 and IPv6
    
    // Attempt details
    table.enum('attempt_type', ['login', 'password_reset']).notNullable().defaultTo('login');
    table.boolean('successful').notNullable().defaultTo(false);
    table.string('user_agent', 500).nullable();
    table.json('additional_info').nullable(); // For storing extra security info
    
    // Timestamps
    table.timestamp('attempted_at').notNullable().defaultTo(knex.fn.now());
    
    // Indexes for efficient queries
    table.index(['email', 'attempted_at'], 'idx_login_attempts_email_time');
    table.index(['user_id', 'attempted_at'], 'idx_login_attempts_user_time');
    table.index(['ip_address', 'attempted_at'], 'idx_login_attempts_ip_time');
    table.index(['attempt_type', 'successful', 'attempted_at'], 'idx_login_attempts_type_success_time');
  });

  // Add comment to table
  await knex.raw(`
    COMMENT ON TABLE login_attempts IS 'Tracks login attempts for security monitoring and account lockout functionality'
  `);
}

/**
 * Drop login_attempts table
 */
export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('login_attempts');
}