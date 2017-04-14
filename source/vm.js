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
const runtime = require('./runtime');

const hasOwnProperty = (x, p) => Object.prototype.hasOwnProperty.call(x, p);


function readAsText(path) {
  return fs.readFileSync(path, 'utf8');
}

function parse(source) {
  return Parser.matchAll(source, 'Program');
}

function last(xs) {
  return xs[xs.length - 1];
}

function getType(x) {
  return typeof x === 'boolean'   ?  'Boolean'
  :      typeof x === 'number'    ?  'Number'
  :      typeof x === 'string'    ?  'Text'
  :      Array.isArray(x)         ?  'Vector'
  :      x instanceof Primitive   ?  'Primitive'
  :      x instanceof Partial     ?  'Partial'
  :      x instanceof Lambda      ?  'Lambda'
  :      x instanceof NativeThunk ?  'Thunk'
  :      x instanceof Thunk       ?  'Thunk'
  :      x instanceof Buffer      ?  'Buffer'
  :      x instanceof Stream      ?  'Stream'
  :      /* otherwise */             'Record';
}

function assertInvokable(fn, value) {
  const type = getType(value);
  if (!['Primitive', 'Partial', 'Lambda', 'Thunk'].includes(type)) {
    throw new TypeError(`${fn} expected an invokable procedure (Lambda, Primitive, Partial, or Thunk), but got ${type} instead.`);
  }
}

function assertType(fn, type, value) {
  if (getType(value) !== type) {
    throw new TypeError(`${fn} expected a value of type ${type}, but got ${getType(value)} instead.`);
  }
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

class Lambda {
  constructor(environment, expression, valueParam, optionsParam) {
    this.environment = environment;
    this.expression = expression;
    this.valueParam = valueParam;
    this.optionsParam = optionsParam;
  }

  invoke(vm, value, options) {
    try {
      const env = new Environment(this.environment);
      env.define(this.valueParam, value);
      env.define(this.optionsParam, options);
      return vm.evaluate(this.expression, env);
    } catch (error) {
      throw new Error(`Error evaluating lambda.

${error.stack}

`);
    }
  }
}


class NativeThunk {
  constructor(name, value, documentation) {
    this.name = name;
    this.value = value;
    this.documentation = documentation;
  }

  invoke() {
    return this.value;
  }

  get autoInvoke() {
    return true;
  }
}


class Thunk {
  constructor(name, environment, expression, documentation) {
    this.name = name;
    this.environment = environment;
    this.expression = expression;
    this.documentation = documentation;
    this.value = null;
    this.computed = false;
  }

  get autoInvoke() {
    return true;
  }

  invoke(vm) {
    if (this.computed) {
      return this.value;
    }

    try {
      const value = vm.evaluate(this.expression, this.environment);
      this.value = value;
      this.computed = true;
      return value;
    } catch (error) {
      throw new Error(`Error evaluating ${this.name}.

${error.stack}

`);
    }
  }
}


class Module {
  constructor(fileName, baseEnvironment) {
    this.fileName = fileName;
    this.baseName = path.dirname(fileName);
    this.exports = new Map();
    this.environment = new Environment(baseEnvironment);
    this.environment.define('self', {
      filename: fileName
    })
  }

  exportAs(alias, identifier) {
    this.exports.set(alias, identifier);
  }

  get exportedBindings() {
    const result = Object.create(null);
    Array.from(this.exports.entries()).forEach(([alias, id]) => {
      result[alias] = this.environment.get(id);
    });
    return result;
  }
}


class Environment {
  constructor(base) {
    this.bindings = Object.create(base ? base.bindings : null);
  }

  get(name) {
    if (name in this.bindings) {
      return this.bindings[name];
    } else {
      throw new ReferenceError(`No binding defined for ${name}`);
    }
  }

  define(name, invokable) {
    if (hasOwnProperty(this.bindings, name)) {
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

const coreModules = runtime;


class FuripotaVM {
  constructor({ module, moduleCache }) {
    this.moduleCache = moduleCache || new Map();
    this.module = module || new Module('<vm>', this.global);
  }

  evaluate(ast, environment) {
    return ast.matchWith({
      Seq: ({ items }) =>
        last(items.map(x => this.evaluate(x, environment))),

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
        items.map(x => this.evaluate(x, environment)),

      Record: ({ pairs }) =>
        fromPairs(pairs.map(([key, value]) => {
          return [
            this.evaluate(key, environment),
            this.evaluate(value, environment)
          ];
        })),

      Lambda: ({ value, options, expression }) => {
        const theValue = this.evaluate(value, environment);
        const theOptions = this.evaluate(options, environment);
        return new Lambda(environment, expression, theValue, theOptions);
      },

      Define: ({ id, expression, documentation }) => {
        const name = this.evaluate(id, environment);
        environment.define(
          name,
          new Thunk(name, environment, expression, documentation)
        );
        return null;
      },

      Import: ({ path, kind }) => {
        const module = this.import(this.evaluate(path, environment), kind);
        environment.extend(module.exportedBindings);
      },

      ImportAliasing: ({ path, alias, kind }) => {
        const thePath = this.evaluate(path, environment);
        const theAlias = this.evaluate(alias, environment);
        const module = this.import(thePath, kind);

        environment.define(theAlias, new NativeThunk(
          theAlias,
          module.exportedBindings,
          `A ${kind} module from ${thePath}`
        ));
      },

      Export: ({ identifier }) => {
        const id = this.evaluate(identifier, environment);
        this.module.exportAs(id, id);
      },

      ExportAliasing: ({ identifier, alias }) => {
        const theId = this.evaluate(identifier, environment);
        const theAlias = this.evaluate(alias, environment);
        this.module.exportAs(theAlias, theId);
      },

      Invoke: ({ callee, input, options }) => {
        const fn = this.evaluate(callee, environment);
        assertInvokable('Function application', fn);

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
        assertType('Pipe', 'Stream', stream);
        assertInvokable('Pipe', fn);

        return stream.chain(
          (value) => fn.invoke(this, value, {})
        );
      },

      Variable: ({ id }) => {
        const name = this.evaluate(id, environment);
        const value = environment.get(name);
        if (value.autoInvoke) {
          return value.invoke(this);
        } else {
          return value;
        }
      },

      Let: ({ binding, value, expression }) => {
        const theBinding = this.evaluate(binding, environment);
        const newEnv = new Environment(environment);
        newEnv.define(theBinding, new Thunk(theBinding, environment, value, ''));

        return this.evaluate(expression, newEnv);
      },

      IfThenElse: ({ condition, consequent, alternate }) => {
        const theCondition = this.evaluate(condition, environment);
        assertType('if _ then _ else', 'Boolean', theCondition);

        if (theCondition) {
          return this.evaluate(consequent, environment);
        } else {
          return this.evaluate(alternate, environment);
        }
      },

      Get: ({ expression, property }) => {
        const theObject = this.evaluate(expression, environment);
        const theProperty = this.evaluate(property, environment);
        assertType(`_.${theProperty}`, 'Record', theObject);

        return theObject[theProperty];
      },

      Program: ({ declarations }) => {
        declarations.forEach(d => this.evaluate(d, environment));
      }
    });
  }

  import(file, kind) {
    switch (kind) {
      case 'core': {
        if (coreModules.hasOwnProperty(file)) {
          return coreModules[file](this);
        } else {
          throw new Error(`No core module ${file}`);
        }
      }

      case 'plugin': {
        return require(file)(this);
      }

      case 'furipota': {
        const fullPath = path.resolve(this.module.baseName, file);

        if (this.moduleCache.has(fullPath)) {
          return this.moduleCache.get(fullPath);
        } else {
          const newVm = FuripotaVM.fromFile(fullPath, this.moduleCache);
          this.moduleCache.set(fullPath, newVm.module);
          return newVm.module;
        }
      }

      default:
      throw new Error(`Invalid module type ${kind}`);
    }
  }

  primitive(fn) {
    return new Primitive(fn);
  }

  stream(producer, name) {
    return new Stream(producer, name);
  }

  nativeModule(name, env, record) {
    const module = new Module(name, env);
    module.environment.extend(mapValues(record, this.primitive));
    Object.keys(record).forEach(k => module.exportAs(k, k));
    return module;
  }

  getType(x) {
    return getType(x);
  }

  assertInvokable(where, value) {
    return assertInvokable(where, value);
  }

  assertType(where, type, value) {
    return assertType(where, type, value);
  }

  get Stream() {
    return Stream;
  }

  get Module() {
    return Module;
  }

  parseExpression(source) {
    return Parser.matchAll(source, 'expression');
  }

  parse(source) {
    return parse(source);
  }

  static fromFile(file, moduleCache = null) {
    const module = new Module(file, new Environment(null));
    const vm = new FuripotaVM({ module, moduleCache });
    const ast = parse(readAsText(file));
    vm.evaluate(ast, module.environment);
    return vm;
  }
}


module.exports = FuripotaVM;
