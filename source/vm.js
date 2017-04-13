//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const path = require('path');
const fs = require('fs');
const { fromPairs, mapValues } = require('folktale/core/object');

const AST = require('./ast');
const Parser = require('./parser').FuripotaParser;
const Stream = require('./stream');


function readAsText(path) {
  return new Promise((resolve, reject) => {
    fs.readFile(path, 'utf8', (error, data) => {
      if (error)  reject(error);
      else        resolve(data);
    });
  });
}

function parse(source) {
  return Parser.matchAll(source, 'Program');
}


class Primitive {
  constructor(fn) {
    this.computation = fn;
  }

  invoke(vm, stream, record) {
    return this.computation(vm, stream, record);
  }
}


class Partial {
  constructor(callee, options) {
    this.callee = callee;
    this.options = options;
  }

  invoke(vm, input, _) {
    return this.callee.invoke(vm, input, this.options);
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
      throw new Error(`Error evaluating ${this.name}.
      
${error.stack}

`);
    }
  }
}


class Thunk {
  constructor(name, environment, expression) {
    this.name = name;
    this.environment = environment;
    this.expression = expression;
  }

  invoke(vm) {
    try {
      return vm.evaluate(this.expression, this.environment);
    } catch (error) {
      throw new Error(`Error evaluating ${this.name}.
      
${error.stack}

`);
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
      this.bindings[name] = invokable;
    }
  }

  extend(bindings) {
    Object.keys(bindings).forEach(key => {
      this.define(key, bindings[key]);
    });
  }
}


class FuripotaVM {
  constructor({ baseDirectory }) {
    this.global = new Environment(null);
    this.baseDirectory = baseDirectory;
  }

  evaluate(ast, environment) {
    return ast.matchWith({
      Identifier: ({ name }) =>
        name,

      Keyword: ({ name }) =>
        name,

      Text: ({ value }) =>
        value,

      Boolean: ({ value }) =>
        value,

      Integer: ({ sign, value }) =>
        Number(sign + value),

      Decimal: ({ sign, integral, decimal, exponent }) =>
        Number(sign + integral + '.' + (decimal || '0') + exponent),

      Vector: ({ items }) =>
        items,

      Record: ({ pairs }) =>
        fromPairs(pairs.map(([key, value]) => {
          return [
            this.evaluate(key, environment),
            this.evaluate(value, environment)
          ];
        })),

      Define: ({ id, expression }) => {
        const name = this.evaluate(id, environment);
        environment.define(
          name,
          new Thunk(name, environment, expression)
        );
        return null;
      },

      Import: ({ path }) =>
        this.import(path),

      Invoke: ({ callee, input, options }) => {
        const fn = this.evaluate(callee, environment);
        return fn.invoke(
          this,
          this.evaluate(input, environment),
          this.evaluate(options, environment)
        );
      },

      Partial: ({ callee, options }) =>
        new Partial(
          this.evaluate(callee, environment),
          this.evaluate(options, environment)
        ),


      Pipe: ({ input, transformation }) => {
        const stream = this.evaluate(input, environment);
        const fn = this.evaluate(transformation, environment);
        return stream.chain(
          (value) => fn.invoke(this, value, {})
        );
      },

      Variable: ({ id }) => {
        const name = this.evaluate(id, environment);
        const value = environment.get(name);
        if (value instanceof Thunk) {
          return value.invoke(this);
        } else {
          return value;
        }
      },

      Program: ({ declarations }) => {
        declarations.forEach(d => this.evaluate(d, environment));
      }
    });
  }

  async import(file) {
    const fullPath = path.resolve(this.baseDirectory, file);
    const ast = parse(await readAsText(fullPath));
    this.evaluate(ast, this.global);
  }

  plugin(fn) {
    const bindings = fn(this);
    this.global.extend(mapValues(bindings, (x) => new Primitive(x)));
  }

  procedure(name, environment, expression) {
    return new Procedure(name, environment, expression);
  }

  primitive(fn) {
    return new Primitive(fn);
  }

  stream(producer) {
    return new Stream(producer);
  }

  get Stream() {
    return Stream;
  }
}


module.exports = FuripotaVM;
