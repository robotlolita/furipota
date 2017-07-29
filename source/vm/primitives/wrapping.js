//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { Environment } = require('../environment');
const { Primitive, Thunk, NativeThunk, Module, Variant, Tagged } = require('../intrinsics');
const { assertParameters, assert, assertType } = require('../assertion');


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


function fn(f, arity = null) {
  return curry(f.name, '', arity || f.length - 1, f);
}


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


module.exports = {
  curry,
  fn,
  native,
  nativeThunk,
  nativeModule,
  variant,
  tagged
};
