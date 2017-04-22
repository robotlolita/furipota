//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const path = require('path');
const { spawn } = require('child_process');
const Stream = require('../data/stream');
const { compact } = require('../utils');

const { Environment } = require('./environment');
const { Primitive, Partial, Lambda, NativeThunk, Thunk, Tagged, Module } = require('./intrinsics');
const { assertParameters, assert, assertType } = require('./assertion');
const { typeMatches, getType } = require('./types');


// --[ Helpers ]-------------------------------------------------------
// Transforms into a Furipota curried function. Context is always the
// first parameter, options always the last.
function curry(name, doc, arity, fn) {
  const curried = (args) => new Primitive(name, doc, (ctx, arg, opts) => {
    const all = args.concat([arg]);
    if (all.length === arity) {
      return fn(ctx, ...all, opts);
    } else {
      return curried(all);
    }
  });

  return curried([]);
}

function typeMatch(ctx, value, patterns) {
  const tag = getType(value);
  ctx.assert(tag in patterns || patterns['default'], `The type ${tag} is not supported.`);

  const method = patterns[tag] || patterns['default'];
  return method(value);
}


// --[ Basic primitives ]----------------------------------------------
function native(name, spec, doc, fn) {
  const [params, option, names = []] = spec;
  if (spec.length < 2) {
    throw new TypeError(`A minimal specification ([paramTypes, optionType]) must be provided for native functions.`);
  }
  return curry(name, doc, params.length, assertParameters(name, params, option, names)(fn));
}


function nativeThunk(name, documentation, value) {
  return new NativeThunk(name, value, documentation);
}


function tagged(tag, value) {
  return new Tagged(tag, value);
}


function nativeModule(name, record) {
  const module = new Module(name, new Environment(null));
  module.environment.extend(record);
  Object.keys(record).forEach(k => module.export(k, k));

  return module;
}

function show(ctx, x) {
  return typeMatch(ctx, x, {
    'Boolean': (x) => String(x),
    'Number':  (x) => String(x),
    'Text':    (x) => x,
    'Vector':  (x) => `[${x.map(show).join(', ')}]`,
    '^Path':   (x) => pathToText(x),
    '^Shell-stderr':    (x) => x.value,
    '^Shell-error':     (x) => x.value.stack,
    '^Shell-exit-code': (x) => `exit code: ${x.value}`,
    'default': (x) => getType(x)
  });
}


// --[ Path-related primitives ]---------------------------------------
function pathToText(x) {
  assertType('^Path', x);
  return x.value._path;
}

function textToPath(x) {
  assertType('Text', x);
  
  const data = path.parse(x);
  return tagged('Path', {
    base: data.base,
    filename: data.name,
    extension: data.ext,
    _path: x
  });
}


// --[ Stream-related primitives ]-------------------------------------
function stream(producer) {
  return new Stream(producer);
}


// --[ OS-related primitives ]-----------------------------------------
function shell(command, args, options) {
  const normalisedArgs = args.map(x => {
    if (typeMatches('^Path', x)) {
      return pathToText(x);
    } else {
      return x;
    }
  });

  return stream(async (producer) => {
    const child = spawn(pathToText(command), normalisedArgs, compact({
      cwd: options['working-directory'] ? pathToText(options['working-directory']) : null,
      env: options.environment,
      uid: options['user-id'],
      gid: options['group-id']
    }));
    const encoding = options.encoding != null ? options.encoding : 'utf8';

    const die = async (error) => {
      child.kill();
      await producer.pushError(tagged('Shell-error', error));
      await producer.close();
    }

    const wrap = async (fn) => {
      try {
        child.stdout.pause();
        child.stderr.pause();
        await fn();
        child.stdout.resume();
        child.stderr.resume();
      } catch (error) {
        await die(error);
      }
    };

    child.stdout.on('data', async (chunk) => {
      wrap(() => producer.pushValue(chunk.toString(encoding)));
    });

    child.stderr.on('data',  async (chunk) => {
      wrap(() => producer.pushError(tagged('Shell-stderr', chunk.toString(encoding))));
    });

    child.on('close', async (code) => {
      if (code !== 0) {
        await producer.pushError(tagged('Shell-exit-code', code));
      }
      await producer.close();
    });

    child.on('error', async (error) => {
      await producer.pushError(tagged('Shell-error'));
      await producer.close();
    });
  });
}

// -- other structures
function ok(value) {
  return tagged('OK', value);
}

function error(value) {
  return tagged('Error', value);
}

const unit = tagged('Unit', {});


module.exports = {
  typeMatches, assert, assertType, show,
  native, tagged, nativeModule, nativeThunk,
  pathToText, textToPath,
  stream,
  shell,
  Stream,
  ok, error, unit
};
