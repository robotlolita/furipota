//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { nativeModule, native, unit } = furipota.primitives;

  return nativeModule('core:terminal', {
    show:
    native('show', [['Stream'], {}],
      'outputs a stream to standard outputs',
      (ctx, stream, _options) => {
        stream.subscribe({
          Value: async (x) => {
            ctx.assertType('Text | Buffer', x);
            process.stdout.write(x)
          },
          Error: (x) => {
            ctx.assertType('Text | Buffer', x);
            process.stderr.write(x)
          },
          Close: () => {}
        });

        return stream;
      }
    ),

    display:
    native('display', [['Text'], {}],
      'Writes a chunk to standard output',
      (ctx, chunk, _options) => {
        process.stdout.write(chunk);
        return unit;
      }
    ),

    'display-line':
    native('display-line', [['Text'], {}],
      'Writes a line to standard output',
      (ctx, chunk, _options) => {
        process.stdout.write(chunk + '\n');
        return unit;
      }
    ),

    'display-error':
    native('display-error', [['Text'], {}],
      'Writes a chunk to standard error output',
      (ctx, chunk, _options) => {
        process.stderr.write(chunk);
        return unit;
      }
    ),


    'display-error-line':
    native('display-error-line', [['Text'], {}],
      'Writes a line to standard error output',
      (ctx, chunk, _options) => {
        process.stdout.write(chunk + '\n');
        return unit;
      }
    )    
  });
};
