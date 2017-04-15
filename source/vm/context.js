//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { Trace } = require('./tracing');
const { assertType, assert } = require('./assertion');
const { furipotaError } = require('./errors');
const { Environment } = require('./environment');


class Context {
  constructor({ vm, environment, module }) {
    this.vm = vm;
    this.environment = environment;
    this.module = module;
    this.trace = new Trace();
  }

  _clone(props) {
    return Object.assign(Object.create(this), props);
  }

  evaluate(ast) {
    return this.vm.evaluate(ast, this);
  }

  extendEnvironment(newBindings) {
    return this._clone({
      environment: new Environment(this.environment).extend(newBindings)
    })
  }

  loadModule(id, kind) {
    return this.vm.loadModule(id, kind);
  }

  assert(condition, message) {
    try {
      assert(condition, message);
    } catch (error) {
      this.rethrow(error);
    }
  }

  assertType(type, value, message) {
    try {
      assertType(type, value, message);
    } catch (error) {
      this.rethrow(error);
    }
  }

  error(name, message) {
    throw furipotaError(name, message, this.trace);
  }

  rethrow(error) {
    if (error.furipotaShouldAssimilate) {
      throw furipotaError(error.name, error.message, this.trace, error);
    } else {
      throw error;
    }
  }

  traceExpression(node) {
    return this._clone({
      trace: this.trace.expression(this.module, node)
    });
  }

  traceNative(name) {
    return this._clone({
      trace: this.trace.native(this.module, name)
    });
  }

  traceProcedure(name) {
    return this._clone({
      trace: this.trace.procedure(this.module, name)
    });
  }
}


module.exports = { Context };
