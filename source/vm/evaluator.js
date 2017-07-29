//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { fromPairs } = require('folktale/core/object');
const Maybe = require('folktale/maybe');
const { Primitive, Lambda, NativeThunk, Thunk, Tagged, Variant } = require('./intrinsics');
const { pathToText, textToPath, shell, show, unit, Stream, TPath } = require('./primitives');
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


function isValidIdentifier(x) {
  return /^([a-zA-Z0-9\-_]+|===|=\/=|>|>=|<|<=|\+|-|\*|\/)$/.test(x);
}


function moduleKeys(record) {
  return Object.keys(record).filter(isValidIdentifier);
}


function restrictBindings(record, modifier) {
  const bindings = modifier.matchWith({
    OpenAll: () => moduleKeys(record).map(x => [x, x]),
    OpenHide: ({ bindings }) => {
      const exclude = new Set(bindings);
      return moduleKeys(record).filter(x => !exclude.has(x)).map(x => [x, x]);
    },
    OpenExpose: ({ bindings }) => {
      return bindings.map(x => [x.name, x.alias]);
    }
  });

  const result = {};
  bindings.forEach(([sourceKey, targetKey]) => {
    if (hasOwnProperty(record, sourceKey)) {
      result[targetKey] = record[sourceKey];
    } else {
      throw ctx.error('INEXISTENT-PROPERTY', `No property ${sourceKey} in the module`);
    }
  });

  return result;
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


// The match-language interpreter
function evaluateMatch(value, cases, ctx) {
  ctx.assert(cases.length > 0, `Could not match ${show(ctx, value)} against any of the provided patterns.`);
  const [current, ...rest] = cases;

  return current.matchWith({
    MatchCase: ({ pattern, expression }) => {
      return testPattern(pattern, value, ctx).matchWith({
        Just: ({ value: bindings }) => {
          return evaluate(expression, ctx.traceExpression(current).extendEnvironment(bindings));
        },

        Nothing: () => {
          return evaluateMatch(value, rest, ctx);
        }
      });
    }
  });
}


function testPattern(pattern, value, ctx) {
  const mergeBindings = (a) => (b) => {
    const result = Object.assign({}, a);
    
    Object.keys(b).forEach(key => {
      if (key in result) {
        throw new Error(`Duplicated binding ${key}`);
      } else {
        result[key] = b[key];
      }
    });

    return result;
  };

  return pattern.matchWith({
    MatchBind: ({ identifier }) => {
      return Maybe.Just({ 
        [evaluate(identifier, ctx)]: value 
      });
    },

    MatchEquals: ({ identifier, expression }) => {
      const otherValue = evaluate(expression, ctx);
      return value === otherValue ?  Maybe.Just({ [evaluate(identifier, ctx)]: value }) 
      :      /* else */              Maybe.Nothing();
    },
    
    MatchTagged: ({ tag, patterns }) => {
      const tagValue = evaluate(tag, ctx);
      ctx.assertType('Variant', tagValue);

      if (patterns.length === 0) {
        return tagValue.hasInstance(value) ?  Maybe.Just({}) : Maybe.Nothing();
      } else {
        const maybeParts = tagValue.unapply(value);

        return patterns.reduce(
          (maybeBindings, pattern) => {
            return maybeBindings.chain(([[part, ...rest], bindings]) => {
              return testPattern(pattern, part, ctx)
                       .map(mergeBindings(bindings))
                       .map(newBindings => [rest, newBindings]);
            });
          },
          (maybeParts == null || maybeParts.length !== patterns.length) ?  Maybe.Nothing()
          : /* else */                                                     Maybe.Just([maybeParts, {}])
        ).map(([_, bindings]) => bindings);
      }
    },

    MatchVector: ({ items }) => {
      return items.reduce(
        (maybeBindings, vectorPattern) => {
          return maybeBindings.chain(([xs, bindings]) => {
            return vectorPattern.matchWith({
              MatchVectorSpread: ({ pattern }) => {
                return testPattern(pattern, xs, ctx)
                         .map(mergeBindings(bindings))
                         .map(newBindings => [[], newBindings]);
              },

              MatchVectorElement: ({ pattern }) => {
                const [x, ...rest] = xs;
                return testPattern(pattern, x, ctx)
                         .map(mergeBindings(bindings))
                         .map(newBindings => [rest, newBindings]);
              }
            })
          });
        },
        Array.isArray(value) && value.length >= items.length ?  Maybe.Just([value, {}])
        : /* else */                                            Maybe.Nothing()
      ).map(([_, bindings]) => bindings)
    },

    MatchAny: () => {
      return Maybe.Just({});
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

    Hole: () => {
      ctx.assert(false, `Application hole not removed during desugaring phase. This is probably an error in the FuriPota VM.`);
    },

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

    Tagged: ({ tag, predicates }) =>
      new Variant(
        evaluate(tag, ctx),
        predicates.map(x => {
          const value = evaluate(x, ctx);
          ctx.traceExpression(x).assertType('Invokable', value);
          return value;
        })
      ),

    
    // --[ Pattern matching ]------------------------------------------
    Match: ({ expression, cases }) => {
      const value = evaluate(expression, ctx);
      return evaluateMatch(value, cases, ctx);
    },

    
    // --[ Complex values ]--------------------------------------------
    Vector: ({ items }) => {
      return flatten(items.map(x => evaluate(x, ctx)))
    },

    VectorSpread: ({ expression }) => {
      const result = evaluate(expression, ctx);
      ctx.assertType('Vector', result);
      return result;
    },

    VectorElement: ({ expression }) => {
      return [evaluate(expression, ctx)];
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
      try {
        ctx.environment.define(name, thunk);
      } catch (e) {
        ctx.rethrow(e);
      }
      return unit;
    },

    Import: ({ path, kind, modifier }) => {
      const pathValue = evaluate(path, ctx);
      const module = ctx.loadModule(pathValue, kind);
      try {
        ctx.environment.extend(restrictBindings(module.exportedBindings, modifier));
      } catch (e) {
        ctx.rethrow(e);
      }
      return unit;
    },

    ImportAliasing: ({ path, alias, kind }) => {
      const pathValue = evaluate(path, ctx);
      const aliasValue = evaluate(alias, ctx);
      const module = ctx.loadModule(pathValue, kind);

      try {
        ctx.environment.define(
          aliasValue,
          new NativeThunk(
            aliasValue,
            () => module.exportedBindings,
            `A ${kind} module from ${pathValue}`
          )
        );
      } catch (e) {
        ctx.rethrow(e);
      }

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
    ExprSequence: ({ expression, rest }) => {
      evaluate(expression, ctx);
      return evaluate(rest, ctx);
    },

    Invoke: ({ callee, input, options }) => {
      const fn = evaluate(callee, ctx);
      const inputValue = evaluate(input, ctx);
      const optionsValue = evaluate(options, ctx);
      ctx.traceExpression(callee).assertType('Invokable', fn);

      return fn.invoke(ctx, inputValue, optionsValue);
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
      try {
        const exprCtx = ctx.extendEnvironment({
          [bindingValue]: new Thunk(ctx, bindingValue, value, '(let local binding)')
        });
      } catch (e) {
        ctx.rethrow(e);
      }

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

    Open: ({ record, modifier, body }) => {
      const moduleValue = evaluate(record, ctx);
      try {
        return evaluate(body, ctx.extendEnvironment(restrictBindings(moduleValue, modifier)));
      } catch (e) {
        ctx.rethrow(e);
      }
    },

    // --[ Shell expressions ]-----------------------------------------
    Shell: ({ command, args, options }) => {
      let [commandValue] = evaluate(command, ctx);
      const argsValue = args.map(x => evaluate(x, ctx));
      if (AST.ShellSymbol.hasInstance(command)) {
        commandValue = textToPath(commandValue);
      }
      ctx.traceExpression(command).assertType(TPath, commandValue);

      return shell(commandValue, flatten(argsValue), evaluate(options, ctx));
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
