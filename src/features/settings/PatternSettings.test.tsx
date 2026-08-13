import { cleanup, fireEvent, render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PatternSettings } from "./PatternSettings";
import { EMPTY_PATTERN_SETTINGS } from "./settings.types";

const COLOR_SET_PROFILES = [
  { profileId: "poparooz-set-24", size: 24 },
  { profileId: "poparooz-set-48", size: 48 },
  { profileId: "poparooz-set-72", size: 72 },
  { profileId: "poparooz-set-120", size: 120 },
  { profileId: "poparooz-set-168", size: 168 },
  { profileId: "poparooz-set-221", size: 221 },
] as const;

afterEach(cleanup);

describe("PatternSettings", () => {
  it("renders the approved default preset and only supported background modes", () => {
    const view = render(
      <PatternSettings
        value={EMPTY_PATTERN_SETTINGS}
        onChange={() => {}}
        colorSetProfiles={COLOR_SET_PROFILES}
      />,
    );

    expect(view.getByLabelText("Pattern Size")).toHaveValue("80");
    expect(view.getByText("Best for most photos.")).toBeInTheDocument();
    expect(view.getByLabelText("Maximum Colors")).toHaveValue(32);
    expect(view.getByLabelText("Bead Color Set")).toHaveValue(
      "poparooz-set-221",
    );
    expect(
      view.getAllByRole("option").map((option) => option.textContent),
    ).toEqual([
      "40 × 40 — Small",
      "60 × 60 — Medium",
      "80 × 80 — Recommended",
      "104 × 104 — Detailed",
      "24-Color Set",
      "48-Color Set",
      "72-Color Set",
      "120-Color Set",
      "168-Color Set",
      "221-Color Set",
    ]);
    expect(
      view.getByText("Choose the Poparooz color range available for matching."),
    ).toBeInTheDocument();
    expect(
      view.getByText(
        "Maximum number of colors used in the generated pattern. This does not change the selected Bead Color Set.",
      ),
    ).toBeInTheDocument();
    expect(view.getByText("Bead Size")).toBeInTheDocument();
    expect(view.getByText("2.6 mm")).toBeInTheDocument();
    expect(
      view.getByLabelText("Bead Size: 2.6 millimeters"),
    ).not.toHaveAttribute("contenteditable");
    expect(view.queryByRole("textbox", { name: /Bead Size/ })).toBeNull();
    expect(view.queryByRole("combobox", { name: /Bead Size/ })).toBeNull();
    expect(view.getByRole("group", { name: "Background" })).toBeInTheDocument();
    expect(
      view.getByRole("heading", { name: "2. Settings" }),
    ).toBeInTheDocument();
    expect(view.getByText("White")).toBeInTheDocument();
    expect(view.getByText("Transparent")).toBeInTheDocument();
    expect(
      view.getByRole("radio", { name: /Full Background/ }),
    ).not.toBeChecked();
    expect(
      view.getByRole("radio", { name: /Remove Background/ }),
    ).not.toBeChecked();
    expect(view.queryByRole("radio", { name: "Keep Original" })).toBeNull();
    expect(
      view.getByRole("button", { name: "Generate Pattern" }),
    ).toBeDisabled();
  });

  it("emits a new immutable draft for each controlled change", async () => {
    const onChange = vi.fn();
    const value = { ...EMPTY_PATTERN_SETTINGS };
    const view = render(
      <PatternSettings
        value={value}
        onChange={onChange}
        colorSetProfiles={COLOR_SET_PROFILES}
      />,
    );

    fireEvent.change(view.getByLabelText("Pattern Size"), {
      target: { value: "60" },
    });
    await userEvent.click(view.getByRole("radio", { name: /Full Background/ }));

    expect(onChange).toHaveBeenCalledWith({
      ...value,
      width: "60",
      height: "60",
    });
    expect(onChange).toHaveBeenCalledWith({ ...value, background: "white" });
    expect(value).toEqual(EMPTY_PATTERN_SETTINGS);
  });

  it("uses four equal desktop buttons without changing preset semantics", async () => {
    const onChange = vi.fn();
    const value = { ...EMPTY_PATTERN_SETTINGS };
    const view = render(
      <PatternSettings
        value={value}
        onChange={onChange}
        colorSetProfiles={COLOR_SET_PROFILES}
        useDesktopPatternSizeSelector
      />,
    );

    expect(view.getByRole("group", { name: "Pattern Size" })).toHaveClass(
      "pattern-size-setting",
    );
    expect(view.queryByRole("combobox", { name: "Pattern Size" })).toBeNull();
    expect(view.getByRole("button", { name: "80 × 80" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await userEvent.click(view.getByRole("button", { name: "104 × 104" }));
    expect(onChange).toHaveBeenCalledWith({
      ...value,
      width: "104",
      height: "104",
    });
  });

  it("exposes only the four fixed sizes and preserves the color limit boundary", () => {
    const view = render(
      <PatternSettings
        value={EMPTY_PATTERN_SETTINGS}
        onChange={() => {}}
        colorSetProfiles={COLOR_SET_PROFILES}
      />,
    );

    expect(view.getByLabelText("Pattern Size")).toHaveValue("80");
    expect(view.getByLabelText("Maximum Colors")).toHaveAttribute("min", "2");
    expect(view.getByLabelText("Maximum Colors")).toHaveAttribute("max", "64");
  });

  it("can omit generation controls when the responsive shell owns their placement", () => {
    const view = render(
      <PatternSettings
        value={EMPTY_PATTERN_SETTINGS}
        onChange={() => {}}
        colorSetProfiles={COLOR_SET_PROFILES}
        generationControls={null}
      />,
    );

    expect(view.queryByRole("button", { name: "Generate Pattern" })).toBeNull();
    expect(view.getByLabelText("Pattern Size")).toBeInTheDocument();
  });

  it.each([
    ["40", "Best for icons and simple designs."],
    ["60", "Best for simple portraits and pets."],
    ["80", "Best for most photos."],
    ["104", "Best for detailed photos."],
  ])("shows guidance for preset %s", (size, guidance) => {
    const view = render(
      <PatternSettings
        value={{ ...EMPTY_PATTERN_SETTINGS, width: size, height: size }}
        onChange={() => {}}
        colorSetProfiles={COLOR_SET_PROFILES}
      />,
    );
    expect(view.getByText(guidance)).toBeInTheDocument();
  });

  it("preserves Color Set, Maximum Colors, and background semantics", async () => {
    const onChange = vi.fn();
    const value = { ...EMPTY_PATTERN_SETTINGS };
    const view = render(
      <PatternSettings
        value={value}
        onChange={onChange}
        colorSetProfiles={COLOR_SET_PROFILES}
      />,
    );

    fireEvent.change(view.getByLabelText("Maximum Colors"), {
      target: { value: "24" },
    });
    await userEvent.click(view.getByRole("radio", { name: /Full Background/ }));
    await userEvent.click(
      view.getByRole("radio", { name: /Remove Background/ }),
    );

    expect(value.selectedColorSetProfileId).toBe("poparooz-set-221");
    expect(onChange).toHaveBeenCalledWith({ ...value, maxColors: "24" });
    expect(onChange).toHaveBeenCalledWith({ ...value, background: "white" });
    expect(onChange).toHaveBeenCalledWith({
      ...value,
      background: "transparent",
    });
    expect(onChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ beadSize: expect.anything() }),
    );
  });

  it("shows the recommendation only once for the recommended preset", () => {
    const view = render(
      <PatternSettings
        value={EMPTY_PATTERN_SETTINGS}
        onChange={() => {}}
        colorSetProfiles={COLOR_SET_PROFILES}
      />,
    );

    expect(view.getAllByText(/Recommended/)).toHaveLength(1);
  });
});
