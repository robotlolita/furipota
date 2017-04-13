//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { stream, Stream, primitive } = furipota;

  return {
    tap: (vm, expression, options) => {
      return primitive((vm, value, _) => {
        return stream((producer) => {
          expression.invoke(vm, value, options);
          producer.pushValue(value);
        });
      });
    },

    'from-vector': (vm, vector, options) => {
      return stream((producer) => {
        vector.forEach(x => producer.pushValue(x));
      });
    }
  };
};
