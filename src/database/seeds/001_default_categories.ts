import { Knex } from 'knex';
import { seedHelpers } from '../utils/migrationHelpers';

interface CategoryData {
  name: string;
  description: string;
  color: string;
  icon: string;
  is_system: boolean;
  user_id?: string;
}

export async function seed(knex: Knex): Promise<void> {
  console.log('🌱 Seeding default categories...');
  
  try {
    // First, we need to create a system user for default categories
    // Check if system user exists
    const systemUser = await knex('users')
      .where('email', 'system@personalfinancetracker.com')
      .first();

    let systemUserId: string;

    if (!systemUser) {
      // Create system user with proper validation
      const systemUserData = {
        email: 'system@personalfinancetracker.com',
        password_hash: '$2b$12$systemUserNoLoginAllowed',
        first_name: 'System',
        last_name: 'User',
        status: 'active',
        email_verified: true,
      };
      
      console.log('📊 Creating system user for default categories...');
      
      const [insertedUser] = await knex('users')
        .insert(systemUserData)
        .returning('id');
      
      systemUserId = insertedUser.id;
      console.log(`✅ System user created with ID: ${systemUserId}`);
    } else {
      systemUserId = systemUser.id;
      console.log(`📊 Using existing system user: ${systemUserId}`);
    }

    // Clear existing system categories safely
    await seedHelpers.clearTable(knex, 'categories', { user_id: systemUserId, is_system: true });
    console.log('📊 Cleared existing system categories');

    // Validate category data before insertion
    const validateCategoryData = (category: Omit<CategoryData, 'user_id' | 'is_system'>): boolean => {
      if (!category.name || category.name.trim().length === 0) {
        console.error(`Invalid category name: ${category.name}`);
        return false;
      }
      
      if (!category.color || !/^#[0-9A-Fa-f]{6}$/.test(category.color)) {
        console.error(`Invalid color format for ${category.name}: ${category.color}`);
        return false;
      }
      
      if (!category.icon || category.icon.trim().length === 0) {
        console.error(`Missing icon for category: ${category.name}`);
        return false;
      }
      
      return true;
    };

    // Insert default expense categories
    const expenseCategories = [
      { name: 'Food & Dining', description: 'Restaurants, groceries, and food delivery', color: '#FF6B6B', icon: 'utensils' },
      { name: 'Transportation', description: 'Car payments, gas, public transit, parking', color: '#4ECDC4', icon: 'car' },
      { name: 'Shopping', description: 'Clothing, electronics, and general shopping', color: '#45B7D1', icon: 'shopping-bag' },
      { name: 'Entertainment', description: 'Movies, games, subscriptions, and hobbies', color: '#96CEB4', icon: 'film' },
      { name: 'Bills & Utilities', description: 'Electric, water, internet, phone bills', color: '#FFEAA7', icon: 'receipt' },
      { name: 'Healthcare', description: 'Medical expenses, pharmacy, insurance', color: '#FD79A8', icon: 'heart' },
      { name: 'Education', description: 'Tuition, books, courses, and learning materials', color: '#6C5CE7', icon: 'book' },
      { name: 'Travel', description: 'Flights, hotels, vacation expenses', color: '#A29BFE', icon: 'plane' },
      { name: 'Home & Garden', description: 'Rent, mortgage, home improvement, gardening', color: '#FD7272', icon: 'home' },
      { name: 'Personal Care', description: 'Haircuts, cosmetics, spa, personal hygiene', color: '#FDCB6E', icon: 'user' },
      { name: 'Gifts & Donations', description: 'Gifts for others, charitable donations', color: '#E17055', icon: 'gift' },
      { name: 'Business Expenses', description: 'Business meals, office supplies, professional services', color: '#74B9FF', icon: 'briefcase' },
      { name: 'Insurance', description: 'Life, auto, home, and health insurance', color: '#81ECEC', icon: 'shield' },
      { name: 'Taxes', description: 'Income tax, property tax, other tax payments', color: '#DDA0DD', icon: 'file-text' },
      { name: 'Miscellaneous', description: 'Other expenses that don\'t fit other categories', color: '#B2BEC3', icon: 'more-horizontal' },
    ];

    // Insert income categories
    const incomeCategories = [
      { name: 'Salary', description: 'Primary job salary and wages', color: '#00B894', icon: 'dollar-sign' },
      { name: 'Freelance', description: 'Freelance work and contract income', color: '#00CEC9', icon: 'briefcase' },
      { name: 'Investment Income', description: 'Dividends, interest, capital gains', color: '#0984E3', icon: 'trending-up' },
      { name: 'Business Income', description: 'Business income and profits', color: '#6C5CE7', icon: 'building' },
      { name: 'Rental Income', description: 'Rental property income', color: '#A29BFE', icon: 'home' },
      { name: 'Side Hustle', description: 'Part-time work and side projects', color: '#FD79A8', icon: 'zap' },
      { name: 'Bonus', description: 'Work bonuses and performance incentives', color: '#FDCB6E', icon: 'award' },
      { name: 'Gifts Received', description: 'Money received as gifts', color: '#E17055', icon: 'gift' },
      { name: 'Refunds', description: 'Tax refunds, purchase returns', color: '#81ECEC', icon: 'refresh-cw' },
      { name: 'Other Income', description: 'Other sources of income', color: '#B2BEC3', icon: 'plus' },
    ];

    // Validate all categories before processing
    const allRawCategories = [...expenseCategories, ...incomeCategories];
    const validCategories = allRawCategories.filter(validateCategoryData);
    
    if (validCategories.length !== allRawCategories.length) {
      throw new Error(`${allRawCategories.length - validCategories.length} categories failed validation`);
    }

    // Prepare categories with additional fields
    const categoriesWithMetadata: CategoryData[] = validCategories.map((cat, index) => ({
      ...cat,
      user_id: systemUserId,
      is_system: true,
      display_order: index + 1,
      is_active: true,
    }));

    // Insert categories using regular insert since we cleared the table
    await knex('categories').insert(categoriesWithMetadata);

    console.log(`✅ Successfully seeded ${categoriesWithMetadata.length} default categories`);
    console.log(`   - ${expenseCategories.length} expense categories`);
    console.log(`   - ${incomeCategories.length} income categories`);
    
  } catch (error) {
    console.error('❌ Error seeding default categories:', error);
    throw error;
  }
}