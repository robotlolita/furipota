//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { union } = require('folktale/adt/union');
const chalk = require('chalk');
const prettyPrint = require('./pretty-print');

const TraceEntry = union('furipota:tracing:type', {
  Expression(module, node) {
    return { module, node };
  },

  Native(module, name) {
    return { module, name };
  },

  Procedure(module, name) {
    return { module, name };
  }
});


// Represents a trace of the current execution
class Trace {
  constructor() {
    this.trace = [];
    this.MAX_SIZE = 10;
  }

  _extend(entry) {
    return Object.assign(Object.create(this), {
      trace: [entry, ...this.trace].slice(-this.MAX_SIZE)
    });
  }

  expression(module, node) {
    return this._extend(TraceEntry.Expression(module, node));
  }

  native(module, name) {
    return this._extend(TraceEntry.Native(module, name));
  }

  procedure(module, name) {
    return this._extend(TraceEntry.Procedure(module, name));
  }

  _formatEntry(entry) {
    return entry.matchWith({
      Native: ({ module, name }) =>
        `at native ${chalk.green(name)} in ${chalk.green(module.fileName)}`,

      Procedure: ({ module, name, node }) =>
        `at ${chalk.blue(name)} in ${chalk.green(module.fileName)}`,

      Expression: ({ module, node }) =>
        `in ${chalk.green(module.fileName)}\n  : ${chalk.gray(prettyPrint(node, 4).split(/\r|\n/)[0])}`
    });
  }

  format() {
    return this.trace.map(entry => this._formatEntry(entry));
  }

  formatTopEntry() {
    const entry = this.trace[0];

    if (!entry) {
      throw new Error(`Trying to format the top of an empty trace.`);
    }

    return entry.matchWith({
      Native: ({ module, name }) =>
        `native ${chalk.green(name)} in ${chalk.green(module.fileName)}`,

      Procedure: ({ module, name, node }) =>
        `${chalk.blue(name)}: ${chalk.gray(prettyPrint(node, 4).split(/\r|\n/)[0])}`,

      Expression: ({ module, node }) =>
        `${chalk.gray(prettyPrint(node, 4).split(/\r|\n/)[0])}`
    });
  }
}


module.exports = { Trace };
