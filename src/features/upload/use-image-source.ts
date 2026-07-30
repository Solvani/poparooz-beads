import { useCallback, useEffect, useRef, useState } from "react";

import type {
  ImageSelectionResult,
  ImageSource,
  ImageUploadError,
} from "./image-upload.types";
import { validateSelectedImageFiles } from "./image-upload-validation";

export interface ObjectUrlApi {
  createObjectURL(file: Blob): string;
  revokeObjectURL(url: string): void;
}

export interface UseImageSourceResult {
  readonly source: ImageSource | null;
  readonly revision: number;
  readonly error: ImageUploadError | null;
  readonly selectFiles: (
    files: FileList | readonly File[],
  ) => ImageSelectionResult;
  readonly removeImage: () => void;
  readonly clearError: () => void;
}

export function useImageSource(
  objectUrls: ObjectUrlApi = URL,
): UseImageSourceResult {
  const [source, setSource] = useState<ImageSource | null>(null);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<ImageUploadError | null>(null);
  const currentSource = useRef<ImageSource | null>(null);

  const selectFiles = useCallback(
    (files: FileList | readonly File[]): ImageSelectionResult => {
      const validation = validateSelectedImageFiles(files);
      if (validation.status === "cancelled") return { status: "cancelled" };
      if (validation.status === "invalid") {
        setError(validation.error);
        return { status: "rejected", error: validation.error };
      }

      let objectUrl: string;
      try {
        objectUrl = objectUrls.createObjectURL(validation.file);
      } catch {
        const nextError: ImageUploadError = {
          code: "PREVIEW_UNAVAILABLE",
          message: "A local preview could not be created for this image.",
        };
        setError(nextError);
        return { status: "rejected", error: nextError };
      }

      const previous = currentSource.current;
      const next: ImageSource = {
        file: validation.file,
        objectUrl,
        name: validation.file.name,
        mimeType: validation.file.type,
        size: validation.file.size,
      };
      currentSource.current = next;
      setSource(next);
      setRevision((current) => current + 1);
      setError(null);
      if (previous !== null) objectUrls.revokeObjectURL(previous.objectUrl);
      return { status: "selected" };
    },
    [objectUrls],
  );

  const removeImage = useCallback(() => {
    const current = currentSource.current;
    if (current !== null) objectUrls.revokeObjectURL(current.objectUrl);
    currentSource.current = null;
    setSource(null);
    setRevision((current) => current + 1);
    setError(null);
  }, [objectUrls]);

  const clearError = useCallback(() => setError(null), []);

  useEffect(
    () => () => {
      const current = currentSource.current;
      if (current !== null) objectUrls.revokeObjectURL(current.objectUrl);
      currentSource.current = null;
    },
    [objectUrls],
  );

  return { source, revision, error, selectFiles, removeImage, clearError };
}
