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
  map: fn((ctx, f, xs) => {
    return xs.map(x => f.invoke(ctx, x, {}))
  })
};
