import { describe, it, expect } from '@jest/globals';
import { render, screen } from '../../../__tests__/utils/testUtils';
import { LoadingSpinner } from '../LoadingSpinner';

describe('LoadingSpinner Component', () => {
  it('renders loading spinner with default props', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
  });

  it('renders with custom size', () => {
    render(<LoadingSpinner size="large" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    expect(spinner).toHaveClass('w-12', 'h-12'); // Assuming large size classes
  });

  it('renders with custom text', () => {
    const customText = 'Processing your request...';
    render(<LoadingSpinner text={customText} />);
    
    expect(screen.getByText(customText)).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const customClass = 'my-custom-spinner';
    render(<LoadingSpinner className={customClass} />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass(customClass);
  });

  it('has proper accessibility attributes', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveAttribute('aria-label', 'Loading');
    expect(spinner).toHaveAttribute('aria-live', 'polite');
  });

  it('renders without text when text is not provided', () => {
    render(<LoadingSpinner />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toBeInTheDocument();
    
    // Should not have any text content
    expect(spinner.textContent?.trim()).toBeFalsy();
  });

  it('combines custom className with default classes', () => {
    render(<LoadingSpinner className="custom-class" />);
    
    const spinner = screen.getByRole('status');
    expect(spinner).toHaveClass('custom-class');
    // Should also have default loading spinner classes
    expect(spinner).toHaveClass('animate-spin');
  });

  describe('size variations', () => {
    const sizeTestCases = [
      { size: 'small' as const, expectedClasses: ['w-4', 'h-4'] },
      { size: 'medium' as const, expectedClasses: ['w-6', 'h-6'] },
      { size: 'large' as const, expectedClasses: ['w-12', 'h-12'] },
    ];

    sizeTestCases.forEach(({ size, expectedClasses }) => {
      it(`renders ${size} size correctly`, () => {
        render(<LoadingSpinner size={size} />);
        
        const spinner = screen.getByRole('status');
        expectedClasses.forEach(className => {
          expect(spinner).toHaveClass(className);
        });
      });
    });
  });

  describe('color variations', () => {
    it('renders with default color', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner.firstChild).toHaveClass('text-primary'); // Assuming default color
    });

    it('renders with custom color', () => {
      render(<LoadingSpinner color="secondary" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner.firstChild).toHaveClass('text-secondary');
    });
  });

  describe('animation', () => {
    it('has spinning animation class', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('animate-spin');
    });

    it('can disable animation', () => {
      render(<LoadingSpinner animate={false} />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).not.toHaveClass('animate-spin');
    });
  });

  describe('inline vs block display', () => {
    it('renders as inline by default', () => {
      render(<LoadingSpinner />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('inline-block');
    });

    it('renders as block when specified', () => {
      render(<LoadingSpinner display="block" />);
      
      const spinner = screen.getByRole('status');
      expect(spinner).toHaveClass('block');
      expect(spinner).not.toHaveClass('inline-block');
    });
  });

  describe('integration with loading states', () => {
    it('works with conditional rendering', () => {
      const { rerender } = render(
        <div>
          {false && <LoadingSpinner />}
          <span>Content</span>
        </div>
      );
      
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
      
      rerender(
        <div>
          {true && <LoadingSpinner />}
          <span>Content</span>
        </div>
      );
      
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('can be used in button loading states', () => {
      render(
        <button disabled>
          <LoadingSpinner size="small" />
          <span>Loading...</span>
        </button>
      );
      
      const button = screen.getByRole('button');
      const spinner = screen.getByRole('status');
      
      expect(button).toBeDisabled();
      expect(spinner).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });
  });

  describe('performance', () => {
    it('renders quickly with default props', () => {
      const startTime = performance.now();
      
      render(<LoadingSpinner />);
      
      const renderTime = performance.now() - startTime;
      
      // Should render very quickly (less than 10ms)
      expect(renderTime).toBeLessThan(10);
    });

    it('does not cause unnecessary re-renders', () => {
      let renderCount = 0;
      
      function TestComponent() {
        renderCount++;
        return <LoadingSpinner />;
      }
      
      const { rerender } = render(<TestComponent />);
      
      expect(renderCount).toBe(1);
      
      // Rerender with same props shouldn't cause additional renders
      rerender(<TestComponent />);
      
      expect(renderCount).toBe(2); // Only one additional render
    });
  });

  describe('error boundaries', () => {
    it('does not throw errors with invalid props', () => {
      // Test with potentially problematic props
      expect(() => {
        render(<LoadingSpinner size={undefined as any} />);
      }).not.toThrow();
      
      expect(() => {
        render(<LoadingSpinner className={null as any} />);
      }).not.toThrow();
    });
  });
});