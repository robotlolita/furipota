//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { nativeModule, native, tagged, ok, error } = furipota.primitives;

  const at = (ctx, index, vector) => {
    ctx.assert(index >= 1, 'Indexes should be 1-based and positive');
    return vector.length <= index ?  ok(vector[index - 1])
    :      /* else */                error(`${index} is not a valid index in a [1..${vector.length}] range`);
  };

  return nativeModule('core:vector', {
    join:
    native('join', [['Text', 'Vector'], {}],
      'joins items of a vector with a separator',
      (ctx, separator, items, _options) => {
        return items.join(separator);
      }
    ),

    at:
    native('at', [['Number', 'Vector'], {}],
      'retrieves the item at the given (1-based) index',
      (ctx, index, vector, _options) => {
        return at(ctx, index, vector);
      }
    ),

    first:
    native('first', [['Vector'], {}],
      'retrieves the first item of the vector',
      (ctx, vector, _options) => at(ctx, 1, vector)
    ),

    last:
    native('last', [['Vector'], {}],
      'retrieves the last item of the vector',
      (ctx, vector, _options) => at(ctx, vector.length, vector)
    ),

    slice:
    native('slice', [['Vector'], { from: 'Number', to: 'Number' }],
      'returns a subset of the vector',
      (ctx, vector, { from, to }) => vector.slice(from, to)
    ),

    count:
    native('count', [['Vector'], {}],
      'returns the number of elements in a vector',
      (ctx, vector, _options) => vector.length
    )
  });
};
