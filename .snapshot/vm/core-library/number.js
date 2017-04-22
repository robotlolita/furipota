//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

module.exports = (furipota) => {
  const { nativeModule, native } = furipota.primitives;
  
  return nativeModule('core:number', {
    '>':
    native('>', [['Number', 'Number'], {}], 
      'tests if left > right',
      (ctx, left, right, _options) => {
        return left > right;
      }
    ),

    '>=':
    native('>=', [['Number', 'Number'], {}], 
      'tests if left >= right',
      (ctx, left, right, _options) => {
        return left >= right;
      }
    ),

    '<':
    native('<', [['Number', 'Number'], {}], 
      'tests if left < right',
      (ctx, left, right, _options) => {
        return left < right;
      }
    ),

    '<=':
    native('<=', [['Number', 'Number'], {}], 
      'tests if left <= right',
      (ctx, left, right, _options) => {
        return left <= right;
      }
    ),

    '+':
    native('+', [['Number', 'Number'], {}],
      'adds left to right',
      (ctx, left, right, _options) => {
        return left + right;
      }
    ),

    '-':
    native('-', [['Number', 'Number'], {}],
      'subtracts right from left',
      (ctx, left, right, _options) => {
        return left - right;
      }
    ),

    '*':
    native('*', [['Number', 'Number'], {}],
      'multiplies left by right',
      (ctx, left, right, _options) => {
        return left * right;
      }
    ),

    'divide':
    native('divide', [['Number', 'Number'], {}],
      'divides left by right',
      (ctx, left, right, _options) => {
        return left / right;
      }
    ),
    
    'to-text':
    native('to-text', [['Number'], {}],
      'converts a number to a text',
      (ctx, number, _options) => {
        return String(number);
      }
    )
  });
};
