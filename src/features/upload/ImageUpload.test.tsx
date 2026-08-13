import { cleanup, fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImageUpload } from "./ImageUpload";
import type { ImageSelectionResult } from "./image-upload.types";

afterEach(cleanup);

const selected: ImageSelectionResult = { status: "selected" };

describe("ImageUpload", () => {
  it("supports native selection, resets the input, and advertises accepted formats", async () => {
    const onSelectFiles = vi.fn(() => selected);
    const view = render(
      <ImageUpload error={null} onSelectFiles={onSelectFiles} />,
    );
    const input = view.getByLabelText("Choose Image") as HTMLInputElement;
    const visibleLabel = view.getByText("Choose Image");
    const file = new File(["image"], "photo.png", { type: "image/png" });

    expect(input.nextElementSibling).toBe(visibleLabel);
    await userEvent.upload(input, file);

    expect(onSelectFiles).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("");
    expect(input.accept).toContain("image/jpeg");
    expect(input.accept).toContain("image/png");
    expect(input.accept).toContain("image/webp");
    expect(view.getByText("Max 20 MB")).toBeInTheDocument();
  });

  it("supports drag and drop with visible drag-over feedback", () => {
    const onSelectFiles = vi.fn(() => selected);
    const view = render(
      <ImageUpload error={null} onSelectFiles={onSelectFiles} />,
    );
    const dropZone =
      view.getByText(/Drag & drop/).parentElement!.parentElement!;
    const file = new File(["image"], "photo.jpg", { type: "image/jpeg" });

    fireEvent.dragEnter(dropZone);
    expect(dropZone).toHaveClass("image-upload--drag-over");
    fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });

    expect(onSelectFiles).toHaveBeenCalledWith([file]);
    expect(dropZone).not.toHaveClass("image-upload--drag-over");
  });

  it("associates safe errors with the file input and live region", () => {
    const view = render(
      <ImageUpload
        error={{
          code: "MULTIPLE_FILES",
          message: "Choose one image at a time.",
        }}
        onSelectFiles={() => ({ status: "cancelled" })}
      />,
    );

    const input = view.getByLabelText("Choose Image");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(view.getByRole("alert")).toHaveTextContent(
      "Choose one image at a time.",
    );
  });
});
