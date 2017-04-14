//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { primitive, assertType, assertInvokable, stream, Stream } = furipota;

  return {
    'from-vector': (vm, vector, options) => {
      assertType('Stream.from-vector', 'Vector', vector);
      return stream((producer) => {
        vector.forEach(x => producer.pushValue(x));
      });
    },

    map: (vm, fn, options) => {
      assertInvokable('Stream.map', fn);
      return stream.map((value) => {
        return fn.invoke(vm, value, Object.create(null));
      });
    },

    filter: (vm, fn, options) => {
      assertInvokable('Stream.filter', fn);
      return stream.chain((value) => {
        const keep = fn.invoke(vm, value, Object.create(null));
        assertType('Stream.filter’s return', 'Boolean', keep);
        if (keep) {
          return Stream.of(value);
        } else {
          return Stream.empty();
        }
      });
    },

    tap: (vm, fn, options) => {
      assertInvokable('Stream.tap', fn);
      return primitive((vm, value, _) => {
        return stream((producer) => {
          fn.invoke(vm, value, Object.create(null));
          producer.pushValue(value);
        });
      });
    },

    parallel: (vm, streams, options) => {
      assertType('Stream.merge <streams>', 'Vector', streams);
      return stream(async (producer) => {
        let pending = streams.slice();

        streams.forEach(x => {
          x.subscribe({
            Error: producer.pushError,
            Value: producer.pushValue,
            Close: async () => { 
              pending = pending.filter(a => a !== x);
              if (!pending.length) {
                await producer.close();
              }
            }
          });
          x.run();
        });
      }, 'parallel');
    },

    sequential: (vm, streams, options) => {
      assertType('Stream.merge <streams>', 'Vector', streams);
      return stream(async (producer) => {
        const pending = streams.slice();
        const runNext = async () => {
          if (!pending.length) {
            await producer.close();
          } else {
            const x = pending.shift();
            x.subscribe({
              Value: producer.pushValue,
              Error: async (error) => {
                await producer.pushError(error);
                await producer.close();
              },
              Close: runNext
            });
            x.run();
          }
        };
        runNext();
      }, 'sequential');
    }
  }
};
