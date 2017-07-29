//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { fn } = require('./wrapping');


module.exports = {
  add: fn((ctx, x, y) => x + y),
  sub: fn((ctx, x, y) => x - y),
  mul: fn((ctx, x, y) => x * y),
  div: fn((ctx, x, y) => x / y),
  gt: fn((ctx, x, y) => x > y),
  gte: fn((ctx, x, y) => x >= y),
  lt: fn((ctx, x, y) => x < y),
  lte: fn((ctx, x, y) => x <= y),
  equals: fn((ctx, x, y) => x === y),
  not_equals: fn((ctx, x, y) => x !== y)
};
