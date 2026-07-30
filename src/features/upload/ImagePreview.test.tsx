import { cleanup, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ImagePreview } from "./ImagePreview";
import type { ImageSource } from "./image-upload.types";

afterEach(cleanup);

const source: ImageSource = {
  file: new File(["image"], "family-photo.png", { type: "image/png" }),
  objectUrl: "blob:local-preview",
  name: "family-photo.png",
  mimeType: "image/png",
  size: 5,
};

describe("ImagePreview", () => {
  it("shows a contained local preview with safe metadata and alt text", () => {
    const view = render(
      <ImagePreview
        source={source}
        onReplace={() => ({ status: "cancelled" })}
        onRemove={() => {}}
      />,
    );

    expect(
      view.getByRole("img", { name: "Preview of the selected image" }),
    ).toHaveAttribute("src", "blob:local-preview");
    expect(view.getByText("family-photo.png")).toBeInTheDocument();
    expect(view.container).not.toHaveTextContent("C:\\");
  });

  it("supports keyboard-operable replace and remove controls", async () => {
    const onReplace = vi.fn(() => ({ status: "selected" as const }));
    const onRemove = vi.fn();
    const view = render(
      <ImagePreview
        source={source}
        onReplace={onReplace}
        onRemove={onRemove}
      />,
    );

    const input = view.getByLabelText("Replace Image") as HTMLInputElement;
    await userEvent.upload(
      input,
      new File(["next"], "next.webp", { type: "image/webp" }),
    );
    await userEvent.click(view.getByRole("button", { name: "Remove Image" }));

    expect(onReplace).toHaveBeenCalledTimes(1);
    expect(input.value).toBe("");
    expect(onRemove).toHaveBeenCalledTimes(1);
  });
});
