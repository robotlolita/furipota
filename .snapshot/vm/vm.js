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

const { Context } = require('./context');
const { Environment } = require('./environment');
const { Module } = require('./intrinsics');
const { evaluate } = require('./evaluator');
const { furipotaError } = require('./errors');
const primitives = require('./primitives');
const AST = require('./ast');
const Parser = require('./parser').FuripotaParser;
const CoreModules = require('./core-library');


function readAsText(path) {
  return fs.readFileSync(path, 'utf8');
}


class FuripotaVM {
  constructor() {
    this.coreModules = CoreModules;
    this.globals = new Environment(null);
    this.primitives = primitives;
    this.moduleCache = new Map();
  }

  parse(source) {
    return Parser.matchAll(source, 'Program');
  }

  parseExpression(source) {
    return Parser.matchAll(source, 'expression');
  }

  context(module, environment) {
    return new Context({ 
      vm: this,
      environment,
      module
    });
  }

  evaluate(ast, context) {
    return evaluate(ast, context);
  }

  loadModule(file, kind) {
    switch (kind) {
      case 'core': {
        if (this.coreModules.hasOwnProperty(file)) {
          return this.coreModules[file](this);
        } else {
          throw new Error(`No core module ${file}`);
        }
      }

      case 'plugin': {
        return require(file)(this);
      }

      case 'furipota': {
        if (this.moduleCache.has(file)) {
          return this.moduleCache.get(file);
        } else {
          const module = new Module(file, new Environment(this.globals));
          const ctx = this.context(module, module.environment);

          module.environment.define('self', {
            path: primitives.textToPath(file)
          });

          const ast = this.parse(readAsText(file));
          this.evaluate(ast, ctx);

          this.moduleCache.set(file, module);
          return module;
        }
      }

      default:
      throw new Error(`Invalid module type ${kind}`);
    }
  }
}


module.exports = FuripotaVM;
