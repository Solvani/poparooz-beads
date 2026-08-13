import { useId, useState, type DragEvent } from "react";

import type {
  ImageSelectionResult,
  ImageUploadError,
} from "./image-upload.types";
import { IMAGE_FILE_ACCEPT } from "./image-upload-validation";

export interface ImageUploadProps {
  readonly error: ImageUploadError | null;
  readonly onSelectFiles: (
    files: FileList | readonly File[],
  ) => ImageSelectionResult;
}

export function ImageUpload({ error, onSelectFiles }: ImageUploadProps) {
  const inputId = useId();
  const descriptionId = useId();
  const errorId = useId();
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragOver(false);
    onSelectFiles(event.dataTransfer.files);
  };

  return (
    <div
      className={`image-upload${isDragOver ? " image-upload--drag-over" : ""}`}
      onDragEnter={(event) => {
        event.preventDefault();
        setIsDragOver(true);
      }}
      onDragOver={(event) => event.preventDefault()}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setIsDragOver(false);
        }
      }}
      onDrop={handleDrop}
    >
      <span className="image-upload__icon" aria-hidden="true">
        &uarr;
      </span>
      <p id={descriptionId} className="image-upload__instructions">
        <strong>Drag &amp; drop an image here</strong>
        <span>or click to browse</span>
        <small>Supports JPG, PNG, WEBP</small>
        <small>Max 20 MB</small>
      </p>
      <input
        id={inputId}
        className="visually-hidden"
        type="file"
        accept={IMAGE_FILE_ACCEPT}
        aria-describedby={`${descriptionId}${error ? ` ${errorId}` : ""}`}
        aria-invalid={error ? "true" : undefined}
        onChange={(event) => {
          onSelectFiles(event.currentTarget.files ?? []);
          event.currentTarget.value = "";
        }}
      />
      <label
        className="button button--primary image-upload__button"
        htmlFor={inputId}
      >
        Choose Image
      </label>
      {error ? (
        <p id={errorId} className="form-error" role="alert" aria-live="polite">
          {error.message}
        </p>
      ) : null}
    </div>
  );
}
