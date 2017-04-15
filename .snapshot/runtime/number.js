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

    '>'(_, a) {
      return primitive((_, b) => {
        assertType('a > _', 'Number', a);
        assertType('_ > b', 'Number', b);

        return a > b;
      });
    },

    '>='(_, a) {
      return primitive((_, b) => {
        assertType('a < _', 'Number', a);
        assertType('_ < b', 'Number', b);

        return a >= b;
      });
    },

    '<'(_, a) {
      return primitive((_, b) => {
        assertType('a < _', 'Number', a);
        assertType('_ < b', 'Number', b);

        return a < b;
      });
    },

    '<='(_, a) {
      return primitive((_, b) => {
        assertType('a <= _', 'Number', a);
        assertType('_ <= b', 'Number', b);

        return a <= b;
      });
    },

    '+'(_, a) {
      return primitive((_, b) => {
        assertType('a + _', 'Number', a);
        assertType('_ + b', 'Number', b);

        return a + b;
      });
    },

    '-'(_, a) {
      return primitive((_, b) => {
        assertType('a - _', 'Number', a);
        assertType('_ - b', 'Number', b);

        return a - b;
      });
    },

    '*'(_, a) {
      return primitive((_, b) => {
        assertType('a * _', 'Number', a);
        assertType('_ * b', 'Number', b);

        return a * b;
      });
    },

    '/'(_, a) {
      return primitive((_, b) => {
        assertType('a / _', 'Number', a);
        assertType('_ / b', 'Number', b);

        return a / b;
      });
    }
  }
};
