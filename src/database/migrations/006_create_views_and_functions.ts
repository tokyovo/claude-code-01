import { Knex } from 'knex';
import {
  withTransaction,
  validateMigration,
} from '../utils/migrationHelpers';

export async function up(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('📊 Creating database views and functions...');
    
    // Validate dependencies
    await validateMigration.requireTables(trx, ['users', 'accounts', 'categories', 'transactions', 'budgets']);
    
    // Create function to update account balances
    await trx.raw(`
      CREATE OR REPLACE FUNCTION update_account_balance(
          p_account_id UUID,
          p_amount DECIMAL(15,2),
          p_operation VARCHAR(10) -- 'add' or 'subtract'
      )
      RETURNS VOID AS $$
      BEGIN
          IF p_operation = 'add' THEN
              UPDATE accounts 
              SET balance = balance + p_amount, updated_at = CURRENT_TIMESTAMP
              WHERE id = p_account_id;
          ELSIF p_operation = 'subtract' THEN
              UPDATE accounts 
              SET balance = balance - p_amount, updated_at = CURRENT_TIMESTAMP
              WHERE id = p_account_id;
          ELSE
              RAISE EXCEPTION 'Invalid operation. Use add or subtract.';
          END IF;
          
          -- Check if update actually affected a row
          IF NOT FOUND THEN
              RAISE EXCEPTION 'Account with ID % not found', p_account_id;
          END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create enhanced transaction_summary view
    await trx.raw(`
      CREATE OR REPLACE VIEW transaction_summary AS
      SELECT 
          t.id,
          t.user_id,
          u.first_name || ' ' || u.last_name AS user_name,
          t.account_id,
          a.name AS account_name,
          a.type AS account_type,
          t.category_id,
          c.name AS category_name,
          c.color AS category_color,
          c.icon AS category_icon,
          t.type,
          t.amount,
          t.currency,
          t.description,
          t.transaction_date,
          t.transfer_account_id,
          ta.name AS transfer_account_name,
          t.merchant_name,
          t.tags,
          t.notes,
          t.is_recurring,
          t.created_at,
          t.updated_at
      FROM transactions t
      LEFT JOIN users u ON t.user_id = u.id
      LEFT JOIN accounts a ON t.account_id = a.id
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN accounts ta ON t.transfer_account_id = ta.id;
    `);
    
    // Create function to get account balance at specific date
    await trx.raw(`
      CREATE OR REPLACE FUNCTION get_account_balance_at_date(
          p_account_id UUID,
          p_date DATE DEFAULT CURRENT_DATE
      )
      RETURNS DECIMAL(15,2) AS $$
      DECLARE
          balance_at_date DECIMAL(15,2);
          account_exists BOOLEAN;
      BEGIN
          -- Check if account exists
          SELECT EXISTS(SELECT 1 FROM accounts WHERE id = p_account_id) INTO account_exists;
          
          IF NOT account_exists THEN
              RAISE EXCEPTION 'Account with ID % not found', p_account_id;
          END IF;
          
          SELECT COALESCE(SUM(
              CASE 
                  WHEN type = 'income' THEN amount
                  WHEN type = 'expense' THEN -amount
                  WHEN type = 'transfer' AND account_id = p_account_id THEN -amount
                  WHEN type = 'transfer' AND transfer_account_id = p_account_id THEN amount
                  ELSE 0
              END
          ), 0)
          INTO balance_at_date
          FROM transactions
          WHERE (account_id = p_account_id OR transfer_account_id = p_account_id)
          AND transaction_date <= p_date;
          
          RETURN balance_at_date;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create function to calculate category spending for a period
    await trx.raw(`
      CREATE OR REPLACE FUNCTION get_category_spending(
          p_user_id UUID,
          p_category_id UUID,
          p_start_date DATE,
          p_end_date DATE
      )
      RETURNS DECIMAL(15,2) AS $$
      DECLARE
          total_spending DECIMAL(15,2);
      BEGIN
          -- Validate input parameters
          IF p_start_date > p_end_date THEN
              RAISE EXCEPTION 'Start date cannot be after end date';
          END IF;
          
          SELECT COALESCE(SUM(amount), 0)
          INTO total_spending
          FROM transactions
          WHERE user_id = p_user_id
          AND category_id = p_category_id
          AND type = 'expense'
          AND transaction_date BETWEEN p_start_date AND p_end_date;
          
          RETURN total_spending;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create function to get budget utilization
    await trx.raw(`
      CREATE OR REPLACE FUNCTION get_budget_utilization(
          p_budget_id UUID
      )
      RETURNS TABLE (
          budget_id UUID,
          budget_name VARCHAR,
          budget_amount DECIMAL(15,2),
          spent_amount DECIMAL(15,2),
          remaining_amount DECIMAL(15,2),
          utilization_percent DECIMAL(5,2)
      ) AS $$
      BEGIN
          RETURN QUERY
          SELECT 
              b.id,
              b.name,
              b.amount,
              COALESCE((
                  SELECT SUM(t.amount)
                  FROM transactions t
                  WHERE t.user_id = b.user_id
                  AND t.category_id = b.category_id
                  AND t.type = 'expense'
                  AND t.transaction_date BETWEEN b.period_start AND b.period_end
              ), 0) AS spent,
              b.amount - COALESCE((
                  SELECT SUM(t.amount)
                  FROM transactions t
                  WHERE t.user_id = b.user_id
                  AND t.category_id = b.category_id
                  AND t.type = 'expense'
                  AND t.transaction_date BETWEEN b.period_start AND b.period_end
              ), 0) AS remaining,
              CASE 
                  WHEN b.amount > 0 THEN
                      ROUND(
                          (COALESCE((
                              SELECT SUM(t.amount)
                              FROM transactions t
                              WHERE t.user_id = b.user_id
                              AND t.category_id = b.category_id
                              AND t.type = 'expense'
                              AND t.transaction_date BETWEEN b.period_start AND b.period_end
                          ), 0) / b.amount) * 100, 2
                      )
                  ELSE 0
              END AS utilization
          FROM budgets b
          WHERE b.id = p_budget_id
          AND b.is_active = true;
      END;
      $$ LANGUAGE plpgsql;
    `);
    
    // Create view for account balances with current balances
    await trx.raw(`
      CREATE OR REPLACE VIEW account_balances AS
      SELECT 
          a.id,
          a.user_id,
          a.name,
          a.type,
          a.currency,
          a.balance AS stored_balance,
          get_account_balance_at_date(a.id, CURRENT_DATE) AS calculated_balance,
          a.include_in_net_worth,
          a.is_active,
          a.created_at,
          a.updated_at
      FROM accounts a
      WHERE a.is_active = true;
    `);
    
    console.log('✅ Database views and functions created successfully');
  });
}

export async function down(knex: Knex): Promise<void> {
  return withTransaction(knex, async (trx) => {
    console.log('📊 Rolling back database views and functions...');
    
    // Drop views first (they depend on functions)
    await trx.raw('DROP VIEW IF EXISTS account_balances');
    await trx.raw('DROP VIEW IF EXISTS transaction_summary');
    
    // Drop functions
    await trx.raw('DROP FUNCTION IF EXISTS get_budget_utilization(UUID)');
    await trx.raw('DROP FUNCTION IF EXISTS get_category_spending(UUID, UUID, DATE, DATE)');
    await trx.raw('DROP FUNCTION IF EXISTS get_account_balance_at_date(UUID, DATE)');
    await trx.raw('DROP FUNCTION IF EXISTS update_account_balance(UUID, DECIMAL, VARCHAR)');
    
    console.log('✅ Database views and functions rollback completed');
  });
}