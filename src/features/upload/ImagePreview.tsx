import { useId } from "react";

import { Button } from "../../components/ui/Button";
import type { ImageSelectionResult, ImageSource } from "./image-upload.types";
import { IMAGE_FILE_ACCEPT } from "./image-upload-validation";

export interface ImagePreviewProps {
  readonly source: ImageSource;
  readonly onReplace: (
    files: FileList | readonly File[],
  ) => ImageSelectionResult;
  readonly onRemove: () => void;
}

export function ImagePreview({
  source,
  onReplace,
  onRemove,
}: ImagePreviewProps) {
  const inputId = useId();

  return (
    <section className="image-preview" aria-labelledby="original-image-heading">
      <h3 id="original-image-heading">Original Image</h3>
      <div className="image-preview__frame">
        <img src={source.objectUrl} alt="Preview of the selected image" />
      </div>
      <p className="image-preview__name">{source.name}</p>
      <p className="image-preview__metadata">
        {source.mimeType} | {formatFileSize(source.size)}
      </p>
      <div className="image-preview__actions">
        <label className="button button--secondary" htmlFor={inputId}>
          Replace Image
        </label>
        <input
          id={inputId}
          className="visually-hidden"
          type="file"
          accept={IMAGE_FILE_ACCEPT}
          onChange={(event) => {
            onReplace(event.currentTarget.files ?? []);
            event.currentTarget.value = "";
          }}
        />
        <Button variant="tertiary" onClick={onRemove}>
          Remove Image
        </Button>
      </div>
    </section>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const kibibytes = bytes / 1024;
  if (kibibytes < 1024) return `${kibibytes.toFixed(1)} KB`;
  return `${(kibibytes / 1024).toFixed(1)} MB`;
}
