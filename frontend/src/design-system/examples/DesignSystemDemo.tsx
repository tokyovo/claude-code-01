/**
 * Design System Demo Component
 * Showcases the design system components and patterns
 * Use this as a reference and testing ground for the design system
 */

import { useState } from 'react';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Input,
  CurrencyInput,
  SearchInput,
  Badge,
  StatusBadge,
  TransactionTypeBadge,
  MetricCard,
} from '../index';

export function DesignSystemDemo() {
  const [searchValue, setSearchValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = () => {
    setIsLoading(true);
    setTimeout(() => setIsLoading(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-12">
        
        {/* Header */}
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Personal Finance Tracker Design System
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            A comprehensive design system built for financial applications with 
            accessibility, consistency, and user experience in mind.
          </p>
        </div>

        {/* Color Palette */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Color Palette</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* Primary Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Primary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary-100 rounded border"></div>
                  <span className="text-sm font-mono">primary-100</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary-500 rounded border"></div>
                  <span className="text-sm font-mono">primary-500</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-primary-900 rounded border"></div>
                  <span className="text-sm font-mono">primary-900</span>
                </div>
              </CardContent>
            </Card>

            {/* Success Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Success</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-success-100 rounded border"></div>
                  <span className="text-sm font-mono">success-100</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-success-500 rounded border"></div>
                  <span className="text-sm font-mono">success-500</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-success-900 rounded border"></div>
                  <span className="text-sm font-mono">success-900</span>
                </div>
              </CardContent>
            </Card>

            {/* Danger Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Danger</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-danger-100 rounded border"></div>
                  <span className="text-sm font-mono">danger-100</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-danger-500 rounded border"></div>
                  <span className="text-sm font-mono">danger-500</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-danger-900 rounded border"></div>
                  <span className="text-sm font-mono">danger-900</span>
                </div>
              </CardContent>
            </Card>

            {/* Warning Colors */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Warning</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-warning-100 rounded border"></div>
                  <span className="text-sm font-mono">warning-100</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-warning-500 rounded border"></div>
                  <span className="text-sm font-mono">warning-500</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-warning-900 rounded border"></div>
                  <span className="text-sm font-mono">warning-900</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Typography */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Typography</h2>
          <Card>
            <CardContent className="space-y-4">
              <div>
                <h1 className="text-5xl font-bold text-gray-900">Heading 1</h1>
                <code className="text-xs text-gray-500">text-5xl font-bold</code>
              </div>
              <div>
                <h2 className="text-4xl font-semibold text-gray-900">Heading 2</h2>
                <code className="text-xs text-gray-500">text-4xl font-semibold</code>
              </div>
              <div>
                <h3 className="text-3xl font-semibold text-gray-900">Heading 3</h3>
                <code className="text-xs text-gray-500">text-3xl font-semibold</code>
              </div>
              <div>
                <p className="text-base text-gray-700">
                  Body text - This is regular paragraph text used throughout the application.
                  It maintains good readability across different screen sizes.
                </p>
                <code className="text-xs text-gray-500">text-base text-gray-700</code>
              </div>
              <div>
                <span className="font-mono text-lg text-success-600">$1,234.56</span>
                <code className="text-xs text-gray-500 ml-4">font-mono (financial data)</code>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Buttons */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Buttons</h2>
          <Card>
            <CardContent>
              <div className="space-y-6">
                
                {/* Button Variants */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Variants</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="primary">Primary</Button>
                    <Button variant="secondary">Secondary</Button>
                    <Button variant="outline">Outline</Button>
                    <Button variant="ghost">Ghost</Button>
                    <Button variant="success">Success</Button>
                    <Button variant="danger">Danger</Button>
                    <Button variant="warning">Warning</Button>
                  </div>
                </div>

                {/* Button Sizes */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Sizes</h3>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button size="xs">Extra Small</Button>
                    <Button size="sm">Small</Button>
                    <Button size="md">Medium</Button>
                    <Button size="lg">Large</Button>
                    <Button size="xl">Extra Large</Button>
                  </div>
                </div>

                {/* Button States */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">States</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button loading={isLoading} onClick={handleSubmit}>
                      {isLoading ? 'Loading...' : 'Click to Load'}
                    </Button>
                    <Button disabled>Disabled</Button>
                    <Button 
                      leftIcon={
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      }
                    >
                      With Icon
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Form Inputs */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Form Inputs</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            <Card>
              <CardHeader>
                <CardTitle>Basic Inputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input 
                  label="Transaction Description" 
                  placeholder="Enter description"
                  helperText="Brief description of the transaction"
                />
                <Input 
                  label="Email Address" 
                  type="email"
                  placeholder="your@email.com"
                />
                <Input 
                  label="Error State" 
                  error="This field is required"
                  variant="error"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Specialized Inputs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <CurrencyInput 
                  label="Amount"
                  placeholder="0.00"
                  currency="$"
                />
                <SearchInput
                  placeholder="Search transactions..."
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onClear={() => setSearchValue('')}
                />
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Cards */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Cards</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Default Card */}
            <Card>
              <CardHeader>
                <CardTitle>Default Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  This is a standard card component with default styling.
                </p>
              </CardContent>
            </Card>

            {/* Elevated Card */}
            <Card variant="elevated">
              <CardHeader>
                <CardTitle>Elevated Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  This card has more prominent shadows for emphasis.
                </p>
              </CardContent>
            </Card>

            {/* Interactive Card */}
            <Card variant="interactive">
              <CardHeader>
                <CardTitle>Interactive Card</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  This card responds to hover and click interactions.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Metric Cards */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Financial Metrics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard
              title="Total Balance"
              value="$12,345.67"
              change={{ value: "+5.2%", type: "positive" }}
              icon={
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              }
            />
            <MetricCard
              title="Monthly Spending"
              value="$2,856.43"
              change={{ value: "-12.3%", type: "negative" }}
            />
            <MetricCard
              title="Savings Goal"
              value="$8,500.00"
              change={{ value: "85%", type: "neutral" }}
            />
            <MetricCard
              title="Investments"
              value="$15,678.90"
              change={{ value: "+8.7%", type: "positive" }}
            />
          </div>
        </section>

        {/* Badges */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Badges</h2>
          <Card>
            <CardContent>
              <div className="space-y-6">
                
                {/* Badge Variants */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Variants</h3>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">Default</Badge>
                    <Badge variant="primary">Primary</Badge>
                    <Badge variant="success">Success</Badge>
                    <Badge variant="danger">Danger</Badge>
                    <Badge variant="warning">Warning</Badge>
                    <Badge variant="info">Info</Badge>
                  </div>
                </div>

                {/* Status Badges */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Status Badges</h3>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status="active" />
                    <StatusBadge status="pending" />
                    <StatusBadge status="completed" />
                    <StatusBadge status="failed" />
                    <StatusBadge status="cancelled" />
                  </div>
                </div>

                {/* Transaction Type Badges */}
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Transaction Types</h3>
                  <div className="flex flex-wrap gap-2">
                    <TransactionTypeBadge type="income" />
                    <TransactionTypeBadge type="expense" />
                    <TransactionTypeBadge type="transfer" />
                    <TransactionTypeBadge type="investment" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Responsive Demo */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Responsive Layout</h2>
          <Card>
            <CardHeader>
              <CardTitle>Responsive Grid</CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                This grid adapts from 1 column on mobile to 4 columns on desktop
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="bg-primary-50 border border-primary-200 rounded-lg p-4 text-center">
                    <div className="text-primary-600 font-semibold">Item {item}</div>
                    <div className="text-sm text-gray-500 mt-1">Responsive item</div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Footer */}
        <footer className="text-center text-gray-500 py-8">
          <p>Personal Finance Tracker Design System</p>
          <p className="text-sm mt-1">Built with accessibility and consistency in mind</p>
        </footer>
      </div>
    </div>
  );
}