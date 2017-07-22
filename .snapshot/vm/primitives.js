//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const path = require('path');
const { spawn } = require('cross-spawn');
const Stream = require('../data/stream');
const { compact } = require('../utils');

const { Environment } = require('./environment');
const { Primitive, Lambda, NativeThunk, Thunk, Tagged, Module, Variant } = require('./intrinsics');
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


// --[ Basic types ]---------------------------------------------------
Tagged.prototype.$show = function(ctx) {
  if (this.tag.$show) {
    return this.tag.$show(ctx, this);
  } else {
    return `^${this.tag.tag}(${this.values.map(x => show(ctx, x)).join(', ')})`;
  }
};

const TPath = new Variant('Path', [
  native('isPath', [['Any'], {}], '', 
  x => {
    return Object(x) === x
    &&     typeof x.$path === 'string'
    &&     typeof x.base === 'string'
    &&     typeof x.filename === 'string'
    &&     typeof x.extension === 'string'
  })
]);
TPath.$show = function(ctx, value) {
  return `^${this.tag}(${pathToText(value)})`;
};

const isAny = native('isAny', [['Any'], {}], '', () => true);
const isString = native('isString', [['Any'], {}], '', (x) => typeof x === 'string');

const TOk = new Variant('Ok', [isAny]);
const TError = new Variant('Error', [isAny]);

const TUnit = new Variant('Unit', []);

const TShellError = new Variant('Shell-Error', [
  native('isError', [['Any'], {}], '',
    x => Object(x) === x
    &&   typeof x.stack === 'string'
    &&   typeof x.message === 'string'
    &&   typeof x.name === 'string'
  )
]);
const TShellExitCode = new Variant('Shell-Exit-Code', [
  native('isNumber', [['Any'], {}], '',
    x => typeof x === 'number'
  )
]);
const TShellOutput = new Variant('Shell-Output', [isString]);
const TShellErrorOutput = new Variant('Shell-Error-Output', [isString]);



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


function nativeModule(name, record) {
  const module = new Module(name, new Environment(null));
  module.environment.extend(record);
  Object.keys(record).forEach(k => module.export(k, k));

  return module;
}


function variant(name, predicates) {
  return new Variant(name, predicates);
}


function tagged(variant, values) {
  if (!(variant instanceof Variant)) {
    throw new Error(`${variant} should be an instance of Variant.`);
  }
  if (values.length !== variant.predicates.length) {
    throw new Error(`${variant} accepts exactly ${variant.predicates.length} arguments, ${values.length} given.`);
  }

  return new Tagged(variant, values);
}


function show(ctx, x) {
  return typeMatch(ctx, x, {
    'Boolean': (x) => String(x),
    'Number':  (x) => String(x),
    'Text':    (x) => x,
    'Vector':  (x) => `[${x.map((v) => show(ctx, v)).join(', ')}]`,
    'default': (x) => {
      if (x instanceof Tagged) {
        return x.$show(ctx);
      } else {
        return getType(x);
      }
    }
  });
}


// --[ Path-related primitives ]---------------------------------------
function pathToText(x) {
  assertType(TPath, x);
  return x.values[0].$path;
}

function textToPath(x) {
  assertType('Text', x);
  
  const data = path.parse(x);
  return tagged(TPath, [{
    base: data.base,
    filename: data.name,
    extension: data.ext,
    $path: x
  }]);
}


// --[ Stream-related primitives ]-------------------------------------
function stream(producer) {
  return new Stream(producer);
}


// --[ OS-related primitives ]-----------------------------------------
function shell(command, args, options) {
  const normalisedArgs = args.map(x => {
    if (typeMatches(TPath, x)) {
      return pathToText(x);
    } else {
      return x;
    }
  });

  return stream(async (producer) => {
    const child = spawn(pathToText(command), normalisedArgs, compact({
      cwd: options['working-directory'] ? pathToText(options['working-directory']) : null,
      env: Object.assign({}, process.env, options.environment),
      uid: options['user-id'],
      gid: options['group-id'],
      shell: false
    }));
    const encoding = options.encoding != null ? options.encoding : 'utf8';

    const die = async (error) => {
      child.kill();
      await producer.pushError(new Taggged(TShellError, [{
        stack: error.stack,
        name: error.name,
        message: error.message
      }]));
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
      wrap(() => producer.pushValue(tagged(TShellOutput, [chunk.toString(encoding)])));
    });

    child.stderr.on('data',  async (chunk) => {
      wrap(() => producer.pushValue(tagged(TShellErrorOutput, [chunk.toString(encoding)])));
    });

    child.on('close', async (code) => {
      if (code !== 0) {
        await producer.pushError(tagged(TShellExitCode, [code]));
      }
      await producer.close();
    });

    child.on('error', async (error) => {
      await producer.pushError(tagged(TShellError, [{ 
        stack: error.stack, 
        name: error.name, 
        message: error.message 
      }]));
      await producer.close();
    });
  });
}

// -- other structures
function ok(value) {
  return tagged(TOk, [value]);
}

function error(value) {
  return tagged(TError, [value]);
}

const unit = tagged(TUnit, []);


module.exports = {
  typeMatches, assert, assertType, show,
  native, nativeModule, nativeThunk, tagged, variant,
  pathToText, textToPath,
  stream,
  shell,
  Stream,
  ok, error, unit,
  TPath, TOk, TError, TUnit, TShellError, TShellExitCode, TShellOutput, TShellErrorOutput,
  isAny, isString
};
