//----------------------------------------------------------------------
//
// This source file is part of the furipota project.
//
// Licensed under MIT. See LICENCE for full licence information.
// See CONTRIBUTORS for the list of contributors to the project.
//
//----------------------------------------------------------------------

const { union, derivations } = require('folktale/adt/union');

const AST = union('furipota:ast', {
  Seq(items) {
    return { items };
  },

  // --[ Basic entities ]-----------------------------------------------
  Identifier(name) {
    return { name };
  },

  Hole() {
    return { };
  },

  Keyword(name) {
    return { name };
  },

  Text(value) {
    return { value };
  },

  Character(character) {
    return { character };
  },

  InterpolateExpression(expression) {
    return { expression };
  },

  Interpolate(items) {
    return { items };
  },

  Integer(sign, value) {
    return { sign, value };
  },

  Decimal(sign, integral, decimal, exponent) {
    return { sign, integral, decimal, exponent };
  },

  Boolean(value) {
    return { value };
  },

  Vector(items) {
    return { items };
  },

  VectorSpread(expression) {
    return { expression };
  },

  VectorElement(expression) {
    return { expression };
  },

  Record(pairs) {
    return { pairs };
  },

  Lambda(value, options, expression) {
    return { value, options, expression };
  },

  Tagged(tag, predicates) {
    return { tag, predicates };
  },

  // --[ Pattern matching ]---------------------------------------------
  Match(expression, cases) {
    return { expression, cases };
  },

  MatchCase(pattern, expression) {
    return { pattern, expression };
  },

  MatchBind(identifier) {
    return { identifier };
  },

  MatchEquals(identifier, expression) {
    return { identifier, expression };
  },

  MatchTagged(tag, patterns) {
    return { tag, patterns };
  },

  MatchVector(items) {
    return { items };
  },

  MatchVectorSpread(pattern) {
    return { pattern };
  },

  MatchVectorElement(pattern) {
    return { pattern };
  },

  MatchAny() {
    return { };
  },

  // --[ Declarations ]-------------------------------------------------
  Define(id, expression, documentation) {
    return { id, expression, documentation };
  },

  Import(path, kind) {
    return { path, kind };
  },

  ImportAliasing(path, alias, kind) {
    return { path, alias, kind };
  },

  Export(identifier) {
    return { identifier };
  },

  ExportAliasing(identifier, alias) {
    return { identifier, alias };
  },

  // --[ Expressions ]--------------------------------------------------
  Invoke(callee, input, options) {
    return { callee, input, options };
  },

  Pipe(input, transformation) {
    return { input, transformation };
  },

  Variable(id) {
    return { id };
  },

  Let(binding, value, expression) {
    return { binding, value, expression };
  },

  IfThenElse(condition, consequent, alternate) {
    return { condition, consequent, alternate };
  },

  Get(expression, property) {
    return { expression, property };
  },

  Infix(operator, left, right) {
    return { operator, left, right };
  },

  Prefix(operator, expression) {
    return { operator, expression };
  },

  Open(record, modifier, body) {
    return { record, modifier, body };
  },

  OpenExpose(bindings) {
    return { bindings };
  },

  OpenHide(bindings) {
    return { bindings };
  },

  OpenAll() {

  },

  OpenBinding(name, alias) {
    return { name, alias };
  },


  // --[ Shell sublanguage ]-------------------------------------------
  Shell(command, args, options) {
    return { command, args, options }
  },

  ShellSymbol(symbol) {
    return { symbol };
  },

  ShellSpread(items) {
    return { items };
  },

  ShellExpression(expression) {
    return { expression };
  },


  // --[ Imperative sublanguage ]--------------------------------------
  Do(instructions) {
    return { instructions };
  },

  DoCall(expression) {
    return { expression };
  },

  DoAction(expression) {
    return { expression };
  },

  DoReturn(expression) {
    return { expression };
  },

  DoBind(id, expression) {
    return { id, expression };
  },

  DoLet(id, expression) {
    return { id, expression };
  },

  DoIfThenElse(condition, consequent, alternate) {
    return { condition, consequent, alternate };
  },

  // --[ Entry point ]--------------------------------------------------
  Program(declarations) {
    return { declarations };
  }
}).derive(
  derivations.equality,
  derivations.debugRepresentation,
  derivations.serialization
);

module.exports = AST;
