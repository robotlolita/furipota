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
      return primitive((_, stream, options, stack) => {
        assertInvokable('Stream.map x _', fn);
        assertType('Stream.map _ x', 'Stream', stream);
        return stream.map((value) => {
          return fn.invoke(vm, value, {}, [...stack, { native: 'Stream.map' }]);
        });
      });
    },

    filter: (vm, fn, options) => {
      return primitive((_, stream, __, stack) => {
        assertInvokable('Stream.filter x _', fn);
        assertType('Stream.filter _ x', 'Stream', stream);

        return stream.chain((value) => {
          const keep = fn.invoke(vm, value, Object.create(null), [...stack, { native: 'Stream.filter' }]);
          assertType('Stream.filter’s return', 'Boolean', keep);
          if (keep) {
            return Stream.of(value);
          } else {
            return Stream.empty();
          }
        })
      });
    },

    tap: (vm, fn, options) => {
      return primitive((vm, value, _, stack) => {
        assertInvokable('Stream.tap x _', fn);
        return stream((producer) => {
          fn.invoke(vm, value, Object.create(null), [...stack, { native: 'Stream.tap' }]);
          producer.pushValue(value);
        });
      });
    },

    parallel: (vm, streams, options) => {
      assertType('Stream.merge <streams>', 'Vector', streams);
      return stream(async (producer) => {
        let pending = streams.slice();

        await Promise.all(streams.map(async x => {
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
          await x.run();
        }));
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
            await x.run();
          }
        };
        await runNext();
      }, 'sequential');
    },

    take(_, n, __) {
      return primitive((_, s, __) => {
        assertType('Stream.take n _', 'Number', n);
        assertType('Stream.take _ stream', 'Stream', s);
        
        return stream(async (producer) => {
          let pending = n;
          s.subscribe({
            Value: async (x) => {
              if (pending > 0) {
                pending -= 1;
                await producer.pushValue(x);
                if (!pending) await producer.close();
              }
            },

            Error: async (x) => {
              if (pending > 0) {
                pending -= 1;
                await producer.pushError(x);
                if (!pending) await producere.close();
              }
            },

            Close: async () => {
              await producer.close();
            }
          });
          await s.run();
        });
      });
    }
  }
};
