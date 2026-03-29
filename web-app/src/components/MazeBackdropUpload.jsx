// MazeBackdropUpload Component
// Allows users to upload a photo of a physical maze as a backdrop

import React, { useRef } from 'react';
import './MazeBackdropUpload.css';

/**
 * @typedef {Object} MazeBackdropUploadProps
 * @property {string|null} backdropImage - Current backdrop image data URL
 * @property {Function} onImageUpload - Handler when image is uploaded
 * @property {Function} onImageClear - Handler when backdrop is cleared
 */

/**
 * Component for uploading and managing maze backdrop images
 * @param {MazeBackdropUploadProps} props - Component props
 */
export function MazeBackdropUpload({ backdropImage, onImageUpload, onImageClear }) {
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPG, PNG, etc.)');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image file is too large. Maximum size is 10MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result;
      if (typeof dataUrl === 'string') {
        onImageUpload(dataUrl);
      }
    };
    reader.onerror = () => {
      alert('Failed to read the image file.');
    };
    reader.readAsDataURL(file);

    // Reset input so same file can be selected again
    event.target.value = '';
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  const handleDrop = (event) => {
    event.preventDefault();
    event.stopPropagation();

    const file = event.dataTransfer.files?.[0];
    if (!file) return;

    // Create a synthetic event to reuse the file handler
    const syntheticEvent = {
      target: { files: [file], value: '' }
    };
    handleFileChange(syntheticEvent);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
  };

  return (
    <div className="backdrop-upload-container">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="backdrop-file-input"
        aria-label="Upload maze backdrop image"
      />

      {backdropImage ? (
        <div className="backdrop-preview">
          <img
            src={backdropImage}
            alt="Maze backdrop"
            className="backdrop-thumbnail"
          />
          <button
            className="clear-backdrop-button"
            onClick={onImageClear}
            aria-label="Clear backdrop image"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Clear
          </button>
        </div>
      ) : (
        <div
          className="backdrop-dropzone"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onClick={handleButtonClick}
          role="button"
          tabIndex={0}
          aria-label="Click or drop an image to upload maze backdrop"
        >
          <svg
            className="upload-icon"
            width="32"
            height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <span className="dropzone-text">
            Drop maze photo here or click to upload
          </span>
          <span className="dropzone-hint">
            JPG, PNG up to 10MB
          </span>
        </div>
      )}
    </div>
  );
}

export default MazeBackdropUpload;