'use client';

import { Image } from '../provider/LevainProvider';
import { useCallback, useState, useEffect, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon } from 'lucide-react';
import { Button } from '../components/Button';

// Helper function to extract image ID from URL (can be overridden by consumer)
const extractImageId = (url: string): string | null => {
  // Default implementation - extract last path segment before extension
  const match = url.match(/\/([^/]+?)(?:\.[^/.]+)?$/);
  return match ? match[1] : null;
};

interface ImageUploaderProps {
  /**
   * The ID of the entity to associate the image with
   */
  entityId?: string;

  /**
   * The type of entity (e.g., 'journal', 'gallery')
   */
  entityType: string;

  /**
   * Maximum number of images allowed (set to 1 for single image)
   */
  maxImages?: number;

  /**
   * Initial image URLs if editing an existing entity
   */
  initialImages?: string[];

  /**
   * Callback when upload is complete, returns the uploaded image URLs
   */
  onImagesUploaded: (imageUrls: string[]) => void;

  /**
   * Optional label for the uploader
   */
  label?: string;

  /**
   * Optional description text
   */
  description?: string;

  /**
   * Whether to preserve the original image format
   */
  preserveFormat?: boolean;

  /**
   * Whether to hide the preview of uploaded images
   */
  hidePreview?: boolean;
}

interface UploadProgress {
  file: File;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  url?: string;
}

export default function ImageUploader({
  entityId,
  entityType,
  maxImages = 1,
  initialImages = [],
  onImagesUploaded,
  label = 'Upload Image',
  description = 'Drag & drop an image here, or click to select',
  preserveFormat = false,
  hidePreview = false,
}: ImageUploaderProps) {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([]);
  const [error, setError] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<string[]>(
    initialImages.filter((img) => img && img.trim() !== '')
  );
  // Create a ref to store the current callback
  const onImagesUploadedRef = useRef(onImagesUploaded);

  // Update ref when callback changes
  useEffect(() => {
    onImagesUploadedRef.current = onImagesUploaded;
  }, [onImagesUploaded]);

  // Take a new starting list when its contents change, and only then: a parent
  // passing the same images again must not undo the user's uploads and removals.
  const initialKey = JSON.stringify(
    initialImages.filter((img) => img && img.trim() !== '')
  );
  const lastInitialKey = useRef(initialKey);
  const uploadedImagesRef = useRef(uploadedImages);
  uploadedImagesRef.current = uploadedImages;
  useEffect(() => {
    if (initialKey === lastInitialKey.current) return;
    lastInitialKey.current = initialKey;
    const validImages: string[] = JSON.parse(initialKey);
    if (validImages.length === 0) return;
    if (JSON.stringify(validImages) === JSON.stringify(uploadedImagesRef.current)) return;
    setUploadedImages(validImages);
    onImagesUploadedRef.current(validImages);
  }, [initialKey]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      // Limit the number of files based on maxImages and existing uploads
      const remainingSlots = maxImages - uploadedImages.length;
      if (remainingSlots <= 0) {
        setError(
          `Maximum of ${maxImages} image${maxImages > 1 ? 's' : ''} allowed`
        );
        return;
      }

      const filesToUpload = acceptedFiles.slice(0, remainingSlots);

      setError('');
      setUploadProgress(
        filesToUpload.map((file) => ({
          file,
          progress: 0,
          status: 'uploading',
        }))
      );

      try {
        // Wait for all uploads to complete
        const uploadResults = await Promise.all(
          filesToUpload.map(async (file, index) => {
            try {
              // Create FormData for server-side upload
              const formData = new FormData();
              formData.append('file', file);
              formData.append('entityType', entityType);
              if (entityId) {
                formData.append('entityId', entityId);
              } else {
                // For new entities without an ID yet, use 'temp' as the entityId
                formData.append('entityId', 'temp');
              }
              if (preserveFormat) {
                formData.append('preserveFormat', 'true');
              }

              // Create XMLHttpRequest to track progress
              return new Promise<string>((resolve, reject) => {
                const xhr = new XMLHttpRequest();

                xhr.upload.onprogress = (event) => {
                  if (event.lengthComputable) {
                    const progress = (event.loaded / event.total) * 100;
                    // Store progress value to avoid unnecessary state updates
                    const progressValue = progress;
                    setUploadProgress((prev) => {
                      // Only update if progress has changed significantly (at least 1%)
                      const prevProgress = prev[index]?.progress || 0;
                      if (Math.abs(prevProgress - progressValue) < 1) {
                        return prev;
                      }
                      return prev.map((item, i) =>
                        i === index
                          ? { ...item, progress: progressValue }
                          : item
                      );
                    });
                  }
                };

                xhr.open('POST', '/api/upload');
                xhr.onload = async () => {
                  if (xhr.status === 200) {
                    try {
                      const result = JSON.parse(xhr.responseText);

                      // Get the image URL from the response - first try imageUrl then fall back to url
                      const imageUrl = result.imageUrl || result.url || '';

                      if (!imageUrl) {
                        throw new Error('No image URL returned from server');
                      }

                      setUploadProgress((prev) =>
                        prev.map((item, i) =>
                          i === index
                            ? { ...item, status: 'complete', url: imageUrl }
                            : item
                        )
                      );
                      resolve(imageUrl);
                    } catch (error) {
                      console.error('Failed to parse server response:', error);
                      reject(new Error('Failed to parse server response'));
                    }
                  } else {
                    // Try to parse error response
                    try {
                      const errorResponse = JSON.parse(xhr.responseText);
                      console.error('Server error:', errorResponse);
                      reject(
                        new Error(
                          errorResponse.error ||
                            `Upload failed with status ${xhr.status}`
                        )
                      );
                    } catch (parseError) {
                      console.error(
                        'Could not parse error response:',
                        parseError
                      );
                      reject(
                        new Error(`Upload failed with status ${xhr.status}`)
                      );
                    }
                  }
                };
                xhr.onerror = () => reject(new Error('Upload failed'));
                xhr.send(formData);
              });
            } catch (error) {
              console.error('Error in upload process:', error);
              setUploadProgress((prev) =>
                prev.map((item, i) =>
                  i === index ? { ...item, status: 'error' } : item
                )
              );
              throw error;
            }
          })
        );

        // Filter out any undefined values that might have come from failed uploads
        const validUploadResults = uploadResults.filter(
          (url) => url && url.trim() !== ''
        );

        // Update the list of uploaded images
        const newUploadedImages = [...uploadedImages, ...validUploadResults];
        setUploadedImages(newUploadedImages);

        // Notify parent component using the ref for the current callback
        onImagesUploadedRef.current(newUploadedImages);

        // Clear progress after a delay
        setTimeout(() => {
          setUploadProgress([]);
        }, 2000);
      } catch (err) {
        console.error('Upload error:', err);
        setError('Failed to upload image');
        setUploadProgress((prev) =>
          prev.map((item) =>
            item.status === 'uploading' ? { ...item, status: 'error' } : item
          )
        );
      }
    },
    [entityId, entityType, maxImages, uploadedImages, preserveFormat]
  );

  /**
   * Removes an image and updates the state
   *
   * For entity-specific images, it will use the correct endpoint:
   * - Gallery images: /api/galleries/{galleryId}/images/{imageId}
   * - Journal images: /api/journal/{journalId}/images/{imageId}
   * - Temporary images and others: /api/images/{imageId}
   */
  const removeImage = async (imageUrl: string, index: number) => {
    try {
      // Guard clause: ensure imageUrl is defined
      if (!imageUrl) {
        // Just remove from local state if no URL
        const newImages = uploadedImages.filter((_, i) => i !== index);
        setUploadedImages(newImages);
        onImagesUploaded(newImages);
        return;
      }

      // Extract image ID from URL using centralized utility
      let imageId = extractImageId(imageUrl);

      // Fallback for legacy S3 URL format
      if (!imageId && imageUrl.includes('/')) {
        const urlParts = imageUrl.split('/');
        const lastPart = urlParts[urlParts.length - 1];
        if (lastPart.includes('.')) {
          imageId = lastPart.split('.')[0];
        } else if (lastPart.includes('?')) {
          imageId = lastPart.split('?')[0];
        } else {
          imageId = lastPart;
        }
      }

      if (!imageId) {
        setError('Failed to delete image: Invalid image URL');
        return;
      }

      // First update local state to provide immediate feedback
      const newImages = uploadedImages.filter((_, i) => i !== index);
      setUploadedImages(newImages);
      onImagesUploaded(newImages);

      // Determine the correct API endpoint based on entity type and ID
      let deleteEndpoint;
      const deleteMethod: 'DELETE' | 'POST' = 'DELETE';
      const deleteBody = undefined;

      if (entityType === 'journal') {
        if (entityId && entityId !== 'temp') {
          // For journal entries with an ID, check if this image is tied to the journal entry
          const imageHasJournalRef = await fetch(`/api/images/${imageId}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          })
            .then((response) => response.json())
            .then((data) => data.journalEntryId === entityId)
            .catch(() => false);

          // If the image is associated with this journal entry, use the journal-specific endpoint
          if (imageHasJournalRef) {
            deleteEndpoint = `/api/journal/${entityId}/images/${imageId}`;
          } else {
            // Otherwise use the generic images endpoint
            deleteEndpoint = `/api/images/${imageId}`;
          }
        } else {
          // For temporary journal images, use the generic images endpoint
          deleteEndpoint = `/api/images/${imageId}`;
        }
      } else if (entityType === 'gallery') {
        if (entityId && entityId !== 'temp') {
          // For galleries with an ID, use the gallery-specific endpoint
          deleteEndpoint = `/api/galleries/${entityId}/images/${imageId}`;
        } else {
          // For temporary gallery images, use the generic images endpoint
          deleteEndpoint = `/api/images/${imageId}`;
        }
      } else {
        // For other entity types, use the generic images endpoint
        deleteEndpoint = `/api/images/${imageId}`;
      }

      // Make sure we don't have any query parameters in the endpoint
      deleteEndpoint = deleteEndpoint.split('?')[0];

      // Delete the image
      try {
        const response = await fetch(deleteEndpoint, {
          method: deleteMethod,
          headers: deleteBody
            ? { 'Content-Type': 'application/json' }
            : undefined,
          body: deleteBody ? JSON.stringify(deleteBody) : undefined,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error(
            `Server error deleting image with status ${response.status}:`,
            errorData
          );
          throw new Error(
            `Failed to delete image: ${response.status} ${response.statusText}`
          );
        }
      } catch (error) {
        console.error('Error deleting image:', error);
        // Re-throw the error to be caught by the outer catch
        throw error;
      }
    } catch (err) {
      console.error('Delete error:', err);
      setError('Failed to delete image');

      // If there was an error, revert the local state change
      if (initialImages.length > 0) {
        setUploadedImages(initialImages);
        onImagesUploaded(initialImages);
      }
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.avif'] },
    disabled:
      uploadProgress.some((p) => p.status === 'uploading') ||
      uploadedImages.length >= maxImages,
    maxFiles: maxImages - uploadedImages.length,
  });

  const isUploading = uploadProgress.some((p) => p.status === 'uploading');
  const isFull = uploadedImages.length >= maxImages;

  return (
    <div className="space-y-1">
      {label && (
        <label className="type-label block text-[var(--color-text-default)]">
          {label}
        </label>
      )}

      {/* Existing Images */}
      {!hidePreview && uploadedImages.length > 0 && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
          {uploadedImages.map((imageUrl, index) => (
            <div key={index} className="group relative">
              <div className="relative aspect-video overflow-hidden rounded-md bg-[var(--color-surface-2)]">
                {imageUrl && imageUrl.trim() !== '' ? (
                  <Image
                    src={imageUrl}
                    alt="Uploaded"
                    fill
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-[var(--color-text-muted)]" />
                  </div>
                )}
              </div>
              <Button
                type="button"
                variant="danger"
                size="icon"
                className="absolute top-2 right-2 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={() => removeImage(imageUrl, index)}
                title="Remove image"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Upload Area - Only show if not at max capacity */}
      {!isFull && (
        <div
          {...getRootProps()}
          className={`mb-4 rounded-lg border-2 border-dashed p-8 text-center ${isDragActive ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5' : 'border-[var(--color-border-default)]'} ${isUploading || isFull ? 'cursor-not-allowed opacity-50' : 'cursor-pointer hover:bg-[var(--color-surface-2)]'}`}
        >
          <input {...getInputProps()} aria-label={label || 'Upload image'} />
          {isUploading ? (
            <div className="animate-pulse">
              <Upload className="mx-auto h-8 w-8 text-[var(--color-text-muted)]" />
              <p className="type-body-sm mt-2 text-[var(--color-text-muted)]">
                Uploading...
              </p>
            </div>
          ) : (
            <>
              {isDragActive ? (
                <div>
                  <Upload className="mx-auto h-8 w-8 text-[var(--color-primary)]" />
                  <p className="type-body-sm mt-2 text-[var(--color-primary)]">
                    Drop the files here...
                  </p>
                </div>
              ) : (
                <div>
                  <ImageIcon className="mx-auto h-8 w-8 text-[var(--color-text-muted)]" />
                  <p className="type-body-sm mt-2 text-[var(--color-text-muted)]">
                    {description}
                  </p>
                  <p className="type-caption mt-1">
                    {maxImages > 1
                      ? `You can upload up to ${maxImages - uploadedImages.length} more image${maxImages - uploadedImages.length !== 1 ? 's' : ''}`
                      : 'JPG, JPEG, PNG, WebP, GIF or AVIF (max 10MB)'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Progress Bars */}
      {uploadProgress.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadProgress.map((item, index) => (
            <div key={index} className="relative">
              <div className="type-body-sm mb-1 flex justify-between">
                <span className="max-w-[80%] truncate text-[var(--color-text-default)]">
                  {item.file.name}
                </span>
                <span className="text-[var(--color-text-muted)]">
                  {item.status === 'complete'
                    ? '100%'
                    : item.status === 'error'
                      ? 'Error'
                      : `${Math.round(item.progress)}%`}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-2)]">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    item.status === 'complete'
                      ? 'bg-[var(--color-success)]'
                      : item.status === 'error'
                        ? 'bg-[var(--color-error)]'
                        : 'bg-[var(--color-primary)]'
                  }`}
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div className="type-body-sm mt-4 rounded bg-[var(--color-error)]/10 p-3 text-[var(--color-error)]">
          <p className="type-label">Error:</p>
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}
