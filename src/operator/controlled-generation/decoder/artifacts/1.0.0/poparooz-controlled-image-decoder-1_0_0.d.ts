/* tslint:disable */
/* eslint-disable */

export class DecodedImage {
    private constructor();
    free(): void;
    [Symbol.dispose](): void;
    rgba_bytes(): Uint8Array;
    readonly actual_codec: string;
    readonly decoded_height: number;
    readonly decoded_pixel_sha256: string;
    readonly decoded_width: number;
    readonly decoder_implementation_id: string;
    readonly decoder_implementation_version: string;
    readonly encoded_height: number;
    readonly encoded_width: number;
    readonly icc_state: string;
    readonly orientation_observed: number;
    readonly orientation_state: string;
    readonly pixel_format: string;
    readonly runtime_abi_version: string;
}

export function decode_controlled(source: Uint8Array, expected_codec: string, maximum_source_bytes: number, maximum_encoded_width: number, maximum_encoded_height: number, maximum_pixel_count: number, maximum_decoded_rgba_bytes: number, maximum_icc_profile_bytes: number, maximum_exif_bytes: number, maximum_total_ancillary_bytes: number, maximum_frames: number, color_policy: string, exif_policy: string): DecodedImage;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_decodedimage_free: (a: number, b: number) => void;
    readonly decode_controlled: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number, l: number, m: number, n: number, o: number, p: number, q: number, r: number) => void;
    readonly decodedimage_actual_codec: (a: number, b: number) => void;
    readonly decodedimage_decoded_height: (a: number) => number;
    readonly decodedimage_decoded_pixel_sha256: (a: number, b: number) => void;
    readonly decodedimage_decoded_width: (a: number) => number;
    readonly decodedimage_decoder_implementation_id: (a: number, b: number) => void;
    readonly decodedimage_decoder_implementation_version: (a: number, b: number) => void;
    readonly decodedimage_encoded_height: (a: number) => number;
    readonly decodedimage_encoded_width: (a: number) => number;
    readonly decodedimage_icc_state: (a: number, b: number) => void;
    readonly decodedimage_orientation_observed: (a: number) => number;
    readonly decodedimage_orientation_state: (a: number, b: number) => void;
    readonly decodedimage_pixel_format: (a: number, b: number) => void;
    readonly decodedimage_rgba_bytes: (a: number, b: number) => void;
    readonly decodedimage_runtime_abi_version: (a: number, b: number) => void;
    readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
    readonly __wbindgen_export: (a: number, b: number) => number;
    readonly __wbindgen_export2: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_export3: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
