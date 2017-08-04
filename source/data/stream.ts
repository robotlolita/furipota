//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------


type OperationName = 'emit' | 'end' | 'fail';

type Operations<V, E> = {
  emit(value: V): Promise<void>
  end(): Promise<void>
  fail(error: E): Promise<void>
};

type Producer<V, E> = (operations: Operations<V, E>) => Promise<void>;


/**
 * Streams are the basic data structure in Furipota. They produce
 * discrete values over time, and either finish successfully, or
 * fail with some error.
 */
export class Stream<V, E> {
  private producer: Producer<V, E>;
  private listeners: Array<Operations<V, E>>;
  private running: boolean;
  readonly name: string;

  /**
   * Constructs a new Stream using the given producer to provide the values.
   * 
   * @param producer 
   */
  constructor(name: string, producer: Producer<V, E>) {
    this.name = name;
    this.producer = producer;
    this.listeners = [];
    this.running = false;
  }

  /**
   * Subscribes to events on a stream.
   */
  subscribe(handler: Operations<V, E>): Operations<V, E> {
    this.listeners.push(handler);
    return handler;
  }

  /**
   * Removes a handler from a stream.
   */
  unsubscribe(handler: Operations<V, E>): Operations<V, E> {
    this.listeners = this.listeners.filter(x => x !== handler);
    return handler;
  }

  /**
   * Runs a stream.
   */
  run(): Promise<void> {
    if (this.running) {
      throw new Error(`Attempted to run ${this.name}, which is already running.`);
    }

    this.running = true;

    return new Promise((resolve, reject) => {
      const listeners = this.listeners;
      let closed = false;

      function broadcast(operation: OperationName, arg?: V | E) {
        if (!closed) {
          return Promise.all(listeners.map((l:any) => l[operation](arg)));
        } else {
          return Promise.resolve();
        }
      }

      function die(error: E) {
        closed = true;
        reject(error);
      }

      const operations = {
        async emit(value: V): Promise<void> {
          await broadcast('emit', value).catch(die);
        },

        async fail(error: E): Promise<void> {
          await broadcast('fail', error).catch(die);
          closed = true;
          reject(error);
        },

        async end(): Promise<void> {
          await broadcast('end').catch(die);
          closed = true;
          resolve();
        }
      };

      this.producer(operations);
    });
  }
}