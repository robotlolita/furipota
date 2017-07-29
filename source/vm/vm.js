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
const PrimModule = require('./primitives/all');
const Plugins = require('./plugins');
const compile = require('./passes');
const pprint = require('./pretty-print');


function readAsText(path) {
  return fs.readFileSync(path, 'utf8');
}


class FuripotaVM {
  constructor() {
    this.coreModules = CoreModules;
    this.plugins = Plugins;
    this.globals = new Environment(null);
    this.primitives = primitives;
    this.moduleCache = new Map();
    this.runtimeCache = new Map();
    this.runtimeDir = path.join(__dirname, '../runtime');
  }

  parse(source) {
    return Parser.matchAll(source, 'Program');
  }

  parseExpression(source) {
    return Parser.matchAll(source, 'expression');
  }

  parseFile(file) {
    return this.parse(readAsText(file));
  }

  compile(ast) {
    return compile(ast);
  }

  prettyPrint(ast) {
    return pprint(ast);
  }

  context(module, environment) {
    return new Context({ 
      vm: this,
      environment,
      module
    });
  }

  evaluate(ast, context) {
    return evaluate(compile(ast), context);
  }

  loadRuntimeModule(file) {
    const fullPath = path.join(this.runtimeDir, file + '.frp');

    if (this.runtimeCache.has(fullPath)) {
      return this.runtimeCache.get(fullPath);
    } else if (fs.existsSync(fullPath)) {
      const module = new Module(fullPath, new Environment(null).extend({ P: PrimModule }));
      const ctx = this.context(module, module.environment);

      module.environment.define('self', {
        path: primitives.textToPath(fullPath)
      });

      const ast = this.parseFile(fullPath);
      this.evaluate(ast, ctx);

      this.runtimeCache.set(fullPath, module);
      return module;
    } else {
      throw new Error(`No core module ${file}`);
    }
  }

  loadModule(file, kind) {
    switch (kind) {
      case 'core': {
        if (this.coreModules.hasOwnProperty(file)) {
          return this.coreModules[file](this);
        } else {
          return this.loadRuntimeModule(file);
        }
      }

      case 'plugin': {
        if (this.plugins.hasOwnProperty(file)) {
          return this.plugins[file](this);
        } else {
          return require(file)(this);
        }
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

          const ast = this.parseFile(file);
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
