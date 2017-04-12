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
  }

  chain(transformation) {
    return new Stream((producer) => {
      this.subscribe({
        Value(x) {
          const stream = transformation(x);
          stream.subscribe({
            Value: producer.pushValue,
            Error: producer.pushError,
            Close: producer.close
          });
          stream.run();
        },

        Error: producer.pushError,
        Close: producer.close
      });

      this.run();
    });
  }

  static of(value) {
    return new Stream(async (producer) => {
      await producer.pushValue(value);
      await producer.close();
    });
  }

  map(transformation) {
    return this.chain(x => Stream.of(transformation(x)));
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
  }

  run() {
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

      const operations = {
        async pushValue(value) {
          await broadcast('Value', [value]);
        },

        async pushError(error) {
          await broadcast('Error', [error]);
        },

        async close() {
          await broadcast('Close', []);
          closed = true;
          resolve();
        }
      };

      this.producer(operations);
    });
  }
}


module.exports = Stream;
