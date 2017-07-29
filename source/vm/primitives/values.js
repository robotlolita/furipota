//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { Tagged, Variant } = require('../intrinsics');
const { native, fn } = require('./wrapping');


function typeMatch(ctx, value, patterns) {
  const tag = getType(value);
  ctx.assert(tag in patterns || patterns['default'], `The type ${tag} is not supported.`);

  const method = patterns[tag] || patterns['default'];
  return method(value);
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

Tagged.prototype.$show = function(ctx) {
  if (this.tag.$show) {
    return this.tag.$show(ctx, this);
  } else {
    return `^${this.tag.tag}(${this.values.map(x => show(ctx, x)).join(', ')})`;
  }
};


const isAny = native('isAny', [['Any'], {}], '', () => true);
const isString = native('isString', [['Any'], {}], '', (x) => typeof x === 'string');


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



module.exports = {
  TPath, 
  TOk, 
  TError, 
  TUnit, 
  TShellError, 
  TShellExitCode, 
  TShellOutput, 
  TShellErrorOutput,
  make: fn((ctx, variant, values) => variant.create(ctx, values))
};
