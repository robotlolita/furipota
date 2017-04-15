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
const { inspect } = require('util');

const AST = require('./ast');
const Parser = require('./parser').FuripotaParser;
const Stream = require('./stream');
const runtime = require('./runtime');
const Path = require('./runtime/path');
const OS = require('./runtime/os');

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

function flatten(xss) {
  return xss.reduce((a, b) => a.concat(b), []);
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
  :      x instanceof Tagged      ?  `^${x.tag}`
  :      Object(x) === x          ?  'Record'
  :      /* else */                  'Unknown Type';
}

function assertInvokable(fn, value) {
  const type = getType(value);
  if (!['Primitive', 'Partial', 'Lambda', 'Thunk'].includes(type)) {
    let details = '';
    if (process.env.SHOW_JS) {
      details = '\n\n' + inspect(value, true, 5, true);
    }
    throw new TypeError(`${fn} expected an invokable procedure (Lambda, Primitive, Partial, or Thunk), but got ${type} instead.${details}`);
  }
}

function assertType(fn, type, value) {
  if (getType(value) !== type) {
    let details = '';
    if (process.env.SHOW_JS) {
      details = '\n\n' + inspect(value, true, 5, true);
    }
    throw new TypeError(`${fn} expected a value of type ${type}, but got ${getType(value)} instead.${details}`);
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
  constructor(callee, options, ast) {
    this.callee = callee;
    this.options = options;
    this.fullAst = ast;
  }

  invoke(vm, input, _, stack) {
    return this.callee.invoke(vm, input, this.options, [...stack, { procedure: '(partial)', ast: this.fullAst }]);
  }
}

class Lambda {
  constructor(environment, expression, valueParam, optionsParam, ast) {
    this.environment = environment;
    this.expression = expression;
    this.valueParam = valueParam;
    this.optionsParam = optionsParam;
    this.fullAst = ast;
  }

  invoke(vm, value, options, stack) {
    const env = new Environment(this.environment);
    env.define(this.valueParam, value);
    env.define(this.optionsParam, options);
    return vm.evaluate(this.expression, env, [...stack, { procedure: '(lambda)', ast: this.fullAst }]);
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
  constructor(name, environment, expression, documentation, ast) {
    this.name = name;
    this.environment = environment;
    this.expression = expression;
    this.documentation = documentation;
    this.value = null;
    this.computed = false;
    this.fullAst = ast;
  }

  get autoInvoke() {
    return true;
  }

  invoke(vm, _, __, stack) {
    if (this.computed) {
      return this.value;
    }

    const value = vm.evaluate(this.expression, this.environment, [...stack, { procedure: this.name, ast: this.fullAst }]);
    this.value = value;
    this.computed = true;
    return value;
  }
}


class Tagged {
  constructor(tag, value) {
    this.tag = tag;
    this.value = value;
  }
}


class Module {
  constructor(fileName, baseEnvironment) {
    this.fileName = fileName;
    this.baseName = path.dirname(fileName);
    this.exports = new Map();
    this.environment = new Environment(baseEnvironment);
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


const formatStack = (stack) =>
  stack.map(({ procedure, ast }) => {
    if (procedure) {
      return `at ${procedure}: ${ast.prettyPrint(7 + procedure.length)}`;
    } else {
      return `in ${ast.prettyPrint(5)}`;
    }
  });

const ERROR_STACK_SIZE = 10;
const furipotaError = (name, message, stack, jsStack) => {
  const result = new Error(`${message}

Furipota stack:
  ${formatStack(stack.slice(-ERROR_STACK_SIZE)).join('\n  ')}

${jsStack && process.env.SHOW_JS_STACK ? 'JavaScript stack:\n' + jsStack : ''}
`);
  result.name = name;
  result.isFuripotaError = true;
  return result;
};


class Environment {
  constructor(base) {
    this.bindings = Object.create(base ? base.bindings : null);
  }

  get(name) {
    if (this.bindings[name] != null) {
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

  evaluate(ast, environment, stack = []) {
    if (process.env.TRACE_FURIPOTA) {
      console.log('=>', ast);
    }

    try {
      return ast.matchWith({
        Seq: ({ items }) =>
          last(items.map(x => this.evaluate(x, environment, stack))),

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
          items.map(x => this.evaluate(x, environment, [...stack, { ast: x }])),

        Record: ({ pairs }) =>
          fromPairs(pairs.map(([key, value]) => {
            return [
              this.evaluate(key, environment, stack),
              this.evaluate(value, environment, [...stack, { ast: value }])
            ];
          })),

        Lambda: ({ value, options, expression }) => {
          const theValue = this.evaluate(value, environment, stack);
          const theOptions = this.evaluate(options, environment, stack);
          return new Lambda(environment, expression, theValue, theOptions, ast);
        },

        Define: ({ id, expression, documentation }) => {
          const name = this.evaluate(id, environment, stack);
          environment.define(
            name,
            new Thunk(name, environment, expression, documentation, ast)
          );
          return null;
        },

        Import: ({ path, kind }) => {
          const module = this.import(this.evaluate(path, environment, stack), kind);
          environment.extend(module.exportedBindings);
        },

        ImportAliasing: ({ path, alias, kind }) => {
          const thePath = this.evaluate(path, environment, stack);
          const theAlias = this.evaluate(alias, environment, stack);
          const module = this.import(thePath, kind);

          environment.define(theAlias, new NativeThunk(
            theAlias,
            module.exportedBindings,
            `A ${kind} module from ${thePath}`
          ));
        },

        Export: ({ identifier }) => {
          const id = this.evaluate(identifier, environment, stack);
          this.module.exportAs(id, id);
        },

        ExportAliasing: ({ identifier, alias }) => {
          const theId = this.evaluate(identifier, environment, stack);
          const theAlias = this.evaluate(alias, environment, stack);
          this.module.exportAs(theAlias, theId);
        },

        Invoke: ({ callee, input, options }) => {
          const fn = this.evaluate(callee, environment, [...stack, { ast: callee }]);
          assertInvokable('Function application', fn);

          return fn.invoke(
            this,
            this.evaluate(input, environment, [...stack, { ast: input }]),
            this.evaluate(options, environment, [...stack, { ast: options }]),
            stack
          );
        },

        Prefix: ({ operator, expression }) => {
          const fn = this.evaluate(callee, environment, [...stack, { ast: operator }]);
          assertInvokable('Function application', fn);

          return fn.invoke(
            this,
            this.evaluate(expression, environment, [...stack, { ast: expression }]),
            {},
            stack
          );
        },

        Infix: ({ operator, left, right }) => {
          const fn = this.evaluate(operator, environment, [...stack, { ast: operator }]);
          assertInvokable('Function application', fn);

          const fn2 = fn.invoke(
            this,
            this.evaluate(left, environment, [...stack, { ast: left }]),
            {},
            stack
          );

          assertInvokable('Function application', fn2);
          return fn2.invoke(
            this,
            this.evaluate(right, environment, [...stack, { ast: right }]),
            {},
            stack
          );
        },

        Partial: ({ callee, options }) =>
          new Partial(
            this.evaluate(callee, environment, [...stack, { ast: callee }]),
            this.evaluate(options, environment, [...stack, { ast: options }]),
            ast
          ),


        Pipe: ({ input, transformation }) => {
          const stream = this.evaluate(input, environment, [...stack, { ast: input }]);
          const fn = this.evaluate(transformation, environment, [...stack, { ast: transformation }]);
          assertType('Pipe', 'Stream', stream);
          assertInvokable('Pipe', fn);

          return stream.chain(
            (value) => fn.invoke(this, value, {}, stack)
          );
        },

        Variable: ({ id }) => {
          const name = this.evaluate(id, environment, stack);
          const value = environment.get(name);
          if (value.autoInvoke) {
            return value.invoke(this, null, {}, stack);
          } else {
            return value;
          }
        },

        Let: ({ binding, value, expression }) => {
          const theBinding = this.evaluate(binding, environment, stack);
          const newEnv = new Environment(environment);
          newEnv.define(theBinding, new Thunk(theBinding, environment, value, '', ast));

          return this.evaluate(expression, newEnv, [...stack, { ast: expression }]);
        },

        IfThenElse: ({ condition, consequent, alternate }) => {
          const theCondition = this.evaluate(condition, environment, [...stack, { ast: condition }]);
          assertType('if _ then _ else', 'Boolean', theCondition);

          if (theCondition) {
            return this.evaluate(consequent, environment, [...stack, { ast: consequent }]);
          } else {
            return this.evaluate(alternate, environment, [...stack, { ast: alternate }]);
          }
        },

        Get: ({ expression, property }) => {
          const theObject = this.evaluate(expression, environment, [...stack, { ast: expression }]);
          const theProperty = this.evaluate(property, environment, stack);
          assertType(`_.${theProperty}`, 'Record', theObject);

          if (hasOwnProperty(theObject, theProperty)) {
            return theObject[theProperty];
          } else {
            throw new Error(`No property ${theProperty} in the record.`);
          }
        },

        Shell: ({ command, args, options }) => {
          let [theCommand] = this.evaluate(command, environment, [...stack, { ast: command }]);
          const theArgs = args.map(x => this.evaluate(x, environment, [...stack, { ast: x }]));
          if (AST.ShellSymbol.hasInstance(command)) {
            theCommand = Path(this)['from-text'](null, theCommand);
          }
          assertType(`$(command ...)`, '^Path', theCommand);

          return OS(this).run(null, theCommand, {}).invoke(null, flatten(theArgs), options);
        },

        ShellSymbol: ({ symbol }) => {
          return [symbol];
        },

        ShellSpread: ({ items }) => {
          return this.evaluate(items, environment, stack);
        },

        ShellExpression: ({ expression }) => {
          return [this.evaluate(expression, environment, stack)];
        },

        Program: ({ declarations }) => {
          declarations.forEach(d => this.evaluate(d, environment, [...stack, { ast: d }]));
        }
      });
    } catch (error) {
      if (error && error.isFuripotaError) {
        throw error;
      } else {
        const name = error ? error.name : 'EvalError';
        const message = error ? error.message : '';
        const jsStack = error ? error.stack : '';
        const theError = furipotaError(name, `Failed to evaluate:
  ${ast.prettyPrint(2)}
  
${message}`, stack, jsStack);
        throw theError;
      }
    }
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

  tagged(tag, value) {
    return new Tagged(tag, value);
  }

  nativeModule(name, env, record) {
    const module = new Module(name, env);
    module.environment.extend(mapValues(record, x => {
      return typeof x === 'function' ?  this.primitive(x)
      :      /* otherwise */            x;
    }));
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
    module.environment.define('self', {
      path: Path(vm)['from-text'](vm, file)
    });
    const ast = parse(readAsText(file));
    vm.evaluate(ast, module.environment);
    return vm;
  }
}


module.exports = FuripotaVM;
