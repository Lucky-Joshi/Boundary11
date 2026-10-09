import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ProductCard } from './ProductCard.jsx';
import { WishlistProvider } from '../../context/WishlistContext.jsx';

const product = {
  id: 'p1',
  name: 'Matchday Home Jersey',
  slug: 'matchday-home-jersey',
  categoryName: 'Jerseys',
  minPricePaise: 149900,
  minCompareAtPaise: 199900,
  discountPercent: 25,
  rating: 4.7,
  reviewCount: 214,
  featured: true,
  inStock: true,
  accent: '#1d2b53',
};

function renderCard(item = product) {
  return render(
    <MemoryRouter>
      <WishlistProvider>
        <ProductCard product={item} />
      </WishlistProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
});

describe('ProductCard', () => {
  it('renders the product name and price', () => {
    renderCard();
    expect(screen.getByText('Matchday Home Jersey')).toBeInTheDocument();
    expect(screen.getByText('₹1,499')).toBeInTheDocument();
  });

  it('shows a discount badge when discounted', () => {
    renderCard();
    expect(screen.getByText('-25%')).toBeInTheDocument();
  });

  it('toggles the wishlist when the heart is clicked', () => {
    renderCard();
    const button = screen.getByRole('button', { name: /add to wishlist/i });
    fireEvent.click(button);
    expect(JSON.parse(localStorage.getItem('b11_wishlist'))).toHaveLength(1);
  });

  it('marks an out-of-stock product', () => {
    renderCard({ ...product, inStock: false });
    expect(screen.getByText('Sold out')).toBeInTheDocument();
  });
});
