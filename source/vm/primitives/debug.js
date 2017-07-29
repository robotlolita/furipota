//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { fn } = require('./wrapping');
const { getType } = require('../types');


module.exports = {
  log: fn((ctx, x) => console.log(x)),
  type: fn((ctx, x) => getType(x))
};
