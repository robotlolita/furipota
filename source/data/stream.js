//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

class Stream {
  constructor(producer) {
    this.producer = producer;
    this.listeners = [];
    this.running = false;
  }

  willMatchWith(pattern) {
    return new Stream(async (producer) => {
      let pending = [];
      const maybeClose = (x) => async () => {
        pending = pending.filter(a => a !== x);
        if (!pending.length) {
          await producer.close();
        }
      };

      this.subscribe({
        async Value(x) {
          const stream = pattern.Value(x);
          stream.subscribe({
            Value: producer.pushValue,
            Error: producer.pushError,
            Close: maybeClose(stream)
          });
          pending.push(stream);
          await stream.run();
        },

        async Error(x) {
          const stream = pattern.Error(x);
          stream.subscribe({
            Value: producer.pushValue,
            Error: producer.pushError,
            Close: maybeClose(stream)
          });
          pending.push(stream);
          await stream.run();
        },

        async Close() {
          const stream = pattern.Close();
          stream.subscribe({
            Value: producer.pushValue,
            Error: producer.pushError,
            Close: maybeClose(stream)
          });
          pending.push(stream);
          await stream.run();
        }
      });
      
      pending.push(this);
      await this.run();
    });
  }

  static of(value) {
    return new Stream(async (producer) => {
      await producer.pushValue(value);
      await producer.close();
    });
  }

  static error(value) {
    return new Stream(async (producer) => {
      await producer.pushError(value);
      await producer.close();
    });    
  }

  static empty() {
    return new Stream(async (producer) => {
      await producer.close();
    });
  }

  static fromVector(xs) {
    return new Stream(async (producer) => {
      for (const x of xs) {
        await producer.pushValue(x);
      }
      await producer.close();
    });
  }

  chain(transformation) {
    return this.willMatchWith({
      Value: (x) => transformation(x),
      Error: (x) => Stream.error(x),
      Close: () => Stream.empty()
    });
  }

  map(transformation) {
    return this.chain(x => Stream.of(transformation(x)));
  }

  mapError(transformation) {
    return this.orElse(x => Stream.error(transformation(x)));
  }

  orElse(handler) {
    return this.willMatchWith({
      Value: (x) => Stream.of(x),
      Error: (x) => handler(x),
      Close: () => Stream.empty()
    });
  }

  bimap(onValue, onError) {
    return this.willMatchWith({
      Value: (x) => Stream.of(onValue(x)),
      Error: (x) => Stream.error(onError(x)),
      Close: () => Stream.empty()
    });
  }

  concat(that) {
    return this.willMatchWith({
      Value: Stream.of,
      Error: Stream.error,
      Close: () => that
    });
  }

  andThen(handler) {
    return new Stream(async (producer) => {
      let errored = false;

      this.subscribe({
        Value: (x) => {},
        Error: async (e) => {
          errored = true;
          await producer.pushValue(e);
          await producer.close();
        },

        Close: async () => {
          if (errored) {
            await producer.close();
          } else {
            const that = handler();
            
            that.subscribe({
              Value: producer.pushValue,
              Error: producer.pushError,
              Close: producer.close
            });

            await that.run();
          }
        }
      })

      return await this.run();
    });
  }

  swap() {
    return this.willMatchWith({
      Value: Stream.error,
      Error: Stream.of,
      Close: Stream.empty
    });
  }

  fold(initial, combinator) {
    return new Stream(async (producer) => {
      let value = initial;
      this.subscribe({
        Value: async (x) => {
          value = combinator(value, x);
        },
        Error: Stream.error,
        Close: async () => {
          await producer.pushValue(value);
          await producer.close();
        }
      });
      await this.run();
    });
  }

  merge(stream) {
    return new Stream(async (producer) => {
      let pending = [stream, this];
      const pushAll = (s) => s.subscribe({
        Value: async (x) => {
          await producer.pushValue(x);
        },

        Error: async (x) => {
          await producer.pushError(x);
        },

        Close: async () => {
          pending = pending.filter(a => a !== s);
          if (pending.length === 0) {
            await producer.close();
          }
        }
      });

      pushAll(stream);
      pushAll(this);
      await Promise.all([stream.run(), this.run()]);
    });
  }

  take(n) {
    return new Stream(async (producer) => {
      let pending = n;
      this.subscribe({
        Value: async (x) => {
          if (pending > 0) {
            pending -= 1;
            await producer.pushValue(x);
          } else {
            await producer.close();
          }
        },

        Error: producer.pushError,
        Close: producer.close
      });
      await this.run();
    });
  }

  drop(n) {
    return new Stream(async (producer) => {
      let pending = n;
      this.subscribe({
        Value: async (x) => {
          if (pending === 0) {
            await producer.pushValue(x);
          } else {
            pending -= 1;
          }
        },

        Error: producer.pushError,
        Close: producer.close
      });
      await this.run();
    });
  }

  onError(listener) {
    this.listeners.push({
      Value(){ },
      Close(){ },
      Error(reason) {
        listener(reason);
      }
    });
  }

  subscribe(handler) {
    this.listeners.push(handler);
    return handler;
  }

  unsubscribe(handler) {
    this.listeners = this.listeners.filter(x => x !== handler);
    return handler;
  }

  run() {
    if (this.running) {
      return;
    }
    this.running = true;

    return new Promise((resolve, reject) => {
      const listeners = this.listeners;
      let closed = false;

      const broadcast = (operation, args) => {
        if (!closed) {
          return Promise.all(listeners.map(l => l[operation](...args)));
        } else {
          return Promise.resolve();
        }
      };

      const die = (error) => {
        closed = true;
        reject(error);
      };

      const operations = {
        async pushValue(value) {
          await broadcast('Value', [value]).catch(die);
        },

        async pushError(error) {
          await broadcast('Error', [error]).catch(die);
        },

        async close() {
          await broadcast('Close', []).catch(die);
          closed = true;
          resolve();
        }
      };

      this.producer(operations, this);
    });
  }
}


module.exports = Stream;
