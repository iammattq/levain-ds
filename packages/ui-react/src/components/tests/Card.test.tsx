import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Card } from '../Card';
import CardContent from '../CardContent';
import CardMedia from '../CardMedia';
import CardTitle from '../CardTitle';

describe('Card Component', () => {
  // Test Card as a static container (div)
  test('renders as a div when no href is provided', () => {
    render(<Card>Card Content</Card>);

    // Should find the text content
    expect(screen.getByText('Card Content')).toBeInTheDocument();

    // Should not find a link
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  // Test Card as a link
  test('renders as a link when href is provided', () => {
    render(<Card href="/test-path">Card Link</Card>);

    // Should find a link element with the right href
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/test-path');

    // Should also find the text content
    expect(screen.getByText('Card Link')).toBeInTheDocument();
  });

  // Test className prop
  test('applies className prop', () => {
    const { container } = render(
      <Card className="test-card-class">Card with class</Card>
    );

    expect(screen.getByText('Card with class')).toBeInTheDocument();
    expect(container.innerHTML).toContain('test-card-class');
  });

  // Test onClick handler
  test('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Card onClick={handleClick}>Clickable Card</Card>);

    const cardElement = screen.getByText('Clickable Card').closest('div');
    fireEvent.click(cardElement!);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  // Test Card with onclick handler as a link
  test('calls onClick handler when clicked as a link', () => {
    const handleClick = jest.fn();
    render(
      <Card href="/test-path" onClick={handleClick}>
        Clickable Link Card
      </Card>
    );

    const link = screen.getByRole('link');
    fireEvent.click(link);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

describe('CardContent Component', () => {
  // Test basic rendering
  test('renders children correctly', () => {
    render(<CardContent>Content text</CardContent>);

    // Just test that the content is rendered
    const contentElement = screen.getByText('Content text');
    expect(contentElement).toBeInTheDocument();
  });

  // Test className prop
  test('applies className prop', () => {
    const { container } = render(
      <CardContent className="test-custom-class">
        Custom class content
      </CardContent>
    );

    // Check that the content renders and the container has the expected class
    const contentElement = screen.getByText('Custom class content');
    expect(contentElement).toBeInTheDocument();

    // Check if the div with our custom class exists in the container
    expect(container.innerHTML).toContain('test-custom-class');
  });
});

describe('CardMedia Component', () => {
  // Test basic rendering
  test('renders children correctly', () => {
    render(
      <CardMedia>
        <div data-testid="media-content">Media content</div>
      </CardMedia>
    );

    const media = screen.getByTestId('media-content');
    expect(media).toBeInTheDocument();
    expect(screen.getByText('Media content')).toBeInTheDocument();
  });

  // Test className prop
  test('applies className prop', () => {
    const { container } = render(
      <CardMedia className="test-media-class">
        <div>Media with custom class</div>
      </CardMedia>
    );

    expect(screen.getByText('Media with custom class')).toBeInTheDocument();
    expect(container.innerHTML).toContain('test-media-class');
  });
});

describe('CardTitle Component', () => {
  // Test basic rendering with title only
  test('renders title correctly', () => {
    render(<CardTitle title="Test Title" />);

    const title = screen.getByText('Test Title');
    expect(title).toBeInTheDocument();
  });

  // Test with title and subtitle
  test('renders title and subtitle when both are provided', () => {
    render(<CardTitle title="Main Title" subtitle="The subtitle" />);

    const title = screen.getByText('Main Title');
    const subtitle = screen.getByText('The subtitle');

    expect(title).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
  });

  // Test className prop
  test('applies className prop', () => {
    const { container } = render(
      <CardTitle title="Classy Title" className="test-title-class" />
    );

    expect(screen.getByText('Classy Title')).toBeInTheDocument();
    expect(container.innerHTML).toContain('test-title-class');
  });
});

// Test integration of all Card components together
describe('Card Component Integration', () => {
  test('renders all card components together correctly', () => {
    render(
      <Card href="/test-card">
        <CardMedia>
          <div data-testid="media-content">Media content</div>
        </CardMedia>
        <CardContent>
          <CardTitle title="Card Title" subtitle="Card Subtitle" />
          <p>Additional content</p>
        </CardContent>
      </Card>
    );

    // Check link and containers
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/test-card');

    // Check media
    const mediaContent = screen.getByTestId('media-content');
    expect(mediaContent).toBeInTheDocument();

    // Check content and titles
    const title = screen.getByText('Card Title');
    const subtitle = screen.getByText('Card Subtitle');
    const additionalContent = screen.getByText('Additional content');

    expect(title).toBeInTheDocument();
    expect(subtitle).toBeInTheDocument();
    expect(additionalContent).toBeInTheDocument();
  });
});
