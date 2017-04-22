//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const path = require('path');
const { Environment } = require('./environment');


// Represents a native function
class Primitive {
  constructor(name, doc, fn) {
    this.name = name;
    this.documentation = doc;
    this.computation = fn;
  }

  invoke(context, stream, record) {
    return this.computation(context.traceNative(this.name), stream, record);
  }
}


// Represents a Furipota partial function (fn _)
class Partial {
  constructor(context, callee, options) {
    this.context = context;
    this.callee = callee;
    this.options = options;
  }

  invoke(context, input, _options) {
    return this.callee.invoke(this.context.traceProcedure('(partial)'), input, this.options);
  }
}


// Represents a Furipota lambda
class Lambda {
  constructor(context, expression, valueParam, optionsParam) {
    this.context = context;
    this.expression = expression;
    this.valueParam = valueParam;
    this.optionsParam = optionsParam;
  }

  invoke(_context, value, options) {
    const exprContext = this.context.extendEnvironment({
      [this.valueParam]: value,
      [this.optionsParam]: options
    });

    return exprContext.traceProcedure('(lambda)').evaluate(this.expression);
  }
}


// Represents a lazy, native variable
class NativeThunk {
  constructor(name, value, documentation) {
    this.name = name;
    this.value = value;
    this.documentation = documentation;
  }

  invoke(ctx) {
    return this.value(ctx);
  }

  get autoInvoke() {
    return true;
  }
}


// Represents a lazy, Furipota variable
class Thunk {
  constructor(context, name, expression, documentation) {
    this.name = name;
    this.expression = expression;
    this.documentation = documentation;
    this.context = context;
    this.value = null;
    this.computed = false;
  }

  get autoInvoke() {
    return true;
  }

  invoke() {
    if (this.computed) {
      return this.value;
    }

    const value = this.context.traceProcedure(this.name).evaluate(this.expression);
    this.value = value;
    this.computed = true;
    return value;
  }
}


// Represents an open variant
class Tagged {
  constructor(tag, value) {
    this.tag = tag;
    this.value = value;
  }
}


// Represents a Furipota module
class Module {
  constructor(fileName, baseEnvironment) {
    this.fileName = fileName;
    this.baseName = path.dirname(fileName);
    this.exports = new Map();
    this.environment = new Environment(baseEnvironment);
  }

  export(alias, identifier) {
    this.exports.set(alias, identifier);
  }

  get exportedBindings() {
    const result = {};
    Array.from(this.exports.entries()).forEach(([alias, id]) => {
      result[alias] = this.environment.get(id);
    });
    return result;
  }
}


module.exports = {
  Primitive,
  Partial,
  Lambda,
  NativeThunk,
  Thunk,
  Tagged,
  Module
};
