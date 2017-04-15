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
    join(_, vector, __) {
      return primitive((_, separator, __) => {
        assertType('Vector.join vector _', 'Vector', vector);
        assertType('Vector.join _ separator', 'Text', separator);
        return vector.join(separator);
      });
    }
  }
};
