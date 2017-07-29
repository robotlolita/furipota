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
  or: fn((ctx, a, b) => a || b),
  and: fn((ctx, a, b) => a && b),
  not: fn((ctx, a) => !a)
};
