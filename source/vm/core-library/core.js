//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { nativeModule, native, nativeThunk, TOk, TError, TUnit, unit, ok, error } = furipota.primitives;

  return nativeModule('core:core', {
    Unit:
    nativeThunk('Unit', 'Variant for no value',
      (ctx) => TUnit
    ),

    Ok:
    nativeThunk('Ok', 'Variant for successful results',
      (ctx) => TOk
    ),

    Error:
    nativeThunk('Error', 'Variant for failed results',
      (ctx) => TError
    ),

    unit:
    nativeThunk('unit', 'Represents the no value', 
      (ctx) => unit
    ),

    ok:
    native('ok', [['Any'], {}],
      'constructs a representation of a succcessful result',
      (ctx, value, options) => ok(value)
    ),

    error:
    native('error', [['Any'], {}],
      'constructs a representation of a failed result',
      (ctx, value, options) => error(value)
    ),

    make:
    native('make', [['Variant', 'Vector'], {}],
      'constructs a value from a variant',
      (ctx, variant, values, options) => {
        return variant.create(ctx, values);
      }
    ),

    union:
    native('union', [['Vector'], {}],
      'constructs an union module',
      (ctx, variants, options) => {
        const result = {};
        variants.forEach(x => {
          ctx.assertType('Variant', x);
          result[x.tag] = x;
          if (x.predicates.length > 0) {
            result[x.tag.toLowerCase()] = native(
              `make-${x.tag}`, 
              [Array.from({ length: x.predicates.length }, () => 'Any'), {}],
              `constructs a ${x.tag} instance`,
              (ctx, ...rest) => {
                const values = rest.slice(0, -1);
                return x.create(ctx, values);
              }
            );
          } else {
            result[x.tag.toLowerCase()] = nativeThunk(
              `make-${x.tag}`,
              `constructs a ${x.tag} instance`,
              (ctx) => x.create(ctx, [])
            );
          }
        });
        return result;
      }
    ),

    and:
    native('and', [['Boolean', 'Boolean'], {}],
      'logical conjunction',
      (ctx, left, right, _options) => {
        return a && b;
      }
    ),

    or:
    native('or', [['Boolean', 'Boolean'], {}],
      'logical disjunction',
      (ctx, left, right, _options) => {
        return a || b;
      }
    ),

    not:
    native('not', [['Boolean'], {}],
      'logical negation',
      (ctx, value, _options) => {
        return !value;
      }
    ),

    '===':
    native('===', [['Any', 'Any'], {}],
      'structural equality',
      (ctx, left, right, _options) => {
        return left === right; // FIXME: structural equality
      }
    ),

    '=/=':
    native('=/=', [['Any', 'Any'], {}],
      'structural inequality',
      (ctx, left, right, _options) => {
        return left !== right; // FIXME: structural equality
      }
    ),

    assert:
    native('assert', [['Boolean'], { 'message?': 'Text' }],
      'Simple boolean assertion',
      (ctx, test, options) => {
        ctx.assert(test, options.message || ctx.trace.formatTopEntry());
        return unit;
      }
    )
  });
};
