//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { fromPairs } = require('folktale/core/object');
const { Primitive, Partial, Lambda, NativeThunk, Thunk, Tagged } = require('./intrinsics');
const { pathToText, textToPath, shell, tagged, show, unit, Stream } = require('./primitives');
const AST = require('./ast');


function hasOwnProperty(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}


function last(xs) {
  if (xs.length === 0) {
    throw new TypeError(`Trying to take the last of an empty list`);
  }

  return xs[xs.length - 1];
}


function flatten(xss) {
  return xss.reduce((a, b) => a.concat(b), []);
}


// The do-language instruction interpreter
function evaluateDo(instructions, originalContext) {
  if (instructions.length === 0) {
    return Stream.empty();
  }

  const [instruction, ...next] = instructions;
  const ctx = originalContext.traceExpression(instruction);

  return instruction.matchWith({
    DoCall: ({ expression }) => {
      evaluate(expression, ctx);
      return evaluateDo(next, ctx);
    },

    DoAction: ({ expression }) => {
      const newStream = evaluate(expression, ctx);
      ctx.assertType('Stream', newStream);

      if (next.length) {
        return newStream.andThen(() => {
          return evaluateDo(next, ctx);
        });
      } else {
        return newStream;
      }
    },

    DoReturn: ({ expression }) => {
      ctx.assert(next.length === 0, 'return must be the last instruction in a do block');
      const value = evaluate(expression, ctx);
      return Stream.of(value);
    },

    DoBind: ({ id, expression }) => {
      ctx.assert(next.length > 0, 'bind can´t be the last instruction in a do block');
      const idValue = evaluate(id, ctx);
      const newStream = evaluate(expression, ctx);
      ctx.assertType('Stream', newStream);

      return newStream.chain((value) => {
        const newCtx = ctx.extendEnvironment({ [idValue]: value });
        return evaluateDo(next, newCtx);
      });
    },

    DoLet: ({ id, expression }) => {
      const idValue = evaluate(id, ctx);
      const value = evaluate(expression, ctx);
      const newCtx = ctx.extendEnvironment({ [idValue]: value });
      return evaluateDo(next, newCtx);
    },

    DoIfThenElse: ({ condition, consequent, alternate }) => {
      ctx.assert(next.length === 0, 'if...then...else must be the last instruction in a do block');

      const conditionValue = evaluate(condition, ctx);
      if (conditionValue) {
        return evaluateDo(consequent, ctx);
      } else {
        return evaluateDo(alternate, ctx);
      }
    }
  });
}



// The main tree-walking interpreter
function evaluate(ast, originalContext) {
  const ctx = originalContext.traceExpression(ast);

  return ast.matchWith({
    Seq: ({ items }) =>
      last(items.map(x => evaluate(x, ctx))),

    // --[ Simple expressions ]----------------------------------------
    Identifier: ({ name }) =>
      name,

    Keyword: ({ name }) =>
      name,

    Text: ({ value }) =>
      value,

    Character: ({ character }) =>
      character,

    InterpolateExpression: ({ expression }) =>
      show(ctx, evaluate(expression, ctx)),

    Interpolate: ({ items }) =>
      items.map(x => evaluate(x, ctx)).join(''),

    Boolean: ({ value }) =>
      value,

    Integer: ({ sign, value }) =>
      Number(sign + value),

    Decimal: ({ sign, integral, decimal, exponent }) =>
      Number(sign + integral + '.' + (decimal || '0') + exponent),

    
    // --[ Complex values ]--------------------------------------------
    Vector: ({ items }) => {
      return items.map(x => evaluate(x, ctx))
    },

    Record: ({ pairs }) => {
      return fromPairs(pairs.map(([key, value]) => {
        return [
          evaluate(key, ctx),
          evaluate(value, ctx)
        ]
      }))
    },

    Lambda: ({ value, options, expression }) => {
      const valueName = evaluate(value, ctx);
      const optionName = evaluate(options, ctx);
      return new Lambda(ctx, expression, valueName, optionName);
    },


    // --[ Declarations ]----------------------------------------------
    Define: ({ id, expression, documentation }) => {
      const name = evaluate(id, ctx);
      const thunk = new Thunk(ctx, name, expression, documentation);
      ctx.environment.define(name, thunk);
      return unit;
    },

    Import: ({ path, kind }) => {
      const pathValue = evaluate(path, ctx);
      const module = ctx.loadModule(pathValue, kind);
      ctx.environment.extend(module.exportedBindings);
      return unit;
    },

    ImportAliasing: ({ path, alias, kind }) => {
      const pathValue = evaluate(path, ctx);
      const aliasValue = evaluate(alias, ctx);
      const module = ctx.loadModule(pathValue, kind);

      ctx.environment.define(
        aliasValue,
        new NativeThunk(
          aliasValue,
          () => module.exportedBindings,
          `A ${kind} module from ${pathValue}`
        )
      );
      return unit;
    },

    Export: ({ identifier }) => {
      const idValue = evaluate(identifier, ctx);
      ctx.module.export(idValue, idValue);
      return unit;
    },

    ExportAliasing: ({ identifier, alias }) => {
      const idValue = evaluate(identifier, ctx);
      const aliasValue = evaluate(alias, ctx);
      ctx.module.export(aliasValue, idValue);
      return unit;
    },


    // --[ Expressions ]-----------------------------------------------
    Invoke: ({ callee, input, options }) => {
      const fn = evaluate(callee, ctx);
      const inputValue = evaluate(input, ctx);
      const optionsValue = evaluate(options, ctx);
      ctx.traceExpression(callee).assertType('Invokable', fn);

      return fn.invoke(ctx, inputValue, optionsValue);
    },

    Prefix: ({ operator, expression }) => {
      const fn = evaluate(operator, ctx);
      const exprValue = evaluate(expression, ctx);
      ctx.traceExpression(operator).assertType('Invokable', fn);

      return fn.invoke(ctx, exprValue, {});
    },

    Infix: ({ operator, left, right }) => {
      const fn = evaluate(operator, ctx);
      const leftValue = evaluate(left, ctx);
      const rightValue = evaluate(right, ctx);
      ctx.traceExpression(operator).assertType('Invokable', fn);

      const fn2 = fn.invoke(ctx, rightValue, {});
      ctx.assertType('Invokable', fn2);

      return fn2.invoke(ctx, leftValue, {});
    },

    Partial: ({ callee, options }) => {
      const calleeValue = evaluate(callee, ctx);
      ctx.traceExpression(callee).assertType('Invokable', calleeValue);

      return new Partial(
        ctx,
        calleeValue,
        evaluate(options, ctx)
      );
    },

    Pipe: ({ input, transformation }) => {
      const stream = evaluate(input, ctx);
      const fn = evaluate(transformation, ctx);
      ctx.traceExpression(input).assertType('Invokable', fn);
      ctx.traceExpression(transformation).assertType('Stream', stream);

      return stream.chain(
        (value) => fn.invoke(ctx, value, {})
      );
    },

    Variable: ({ id }) => {
      const name = evaluate(id, ctx);
      try {
        const value = ctx.environment.get(name);

        if (value.autoInvoke) {
          return value.invoke(ctx);
        } else {
          return value;
        }
      } catch (e) {
        ctx.rethrow(e);
      }
    },

    Let: ({ binding, value, expression }) => {
      const bindingValue = evaluate(binding, ctx);
      const exprCtx = ctx.extendEnvironment({
        [bindingValue]: new Thunk(ctx, bindingValue, value, '(let local binding)')
      });

      return evaluate(expression, exprCtx);
    },

    IfThenElse: ({ condition, consequent, alternate }) => {
      const conditionValue = evaluate(condition, ctx);
      ctx.traceExpression(condition).assertType('Boolean', conditionValue);

      if (conditionValue) {
        return evaluate(consequent, ctx);
      } else {
        return evaluate(alternate, ctx);
      }
    },

    Get: ({ expression, property }) => {
      const objectValue = evaluate(expression, ctx);
      const propertyName = evaluate(property, ctx);
      ctx.traceExpression(expression).assertType('Record', objectValue);

      if (hasOwnProperty(objectValue, propertyName)) {
        const value = objectValue[propertyName];
        if (value.autoInvoke) {
          return value.invoke(ctx);
        } else {
          return value;
        }
      } else {
        throw ctx.error('INEXISTENT-PROPERTY', `No property ${propertyName} in the record.`);
      }
    },

    // --[ Shell expressions ]-----------------------------------------
    Shell: ({ command, args, options }) => {
      let [commandValue] = evaluate(command, ctx);
      const argsValue = args.map(x => evaluate(x, ctx));
      if (AST.ShellSymbol.hasInstance(command)) {
        commandValue = textToPath(commandValue);
      }
      ctx.traceExpression(command).assertType('^Path', commandValue);

      return shell(commandValue, flatten(argsValue), options);
    },

    ShellSymbol: ({ symbol }) => {
      return [symbol];
    },

    ShellSpread: ({ items }) => {
      return evaluate(items, ctx);
    },

    ShellExpression: ({ expression }) => {
      return [evaluate(expression, ctx)];
    },


    // --[ Do expressions ]--------------------------------------------
    Do: ({ instructions }) =>
      evaluateDo(instructions, ctx),


    // --[ Entry point ]-----------------------------------------------
    Program: ({ declarations }) => {
      declarations.forEach(d => evaluate(d, ctx));
      return unit;
    }
  })
}


module.exports = { evaluate };
