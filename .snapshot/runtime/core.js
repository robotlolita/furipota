//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { primitive, tagged, assertType, getType } = furipota;

  return {
    match(vm, value, patterns) {
      assertType('match <x>', 'Tagged', value);

      const method = patterns[value.tag] || patterns['default'];
      assertInvokable(`match _ ${getType(value.tag)}: <X>`, method);

      return method.invoke(vm, value, {});
    },

    and(_, a) {
      return primitive((_, b) => {
        assertType('<X> and _', 'Boolean', a);
        assertType('_ and <X>', 'Boolean', b);
        return a && b;
      });
    },

    or(_, a) {
      return primitive((_, b) => {
        assertType('<X> or _', 'Boolean', a);
        assertType('_ or <X>', 'Boolean', b);
        return a || b;
      });
    },
    
    not(_, a) {
      assertType('not <X>', 'Boolean', a);
      return !a;
    },

    '==='(_, a) {
      return primitive((_, b) => {
        return a === b;
      });
    },

    '=/='(_, a) {
      return primitive((_, b) => {
        return a !== b;
      });
    },

    'do'(_, exprs) {
      assertType('do expressions', 'Vector', exprs);
      if (exprs.length === 0) {
        throw new Error(`(do expressions) invoked with an empty sequence of expressions`);
      }
      return exprs[exprs.length - 1];
    }
  }
};
