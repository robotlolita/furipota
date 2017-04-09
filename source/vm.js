//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { fromPairs } = require('folktale/core/object');

const AST = require('./ast');


class Primitive {
  constructor(fn) {
    this.computation = fn;
  }

  invoke(vm, stream, record) {
    return this.computation(vm, stream, record);
  }
}


class Procedure {
  constructor(name, environment, expression) {
    this.name = name;
    this.environment = environment;
    this.expression = expression;
  }

  invoke(vm, stream, record) {
    try {
      return vm.evaluate(this.expression, this.environment);
    } catch (error) {
      throw new Error(`Error evaluating ${name}: ${error.name} - ${error.message}`);
    }
  }
}


class Environment {
  constructor(base) {
    this.bindings = Object.create(base);
  }

  get(name) {
    if (name in this.bindings) {
      return this.bindings[name];
    } else {
      throw new ReferenceError(`No binding defined for ${name}`);
    }
  }

  define(name, invokable) {
    if (name in this.bindings) {
      throw new Error(`${name} is already defined`);
    } else {
      this.bindings[name] = value;
    }
  }
}


class FuripotaVM {
  constructor() {
    this.global = new Environment(null);
  }

  evaluate(ast, environment) {
    return ast.matchWith({
      Identifier: ({ name }) =>
        name,

      Text: ({ value }) =>
        value,

      Number: ({ value }) =>
        value,

      Vector: ({ items }) =>
        items,

      Record: ({ pairs }) =>
        fromPairs(pairs.map(([key, value]) => {
          return [
            key,
            this.evaluate(value, environment)
          ];
        })),

      Define: ({ id, expression }) => {
        const name = this.evaluate(id, environment);
        environment.define(
          name,
          new Procedure(name, environment, expression)
        );
        return null;
      },

      Import: ({ path }) =>
        this.import(path),

      Invoke: ({ callee, stream, record }) =>
        this.evaluate(callee, environment).invoke(
          this,
          this.evaluate(stream, environment),
          this.evaluate(record, environment)
        ),

      Pipe: ({ input, mapping, record }) => {
        const stream = this.evaluate(input, environment);
        const fn = this.evaluate(mapping, environment);
        return stream.chain(
          (value) => fn.invoke(this, value, record)
        );
      },

      Variable: ({ id }) => {
        const name = this.evaluate(id, environment);
        return environment.get(name);
      }
    });
  }

  import(path) {
    throw new Error('TODO');
  }

  static procedure(name, environment, expression) {
    return new Procedure(name, environment, expression);
  }

  static primitive(fn) {
    return new Primitive(fn);
  }
}


module.exports = FuripotaVM;
