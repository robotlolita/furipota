//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { error } = require('./errors');
const hasOwnProperty = Function.call.bind(Object.prototype.hasOwnProperty);


// Represents bindings in the program
class Environment {
  constructor(base) {
    this.bindings = Object.create(base ? base.bindings : null);
  }

  get(name) {
    if (this.bindings[name] != null) {
      return this.bindings[name];
    } else {
      throw error('INEXISTENT-BINDING', `No binding defined for ${name}`);
    }
  }

  define(name, invokable) {
    if (hasOwnProperty(this.bindings, name)) {
      throw error('DUPLICATE-BINDING', `${name} is already defined`);
    } else {
      this.bindings[name] = invokable;
    }
    return this;
  }

  extend(bindings) {
    Object.keys(bindings).forEach(key => {
      this.define(key, bindings[key]);
    });
    return this;
  }
}


module.exports = { Environment };
