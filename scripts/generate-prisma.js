const fs = require('fs');
const path = require('path');

global.PRISMA_WASM_PANIC_REGISTRY = { set_message: () => {} };

function getWasm() {
  const Tr = { exports: {} };
  const tK = { __wbindgen_placeholder__: Tr.exports };
  let se;
  const { TextDecoder, TextEncoder } = require('util');
  const rK = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
  let x_ = null;
  function w_() {
    if (x_ === null || x_.byteLength === 0) x_ = new Uint8Array(se.memory.buffer);
    return x_;
  }
  function Mn(e, r) {
    e = e >>> 0;
    return rK.decode(w_().subarray(e, e + r));
  }
  const qo = new Array(128).fill(undefined);
  qo.push(undefined, null, true, false);
  let mv = qo.length;
  function d5e(e) {
    if (mv === qo.length) qo.push(qo.length + 1);
    const r = mv;
    mv = qo[r];
    qo[r] = e;
    return r;
  }
  let Ir = 0;
  const __ = new TextEncoder('utf-8');
  function an(e, r, n) {
    const u = __.encode(e);
    const l = r(u.length, 1) >>> 0;
    w_().subarray(l, l + u.length).set(u);
    Ir = u.length;
    return l;
  }
  let dd = null;
  function lt() {
    if (dd === null || dd.buffer.detached === true || (dd.buffer.detached === undefined && dd.buffer !== se.memory.buffer)) {
      dd = new DataView(se.memory.buffer);
    }
    return dd;
  }
  function m5e(e) { return qo[e]; }
  function g5e(e) { if (e >= 132) { qo[e] = mv; mv = e; } }
  function E_(e) { const r = m5e(e); g5e(e); return r; }

  Tr.exports.get_dmmf = function(e) {
    let r, n;
    try {
      const f = se.__wbindgen_add_to_stack_pointer(-16);
      const p = an(e, se.__wbindgen_malloc, se.__wbindgen_realloc);
      const g = Ir;
      se.get_dmmf(f, p, g);
      const i = lt().getInt32(f + 4 * 0, true);
      const a = lt().getInt32(f + 4 * 1, true);
      const o = lt().getInt32(f + 4 * 2, true);
      const c = lt().getInt32(f + 4 * 3, true);
      let u = i, l = a;
      if (c) { u = 0; l = 0; throw E_(o); }
      return Mn(u, l);
    } finally {
      se.__wbindgen_add_to_stack_pointer(16);
      se.__wbindgen_free(r, n, 1);
    }
  };

  Tr.exports.get_config = function(e) {
    let r, n;
    try {
      const o = se.__wbindgen_add_to_stack_pointer(-16);
      const c = an(e, se.__wbindgen_malloc, se.__wbindgen_realloc);
      const u = Ir;
      se.get_config(o, c, u);
      const i = lt().getInt32(o + 4 * 0, true);
      const a = lt().getInt32(o + 4 * 1, true);
      return Mn(i, a);
    } finally {
      se.__wbindgen_add_to_stack_pointer(16);
      se.__wbindgen_free(r, n, 1);
    }
  };

  Tr.exports.__wbindgen_error_new = function(e, r) { return d5e(new Error(Mn(e, r))); };
  Tr.exports.__wbg_setmessage_e113e9fee2d41bd4 = function(e, r) { global.PRISMA_WASM_PANIC_REGISTRY.set_message(Mn(e, r)); };
  Tr.exports.__wbindgen_throw = function(e, r) { throw new Error(Mn(e, r)); };

  const wasmPath = path.join(__dirname, '../node_modules/prisma/build/prisma_schema_build_bg.wasm');
  const wasmBytes = fs.readFileSync(wasmPath);
  const wasmModule = new WebAssembly.Module(wasmBytes);
  const wasmInstance = new WebAssembly.Instance(wasmModule, tK);
  se = wasmInstance.exports;
  return Tr.exports;
}

async function generateAll() {
  const wasm = getWasm();
  const schemaPath = path.resolve(__dirname, '../prisma/schema.prisma');
  const datamodel = fs.readFileSync(schemaPath, 'utf8');
  const dmmf = JSON.parse(wasm.get_dmmf(JSON.stringify({ prismaSchema: datamodel })));
  const configRes = JSON.parse(wasm.get_config(JSON.stringify({ prismaSchema: datamodel, ignoreEnvVarErrors: true })));
  const config = configRes.config;

  const generator = config.generators[0];
  const datasources = config.datasources;
  const outputDir = path.resolve(__dirname, '../node_modules/.prisma/client');

  const genBuildPath = path.resolve(__dirname, '../node_modules/@prisma/client/generator-build/index.js');
  let genBuildCode = fs.readFileSync(genBuildPath, 'utf8');
  if (!genBuildCode.includes('generateClient: () => generateClient')) {
    genBuildCode = genBuildCode.replace('dmmfToTypes: () => dmmfToTypes,', 'generateClient: () => generateClient,\n  dmmfToTypes: () => dmmfToTypes,');
    fs.writeFileSync(genBuildPath, genBuildCode, 'utf8');
  }

  const { generateClient } = require('../node_modules/@prisma/client/generator-build/index.js');
  await generateClient({
    datamodel,
    schemaPath,
    binaryPaths: { libqueryEngine: { 'debian-openssl-3.0.x': '' } },
    datasources,
    outputDir,
    copyRuntime: true,
    copyEngine: false,
    dmmf,
    generator,
    clientVersion: '5.22.0',
    engineVersion: '605197351a3c8bdd595af2d2a9bc3025bca48ea2',
    activeProvider: 'postgresql',
    postinstall: false,
  });

  console.log('Successfully generated complete Prisma Client in', outputDir);
}

generateAll().catch(console.error);
