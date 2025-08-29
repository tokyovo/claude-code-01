-- Seed Data for Personal Finance Tracker Development Environment
-- This script creates sample data for development and testing

-- Only run in development environment
DO $$
BEGIN
    -- Always run in Docker development environment
    -- Check if we should insert seed data based on database name or existing marker
    IF current_database() = 'finance_tracker' THEN
        
        RAISE NOTICE 'Development environment detected, inserting seed data...';
        
        -- Insert sample users (passwords are hashed version of 'password123')
        INSERT INTO users (id, email, password_hash, first_name, last_name, status, email_verified) VALUES
        (
            uuid_generate_v4(),
            'john.doe@example.com',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeIYWNm6X8EFU5QOu', -- password123
            'John',
            'Doe',
            'active',
            true
        ),
        (
            uuid_generate_v4(),
            'jane.smith@example.com',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeIYWNm6X8EFU5QOu', -- password123
            'Jane',
            'Smith',
            'active',
            true
        ),
        (
            uuid_generate_v4(),
            'demo.user@example.com',
            '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LeIYWNm6X8EFU5QOu', -- password123
            'Demo',
            'User',
            'active',
            true
        );
        
        -- Get user IDs for further inserts
        -- Insert sample accounts
        WITH user_data AS (
            SELECT id as user_id, email FROM users WHERE email IN ('john.doe@example.com', 'jane.smith@example.com', 'demo.user@example.com')
        )
        INSERT INTO accounts (id, user_id, name, type, balance, currency, is_active)
        SELECT 
            uuid_generate_v4(),
            ud.user_id,
            account_name,
            account_type::account_type,
            account_balance,
            'USD',
            true
        FROM user_data ud
        CROSS JOIN (
            VALUES 
                ('Primary Checking', 'checking', 2500.00),
                ('Savings Account', 'savings', 10000.00),
                ('Credit Card', 'credit', -850.00),
                ('Investment Account', 'investment', 15000.00),
                ('Cash Wallet', 'cash', 200.00)
        ) AS accounts_data(account_name, account_type, account_balance);
        
        -- Insert sample categories
        WITH user_data AS (
            SELECT id as user_id FROM users WHERE email = 'john.doe@example.com'
        )
        INSERT INTO categories (id, user_id, name, description, color, icon, is_active)
        SELECT 
            uuid_generate_v4(),
            ud.user_id,
            category_name,
            category_desc,
            category_color,
            category_icon,
            true
        FROM user_data ud
        CROSS JOIN (
            VALUES 
                ('Food & Dining', 'Restaurants, groceries, and food delivery', '#FF6B6B', 'utensils'),
                ('Transportation', 'Gas, public transport, ride-sharing', '#4ECDC4', 'car'),
                ('Entertainment', 'Movies, games, subscriptions', '#45B7D1', 'gamepad'),
                ('Shopping', 'Clothing, electronics, general purchases', '#96CEB4', 'shopping-bag'),
                ('Bills & Utilities', 'Rent, electricity, water, internet', '#FECA57', 'file-text'),
                ('Healthcare', 'Medical expenses, pharmacy, insurance', '#FF9FF3', 'heart'),
                ('Education', 'Courses, books, training', '#54A0FF', 'book'),
                ('Salary', 'Primary income from employment', '#5F27CD', 'briefcase'),
                ('Freelance', 'Income from freelance work', '#00D2D3', 'laptop'),
                ('Investment', 'Dividends, capital gains', '#FF9F43', 'trending-up'),
                ('Gifts', 'Money received as gifts', '#1DD1A1', 'gift'),
                ('Other Income', 'Miscellaneous income sources', '#FD79A8', 'dollar-sign')
        ) AS categories_data(category_name, category_desc, category_color, category_icon);
        
        -- Copy categories for other users
        WITH john_categories AS (
            SELECT c.name, c.description, c.color, c.icon
            FROM categories c
            JOIN users u ON c.user_id = u.id
            WHERE u.email = 'john.doe@example.com'
        ),
        other_users AS (
            SELECT id as user_id FROM users WHERE email IN ('jane.smith@example.com', 'demo.user@example.com')
        )
        INSERT INTO categories (id, user_id, name, description, color, icon, is_active)
        SELECT 
            uuid_generate_v4(),
            ou.user_id,
            jc.name,
            jc.description,
            jc.color,
            jc.icon,
            true
        FROM john_categories jc
        CROSS JOIN other_users ou;
        
        -- Insert sample transactions for the last 90 days
        WITH user_accounts AS (
            SELECT 
                u.id as user_id,
                u.email,
                a.id as account_id,
                a.name as account_name,
                a.type as account_type
            FROM users u
            JOIN accounts a ON u.id = a.user_id
            WHERE u.email = 'john.doe@example.com'
        ),
        user_categories AS (
            SELECT 
                c.id as category_id,
                c.name as category_name
            FROM categories c
            JOIN users u ON c.user_id = u.id
            WHERE u.email = 'john.doe@example.com'
        )
        INSERT INTO transactions (id, user_id, account_id, category_id, type, amount, currency, description, transaction_date, tags, notes)
        SELECT 
            uuid_generate_v4(),
            ua.user_id,
            ua.account_id,
            uc.category_id,
            CASE 
                WHEN uc.category_name IN ('Salary', 'Freelance', 'Investment', 'Gifts', 'Other Income') THEN 'income'::transaction_type
                ELSE 'expense'::transaction_type
            END,
            transaction_amount,
            'USD',
            transaction_desc,
            (CURRENT_DATE - (random() * 90)::integer) as transaction_date,
            transaction_tags,
            transaction_notes
        FROM user_accounts ua
        CROSS JOIN user_categories uc
        CROSS JOIN (
            VALUES 
                -- Income transactions
                (3200.00, 'Monthly Salary - Software Engineer', ARRAY['salary', 'work'], 'Direct deposit'),
                (850.00, 'Freelance Project - Website Development', ARRAY['freelance', 'web'], 'Client payment via PayPal'),
                (125.50, 'Stock Dividend - AAPL', ARRAY['investment', 'dividend'], 'Quarterly dividend payment'),
                (200.00, 'Birthday Gift from Parents', ARRAY['gift', 'family'], 'Cash gift'),
                
                -- Food & Dining
                (45.67, 'Dinner at Italian Restaurant', ARRAY['restaurant', 'dinner'], 'Date night'),
                (23.45, 'Coffee Shop - Morning Latte', ARRAY['coffee', 'breakfast'], 'Daily coffee run'),
                (156.78, 'Grocery Shopping - Whole Foods', ARRAY['groceries', 'healthy'], 'Weekly grocery shopping'),
                (18.50, 'Food Delivery - Thai Cuisine', ARRAY['delivery', 'lunch'], 'Work from home lunch'),
                
                -- Transportation
                (45.00, 'Gas Station Fill-up', ARRAY['gas', 'commute'], 'Weekly gas fill'),
                (12.50, 'Public Transit - Metro Card', ARRAY['transit', 'commute'], 'Daily commute'),
                (25.75, 'Uber Ride to Airport', ARRAY['rideshare', 'travel'], 'Airport transfer'),
                
                -- Entertainment
                (15.99, 'Netflix Monthly Subscription', ARRAY['subscription', 'streaming'], 'Monthly entertainment'),
                (45.00, 'Movie Theater - Avengers', ARRAY['movies', 'weekend'], 'Weekend entertainment'),
                (29.99, 'PlayStation Game Purchase', ARRAY['gaming', 'digital'], 'New game release'),
                
                -- Shopping
                (89.99, 'Running Shoes - Nike', ARRAY['clothing', 'fitness'], 'Exercise equipment'),
                (234.50, 'Laptop Accessories - Monitor', ARRAY['electronics', 'work'], 'Home office setup'),
                (56.78, 'Casual Clothing - T-shirts', ARRAY['clothing', 'casual'], 'Weekend shopping'),
                
                -- Bills & Utilities
                (1200.00, 'Monthly Rent Payment', ARRAY['rent', 'housing'], 'Apartment rent'),
                (89.34, 'Electricity Bill - March', ARRAY['utilities', 'power'], 'Monthly utility'),
                (45.99, 'Internet Bill - Comcast', ARRAY['utilities', 'internet'], 'Monthly internet service'),
                (32.50, 'Water & Sewer Bill', ARRAY['utilities', 'water'], 'Quarterly water bill'),
                
                -- Healthcare
                (25.00, 'Prescription Medication', ARRAY['pharmacy', 'health'], 'Monthly prescription'),
                (150.00, 'Dental Cleaning', ARRAY['dental', 'preventive'], 'Semi-annual checkup'),
                (35.00, 'Gym Membership', ARRAY['fitness', 'health'], 'Monthly gym fee'),
                
                -- Education
                (49.99, 'Online Course - React Development', ARRAY['course', 'programming'], 'Professional development'),
                (23.50, 'Technical Book - Clean Code', ARRAY['books', 'learning'], 'Learning resource')
        ) AS transaction_data(transaction_amount, transaction_desc, transaction_tags, transaction_notes)
        WHERE 
            (uc.category_name IN ('Salary', 'Freelance', 'Investment', 'Gifts', 'Other Income') AND ua.account_type = 'checking')
            OR 
            (uc.category_name NOT IN ('Salary', 'Freelance', 'Investment', 'Gifts', 'Other Income') 
             AND uc.category_name = CASE 
                WHEN transaction_desc LIKE '%Salary%' THEN 'Salary'
                WHEN transaction_desc LIKE '%Freelance%' THEN 'Freelance'
                WHEN transaction_desc LIKE '%Stock%' OR transaction_desc LIKE '%Dividend%' THEN 'Investment'
                WHEN transaction_desc LIKE '%Gift%' THEN 'Gifts'
                WHEN transaction_desc LIKE '%Coffee%' OR transaction_desc LIKE '%Restaurant%' OR transaction_desc LIKE '%Grocery%' OR transaction_desc LIKE '%Delivery%' THEN 'Food & Dining'
                WHEN transaction_desc LIKE '%Gas%' OR transaction_desc LIKE '%Transit%' OR transaction_desc LIKE '%Uber%' THEN 'Transportation'
                WHEN transaction_desc LIKE '%Netflix%' OR transaction_desc LIKE '%Movie%' OR transaction_desc LIKE '%Game%' THEN 'Entertainment'
                WHEN transaction_desc LIKE '%Shoes%' OR transaction_desc LIKE '%Laptop%' OR transaction_desc LIKE '%Clothing%' THEN 'Shopping'
                WHEN transaction_desc LIKE '%Rent%' OR transaction_desc LIKE '%Electricity%' OR transaction_desc LIKE '%Internet%' OR transaction_desc LIKE '%Water%' THEN 'Bills & Utilities'
                WHEN transaction_desc LIKE '%Prescription%' OR transaction_desc LIKE '%Dental%' OR transaction_desc LIKE '%Gym%' THEN 'Healthcare'
                WHEN transaction_desc LIKE '%Course%' OR transaction_desc LIKE '%Book%' THEN 'Education'
                ELSE uc.category_name
             END)
        LIMIT 50; -- Limit to prevent too many transactions
        
        -- Insert sample budgets
        WITH user_data AS (
            SELECT u.id as user_id FROM users WHERE u.email = 'john.doe@example.com'
        ),
        user_categories AS (
            SELECT c.id as category_id, c.name as category_name
            FROM categories c
            JOIN users u ON c.user_id = u.id
            WHERE u.email = 'john.doe@example.com'
            AND c.name IN ('Food & Dining', 'Transportation', 'Entertainment', 'Shopping', 'Healthcare')
        )
        INSERT INTO budgets (id, user_id, category_id, name, amount, currency, period_start, period_end, is_active)
        SELECT 
            uuid_generate_v4(),
            ud.user_id,
            uc.category_id,
            'Monthly Budget - ' || uc.category_name,
            budget_amount,
            'USD',
            date_trunc('month', CURRENT_DATE),
            (date_trunc('month', CURRENT_DATE) + interval '1 month' - interval '1 day')::date,
            true
        FROM user_data ud
        CROSS JOIN user_categories uc
        CROSS JOIN (
            VALUES 
                (600.00), -- Food & Dining
                (200.00), -- Transportation
                (100.00), -- Entertainment
                (300.00), -- Shopping
                (150.00)  -- Healthcare
        ) AS budget_data(budget_amount);
        
        RAISE NOTICE 'Seed data insertion completed successfully!';
        
    ELSE
        RAISE NOTICE 'Production environment detected, skipping seed data insertion.';
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error inserting seed data: %', SQLERRM;
        RAISE;
END $$;

-- Create a marker table to indicate development mode
CREATE TABLE IF NOT EXISTS development_mode (
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO development_mode DEFAULT VALUES
ON CONFLICT DO NOTHING;

-- Log completion
SELECT 'Seed data script completed!' as message;