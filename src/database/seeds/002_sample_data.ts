import { Knex } from 'knex';
import { hash } from 'bcrypt';
// import { seedHelpers } from '../utils/migrationHelpers';

interface SampleUser {
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  email_verified: boolean;
}

// interface SampleAccount {
//   user_id: string;
//   name: string;
//   type: string;
//   balance: number;
//   currency: string;
//   description?: string;
// }

// interface SampleTransaction {
//   user_id: string;
//   account_id: string;
//   category_id?: string;
//   type: string;
//   amount: number;
//   description: string;
//   transaction_date: Date;
//   currency: string;
//   transfer_account_id?: string;
//   merchant_name?: string;
//   tags?: string[];
// }

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Seeding sample data...');
  
  // Only run in development environment
  if (process.env.NODE_ENV === 'production') {
    console.log('⚠️  Skipping sample data seeding in production environment');
    return;
  }

  try {

    // Clear existing sample data safely (in reverse order of dependencies)
    console.log('📊 Clearing existing sample data...');
    
    const sampleUserIds = await knex('users')
      .select('id')
      .where('email', 'LIKE', '%@example.com')
      .pluck('id');
    
    if (sampleUserIds.length > 0) {
      await knex('budgets').whereIn('user_id', sampleUserIds).del();
      await knex('transactions').whereIn('user_id', sampleUserIds).del();
      await knex('accounts').whereIn('user_id', sampleUserIds).del();
      await knex('categories').whereIn('user_id', sampleUserIds).del();
      await knex('users').where('email', 'LIKE', '%@example.com').del();
      console.log(`📊 Cleared data for ${sampleUserIds.length} sample users`);
    }

    // Create sample users with validation
    console.log('📊 Creating sample users...');
    const hashedPassword = await hash('password123', 12);
    
    // Validate email format
    const validateEmail = (email: string): boolean => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    };
    
    const sampleUsers: SampleUser[] = [
      {
        email: 'john.doe@example.com',
        password_hash: hashedPassword,
        first_name: 'John',
        last_name: 'Doe',
        email_verified: true,
      },
      {
        email: 'jane.smith@example.com',
        password_hash: hashedPassword,
        first_name: 'Jane',
        last_name: 'Smith',
        email_verified: true,
      },
      {
        email: 'demo.user@example.com',
        password_hash: hashedPassword,
        first_name: 'Demo',
        last_name: 'User',
        email_verified: true,
      },
    ];

    // Validate user data
    for (const user of sampleUsers) {
      if (!validateEmail(user.email)) {
        throw new Error(`Invalid email format: ${user.email}`);
      }
      if (!user.first_name || !user.last_name) {
        throw new Error(`Missing name for user: ${user.email}`);
      }
    }

    const insertedUsers = await knex('users').insert(sampleUsers).returning('*');
    const [johnDoe, janeSmith] = insertedUsers;
    
    console.log(`✅ Created ${insertedUsers.length} sample users`);

  // Create sample accounts for John Doe
  const johnAccounts = [
    {
      user_id: johnDoe.id,
      name: 'Primary Checking',
      type: 'checking',
      balance: 2500.00,
      currency: 'USD',
    },
    {
      user_id: johnDoe.id,
      name: 'Savings Account',
      type: 'savings',
      balance: 15000.00,
      currency: 'USD',
    },
    {
      user_id: johnDoe.id,
      name: 'Credit Card',
      type: 'credit',
      balance: 0.00, // Credit cards start at 0, debt is shown as negative balance
      currency: 'USD',
    },
  ];

  // Create sample accounts for Jane Smith
  const janeAccounts = [
    {
      user_id: janeSmith.id,
      name: 'Main Checking',
      type: 'checking',
      balance: 3200.00,
      currency: 'USD',
    },
    {
      user_id: janeSmith.id,
      name: 'Emergency Fund',
      type: 'savings',
      balance: 8500.00,
      currency: 'USD',
    },
  ];

  const insertedAccounts = await knex('accounts').insert([...johnAccounts, ...janeAccounts]).returning('*');
  
  // Get account IDs
  const johnCheckingId = insertedAccounts.find(acc => acc.name === 'Primary Checking' && acc.user_id === johnDoe.id)?.id;
  const johnSavingsId = insertedAccounts.find(acc => acc.name === 'Savings Account' && acc.user_id === johnDoe.id)?.id;
  // const johnCreditId = insertedAccounts.find(acc => acc.name === 'Credit Card' && acc.user_id === johnDoe.id)?.id;
  const janeCheckingId = insertedAccounts.find(acc => acc.name === 'Main Checking' && acc.user_id === janeSmith.id)?.id;
  // const janeSavingsId = insertedAccounts.find(acc => acc.name === 'Emergency Fund' && acc.user_id === janeSmith.id)?.id;

  // Get system categories for reference
  const systemUser = await knex('users').where('email', 'system@personalfinancetracker.com').first();
  const categories = await knex('categories').where('user_id', systemUser.id);
  
  // Create user-specific categories (copying from system categories)
  const johnCategories = categories.slice(0, 12).map(cat => ({
    user_id: johnDoe.id,
    name: cat.name,
    description: cat.description,
    color: cat.color,
    icon: cat.icon,
  }));

  const janeCategories = categories.slice(0, 10).map(cat => ({
    user_id: janeSmith.id,
    name: cat.name,
    description: cat.description,
    color: cat.color,
    icon: cat.icon,
  }));

  const insertedUserCategories = await knex('categories').insert([...johnCategories, ...janeCategories]).returning('*');

  // Get category IDs
  const getCategoryId = (userId: string, name: string) => 
    insertedUserCategories.find(cat => cat.user_id === userId && cat.name === name)?.id;

  // Create sample transactions for John Doe (last 30 days)
  const currentDate = new Date();
  const johnTransactions = [];

  // Income transactions
  johnTransactions.push({
    user_id: johnDoe.id,
    account_id: johnCheckingId,
    category_id: getCategoryId(johnDoe.id, 'Salary'),
    type: 'income',
    amount: 5000.00,
    description: 'Monthly Salary',
    transaction_date: new Date(currentDate.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    currency: 'USD',
  });

  // Expense transactions
  const expenseTransactions = [
    { amount: 850.00, description: 'Monthly Rent', category: 'Home & Garden', daysAgo: 3 },
    { amount: 120.00, description: 'Grocery Shopping', category: 'Food & Dining', daysAgo: 2 },
    { amount: 45.00, description: 'Gas Station', category: 'Transportation', daysAgo: 1 },
    { amount: 25.00, description: 'Coffee Shop', category: 'Food & Dining', daysAgo: 1 },
    { amount: 80.00, description: 'Electric Bill', category: 'Bills & Utilities', daysAgo: 7 },
    { amount: 15.99, description: 'Netflix Subscription', category: 'Entertainment', daysAgo: 10 },
    { amount: 200.00, description: 'New Shoes', category: 'Shopping', daysAgo: 12 },
  ];

  expenseTransactions.forEach(expense => {
    johnTransactions.push({
      user_id: johnDoe.id,
      account_id: johnCheckingId,
      category_id: getCategoryId(johnDoe.id, expense.category),
      type: 'expense',
      amount: expense.amount,
      description: expense.description,
      transaction_date: new Date(currentDate.getTime() - expense.daysAgo * 24 * 60 * 60 * 1000),
      currency: 'USD',
    });
  });

  // Transfer transaction
  johnTransactions.push({
    user_id: johnDoe.id,
    account_id: johnCheckingId,
    category_id: null,
    type: 'transfer',
    amount: 500.00,
    description: 'Transfer to Savings',
    transaction_date: new Date(currentDate.getTime() - 4 * 24 * 60 * 60 * 1000),
    currency: 'USD',
    transfer_account_id: johnSavingsId,
  });

  // Create sample transactions for Jane Smith
  const janeTransactions = [
    {
      user_id: janeSmith.id,
      account_id: janeCheckingId,
      category_id: getCategoryId(janeSmith.id, 'Salary'),
      type: 'income',
      amount: 4500.00,
      description: 'Monthly Salary',
      transaction_date: new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000),
      currency: 'USD',
    },
    {
      user_id: janeSmith.id,
      account_id: janeCheckingId,
      category_id: getCategoryId(janeSmith.id, 'Food & Dining'),
      type: 'expense',
      amount: 95.50,
      description: 'Whole Foods',
      transaction_date: new Date(currentDate.getTime() - 1 * 24 * 60 * 60 * 1000),
      currency: 'USD',
    },
    {
      user_id: janeSmith.id,
      account_id: janeCheckingId,
      category_id: getCategoryId(janeSmith.id, 'Transportation'),
      type: 'expense',
      amount: 12.50,
      description: 'Metro Card',
      transaction_date: new Date(currentDate.getTime() - 2 * 24 * 60 * 60 * 1000),
      currency: 'USD',
    },
  ];

  await knex('transactions').insert([...johnTransactions, ...janeTransactions]);

  // Create sample budgets
  const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
  const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

  const sampleBudgets = [
    {
      user_id: johnDoe.id,
      category_id: getCategoryId(johnDoe.id, 'Food & Dining'),
      name: 'Monthly Food Budget',
      amount: 400.00,
      currency: 'USD',
      period_start: startOfMonth,
      period_end: endOfMonth,
    },
    {
      user_id: johnDoe.id,
      category_id: getCategoryId(johnDoe.id, 'Transportation'),
      name: 'Transportation Budget',
      amount: 200.00,
      currency: 'USD',
      period_start: startOfMonth,
      period_end: endOfMonth,
    },
    {
      user_id: janeSmith.id,
      category_id: getCategoryId(janeSmith.id, 'Food & Dining'),
      name: 'Grocery Budget',
      amount: 350.00,
      currency: 'USD',
      period_start: startOfMonth,
      period_end: endOfMonth,
    },
  ];

  await knex('budgets').insert(sampleBudgets);

    console.log('✅ Sample data seeded successfully!');
    console.log('📊 Sample users created:');
    console.log('   - john.doe@example.com (password: password123)');
    console.log('   - jane.smith@example.com (password: password123)');
    console.log('   - demo.user@example.com (password: password123)');
    console.log('💡 Use these credentials to test the application');
    
  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
    throw error;
  }
}