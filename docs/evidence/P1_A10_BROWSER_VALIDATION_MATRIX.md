# P1-A10 Browser Validation Matrix

Status: **Prepared but not executed**

Prepared: **2026-07-30**

Build base commit: `18e7c9c271d3f4d5f7afed45e4cf395c63e2da9e`

## Environment discovery

- Windows environment detected.
- Google Chrome executable detected locally.
- Firefox executable was not detected in the standard installation paths checked.
- Safari desktop and Safari iOS are unavailable on this Windows environment.
- No Android or iOS device/session is connected through the project.
- The project has no Playwright/Puppeteer dependency and P1-A10 does not add one.
- The current placeholder application does not exercise the complete image/Worker/Pattern chain. A technical validation page was deliberately not added because credible interactive evidence could not be captured in this session without expanding scope.

Therefore no real-browser scenario is marked Passed. jsdom, Vitest Fake Worker tests, Vite build output, and Node benchmarks are separate engineering evidence and are not browser evidence.

## Result vocabulary

- `Passed`: executed on the named real browser/device with retained evidence.
- `Failed`: executed and did not satisfy the scenario.
- `Blocked`: execution was attempted but an identified environmental blocker prevented completion.
- `Not executed`: no credible run occurred.

## Validation matrix

| Platform        | Browser Version | Device                  | Scenario                                                | Result       | Evidence                  | Notes                                                                |
| --------------- | --------------- | ----------------------- | ------------------------------------------------------- | ------------ | ------------------------- | -------------------------------------------------------------------- |
| Chrome Desktop  | Not recorded    | Windows desktop         | JPEG/PNG/WebP decode and transparency                   | Not executed | None                      | Chrome exists, but no credible interactive test run was captured.    |
| Chrome Desktop  | Not recorded    | Windows desktop         | EXIF Orientation                                        | Not executed | None                      | Requires controlled synthetic browser image evidence.                |
| Chrome Desktop  | Not recorded    | Windows desktop         | Module Worker and Transferable detachment               | Not executed | Vite asset only           | Build evidence is not a browser run.                                 |
| Chrome Desktop  | Not recorded    | Windows desktop         | Abort, terminate, supersede, stale-result rejection     | Not executed | Fake Worker tests only    | Fake Worker evidence is not relabeled as browser evidence.           |
| Chrome Desktop  | Not recorded    | Windows desktop         | Large image, rapid settings changes, memory reclamation | Not executed | None                      | Requires interactive technical validation and retained measurements. |
| Chrome Desktop  | Not recorded    | Windows desktop         | Public Pattern brand and no image upload                | Not executed | Static/unit evidence only | Must be rechecked in the eventual customer integration.              |
| Firefox Desktop | Not recorded    | Not available           | All required scenarios                                  | Not executed | None                      | Browser not detected.                                                |
| Safari Desktop  | Not recorded    | macOS device required   | All required scenarios                                  | Not executed | None                      | Unavailable on Windows.                                              |
| Chrome Android  | Not recorded    | Android device required | All required scenarios                                  | Not executed | None                      | No target device/session available.                                  |
| Safari iOS      | Not recorded    | iPhone/iPad required    | All required scenarios                                  | Not executed | None                      | No target device/session available.                                  |

## Required execution checklist

For each target browser/device, record the exact browser version, device/OS, UTC test time, tested build commit, operator steps, result, and retained evidence path. Use only generated or rights-safe test images.

1. Decode JPEG.
2. Decode PNG and preserve expected transparency.
3. Decode WebP.
4. Verify EXIF Orientation cases.
5. Load the native module Worker asset.
6. Verify actual input Transferable detachment applies only to the copied buffer.
7. Verify Worker termination and fresh-worker recreation.
8. Abort an active task.
9. Rapidly supersede settings/tasks.
10. Confirm an old result cannot overwrite the newest result.
11. Complete representative large-image processing.
12. Observe memory reclamation after completion, cancellation, and page close.
13. Inspect Public Pattern fields for Poparooz-only presentation.
14. Confirm no image-content network upload.
15. Confirm Worker cleanup after page close/navigation.

Any future evidence attachment must avoid user/private images, local absolute paths, usernames, device serials, IP addresses, and unredacted image contents.
