//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

class Stream {
  constructor(producer, name) {
    this.producer = producer;
    this.listeners = [];
    this.running = false;
    this.name = name;
  }

  chain(transformation) {
    return new Stream(async (producer) => {
      let pending = [];
      const maybeClose = (x) => async () => {
        pending = pending.filter(a => a !== x);
        if (!pending.length) {
          await producer.close();
        }
      }

      this.subscribe({
        Value(x) {
          const stream = transformation(x);
          stream.subscribe({
            Value: producer.pushValue,
            Error: producer.pushError,
            Close: maybeClose(stream)
          });
          pending.push(stream);
          stream.run();
        },

        Error: producer.pushError,
        Close: maybeClose(this)
      });

      pending.push(this);
      await this.run();
    }, this.name + ' chain');
  }

  static of(value) {
    return new Stream(async (producer) => {
      await producer.pushValue(value);
      await producer.close();
    }, 'of');
  }

  static empty() {
    return new Stream(async (producer) => {
      await producer.close();
    }, 'empty');
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
