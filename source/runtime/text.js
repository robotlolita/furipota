//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { primitive, assertType } = furipota;

  return {
    concat(vm, x) {
      return primitive((vm, y) => {
        assertType('concat <A> _', 'Text', x);
        assertType('concat _ <B>', 'Text', y);
        return x + y;
      });
    }
  }
};
