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
  value: fn((ctx, t, x) => {
    const result = t.invoke(ctx, x, {});
    ctx.assertType('Boolean', result);
    ctx.assert(result, `Expected ${t.name}, but got ${getType(x)}.`);
    return x;
  }),

  blame_callee: fn((ctx, test, message, n) => {
    ctx.assert(test, `${message}
    
Blame: ${ctx.trace.formatTopEntry(n)}`)
  }),

  blame_self: fn((ctx, test, message) => {
    ctx.assert(test, `${message}
    
Blame: ${ctx.trace.formatTopEntry(1)}`)
  })
};
