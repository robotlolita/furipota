//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { nativeModule, native, tagged } = furipota.primitives;

  return nativeModule('core:core', {
    match:
    native('match', [['Any'], {_: 'Invokable'}],
      'matches a tagged value to its appropriate handler',
      (ctx, value, patterns) => {
        const method = patterns[value.tag] || patterns['default'];
        ctx.assertType('Invokable', method);

        return method.invoke(ctx, value.value, {});
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

    'do':
    native('do', [['Vector'], {}],
      'evaluates expressions in sequence, returns the last one',
      (ctx, expressions, _options) => {
        ctx.assert(expressions.length > 0, `(do expressions) needs at least one expression`);
        return expressions[expressions.length - 1];
      }
    )
  });
};