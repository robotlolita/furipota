//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { nativeModule, native, nativeThunk, Stream } = furipota.primitives;

  return nativeModule('core:streams', {
    map: 
    native('map', [['Invokable', 'Stream'], {}], 
      'transforms values of a stream with a function', 
      (ctx, transformation, stream, _options) => {
        return stream.map(x => transformation.invoke(ctx, x, {}));
      }
    ),

    'map-errors':
    native('map-errors', [['Invokable', 'Stream'], {}],
      'transforms errors of a stream with a function',
      (ctx, transformation, stream, _options) => {
        return stream.mapError(x => transformation.invoke(ctx, x, {}));
      }
    ),

    bimap:
    native('bimap', [['Invokable', 'Invokable', 'Stream'], {}],
      'transforms both errors and values in a stream',
      (ctx, onValue, onError, stream, _options) => {
        return stream.bimap(
          x => onValue.invoke(ctx, x, {}),
          x => onError.invoke(ctx, x, {})
        );
      }
    ),

    filter:
    native('filter', [['Invokable', 'Stream'], {}],
      'filters a stream based on a predicate',
      (ctx, predicate, stream, _options) => {
        return stream.filter(x => transformation.invoke(ctx, x, {}));
      }
    ),

    'from-vector':
    native('from-vector', [['Vector'], {}],
      'converts a vector to a stream',
      (ctx, vector, _options) => {
        return Stream.fromVector(vector);
      }
    ),

    empty:
    nativeThunk('empty',
      'creates an empty stream',
      (ctx) => { 
        return Stream.empty();
      }
    ),

    of:
    native('of', [['Any'], {}],
      'creates a stream with one element',
      (ctx, value, _options) => {
        return Stream.of(value);
      }
    ),

    error:
    native('error', [['Any'], {}],
      'creates a stream containing an error',
      (ctx, value, _options) => {
        return Stream.error(value);
      }
    ),

    invert:
    native('invert', [['Stream'], {}],
      'inverts a stream, so errors become values, values become errors',
      (ctx, stream, _options) => {
        return stream.swap();
      }
    ),

    concatenate:
    native('concatenate', [['Vector'], {}],
      'concatenates a sequence of streams together. Streams are fully consumed before moving to another',
      (ctx, streams, _options) => {
        return streams.reduce((a, b) => a.concat(b));
      }
    ),

    merge:
    native('merge', [['Vector'], {}],
      'merges a set of streams together.',
      (ctx, streams, _options) => {
        return streams.reduce((a, b) => a.merge(b));
      }
    ),

    chain:
    native('chain', [['Invokable', 'Stream'], {}],
      'Transforms values in a stream',
      (ctx, transformation, stream, _options) => {
        return stream.chain(x => transformation.invoke(ctx, x, {}));
      }
    ),

    recover:
    native('recover', [['Invokable', 'Stream'], {}],
      'Transforms errors in a stream',
      (ctx, handler, stream, _options) => {
        return stream.orElse(x => handler.invoke(ctx, x, {}));
      }
    ),

    fold:
    native('fold', [['Invokable', 'Any', 'Stream'], {}],
      'combines all values in a stream',
      (ctx, combinator, initial, stream, _options) => {
        return stream.fold(
          initial,
          (a, b) => combinator.invoke(ctx, a, {}).invoke(ctx, b, {})
        );
      }
    ),

    take:
    native('take', [['Number', 'Stream'], {}],
      'takes the first n items of a stream',
      (ctx, n, stream, _options) => {
        return stream.take(n);
      }
    ),

    drop:
    native('drop', [['Number', 'Stream'], {}],
      'drops the first n items of a stream',
      (ctx, n, stream, _options) => {
        return stream.drop(n);
      }
    )
  });
};
