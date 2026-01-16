import wasmModule from '../../www/pkg/routes_to_gpx_bg.wasm';

let wasm: any;
let initialized = false;

const cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
const cachedTextEncoder = new TextEncoder();
let cachedUint8ArrayMemory0: Uint8Array | null = null;
let cachedDataViewMemory0: DataView | null = null;
let WASM_VECTOR_LEN = 0;

function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr: number, len: number) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

function passStringToWasm0(arg: string, malloc: Function, realloc?: Function) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;
    const mem = getUint8ArrayMemory0();
    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);
        offset += ret.written ?? 0;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }
    WASM_VECTOR_LEN = offset;
    return ptr;
}

function addToExternrefTable0(obj: any) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function takeFromExternrefTable0(idx: number) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

function handleError(f: Function, args: any) {
    try {
        return f.apply(null, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x: any) {
    return x === undefined || x === null;
}

function debugString(val: any): string {
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        return description == null ? 'Symbol' : `Symbol(${description})`;
    }
    if (type == 'function') {
        const name = val.name;
        return typeof name == 'string' && name.length > 0 ? `Function(${name})` : 'Function';
    }
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) debug += debugString(val[0]);
        for (let i = 1; i < length; i++) debug += ', ' + debugString(val[i]);
        debug += ']';
        return debug;
    }
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        return toString.call(val);
    }
    if (className == 'Object') {
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    return className;
}

function getArrayU8FromWasm0(ptr: number, len: number) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr, ptr + len);
}

function getImports() {
    const imports: any = {
        "./routes_to_gpx_bg.js": {
            __wbg_Error_8c4e43fe74559d73: function(arg0: number, arg1: number) {
                return Error(getStringFromWasm0(arg0, arg1));
            },
            __wbg_String_8f0eb39a4a4c2f66: function(arg0: number, arg1: any) {
                const ret = String(arg1);
                const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
                const len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            },
            __wbg___wbindgen_boolean_get_bbbb1c18aa2f5e25: function(arg0: any) {
                const v = arg0;
                const ret = typeof(v) === 'boolean' ? v : undefined;
                return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
            },
            __wbg___wbindgen_debug_string_0bc8482c6e3508ae: function(arg0: number, arg1: any) {
                const ret = debugString(arg1);
                const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
                const len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            },
            __wbg___wbindgen_in_47fa6863be6f2f25: function(arg0: any, arg1: any) {
                return arg0 in arg1;
            },
            __wbg___wbindgen_is_function_0095a73b8b156f76: function(arg0: any) {
                return typeof(arg0) === 'function';
            },
            __wbg___wbindgen_is_object_5ae8e5880f2c1fbd: function(arg0: any) {
                const val = arg0;
                return typeof(val) === 'object' && val !== null;
            },
            __wbg___wbindgen_is_undefined_9e4d92534c42d778: function(arg0: any) {
                return arg0 === undefined;
            },
            __wbg___wbindgen_jsval_loose_eq_9dd77d8cd6671811: function(arg0: any, arg1: any) {
                return arg0 == arg1;
            },
            __wbg___wbindgen_number_get_8ff4255516ccad3e: function(arg0: number, arg1: any) {
                const obj = arg1;
                const ret = typeof(obj) === 'number' ? obj : undefined;
                getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret) ? 1 : 0, true);
            },
            __wbg___wbindgen_string_get_72fb696202c56729: function(arg0: number, arg1: any) {
                const obj = arg1;
                const ret = typeof(obj) === 'string' ? obj : undefined;
                const ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
                const len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            },
            __wbg___wbindgen_throw_be289d5034ed271b: function(arg0: number, arg1: number) {
                throw new Error(getStringFromWasm0(arg0, arg1));
            },
            __wbg_call_389efe28435a9388: function() { 
                return handleError(function (arg0: any, arg1: any) {
                    return arg0.call(arg1);
                }, arguments); 
            },
            __wbg_done_57b39ecd9addfe81: function(arg0: any) {
                return arg0.done;
            },
            __wbg_error_7534b8e9a36f1ab4: function(arg0: number, arg1: number) {
                console.error(getStringFromWasm0(arg0, arg1));
            },
            __wbg_get_9b94d73e6221f75c: function(arg0: any, arg1: number) {
                return arg0[arg1 >>> 0];
            },
            __wbg_get_b3ed3ad4be2bc8ac: function() { 
                return handleError(function (arg0: any, arg1: any) {
                    return Reflect.get(arg0, arg1);
                }, arguments); 
            },
            __wbg_get_with_ref_key_1dc361bd10053bfe: function(arg0: any, arg1: any) {
                return arg0[arg1];
            },
            __wbg_instanceof_ArrayBuffer_c367199e2fa2aa04: function(arg0: any) {
                try { return arg0 instanceof ArrayBuffer; } catch (_) { return false; }
            },
            __wbg_instanceof_Uint8Array_9b9075935c74707c: function(arg0: any) {
                try { return arg0 instanceof Uint8Array; } catch (_) { return false; }
            },
            __wbg_isArray_d314bb98fcf08331: function(arg0: any) {
                return Array.isArray(arg0);
            },
            __wbg_iterator_6ff6560ca1568e55: function() {
                return Symbol.iterator;
            },
            __wbg_length_32ed9a279acd054c: function(arg0: any) {
                return arg0.length;
            },
            __wbg_length_35a7bace40f36eac: function(arg0: any) {
                return arg0.length;
            },
            __wbg_new_361308b2356cecd0: function() {
                return {};
            },
            __wbg_new_3eb36ae241fe6f44: function() {
                return [];
            },
            __wbg_new_8a6f238a6ece86ea: function() {
                return new Error();
            },
            __wbg_new_dd2b680c8bf6ae29: function(arg0: any) {
                return new Uint8Array(arg0);
            },
            __wbg_next_3482f54c49e8af19: function() { 
                return handleError(function (arg0: any) {
                    return arg0.next();
                }, arguments); 
            },
            __wbg_next_418f80d8f5303233: function(arg0: any) {
                return arg0.next;
            },
            __wbg_prototypesetcall_bdcdcc5842e4d77d: function(arg0: number, arg1: number, arg2: any) {
                Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
            },
            __wbg_set_3f1d0b984ed272ed: function(arg0: any, arg1: any, arg2: any) {
                arg0[arg1] = arg2;
            },
            __wbg_set_f43e577aea94465b: function(arg0: any, arg1: number, arg2: any) {
                arg0[arg1 >>> 0] = arg2;
            },
            __wbg_stack_0ed75d68575b0f3c: function(arg0: number, arg1: any) {
                const ret = arg1.stack;
                const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
                const len1 = WASM_VECTOR_LEN;
                getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
                getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
            },
            __wbg_value_0546255b415e96c1: function(arg0: any) {
                return arg0.value;
            },
            __wbindgen_cast_0000000000000001: function(arg0: any) {
                return arg0;
            },
            __wbindgen_cast_0000000000000002: function(arg0: number, arg1: number) {
                return getStringFromWasm0(arg0, arg1);
            },
            __wbindgen_init_externref_table: function() {
                const table = wasm.__wbindgen_externrefs;
                const offset = table.grow(4);
                table.set(0, undefined);
                table.set(offset + 0, undefined);
                table.set(offset + 1, null);
                table.set(offset + 2, true);
                table.set(offset + 3, false);
            },
        }
    };
    return imports;
}

export function initWasm() {
    if (initialized) return;
    
    const imports = getImports();
    const instance = new WebAssembly.Instance(wasmModule, imports);
    wasm = instance.exports;
    
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    
    wasm.__wbindgen_start();
    initialized = true;
}

export function parse_google_maps_url(url: string): any {
    initWasm();
    const ptr0 = passStringToWasm0(url, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.parse_google_maps_url(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

export function parse_kml(kml_content: string): any {
    initWasm();
    const ptr0 = passStringToWasm0(kml_content, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.parse_kml(ptr0, len0);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

export function route_to_gpx(route: any): string {
    initWasm();
    let deferred2_0: number;
    let deferred2_1: number;
    try {
        const ret = wasm.route_to_gpx(route);
        const ptr1 = ret[0];
        const len1 = ret[1];
        if (ret[3]) {
            throw takeFromExternrefTable0(ret[2]);
        }
        deferred2_0 = ptr1;
        deferred2_1 = len1;
        return getStringFromWasm0(ptr1, len1);
    } finally {
        wasm.__wbindgen_free(deferred2_0!, deferred2_1!, 1);
    }
}

