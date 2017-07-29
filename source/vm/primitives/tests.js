//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { typeMatches } = require('../types');
const { fn } = require('./wrapping');


module.exports = {
  any: fn((ctx, x) => typeMatches('Any', x)),
  number: fn((ctx, x) => typeMatches('Number', x)),
  text: fn((ctx, x) => typeMatches('Text', x)),
  boolean: fn((ctx, x) => typeMatches('Boolean', x)),
  vector: fn((ctx, x) => typeMatches('Vector', x)),
  invokable: fn((ctx, x) => typeMatches('Invokable', x)),
  stream: fn((ctx, x) => typeMatches('Stream', x)),
  record: fn((ctx, x) => typeMatches('Record', x)),
  any_variant: fn((ctx, x) => typeMatches('Variant', x)),
  variant: fn((ctx, tag, x) => typeMatches('Variant', x) && typeMatches(tag, x)),
  instance: fn((ctx, tag, x) => typeMatches(tag, x))
};
