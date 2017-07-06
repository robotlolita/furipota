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
  constructor(tag, values) {
    this.tag = tag;
    this.values = values;
  }
}


// Represents a variant constructor
class Variant {
  constructor(tag, predicates) {
    this.tag = tag;
    this.predicates = predicates;
  }


  unapply(value) {
    if (this.hasInstance(value)) {
      return value.values;
    } else {
      return null;
    }
  }

  hasInstance(value) {
    return value && value.tag === this;
  }

  create(context, values) {
    context.assert(
      values.length === this.predicates.length,
      `Error constructing ${this.tag}: The variant accepts exactly ${this.predicates.length} parameters, was given ${values.length}`
    );

    this.predicates.forEach((predicate, index) => {
      const nthSuffix = index === 0 ? 'st'
                      : index === 1 ? 'nd'
                      : index === 2 ? 'rd'
                      : /* else */    'nth';
      context.assertType('Invokable', predicate);
      context.assert(
        predicate.invoke(context, values[index], {}),
        `Error constructing ${this.tag}: The ${index + 1}${nthSuffix} argument is not valid for this structure.`
      );
    });

    return new Tagged(this, values);
  }

  toString() {
    return `^${this.tag}`;
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
  Lambda,
  NativeThunk,
  Thunk,
  Tagged,
  Module,
  Variant
};
