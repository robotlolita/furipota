//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { Primitive, Lambda, NativeThunk, Thunk, Tagged, Variant } = require('./intrinsics');
const Stream = require('../data/stream');
const protoOf = Object.getPrototypeOf;
const internalClass = Function.call.bind(Object.prototype.toString);

function notFromObject(x) {
  return typeof x.constructor === 'function'
  &&     x.constructor !== Object
  &&     x.constructor.prototype;
}

function isMaybeClass(x) {
  return !x?                false
  :      notFromObject(x)?  true
  :      /* else */         isMaybeClass(protoOf(x));
}

function isPlainObject(x) {
  return x && !isMaybeClass(x);
}

function classOf(x) {
  return internalClass(x).replace(/^\[object |\]$/g, '');
}


function getType(x) {
  return typeof x === 'boolean'   ?  'Boolean'
  :      typeof x === 'number'    ?  'Number'
  :      typeof x === 'string'    ?  'Text'
  :      Array.isArray(x)         ?  'Vector'
  :      x instanceof Primitive   ?  'Primitive'
  :      x instanceof Lambda      ?  'Lambda'
  :      x instanceof NativeThunk ?  'Thunk'
  :      x instanceof Thunk       ?  'Thunk'
  :      x instanceof Buffer      ?  'Buffer'
  :      x instanceof Stream      ?  'Stream'
  :      x instanceof Tagged      ?  `^${x.tag.tag} instance`
  :      x instanceof Variant     ?  `^${x.tag}`
  :      isPlainObject(x)         ?  'Record'
  :      /* else */                  `Unknown Type (JS ${classOf(x)})`;
}

function typeMatches(type, value) {
  if (Array.isArray(type)) {
    return type.some(t => typeMatches(t, value));
  } else if (type instanceof Variant) {
    return type.hasInstance(value);
  } else if (type === 'Any') {
    return !/^Unknown Type/.test(getType(value));
  } else if (type === 'Invokable') {
    return ['Primitive', 'Lambda', 'Thunk'].includes(getType(value));
  } else if (type === 'Variant') {
    return value instanceof Variant;
  } else {
    return getType(value) === type;
  }
}


module.exports = { getType, typeMatches };
