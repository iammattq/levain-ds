import React from 'react';
import {
  render,
  screen,
  fireEvent,
  act,
  waitFor,
} from '@testing-library/react';
import '@testing-library/jest-dom';
import ImageUploader from '../ImageUploader';
import { useDropzone } from 'react-dropzone';

jest.mock('../../provider/LevainProvider', () => {
  const actual = jest.requireActual('../../provider/LevainProvider');
  const image = (() => {
  // eslint-disable-next-line @next/next/no-img-element
  return function NextImage({
    src,
    alt,
    className,
  }: {
    src: string;
    alt: string;
    className?: string;
  }) {
    return (
      // This is a mock for testing only, no need to use next/image here
      // eslint-disable-next-line @next/next/no-img-element
      <img src={src} alt={alt} className={className} data-testid="next-image" />
    );
  };
})();
  return { ...actual, Image: image.default ?? image };
});

// Store for dropzone state and callbacks
let dropzoneCallback: ((files: File[]) => void) | null = null;

// Mock the components and APIs

jest.mock('lucide-react', () => ({
  Upload: () => <div data-testid="upload-icon">Upload Icon</div>,
  X: () => <div data-testid="x-icon">X Icon</div>,
  Image: () => <div data-testid="image-icon">Image Icon</div>,
}));

jest.mock('../../components/Button', () => ({
  Button: ({
    children,
    onClick,
    type,
    variant,
    size,
    className,
    title,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
    variant?: string;
    size?: string;
    className?: string;
    title?: string;
  }) => (
    <button
      onClick={onClick}
      type={type}
      className={`mock-button ${variant || ''} ${size || ''} ${className || ''}`}
      data-testid="remove-button"
      title={title}
    >
      {children}
    </button>
  ),
}));

jest.mock('react-dropzone', () => ({
  useDropzone: jest.fn((props) => {
    // Store callback in module state
    if (props && typeof props.onDrop === 'function') {
      dropzoneCallback = props.onDrop;
    }

    return {
      getRootProps: () => ({
        onClick: jest.fn(),
        role: 'button',
        'aria-label': 'Drag and drop area',
        'data-testid': 'dropzone',
      }),
      getInputProps: () => ({
        type: 'file',
        accept: props?.accept ? Object.keys(props.accept).join(',') : 'image/*',
        multiple: props?.maxFiles ? props.maxFiles > 1 : false,
        disabled: props?.disabled || false,
        'data-testid': 'file-input',
      }),
      isDragActive: false, // Default value - will be overridden in specific tests
      open: jest.fn(),
    };
  }),
}));

// Mock fetch API
global.fetch = jest.fn();
const mockFetch = global.fetch as jest.Mock;

// Create mock XMLHttpRequest for upload testing
class MockXMLHttpRequest {
  open = jest.fn();
  send = jest.fn();
  setRequestHeader = jest.fn();
  readyState = 4;
  status = 200;
  response = '';
  responseText = '';
  onload: (() => void) | null = null;
  onerror: ((err: Error) => void) | null = null;
  upload = {
    onprogress: jest.fn(),
  };

  constructor() {
    // Default send implementation - does nothing until overridden
    this.send = jest.fn();
  }
}

// Store original XMLHttpRequest
const OriginalXHR = global.XMLHttpRequest;

// Create mock file
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(['mock-content'], name, { type });
  Object.defineProperty(file, 'size', { value: size });
  return file;
};

describe('ImageUploader Pattern', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Reset state
    dropzoneCallback = null;

    // Reset useDropzone mock default implementation
    (useDropzone as jest.Mock).mockImplementation((props) => {
      if (props && typeof props.onDrop === 'function') {
        dropzoneCallback = props.onDrop;
      }

      return {
        getRootProps: () => ({
          onClick: jest.fn(),
          role: 'button',
          'aria-label': 'Drag and drop area',
          'data-testid': 'dropzone',
        }),
        getInputProps: () => ({
          type: 'file',
          accept: props?.accept
            ? Object.keys(props.accept).join(',')
            : 'image/*',
          multiple: props?.maxFiles ? props.maxFiles > 1 : false,
          disabled: props?.disabled || false,
          'data-testid': 'file-input',
        }),
        isDragActive: false,
        open: jest.fn(),
      };
    });

    // Mock XMLHttpRequest
    global.XMLHttpRequest = jest.fn(() => {
      return new MockXMLHttpRequest() as unknown as XMLHttpRequest;
    }) as unknown as typeof XMLHttpRequest;

    // Reset fetch mock
    mockFetch.mockReset();
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );

    // Mock timers
    jest.useFakeTimers();
  });

  afterEach(() => {
    // Restore XMLHttpRequest
    global.XMLHttpRequest = OriginalXHR;

    // Restore timers
    jest.useRealTimers();
  });

  // Basic rendering tests
  test('renders correctly with default props', () => {
    render(<ImageUploader entityType="test" onImagesUploaded={() => {}} />);

    expect(screen.getByText('Upload Image')).toBeInTheDocument();
    expect(
      screen.getByText('Drag & drop an image here, or click to select')
    ).toBeInTheDocument();
  });

  test('renders with custom label and description', () => {
    render(
      <ImageUploader
        entityType="test"
        onImagesUploaded={() => {}}
        label="Custom Label"
        description="Custom Description"
      />
    );

    expect(screen.getByText('Custom Label')).toBeInTheDocument();
    expect(screen.getByText('Custom Description')).toBeInTheDocument();
  });

  test('shows initial images when provided', async () => {
    const initialImages = ['https://example.com/image1.jpg'];

    render(
      <ImageUploader
        entityType="test"
        initialImages={initialImages}
        onImagesUploaded={() => {}}
      />
    );

    // Wait for the image to appear
    const image = await screen.findByTestId('next-image');
    expect(image).toBeInTheDocument();
    expect(image).toHaveAttribute('src', initialImages[0]);
  });

  test('respects the hidePreview prop with initial images', () => {
    const initialImages = ['https://example.com/image1.jpg'];

    render(
      <ImageUploader
        entityType="test"
        initialImages={initialImages}
        onImagesUploaded={() => {}}
        hidePreview={true}
      />
    );

    // With hidePreview=true, we shouldn't see the image preview
    expect(screen.queryByTestId('next-image')).not.toBeInTheDocument();
  });

  // File upload tests
  test('handles file upload successfully', async () => {
    const mockOnImagesUploaded = jest.fn();

    // Create a custom XMLHttpRequest mock for this test
    const mockXhr = new MockXMLHttpRequest();
    // Define the successful upload behavior
    mockXhr.send = jest.fn().mockImplementation(function () {
      // Simulate progress completion and successful load
      setTimeout(() => {
        if (mockXhr.upload.onprogress) {
          mockXhr.upload.onprogress({
            lengthComputable: true,
            loaded: 100,
            total: 100,
          } as ProgressEvent);
        }
        if (mockXhr.onload) {
          // Set responseText *before* calling onload
          mockXhr.responseText = JSON.stringify({
            imageUrl: 'https://example.com/uploaded.jpg',
          });
          mockXhr.onload();
        }
      }, 10);
    });
    (global.XMLHttpRequest as unknown as jest.Mock).mockReturnValue(
      mockXhr as unknown as XMLHttpRequest
    );

    render(
      <ImageUploader
        entityType="test"
        onImagesUploaded={mockOnImagesUploaded}
      />
    );

    // Create a mock file
    const mockFile = createMockFile('test-image.jpg', 1024, 'image/jpeg');

    // Simulate dropzone callback and wait for related async operations
    await act(async () => {
      if (dropzoneCallback) {
        // No await here, let the internal promise chain handle it
        dropzoneCallback([mockFile]);
      }
      // Run timers to allow the setTimeout in mockXhr.send to execute
      await jest.runAllTimersAsync();
    });

    // Verify callback was called with the URL
    await waitFor(() => {
      expect(mockOnImagesUploaded).toHaveBeenCalledWith([
        'https://example.com/uploaded.jpg',
      ]);
    });
  }, 30000); // Increase timeout to 30 seconds

  test('handles upload errors', async () => {
    const mockOnImagesUploaded = jest.fn();

    // Create a custom XMLHttpRequest mock that triggers an error
    const mockXhr = new MockXMLHttpRequest();
    mockXhr.send = jest.fn().mockImplementation(() => {
      // Simulate an error
      setTimeout(() => {
        if (mockXhr.onerror) {
          mockXhr.onerror(new Error('Simulated upload failure'));
        }
      }, 10);
    });
    (global.XMLHttpRequest as unknown as jest.Mock).mockReturnValue(
      mockXhr as unknown as XMLHttpRequest
    );

    render(
      <ImageUploader
        entityType="test"
        onImagesUploaded={mockOnImagesUploaded}
      />
    );

    // Create a mock file
    const mockFile = createMockFile('test-image.jpg', 1024, 'image/jpeg');

    // Simulate dropzone callback
    await act(async () => {
      if (dropzoneCallback) {
        dropzoneCallback([mockFile]);
      }
      // Allow the error handler to run
      await jest.runAllTimersAsync();
    });

    // Check for error message using findByText
    const errorMessage = await screen.findByText(/Failed to upload image/i);
    expect(errorMessage).toBeInTheDocument();

    // The callback should not have been called
    expect(mockOnImagesUploaded).not.toHaveBeenCalled();
  }, 30000); // Increase timeout

  test('enforces maximum image limit', async () => {
    const mockOnImagesUploaded = jest.fn();
    const initialImages = ['https://example.com/image1.jpg'];

    render(
      <ImageUploader
        entityType="test"
        initialImages={initialImages}
        onImagesUploaded={mockOnImagesUploaded}
        maxImages={1}
      />
    );

    // Create a mock file
    const mockFile = createMockFile('test-image.jpg', 1024, 'image/jpeg');

    // Simulate dropzone callback - this should immediately trigger the error state
    if (dropzoneCallback) {
      act(() => {
        // Using non-null assertion since we've already checked it's not null
        dropzoneCallback!([mockFile]);
      });
    }

    // Check for error message about maximum images using findByText
    const errorMessage = await screen.findByText(/Maximum of 1 image allowed/i);
    expect(errorMessage).toBeInTheDocument();

    // Callback should not have been called
    expect(mockOnImagesUploaded).not.toHaveBeenCalled();
  }, 30000); // Increase timeout

  test('shows upload progress', async () => {
    const mockOnImagesUploaded = jest.fn();

    // Create a custom XMLHttpRequest mock that reports progress
    const mockXhr = new MockXMLHttpRequest();
    mockXhr.send = jest.fn().mockImplementation(function () {
      // Simulate 50% progress
      setTimeout(() => {
        if (mockXhr.upload.onprogress) {
          mockXhr.upload.onprogress({
            lengthComputable: true,
            loaded: 50,
            total: 100,
          } as ProgressEvent);
        }
      }, 10);

      // Simulate completion
      setTimeout(() => {
        if (mockXhr.upload.onprogress) {
          mockXhr.upload.onprogress({
            lengthComputable: true,
            loaded: 100,
            total: 100,
          } as ProgressEvent);
        }
        if (mockXhr.onload) {
          mockXhr.responseText = JSON.stringify({
            imageUrl: 'https://example.com/uploaded.jpg',
          });
          mockXhr.onload();
        }
      }, 20);
    });
    (global.XMLHttpRequest as unknown as jest.Mock).mockReturnValue(
      mockXhr as unknown as XMLHttpRequest
    );

    render(
      <ImageUploader
        entityType="test"
        onImagesUploaded={mockOnImagesUploaded}
      />
    );

    // Create a mock file
    const mockFile = createMockFile('progress-test.jpg', 1024, 'image/jpeg');

    // Simulate dropzone callback
    await act(async () => {
      if (dropzoneCallback) {
        dropzoneCallback([mockFile]);
      }
      // Allow progress handler to run
      await jest.advanceTimersByTimeAsync(15);
    });

    // Look for upload progress indication using findByText
    const progressText = await screen.findByText('Uploading...');
    expect(progressText).toBeInTheDocument();

    // Allow completion
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    // Verify the callback was called after completion
    await waitFor(() => {
      expect(mockOnImagesUploaded).toHaveBeenCalledWith([
        'https://example.com/uploaded.jpg',
      ]);
    });
  }, 30000); // Increase timeout

  test('handles removing uploaded images', async () => {
    // Mock fetch to simulate successful deletion
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    );

    const mockOnImagesUploaded = jest.fn();
    const initialImages = ['https://example.com/image1.jpg'];

    render(
      <ImageUploader
        entityType="test"
        initialImages={initialImages}
        onImagesUploaded={mockOnImagesUploaded}
      />
    );

    // Find the remove button using findByTestId
    const removeButton = await screen.findByTestId('remove-button');
    expect(removeButton).toBeInTheDocument();

    // Click to remove the image
    await act(async () => {
      fireEvent.click(removeButton);
      // Allow fetch mock and state updates to resolve
      await jest.runAllTimersAsync();
    });

    // Check that the onImagesUploaded callback was called with an empty array
    // Use waitFor to ensure state update has propagated
    await waitFor(() => {
      expect(mockOnImagesUploaded).toHaveBeenCalledWith([]);
    });

    // Check that fetch was called
    expect(mockFetch).toHaveBeenCalled();
  }, 30000); // Increase timeout

  // D7: a fixed starting list doesn't undo removals or uploads
  test('a removal sticks when the starting list stays the same', async () => {
    const onImagesUploaded = jest.fn();
    const initialImages = ['https://example.com/image1.jpg'];
    const { rerender } = render(
      <ImageUploader
        entityType="test"
        initialImages={initialImages}
        onImagesUploaded={onImagesUploaded}
      />
    );

    await act(async () => {
      fireEvent.click(await screen.findByTestId('remove-button'));
      await jest.runAllTimersAsync();
    });
    // The parent re-renders with a fresh array of the same starting images
    rerender(
      <ImageUploader
        entityType="test"
        initialImages={['https://example.com/image1.jpg']}
        onImagesUploaded={onImagesUploaded}
      />
    );
    await act(async () => {
      await jest.runAllTimersAsync();
    });

    expect(screen.queryByTestId('remove-button')).not.toBeInTheDocument();
    expect(onImagesUploaded).toHaveBeenLastCalledWith([]);
  }, 30000);

  test('an upload sticks when the starting list stays the same', async () => {
    const onImagesUploaded = jest.fn();
    const mockXhr = new MockXMLHttpRequest();
    mockXhr.send = jest.fn().mockImplementation(() => {
      setTimeout(() => {
        mockXhr.responseText = JSON.stringify({
          imageUrl: 'https://example.com/uploaded.jpg',
        });
        mockXhr.onload?.();
      }, 10);
    });
    (global.XMLHttpRequest as unknown as jest.Mock).mockReturnValue(
      mockXhr as unknown as XMLHttpRequest
    );
    render(
      <ImageUploader
        entityType="test"
        maxImages={2}
        initialImages={['https://example.com/image1.jpg']}
        onImagesUploaded={onImagesUploaded}
      />
    );

    await act(async () => {
      dropzoneCallback?.([createMockFile('a.jpg', 1024, 'image/jpeg')]);
      await jest.runAllTimersAsync();
    });

    expect(screen.getAllByTestId('remove-button')).toHaveLength(2);
    expect(onImagesUploaded).toHaveBeenLastCalledWith([
      'https://example.com/image1.jpg',
      'https://example.com/uploaded.jpg',
    ]);
  }, 30000);

  test('a new starting list replaces the images', async () => {
    const onImagesUploaded = jest.fn();
    const { rerender } = render(
      <ImageUploader
        entityType="test"
        maxImages={2}
        initialImages={['https://example.com/image1.jpg']}
        onImagesUploaded={onImagesUploaded}
      />
    );
    rerender(
      <ImageUploader
        entityType="test"
        maxImages={2}
        initialImages={['https://example.com/image2.jpg']}
        onImagesUploaded={onImagesUploaded}
      />
    );
    await act(async () => {
      await jest.runAllTimersAsync();
    });
    expect(onImagesUploaded).toHaveBeenLastCalledWith([
      'https://example.com/image2.jpg',
    ]);
  }, 30000);

  test('handles failed image removal', async () => {
    // Mock fetch to simulate failed deletion
    mockFetch.mockImplementation(() =>
      Promise.resolve({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({ error: 'Server error' }),
      })
    );

    const mockOnImagesUploaded = jest.fn();
    const initialImages = ['https://example.com/image1.jpg'];

    render(
      <ImageUploader
        entityType="test"
        initialImages={initialImages}
        onImagesUploaded={mockOnImagesUploaded}
      />
    );

    // Find the remove button
    const removeButton = await screen.findByTestId('remove-button');

    // Click to remove the image
    await act(async () => {
      fireEvent.click(removeButton);
      // Allow fetch mock and state updates to resolve
      await jest.runAllTimersAsync();
    });

    // Check for error message using findByText
    const errorMessage = await screen.findByText(/Failed to delete image/i);
    expect(errorMessage).toBeInTheDocument();

    // Check that the images were restored (called initially, then again on error)
    // It should be called with initialImages upon restoration
    await waitFor(() => {
      // The callback is called once initially, then again on error restore
      // Let's check the last call
      expect(mockOnImagesUploaded).toHaveBeenLastCalledWith(initialImages);
    });
    // Verify it was called at least for the restoration
    expect(mockOnImagesUploaded).toHaveBeenCalled();
  }, 30000); // Increase timeout

  test('shows drag active state', async () => {
    // Override the useDropzone mock for this specific test
    (useDropzone as jest.Mock).mockImplementationOnce((props) => {
      if (props && typeof props.onDrop === 'function') {
        dropzoneCallback = props.onDrop;
      }

      return {
        getRootProps: () => ({
          onClick: jest.fn(),
          role: 'button',
          'aria-label': 'Drag and drop area',
          'data-testid': 'dropzone',
        }),
        getInputProps: () => ({
          type: 'file',
          accept: props?.accept
            ? Object.keys(props.accept).join(',')
            : 'image/*',
          multiple: props?.maxFiles ? props.maxFiles > 1 : false,
          disabled: props?.disabled || false,
          'data-testid': 'file-input',
        }),
        isDragActive: true, // Set to true for this specific test
        open: jest.fn(),
      };
    });

    render(<ImageUploader entityType="test" onImagesUploaded={() => {}} />);

    // Check for the drag active message using findByText
    const dragMessage = await screen.findByText(/Drop the files here/i);
    expect(dragMessage).toBeInTheDocument();
  }, 30000); // Increase timeout

  test('hides upload area when maximum images reached', () => {
    const initialImages = ['https://example.com/image1.jpg'];

    render(
      <ImageUploader
        entityType="test"
        initialImages={initialImages}
        onImagesUploaded={() => {}}
        maxImages={1}
      />
    );

    // The dropzone text should not be visible when we have max images
    expect(
      screen.queryByText('Drag & drop an image here, or click to select')
    ).not.toBeInTheDocument();
  });

  test('preserves initial images on component update', async () => {
    const mockOnImagesUploaded = jest.fn();
    const initialImages = ['https://example.com/image1.jpg'];

    const { rerender } = render(
      <ImageUploader
        entityType="test"
        initialImages={initialImages}
        onImagesUploaded={mockOnImagesUploaded}
      />
    );

    // Wait for initial render effects to settle, including potential initial call
    await waitFor(() => {
      // Check if it was called initially (depends on component logic)
      // If the component calls it on mount with initialImages, this might be 1
      // Let's assume for now it might be called once initially.
      // We reset it below anyway.
    });

    // Clear mock after initial render potentially calls it
    mockOnImagesUploaded.mockClear();

    // Re-render with the same props
    rerender(
      <ImageUploader
        entityType="test"
        initialImages={initialImages}
        onImagesUploaded={mockOnImagesUploaded}
      />
    );

    // Wait a tick to ensure effects could run (though ideally shouldn't)
    await act(async () => {
      await jest.advanceTimersByTimeAsync(10);
    });

    // The callback should NOT be called again with the same images
    expect(mockOnImagesUploaded).not.toHaveBeenCalled();

    // Re-render with different images
    const newImages = ['https://example.com/image2.jpg'];

    rerender(
      <ImageUploader
        entityType="test"
        initialImages={newImages}
        onImagesUploaded={mockOnImagesUploaded}
      />
    );

    // Wait for the effect handling new images to run
    await waitFor(() => {
      // The callback should be called with new images
      expect(mockOnImagesUploaded).toHaveBeenCalledWith(newImages);
    });
  }, 30000); // Increase timeout
});
